'use strict';

const prisma          = require('../lib/prisma');
const cardapioService = require('../services/cardapio.service');
const mc              = require('../lib/mealcontrolClient');

// Transições de status permitidas via atualizarStatus manual
const TRANSICOES = {
  PENDENTE:             ['GERADO'],
  GERADO:               ['AGUARDANDO_APROVACAO', 'REPROVADO', 'PENDENTE'],
  AGUARDANDO_APROVACAO: ['APROVADO', 'REPROVADO', 'GERADO'],
  APROVADO:             ['EM_PRODUCAO'],
  REPROVADO:            ['GERADO'],
  EM_PRODUCAO:          ['CONCLUIDO', 'CANCELADO', 'PENDENTE'],
  CONCLUIDO:            [],
  CANCELADO:            [],
};

// Status que bloqueiam edição estrutural do pedido
// EM_PRODUCAO removido — agora o pedido pode ser editado mesmo em produção
const STATUS_BLOQUEADO = ['APROVADO', 'CONCLUIDO', 'CANCELADO'];

// Status que bloqueiam exclusão (EM_PRODUCAO removido — agora pode ser excluído)
const STATUS_BLOQUEADO_EXCLUSAO = ['CONCLUIDO'];

function includeDetalhe() {
  return {
    cliente: { select: { id: true, nome: true, email: true } },
    proteinas: {
      include: {
        alimentoBase: {
          include: {
            grupo:   { select: { id: true, nome: true } },
            preparos: { where: { ativo: true }, select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { quantidadePratos: 'desc' },
    },
    itensPermitidos: {
      include: {
        preparo: {
          include: { alimento: { select: { id: true, nome: true, carboidratosPor100g: true } } },
        },
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
      tipoRefeicao,
      totalPratos,
      maxRepeticoes,
      minRepeticoesLote,
      observacoes,
      obsLegumes,
      nutricionista,
      proteinas    = [],
      carboidratos = {},
      leguminosas  = {},
      legumes      = {},
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
          tipoRefeicao:      tipoRefeicao || 'ALMOCO',
          totalPratos:       parseInt(totalPratos),
          maxRepeticoes:     parseInt(maxRepeticoes),
          minRepeticoesLote: minRepeticoesLote ? parseInt(minRepeticoesLote) : 2,
          observacoes,
          obsLegumes: obsLegumes || null,
          nutricionista: nutricionista || null,
          status: 'PENDENTE',
        },
      });

      await tx.pedidoProteina.createMany({
        data: proteinas.map((p) => ({
          pedidoId:         novo.id,
          alimentoBaseId:   p.alimentoBaseId,
          gramagem:         parseFloat(p.gramagem),
          quantidadePratos: parseInt(p.quantidadePratos),
          preparosIds:      Array.isArray(p.preparosIds) ? p.preparosIds : [],
        })),
      });

      const gruposPayload = [
        { grupoNome: 'Carboidrato', dados: carboidratos },
        { grupoNome: 'Leguminosa',  dados: leguminosas  },
        { grupoNome: 'Legumes',     dados: legumes      },
      ];
      const itens = [];
      for (const { grupoNome, dados } of gruposPayload) {
        if (!dados || !Array.isArray(dados.preparos) || dados.preparos.length === 0) continue;
        const gramagem = parseFloat(dados.gramagem);
        if (!gramagem || gramagem <= 0) continue;
        for (const preparoId of dados.preparos) {
          itens.push({ pedidoId: novo.id, grupoNome, preparoId, gramagemBase: gramagem });
        }
      }
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

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      totalPratos,
      maxRepeticoes,
      minRepeticoesLote,
      observacoes,
      obsLegumes,
      nutricionista,
      proteinas    = [],
      carboidratos = {},
      leguminosas  = {},
      legumes      = {},
    } = req.body;

    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (STATUS_BLOQUEADO.includes(pedido.status))
      return res.status(400).json({ error: `Pedido com status "${pedido.status}" não pode ser editado.` });

    if (parseInt(totalPratos) < 5)
      return res.status(400).json({ error: 'O pedido deve ter no mínimo 5 pratos.' });

    if (proteinas.length === 0)
      return res.status(400).json({ error: 'Informe ao menos uma proteína.' });

    const somaProteinas = proteinas.reduce((s, p) => s + parseInt(p.quantidadePratos || 0), 0);
    if (somaProteinas !== parseInt(totalPratos))
      return res.status(400).json({
        error: `Soma das proteínas (${somaProteinas}) deve ser igual a totalPratos (${totalPratos}).`,
      });

    await prisma.$transaction(async (tx) => {
      // Edição estrutural recria proteínas/itens — limpa cardápios, aprovações
      // e ordens antigas, que ficariam apontando para uma estrutura que não existe mais.
      await tx.cardapioVersao.deleteMany({ where: { pedidoId: id } });
      await tx.aprovacaoCliente.deleteMany({ where: { pedidoId: id } });
      await tx.ordemProducao.deleteMany({ where: { pedidoId: id } });

      await tx.pedidoDieta.update({
        where: { id },
        data: {
          totalPratos:       parseInt(totalPratos),
          maxRepeticoes:     parseInt(maxRepeticoes),
          minRepeticoesLote: minRepeticoesLote ? parseInt(minRepeticoesLote) : 2,
          observacoes,
          obsLegumes: obsLegumes || null,
          nutricionista: nutricionista || null,
          status: 'PENDENTE',
        },
      });

      await tx.pedidoProteina.deleteMany({ where: { pedidoId: id } });
      await tx.pedidoProteina.createMany({
        data: proteinas.map((p) => ({
          pedidoId:         id,
          alimentoBaseId:   p.alimentoBaseId,
          gramagem:         parseFloat(p.gramagem),
          quantidadePratos: parseInt(p.quantidadePratos),
          preparosIds:      Array.isArray(p.preparosIds) ? p.preparosIds : [],
        })),
      });

      await tx.pedidoItemPermitido.deleteMany({ where: { pedidoId: id } });
      const gruposPayload = [
        { grupoNome: 'Carboidrato', dados: carboidratos },
        { grupoNome: 'Leguminosa',  dados: leguminosas  },
        { grupoNome: 'Legumes',     dados: legumes      },
      ];
      const itens = [];
      for (const { grupoNome, dados } of gruposPayload) {
        if (!dados || !Array.isArray(dados.preparos) || dados.preparos.length === 0) continue;
        const gramagem = parseFloat(dados.gramagem);
        if (!gramagem || gramagem <= 0) continue;
        for (const preparoId of dados.preparos) {
          itens.push({ pedidoId: id, grupoNome, preparoId, gramagemBase: gramagem });
        }
      }
      if (itens.length > 0)
        await tx.pedidoItemPermitido.createMany({ data: itens });
    });

    const pedidoCompleto = await prisma.pedidoDieta.findUnique({
      where: { id },
      include: includeDetalhe(),
    });
    res.json(pedidoCompleto);
  } catch (err) {
    next(err);
  }
};

const deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (STATUS_BLOQUEADO_EXCLUSAO.includes(pedido.status))
      return res.status(400).json({ error: `Pedido com status "${pedido.status}" não pode ser excluído. Cancele-o primeiro.` });
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

    const data = { status };
    if (observacoes !== undefined) data.observacoes = observacoes;

    const atualizado = await prisma.pedidoDieta.update({
      where: { id },
      data,
    });
    res.json(atualizado);
  } catch (err) {
    next(err);
  }
};

const deletarVarios = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'Informe ao menos um ID.' });

    const pedidos = await prisma.pedidoDieta.findMany({ where: { id: { in: ids } } });
    const deletaveis = pedidos.filter((p) => !STATUS_BLOQUEADO_EXCLUSAO.includes(p.status));
    const bloqueados = pedidos.filter((p) =>  STATUS_BLOQUEADO_EXCLUSAO.includes(p.status));

    if (deletaveis.length > 0)
      await prisma.pedidoDieta.deleteMany({ where: { id: { in: deletaveis.map((p) => p.id) } } });

    res.json({
      deletados:  deletaveis.length,
      bloqueados: bloqueados.length,
      mensagem:   bloqueados.length > 0
        ? `${deletaveis.length} pedido(s) excluído(s). ${bloqueados.length} não pôde(ram) ser excluído(s) por restrição de status.`
        : `${deletaveis.length} pedido(s) excluído(s) com sucesso.`,
    });
  } catch (err) {
    next(err);
  }
};

const atualizarValor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { valorTotal } = req.body;

    const pedido = await prisma.pedidoDieta.findUnique({ where: { id } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const valor = valorTotal != null ? parseFloat(valorTotal) : null;
    if (valor !== null && (isNaN(valor) || valor < 0))
      return res.status(400).json({ error: 'Valor inválido.' });

    const atualizado = await prisma.pedidoDieta.update({
      where: { id },
      data: { valorTotal: valor },
    });
    res.json(atualizado);
  } catch (err) {
    next(err);
  }
};

