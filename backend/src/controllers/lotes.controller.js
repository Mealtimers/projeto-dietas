'use strict';

const prisma = require('../lib/prisma');

// GET /api/lotes/molhos - retorna todos preparos do grupo Molho
const listarMolhos = async (req, res, next) => {
  try {
    const grupo = await prisma.grupoAlimentar.findFirst({ where: { nome: 'Molho' } });
    if (!grupo) return res.json([]);
    const alimentos = await prisma.alimentoBase.findMany({
      where: { grupoId: grupo.id, ativo: true },
      include: { preparos: { where: { ativo: true }, orderBy: { nome: 'asc' } } },
      orderBy: { nome: 'asc' },
    });
    res.json(alimentos);
  } catch (err) {
    next(err);
  }
};

// PUT /api/lotes/:loteId/itens/:itemId - atualiza item (edição manual: nome, gramagem, obs)
const atualizarItem = async (req, res, next) => {
  try {
    const { loteId, itemId } = req.params;
    const { nomeManual, gramagem, obs } = req.body;

    const item = await prisma.itemLote.findFirst({ where: { id: itemId, loteId } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    const updated = await prisma.itemLote.update({
      where: { id: itemId },
      data: {
        nomeManual: nomeManual !== undefined ? (nomeManual?.trim() || null) : item.nomeManual,
        gramagem:   gramagem   != null       ? parseFloat(gramagem)         : item.gramagem,
        obs:        obs        !== undefined ? (obs?.trim() || null)        : item.obs,
      },
      include: { preparo: { include: { alimento: { include: { grupo: true } } } } },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// POST /api/lotes/:loteId/molho - adiciona molho a um lote
const adicionarMolho = async (req, res, next) => {
  try {
    const { loteId } = req.params;
    const { preparoId } = req.body;

    const lote = await prisma.loteCardapio.findUnique({ where: { id: loteId } });
    if (!lote) return res.status(404).json({ error: 'Lote não encontrado.' });

    const preparo = await prisma.preparoAlimento.findUnique({ where: { id: preparoId } });
    if (!preparo) return res.status(404).json({ error: 'Preparo não encontrado.' });

    const existente = await prisma.itemLote.findFirst({
      where: { loteId, preparoId, grupoNome: 'Molho' },
    });
    if (existente) return res.status(400).json({ error: 'Este molho já foi adicionado a este lote.' });

    const item = await prisma.itemLote.create({
      data: { loteId, preparoId, gramagem: 0, grupoNome: 'Molho' },
      include: { preparo: { include: { alimento: true } } },
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lotes/:loteId/itens/:itemId - remove item de molho
const removerItem = async (req, res, next) => {
  try {
    const { loteId, itemId } = req.params;
    const item = await prisma.itemLote.findFirst({ where: { id: itemId, loteId } });
    if (!item) return res.status(404).json({ error: 'Item não encontrado.' });

    if (item.grupoNome !== 'Molho') {
      return res.status(400).json({ error: 'Apenas itens de molho podem ser removidos.' });
    }

    await prisma.itemLote.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

module.exports = { listarMolhos, atualizarItem, adicionarMolho, removerItem };
