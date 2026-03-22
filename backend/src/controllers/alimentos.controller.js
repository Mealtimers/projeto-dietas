const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { grupoId } = req.query;
    const where = grupoId ? { grupoId } : {};
    const alimentos = await prisma.alimentoBase.findMany({
      where,
      orderBy: { nome: 'asc' },
      include: {
        grupo: { select: { id: true, nome: true } },
        preparos: { where: { ativo: true }, orderBy: { nome: 'asc' } },
      },
    });
    res.json(alimentos);
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alimento = await prisma.alimentoBase.findUnique({
      where: { id },
      include: {
        grupo: true,
        preparos: { orderBy: { nome: 'asc' } },
      },
    });
    if (!alimento) {
      return res.status(404).json({ error: 'Alimento não encontrado.' });
    }
    res.json(alimento);
  } catch (err) {
    next(err);
  }
};

const criar = async (req, res, next) => {
  try {
    const { nome, grupoId, ativo, carboidratosPor100g } = req.body;
    if (!nome || !grupoId) {
      return res.status(400).json({ error: 'Nome e grupoId são obrigatórios.' });
    }
    const alimento = await prisma.alimentoBase.create({
      data: {
        nome,
        grupoId,
        ativo: ativo !== undefined ? ativo : true,
        carboidratosPor100g: carboidratosPor100g != null ? parseFloat(carboidratosPor100g) : null,
      },
      include: { grupo: { select: { id: true, nome: true } } },
    });
    res.status(201).json(alimento);
  } catch (err) {
    next(err);
  }
};

const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, grupoId, ativo, carboidratosPor100g } = req.body;
    const data = { nome, grupoId, ativo };
    if (carboidratosPor100g !== undefined) {
      data.carboidratosPor100g = carboidratosPor100g != null ? parseFloat(carboidratosPor100g) : null;
    }
    const alimento = await prisma.alimentoBase.update({
      where: { id },
      data,
      include: { grupo: { select: { id: true, nome: true } } },
    });
    res.json(alimento);
  } catch (err) {
    next(err);
  }
};

const deletar = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.alimentoBase.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

const adicionarPreparo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nome, descricao, ativo } = req.body;
    if (!nome) {
      return res.status(400).json({ error: 'Nome do preparo é obrigatório.' });
    }
    const preparo = await prisma.preparoAlimento.create({
      data: {
        alimentoId: id,
        nome,
        descricao,
        ativo: ativo !== undefined ? ativo : true,
      },
    });
    res.status(201).json(preparo);
  } catch (err) {
    next(err);
  }
};

const atualizarPreparo = async (req, res, next) => {
  try {
    const { preparoId } = req.params;
    const { nome, descricao, ativo } = req.body;
    const preparo = await prisma.preparoAlimento.update({
      where: { id: preparoId },
      data: { nome, descricao, ativo },
    });
    res.json(preparo);
  } catch (err) {
    next(err);
  }
};

const deletarPreparo = async (req, res, next) => {
  try {
    const { preparoId } = req.params;
    await prisma.preparoAlimento.delete({ where: { id: preparoId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  deletar,
  adicionarPreparo,
  atualizarPreparo,
  deletarPreparo,
};
