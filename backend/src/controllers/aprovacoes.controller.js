const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const pedidos = await prisma.pedidoDieta.findMany({
      where: { status: { in: ['AGUARDANDO_APROVACAO', 'GERADO'] } },
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { id: true, nome: true } },
        aprovacao: true,
        _count: { select: { versoes: true } },
      },
    });
    res.json(pedidos);
  } catch (err) {
    next(err);
  }
};

const buscarPorPedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const aprovacao = await prisma.aprovacaoCliente.findUnique({
      where: { pedidoId },
      include: {
        pedido: {
          include: {
            cliente: { select: { id: true, nome: true } },
            versoes: {
              where: { ativo: true },
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
          },
        },
      },
    });
    if (!aprovacao) {
      return res.status(404).json({ error: 'Aprovação não encontrada para este pedido.' });
    }
    res.json(aprovacao);
  } catch (err) {
    next(err);
  }
};

const aprovarOuReprovar = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const { status, observacoes } = req.body;

    if (!status || !['APROVADO', 'REPROVADO', 'PENDENTE'].includes(status)) {
      return res.status(400).json({ error: 'Status inválido. Use APROVADO, REPROVADO ou PENDENTE.' });
    }

    const pedido = await prisma.pedidoDieta.findUnique({ where: { id: pedidoId } });
    if (!pedido) return res.status(404).json({ error: 'Pedido não encontrado.' });

    // Validar: só processar aprovação se o pedido estiver aguardando aprovação
    if (pedido.status !== 'AGUARDANDO_APROVACAO') {
      return res.status(400).json({
        error: `Pedido com status "${pedido.status}" não pode ser aprovado/reprovado. O pedido precisa estar em AGUARDANDO_APROVACAO.`,
      });
    }

    // Validar: só aprovar se existir versão ativa gerada
    if (status === 'APROVADO') {
      const versaoAtiva = await prisma.cardapioVersao.findFirst({ where: { pedidoId, ativo: true } });
      if (!versaoAtiva)
        return res.status(400).json({ error: 'Não é possível aprovar sem versão de cardápio ativa. Gere o cardápio primeiro.' });
    }

    const aprovacao = await prisma.aprovacaoCliente.upsert({
      where: { pedidoId },
      create: {
        pedidoId,
        status,
        observacoes,
        dataAprovacao: status !== 'PENDENTE' ? new Date() : null,
      },
      update: {
        status,
        observacoes,
        dataAprovacao: status !== 'PENDENTE' ? new Date() : null,
      },
      include: { pedido: { select: { id: true, status: true } } },
    });

    const novoStatus =
      status === 'APROVADO' ? 'APROVADO' :
      status === 'REPROVADO' ? 'REPROVADO' :
      'AGUARDANDO_APROVACAO';

    await prisma.pedidoDieta.update({
      where: { id: pedidoId },
      data: { status: novoStatus },
    });

    res.json(aprovacao);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorPedido, aprovarOuReprovar };
