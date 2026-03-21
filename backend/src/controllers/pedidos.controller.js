'use strict';

const prisma          = require('../lib/prisma');
const cardapioService = require('../services/cardapio.service');

// Transições de status permitidas via atualizarStatus manual
const TRANSICOES = {
  PENDENTE:             ['GERADO'],
  GERADO:               ['AGUARDANDO_APROVACAO', 'REPROVADO', 'PENDENTE'],
  AGUARDANDO_APROVACAO: ['APROVADO', 'REPROVADO', 'GERADO'],
  APROVADO:             ['EM_PRODUCAO'],
  REPROVADO:            ['GERADO'],
  EM_PRODUCAO:          ['CONCLUIDO'],
  CONCLUIDO:            [],
};

// Status que bloqueiam alteração estrutural do pedido
const STATUS_BLOQUEADO = ['APROVADO', 'EM_PRODUCAO', 'CONCLUIDO'];

function includeDetalhe() {
  return {
    cliente: { select: { id: true, nome: true, email: true } },
    proteinas: {
      include: {
        alimentoBase: { include: { grupo: { select: { id: true, nome: true } } } },
      },
      orderBy: { quantidadePratos: 'desc' },
    },
    itensPermitidos: {
      include: {
        alimentoBase: { include: { grupo: { select: { id: true, nome: true } } } },
      },
    },
    versoes: {
      orderBy: { numero: 'desc' },
      include: {
        lotes: {
          orderBy: { quantidade: 'desc' },
          include: {
            itens: {
              include: {
                preparo: {
                  include: {
                    alimento: { include: { grupo: { select: { id: true, nome: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    },
    aprovacao:    true,
    ordemProducao: true,
  };
}

const listar = async (req, res, next) => {
  try {
    const pedidos = await prisma.pedidoDieta.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cliente:       { select: { id: true, nome: true } },
        aprovacao:     { select: { status: true } },
        ordemProducao: { select: { id: true, status: true } },
        _count:        { select: { versoes: true } },
      },
    });
    res.json(pedidos);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({ where: { id }, include: includeDetalhe() });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
    res.json(pedido);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const {
      clienteId,
      totalPratos,
      maxRepeticoes,
      minRepeticoesLote,
      observacoes,
      proteinas    = [],
      carboidratos = [],
      leguminosas  = [],
      legumes      = [],
    } = req.body;

    if (!clienteId || !totalPratos || !maxRepeticoes)
      return res.status(400).json({ error: 'clienteId, totalPratos e maxRepeticoes são obrigatórios.' });

    if (parseInt(totalPratos) < 5)
      return res.status(400).json({ error: 'O pedido deve ter no mínimo 5 pratos.' });

    if (proteinas.length === 0)
      return res.status(400).json({ error: 'Informe ao menos uma proteína com quantidadePratos.' });

    const somaProteinas = proteinas.reduce((s, p) => s + parseInt(p.quantidadePratos || 0), 0);
    if (somaProteinas !== parseInt(totalPratos))
      return res.status(400).json({
        error: `Soma das proteínas (${somaProteinas}) deve ser igual a totalPratos (${totalPratos}).`,
      });

    const pedido = await prisma.$transaction(async (tx) => {
      const novo = await tx.pedidoDieta.create({
        data: {
          clienteId,
          totalPratos:       parseInt(totalPratos),
          maxRepeticoes:     parseInt(maxRepeticoes),
          minRepeticoesLote: minRepeticoesLote ? parseInt(minRepeticoesLote) : 2,
          observacoes,
          status: 'PENDENTE',
        },
      });

      await tx.pedidoProteina.createMany({
        data: proteinas.map((p) => ({
          pedidoId:         novo.id,
          alimentoBaseId:   p.alimentoBaseId,
          gramagem:         parseFloat(p.gramagem),
          quantidadePratos: parseInt(p.quantidadePratos),
        })),
      });

      const itens = [
        ...carboidratos.map((p) => ({ pedidoId: novo.id, grupoNome: 'Carboidrato', alimentoBaseId: p.alimentoBaseId, gramagemBase: parseFloat(p.gramagemBase) })),
        ...leguminosas.map((p)  => ({ pedidoId: novo.id, grupoNome: 'Leguminosa',  alimentoBaseId: p.alimentoBaseId, gramagemBase: parseFloat(p.gramagemBase) })),
        ...legumes.map((p)      => ({ pedidoId: novo.id, grupoNome: 'Legume',       alimentoBaseId: p.alimentoBaseId, gramagemBase: parseFloat(p.gramagemBase) })),
      ];
      if (itens.length > 0)
        await tx.pedidoItemPermitido.createMany({ data: itens });

      return novo;
    });

    const pedidoCompleto = await prisma.pedidoDieta.findUnique({
      where: { id: pedido.id },
      include: includeDetalhe(),
    });

    res.status(201).json(pedidoCompleto);
  } catch (err) {
    next(err);
  }
};

const deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (STATUS_BLOQUEADO.includes(pedido.status))
      return res.status(400).json({ error: `Pedido com status "${pedido.status}" não pode ser excluído.` });
    await prisma.pedidoDieta.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const gerarCardapio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const statusPermitidos = ['PENDENTE', 'GERADO', 'REPROVADO'];
    if (!statusPermitidos.includes(pedido.status))
      return res.status(400).json({
        error: `Pedido com status "${pedido.status}" não pode ter cardápio gerado. Permitido apenas em: ${statusPermitidos.join(', ')}.`,
      });

    const resultado = await cardapioService.gerarCardapio(id);
    res.json({
      message:      'Cardápio gerado com sucesso.',
      versaoNumero: resultado.versaoNumero,
      totalLotes:   resultado.totalLotes,
      totalPratos:  resultado.totalPratos,
    });
  } catch (err) {
    next(err);
  }
};

const atualizarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body;

    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const permitidos = TRANSICOES[pedido.status] ?? [];
    if (!status || !permitidos.includes(status)) {
      return res.status(400).json({
        error: `Transição inválida: "${pedido.status}" → "${status}". Permitido: ${permitidos.join(', ') || 'nenhum'}.`,
      });
    }

    const atualizado = await prisma.pedidoDieta.update({
      where: { id },
      data: { status, observacoes },
    });
    res.json(atualizado);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, deletar, gerarCardapio, atualizarStatus };