// POST /api/pedidos/:id/enviar-mealcontrol
// Cria um planning no Meal Control com base nos itens consolidados da ordem de produção.
// Idempotente: se pedido já tem mealcontrolPlanningId, retorna o existente sem duplicar.
const enviarMealcontrol = async (req, res, next) => {
  try {
    const { id } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({
      where: { id },
      include: {
        cliente:       { select: { id: true, nome: true } },
        ordemProducao: true,
      },
    });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    if (pedido.mealcontrolPlanningId) {
      return res.json({
        ok: true, alreadySent: true,
        planningId: pedido.mealcontrolPlanningId,
        planningUrl: `${mc.baseUrl()}/#/plannings/${pedido.mealcontrolPlanningId}`,
        sentAt: pedido.mealcontrolPlanningAt,
      });
    }

    if (!pedido.ordemProducao)
      return res.status(400).json({ error: 'Pedido não tem ordem de produção. Gere a ordem antes de enviar.' });

    const consolidado = pedido.ordemProducao.itensConsolidados?.consolidadoCozinha || [];
    if (consolidado.length === 0)
      return res.status(400).json({ error: 'Ordem de produção sem itens consolidados.' });

    // Agrupa por preparoId (mesmo preparo pode aparecer em vários lotes)
    const porPreparo = new Map();
    for (const item of consolidado) {
      const cur = porPreparo.get(item.preparoId) || {
        preparoId: item.preparoId, preparo: item.preparo, alimento: item.alimento,
        totalPratos: 0, totalGramas: 0,
      };
      cur.totalPratos += Number(item.totalPratos) || 0;
      cur.totalGramas += Number(item.totalGramas) || 0;
      porPreparo.set(item.preparoId, cur);
    }
    const preparoIds = [...porPreparo.keys()];

    const preparos = await prisma.preparoAlimento.findMany({
      where: { id: { in: preparoIds } },
      select: { id: true, nome: true, mealcontrolRecipeId: true, mealcontrolRecipeName: true, mealcontrolIsRepresentative: true },
    });
    const preparoById = new Map(preparos.map((p) => [p.id, p]));

    const semVinculo = [];
    const paraEnviar = [];
    for (const [pid, agg] of porPreparo) {
      const link = preparoById.get(pid);
      if (!link || !link.mealcontrolRecipeId) {
        semVinculo.push({ preparoId: pid, preparo: agg.preparo, alimento: agg.alimento, totalPratos: agg.totalPratos });
      } else {
        paraEnviar.push({ ...agg, recipeId: link.mealcontrolRecipeId, recipeName: link.mealcontrolRecipeName, isRepresentative: link.mealcontrolIsRepresentative });
      }
    }

    if (semVinculo.length > 0) {
      return res.status(400).json({
        error: 'Alguns preparos não estão vinculados a receitas do Meal Control.',
        semVinculo,
        totalItens: consolidado.length,
        vinculados: paraEnviar.length,
        naoVinculados: semVinculo.length,
      });
    }

    // 1. Cria planning no MC
    const dataStr = new Date().toISOString().slice(0, 10);
    const shortId = pedido.id.slice(-6);
    const planningName = `Dietas · ${pedido.cliente.nome} · ${dataStr} · #${shortId}`;
    const planning = await mc.post('/api/plannings', { name: planningName });
    if (!planning?.id) throw new Error('Meal Control não retornou id do planning criado.');

    // 2. Cria planning_items (um por receita)
    const itensCriados = [];
    for (const item of paraEnviar) {
      const pi = await mc.post('/api/planning_items', {
        planning_id: planning.id,
        type:        'recipe',
        item_id:     item.recipeId,
        qty:         item.totalPratos,
        unit:        'un',
      });
      itensCriados.push({ recipeId: item.recipeId, recipeName: item.recipeName, qty: item.totalPratos, planningItemId: pi?.id });
    }

    // 3. Persiste idempotência no pedido
    await prisma.pedidoDieta.update({
      where: { id },
      data: { mealcontrolPlanningId: planning.id, mealcontrolPlanningAt: new Date() },
    });

    res.status(201).json({
      ok: true, alreadySent: false,
      planningId:  planning.id,
      planningUrl: `${mc.baseUrl()}/#/plannings/${planning.id}`,
      itensEnviados: itensCriados,
    });
  } catch (err) {
    if (err.code === 'MC_NOT_CONFIGURED')
      return res.status(503).json({ error: 'Integração com Meal Control não configurada (env vars faltando).' });
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar, deletarVarios, gerarCardapio, atualizarStatus, atualizarValor, enviarMealcontrol };
