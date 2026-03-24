'use strict';

const prisma = require('../lib/prisma');

const listar = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const solicitacoes = await prisma.solicitacaoOrcamento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(solicitacoes);
  } catch (err) {
    next(err);
  }
};

const contar = async (req, res, next) => {
  try {
    const count = await prisma.solicitacaoOrcamento.count({
      where: { status: 'AGUARDANDO' },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

const buscarPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sol = await prisma.solicitacaoOrcamento.findUnique({ where: { id } });
    if (!sol) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    res.json(sol);
  } catch (err) {
    next(err);
  }
};

const atualizarStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validos = ['AGUARDANDO', 'EM_ORCAMENTO', 'ORCAMENTO_ENVIADO', 'APROVADO', 'REPROVADO'];
    if (!validos.includes(status))
      return res.status(400).json({ error: `Status inválido: ${status}` });

    const sol = await prisma.solicitacaoOrcamento.findUnique({ where: { id } });
    if (!sol) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const updated = await prisma.solicitacaoOrcamento.update({
      where: { id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// Rota pública — chamada pelo portal do cliente (sem auth)
const criar = async (req, res, next) => {
  try {
    const {
      nome, email, telefone,
      totalPratos,
      proteinas, carboidrato, leguminosa, legume,
      molhos, observacoes,
    } = req.body;

    if (!nome?.trim())   return res.status(400).json({ error: 'Nome é obrigatório.' });
    if (!email?.trim())  return res.status(400).json({ error: 'E-mail é obrigatório.' });
    if (!totalPratos || totalPratos < 1)
      return res.status(400).json({ error: 'Total de pratos inválido.' });
    if (!proteinas || !Array.isArray(proteinas) || proteinas.length === 0)
      return res.status(400).json({ error: 'Informe ao menos uma proteína.' });

    const sol = await prisma.solicitacaoOrcamento.create({
      data: {
        nome:        nome.trim(),
        email:       email.trim().toLowerCase(),
        telefone:    telefone?.trim() || null,
        totalPratos: parseInt(totalPratos),
        proteinas,
        carboidrato: carboidrato || null,
        leguminosa:  leguminosa  || null,
        legume:      legume      || null,
        molhos:      molhos      || null,
        observacoes: observacoes?.trim() || null,
      },
    });
    res.status(201).json(sol);
  } catch (err) {
    next(err);
  }
};

module.exports = { listar, contar, buscarPorId, atualizarStatus, criar };
