// Publisher: espelha Pedidos, OrdensProducao e Clientes no Supabase.
// Fire-and-forget: erros são logados, nunca derrubam a operação principal.
//
// Uso típico (chamado pelo middleware Prisma e pelo backfill):
//   await publishPedido(prisma, pedidoId);
//   await publishOrdemProducao(prisma, ordemId);
//   await publishCliente(prisma, clienteId);

const sb = require('./supabaseClient');

function digitsOnly(v) {
  return String(v || '').replace(/\D/g, '');
}

// ─────────────────────────────────────────────────────────────────
// Mapeadores Prisma → Supabase
// ─────────────────────────────────────────────────────────────────

function mapClienteRow(cliente) {
  return {
    cpf_cnpj: null, // o schema Prisma não tem CPF; ligar pelo dieta_id mesmo.
    name: cliente.nome,
    whatsapp: cliente.telefone || null,
    email: cliente.email || null,
    person_type: 'F',
    dieta_id: cliente.id,
    raw: cliente,
  };
}

function mapPedidoRow(pedido, customerSupabaseId) {
  return {
    prisma_id: pedido.id,
    customer_id: customerSupabaseId || null,
    status: pedido.status,
    total_pratos: pedido.totalPratos,
    max_repeticoes: pedido.maxRepeticoes,
    raw: pedido,
    created_at: pedido.createdAt,
    synced_at: new Date().toISOString(),
  };
}

function mapOrdemRow(ordem, pedidoSupabaseId) {
  return {
    prisma_id: ordem.id,
    pedido_id: pedidoSupabaseId || null,
    status: ordem.status,
    itens_consolidados: ordem.itensConsolidados || null,
    raw: ordem,
    created_at: ordem.createdAt,
    synced_at: new Date().toISOString(),
  };
}

function mapVersaoRow(versao, pedidoSupabaseId) {
  return {
    prisma_id: versao.id,
    pedido_id: pedidoSupabaseId || null,
    versao: versao.numero,
    lote: versao.lotes || null,
    raw: versao,
    created_at: versao.criadoEm,
    synced_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────
// Helpers de id no Supabase
// ─────────────────────────────────────────────────────────────────

async function getCustomerSupabaseId(dietaId) {
  if (!dietaId) return null;
  const rows = await sb.select(
    'core.customers',
    'select=id&dieta_id=eq.' + encodeURIComponent(dietaId) + '&limit=1'
  );
  return Array.isArray(rows) && rows[0] ? rows[0].id : null;
}

async function getPedidoSupabaseId(prismaId) {
  if (!prismaId) return null;
  const rows = await sb.select(
    'dieta.pedidos',
    'select=id&prisma_id=eq.' + encodeURIComponent(prismaId) + '&limit=1'
  );
  return Array.isArray(rows) && rows[0] ? rows[0].id : null;
}

// ─────────────────────────────────────────────────────────────────
// Publishers
// ─────────────────────────────────────────────────────────────────

async function publishCliente(prisma, clienteId) {
  if (!sb.isConfigured()) return { skipped: true };
  try {
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) return { ok: false, error: 'Cliente não encontrado' };
    await sb.upsert('core.customers', [mapClienteRow(cliente)], 'dieta_id');
    return { ok: true };
  } catch (err) {
    console.error('[supabase-publish-cliente]', err.message);
    return { ok: false, error: err.message };
  }
}

async function publishPedido(prisma, pedidoId) {
  if (!sb.isConfigured()) return { skipped: true };
  try {
    const pedido = await prisma.pedidoDieta.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: true,
        proteinas: { include: { alimentoBase: true } },
        itensPermitidos: { include: { preparo: true } },
        versoes: { include: { lotes: { include: { itens: true } } } },
      },
    });
    if (!pedido) return { ok: false, error: 'Pedido não encontrado' };

    // Garantir cliente espelhado primeiro
    if (pedido.cliente) {
      await sb.upsert('core.customers', [mapClienteRow(pedido.cliente)], 'dieta_id');
    }
    const customerSupabaseId = await getCustomerSupabaseId(pedido.clienteId);

    await sb.upsert('dieta.pedidos', [mapPedidoRow(pedido, customerSupabaseId)], 'prisma_id');

    // Versões (lote)
    if (Array.isArray(pedido.versoes) && pedido.versoes.length) {
      const pedidoSupabaseId = await getPedidoSupabaseId(pedido.id);
      const versaoRows = pedido.versoes.map((v) => mapVersaoRow(v, pedidoSupabaseId));
      await sb.upsert('dieta.cardapio_versoes', versaoRows, 'prisma_id');
    }

    return { ok: true };
  } catch (err) {
    console.error('[supabase-publish-pedido]', err.message);
    return { ok: false, error: err.message };
  }
}

async function publishOrdemProducao(prisma, ordemId) {
  if (!sb.isConfigured()) return { skipped: true };
  try {
    const ordem = await prisma.ordemProducao.findUnique({
      where: { id: ordemId },
      include: { pedido: true },
    });
    if (!ordem) return { ok: false, error: 'Ordem não encontrada' };

    // Garantir pedido espelhado primeiro
    if (ordem.pedido) {
      await publishPedido(prisma, ordem.pedidoId);
    }
    const pedidoSupabaseId = await getPedidoSupabaseId(ordem.pedidoId);

    await sb.upsert('dieta.ordens_producao', [mapOrdemRow(ordem, pedidoSupabaseId)], 'prisma_id');
    return { ok: true };
  } catch (err) {
    console.error('[supabase-publish-ordem]', err.message);
    return { ok: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────
// Middleware Prisma — auto-publish
// ─────────────────────────────────────────────────────────────────

// Modelos a observar e qual publisher chamar depois.
const WATCH = {
  PedidoDieta: 'pedido',
  OrdemProducao: 'ordem',
  Cliente: 'cliente',
};

// Aplica $use no PrismaClient. Chamado uma vez no setup.
function attachMiddleware(prisma) {
  if (!prisma || typeof prisma.$use !== 'function') return;

  prisma.$use(async (params, next) => {
    const result = await next(params);
    try {
      const watch = WATCH[params.model];
      if (!watch) return result;
      const action = params.action;
      if (!['create', 'update', 'upsert', 'delete', 'createMany', 'updateMany'].includes(action)) {
        return result;
      }
      // delete: nada a publicar (poderia marcar deletado, fica pra fase 2)
      if (action === 'delete' || action === 'deleteMany') return result;

      // Capturar id do registro
      const id = result?.id;
      if (!id) return result; // updateMany não retorna ids — pula

      // Fire-and-forget
      if (watch === 'pedido') {
        publishPedido(prisma, id).catch((e) => console.error('[publish-pedido]', e.message));
      } else if (watch === 'ordem') {
        publishOrdemProducao(prisma, id).catch((e) => console.error('[publish-ordem]', e.message));
      } else if (watch === 'cliente') {
        publishCliente(prisma, id).catch((e) => console.error('[publish-cliente]', e.message));
      }
    } catch (err) {
      console.error('[supabase-middleware]', err.message);
    }
    return result;
  });
}

module.exports = {
  attachMiddleware,
  publishPedido,
  publishOrdemProducao,
  publishCliente,
};
