const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const preparos = await prisma.preparoAlimento.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        alimento: {
          include: {
            grupo: { select: { id: true, nome: true } },
          },
        },
      },
    });
    res.json(preparos);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar };
