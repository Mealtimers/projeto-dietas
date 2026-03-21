const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const grupos = await prisma.grupoAlimentar.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        _count: { select: { alimentos: true } },
      },
    });
    res.json(grupos);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const grupo = await prisma.grupoAlimentar.findUnique({
      where: { id },
      include: {
        alimentos: {
          orderBy: { nome: 'asc' },
          include: {
            preparos: {
              orderBy: { nome: 'asc' },
            },
          },
        },
      },
    });
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo alimentar não encontrado.' });
    }
    res.json(grupo);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, descricao, ordem } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }
    const grupo = await prisma.grupoAlimentar.create({
      data: { nome, descricao, ordem: ordem || 0 },
    });
    res.status(201).json(grupo);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, descricao, ordem } = req.body;
    const grupo = await prisma.grupoAlimentar.update({
      where: { id },
      data: { nome, descricao, ordem },
    });
    res.json(grupo);
  } catch (err) {
    next(err);
  }
};

const deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.grupoAlimentar.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
