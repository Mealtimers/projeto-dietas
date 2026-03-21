const prisma = require('../lib/prisma');
const ordemProducaoService = require('../services/ordemProducao.service');

const listar = async (req, res, next) => {
  try {
    const ordens = await prisma.ordemProducao.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        pedido: {
          include: { cliente: { select: { id: true, nome: true } } },
        },
      },
    });
    res.json(ordens);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ordem = await prisma.ordemProducao.findUnique({
      where: { id },
      include: {
        pedido: {
          include: { cliente: { select: { id: true, nome: true } } },
        },
      },
    });
    if (!ordem) return res.status(404).json({ error: 'Ordem de produção não encontrada.' });
    res.json(ordem);
  } catch (err) {
    next(err);
  }
};

const gerar = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const pedido = await prisma.pedidoDieta.findUnique({ where: { id: pedidoId } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });
    if (pedido.status !== 'APROVADO') {
      return res.status(400).json({
        error: `Apenas pedidos com status APROVADO podem gerar ordem de produção. Status atual: "${pedido.status}".`,
      });
    }

    const ordemExistente = await prisma.ordemProducao.findUnique({ where: { pedidoId } });
    if (ordemExistente) {
      return res.status(409).json({
        error: 'Já existe uma ordem de produção para este pedido.',
        ordem: ordemExistente,
      });
    }

    const ordem = await ordemProducaoService.gerarOrdem(pedidoId);
    res.status(201).json(ordem);
  } catch (err) {
    next(err);
  }
};

const atualizarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, observacoes, dataPrevisao } = req.body;
    const statusValidos = ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA'];
    if (!status || !statusValidos.includes(status)) {
      return res.status(400).json({
        error: `Status inválido. Valores possíveis: ${statusValidos.join(', ')}`,
      });
    }

    const ordem = await prisma.ordemProducao.update({
      where: { id },
      data: {
        status,
        observacoes,
        dataPrevisao: dataPrevisao ? new Date(dataPrevisao) : undefined,
      },
    });

    if (status === 'CONCLUIDA') {
      await prisma.pedidoDieta.update({ where: { id: ordem.pedidoId }, data: { status: 'CONCLUIDO' } });
    } else if (status === 'EM_ANDAMENTO') {
      await prisma.pedidoDieta.update({ where: { id: ordem.pedidoId }, data: { status: 'EM_PRODUCAO' } });
    }

    res.json(ordem);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, gerar, atualizarStatus };
