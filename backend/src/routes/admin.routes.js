'use strict';

// Rotas admin protegidas (já passam pelo middleware auth global em /api).
// Backfill empurra Clientes/PedidosDieta/OrdemProducao do Postgres pro Supabase.

const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const {
  publishCliente,
  publishPedido,
  publishOrdemProducao,
} = require('../lib/supabasePublisher');
const { isConfigured } = require('../lib/supabaseClient');

router.post('/supabase-backfill', async (req, res, next) => {
  try {
    if (!isConfigured()) {
      return res.status(503).json({ ok: false, error: 'Supabase não configurado' });
    }
    const summary = { ok: true, clientes: 0, pedidos: 0, ordens: 0, errors: [] };

    const clientes = await prisma.cliente.findMany({ select: { id: true } });
    for (const c of clientes) {
      const r = await publishCliente(prisma, c.id);
      if (r.ok) summary.clientes++;
      else if (!r.skipped) summary.errors.push({ cliente: c.id, error: r.error });
    }

    const pedidos = await prisma.pedidoDieta.findMany({ select: { id: true } });
    for (const p of pedidos) {
      const r = await publishPedido(prisma, p.id);
      if (r.ok) summary.pedidos++;
      else if (!r.skipped) summary.errors.push({ pedido: p.id, error: r.error });
    }

    const ordens = await prisma.ordemProducao.findMany({ select: { id: true } });
    for (const o of ordens) {
      const r = await publishOrdemProducao(prisma, o.id);
      if (r.ok) summary.ordens++;
      else if (!r.skipped) summary.errors.push({ ordem: o.id, error: r.error });
    }

    res.json(summary);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
