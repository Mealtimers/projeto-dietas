'use strict';

const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/solicitacoes.controller');
const prisma  = require('../lib/prisma');

// POST /api/portal/solicitar — público, sem auth
router.post('/solicitar', ctrl.criar);

// GET /api/portal/opcoes — retorna alimentos/grupos para o formulário (público)
router.get('/opcoes', async (req, res, next) => {
  try {
    const grupos = await prisma.grupoAlimentar.findMany({
      include: {
        alimentos: {
          where: { ativo: true },
          select: { id: true, nome: true },
          orderBy: { nome: 'asc' },
        },
      },
      orderBy: { ordem: 'asc' },
    });
    res.json(grupos);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
