// Backfill: lê todos os clientes/pedidos/ordens do Postgres do Gerador
// e empurra pro Supabase. Idempotente.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... node scripts/backfill-supabase.js
//
// Roda contra o mesmo DATABASE_URL do app.

const prisma = require('../src/lib/prisma');
const {
  publishPedido,
  publishOrdemProducao,
  publishCliente,
} = require('../src/lib/supabasePublisher');
const { isConfigured } = require('../src/lib/supabaseClient');

async function main() {
  if (!isConfigured()) {
    console.error('[backfill] SUPABASE_URL/SUPABASE_SERVICE_KEY não configurados.');
    process.exit(1);
  }

  // 1) Clientes
  const clientes = await prisma.cliente.findMany({ select: { id: true } });
  console.log(`[backfill] ${clientes.length} cliente(s)`);
  for (const c of clientes) {
    const r = await publishCliente(prisma, c.id);
    if (!r.ok && !r.skipped) console.warn('  cliente', c.id, r.error);
  }

  // 2) Pedidos (já espelha versoes e cliente também)
  const pedidos = await prisma.pedidoDieta.findMany({ select: { id: true } });
  console.log(`[backfill] ${pedidos.length} pedido(s)`);
  for (const p of pedidos) {
    const r = await publishPedido(prisma, p.id);
    if (!r.ok && !r.skipped) console.warn('  pedido', p.id, r.error);
  }

  // 3) Ordens de produção
  const ordens = await prisma.ordemProducao.findMany({ select: { id: true } });
  console.log(`[backfill] ${ordens.length} ordem(ns) de produção`);
  for (const o of ordens) {
    const r = await publishOrdemProducao(prisma, o.id);
    if (!r.ok && !r.skipped) console.warn('  ordem', o.id, r.error);
  }

  console.log('[backfill] OK');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('[backfill] FALHOU:', err);
  try { await prisma.$disconnect(); } catch {}
  process.exit(1);
});
