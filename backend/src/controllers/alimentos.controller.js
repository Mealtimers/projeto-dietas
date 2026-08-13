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
    const force = req.query.force === 'true';

    // Conta uso via preparos deste alimento
    const preparos = await prisma.preparoAlimento.findMany({ where: { alimentoId: id }, select: { id: true } });
    const preparoIds = preparos.map((p) => p.id);
    const [lotes, itensPermitidos, proteinasPedido] = await Promise.all([
      preparoIds.length ? prisma.itemLote.count({ where: { preparoId: { in: preparoIds } } }) : 0,
      preparoIds.length ? prisma.pedidoItemPermitido.count({ where: { preparoId: { in: preparoIds } } }) : 0,
      prisma.pedidoProteina.count({ where: { alimentoBaseId: id } }),
    ]);
    const emUso = lotes + itensPermitidos + proteinasPedido;

    if (emUso > 0 && !force) {
      return res.status(409).json({
        error: 'Alimento em uso — não pode ser excluído diretamente.',
        codigo: 'IN_USE',
        uso: { lotes, itensPermitidos, proteinasPedido, preparos: preparoIds.length },
        sugestao: 'Use Desativar (preserva histórico) ou reenvie com ?force=true (apaga registros de histórico).',
      });
    }

    if (force) {
      // Ordem: dependentes primeiro
      await prisma.$transaction([
        prisma.itemLote.deleteMany({ where: { preparoId: { in: preparoIds } } }),
        prisma.pedidoItemPermitido.deleteMany({ where: { preparoId: { in: preparoIds } } }),
        prisma.pedidoProteina.deleteMany({ where: { alimentoBaseId: id } }),
        prisma.alimentoBase.delete({ where: { id } }), // cascade nos preparos
      ]);
    } else {
      await prisma.alimentoBase.delete({ where: { id } });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Alimento não encontrado.' });
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
    const force = req.query.force === 'true';

    // Conta uso em histórico
    const [lotes, pedidos] = await Promise.all([
      prisma.itemLote.count({ where: { preparoId } }),
      prisma.pedidoItemPermitido.count({ where: { preparoId } }),
    ]);

    if ((lotes > 0 || pedidos > 0) && !force) {
      return res.status(409).json({
        error: 'Preparo em uso — não pode ser excluído diretamente.',
        codigo: 'IN_USE',
        uso: { lotes, pedidos },
        sugestao: 'Use Desativar (preserva histórico) ou reenvie com ?force=true (apaga registros de histórico).',
      });
    }

    // Se force=true, apaga referências primeiro
    if (force) {
      await prisma.$transaction([
        prisma.itemLote.deleteMany({ where: { preparoId } }),
        prisma.pedidoItemPermitido.deleteMany({ where: { preparoId } }),
        prisma.preparoAlimento.delete({ where: { id: preparoId } }),
      ]);
    } else {
      await prisma.preparoAlimento.delete({ where: { id: preparoId } });
    }
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Preparo não encontrado.' });
    next(err);
  }
};

// PUT /api/alimentos/preparos/:preparoId/mealcontrol-link
// body: { recipeId: number, recipeName: string, isRepresentative?: boolean }
const vincularMealcontrol = async (req, res, next) => {
  try {
    const { preparoId } = req.params;
    const { recipeId, recipeName, isRepresentative } = req.body || {};
    if (!Number.isInteger(recipeId) || recipeId <= 0)
      return res.status(400).json({ error: 'recipeId inválido (esperado inteiro positivo).' });
    if (typeof recipeName !== 'string' || !recipeName.trim())
      return res.status(400).json({ error: 'recipeName é obrigatório.' });

    const preparo = await prisma.preparoAlimento.update({
      where: { id: preparoId },
      data: {
        mealcontrolRecipeId:         recipeId,
        mealcontrolRecipeName:       recipeName.trim(),
        mealcontrolIsRepresentative: Boolean(isRepresentative),
        mealcontrolLinkedAt:         new Date(),
      },
    });
    res.json(preparo);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Preparo não encontrado.' });
    next(err);
  }
};

// DELETE /api/alimentos/preparos/:preparoId/mealcontrol-link
const desvincularMealcontrol = async (req, res, next) => {
  try {
    const { preparoId } = req.params;
    const preparo = await prisma.preparoAlimento.update({
      where: { id: preparoId },
      data: {
        mealcontrolRecipeId:         null,
        mealcontrolRecipeName:       null,
        mealcontrolIsRepresentative: false,
        mealcontrolLinkedAt:         null,
      },
    });
    res.json(preparo);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Preparo não encontrado.' });
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
  vincularMealcontrol,
  desvincularMealcontrol,
};
