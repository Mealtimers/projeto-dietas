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

    const novoStatusPedido =
      status === 'APROVADO'  ? 'APROVADO' :
      status === 'REPROVADO' ? 'REPROVADO' :
                               'AGUARDANDO_APROVACAO';

    const dataAprovacao = status !== 'PENDENTE' ? new Date() : null;

    try {
      const aprovacao = await prisma.$transaction(async (tx) => {
        const pedido = await tx.pedidoDieta.findUnique({
          where: { id: pedidoId },
          select: { status: true },
        });
        if (!pedido) {
          const err = new Error('Pedido não encontrado.');
          err.statusCode = 404;
          throw err;
        }
        if (pedido.status !== 'AGUARDANDO_APROVACAO') {
          const err = new Error(
            `Pedido com status "${pedido.status}" não pode ser aprovado/reprovado. O pedido precisa estar em AGUARDANDO_APROVACAO.`,
          );
          err.statusCode = 400;
          throw err;
        }

        if (status === 'APROVADO') {
          const versaoAtiva = await tx.cardapioVersao.findFirst({ where: { pedidoId, ativo: true } });
          if (!versaoAtiva) {
            const err = new Error('Não é possível aprovar sem versão de cardápio ativa. Gere o cardápio primeiro.');
            err.statusCode = 400;
            throw err;
          }
        }

        const ap = await tx.aprovacaoCliente.upsert({
          where: { pedidoId },
          create: { pedidoId, status, observacoes, dataAprovacao },
          update: { status, observacoes, dataAprovacao },
          include: { pedido: { select: { id: true, status: true } } },
        });

        await tx.pedidoDieta.update({
          where: { id: pedidoId },
          data: { status: novoStatusPedido },
        });

        return ap;
      }, { isolationLevel: 'Serializable' });

      res.json(aprovacao);
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorPedido, aprovarOuReprovar };
