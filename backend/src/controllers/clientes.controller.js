const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: { nome: 'asc' },
      include: {
        _count: { select: { pedidos: true } },
      },
    });
    res.json(clientes);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        pedidos: {
          orderBy: { createdAt: 'desc' },
          include: {
            aprovacao: { select: { status: true } },
            ordemProducao: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }
    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, email, telefone, observacoes } = req.body;
    if (!nome || !email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios.' });
    }
    const cliente = await prisma.cliente.create({
      data: { nome, email, telefone, observacoes },
    });
    res.status(201).json(cliente);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, email, telefone, observacoes } = req.body;
    const cliente = await prisma.cliente.update({
      where: { id },
      data: { nome, email, telefone, observacoes },
    });
    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

const deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.cliente.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
