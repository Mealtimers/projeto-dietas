'use strict';

const prisma = require('../lib/prisma');

const GRUPO_ORDER = ['Proteína', 'Carboidrato', 'Leguminosa', 'Legumes', 'Molho'];

async function gerarOrdem(pedidoId) {
  const versaoAtiva = await prisma.cardapioVersao.findFirst({
    where: { pedidoId, ativo: true },
    include: {
      lotes: {
        orderBy: { quantidade: 'desc' },
        include: {
          itens: {
            include: {
              preparo: {
                include: { alimento: { include: { grupo: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: { numero: 'desc' },
  });

  if (!versaoAtiva || versaoAtiva.lotes.length === 0)
    throw new Error('Nenhuma versão de cardápio ativa encontrada. Gere o cardápio primeiro.');

  // ── A) Consolidado de Cozinha ──────────────────────────────────────────────
  const acc = {};
  for (const lote of versaoAtiva.lotes) {
    for (const item of lote.itens) {
      const key = item.preparoId;
      if (!acc[key]) {
        acc[key] = {
          preparoId:    key,
          preparo:      item.preparo.nome,
          alimento:     item.preparo.alimento.nome,
          grupo:        item.preparo.alimento.grupo.nome,
          gramagem:     item.gramagem,
          totalPratos:  0,
          totalGramas:  0,
        };
      }
      acc[key].totalPratos += lote.quantidade;
      acc[key].totalGramas  = parseFloat((acc[key].totalGramas + lote.quantidade * item.gramagem).toFixed(1));
    }
  }

  const consolidadoCozinha = Object.values(acc).sort((a, b) => {
    const ia = GRUPO_ORDER.indexOf(a.grupo), ib = GRUPO_ORDER.indexOf(b.grupo);
    if (ia !== ib) return ia - ib;
    return a.alimento.localeCompare(b.alimento);
  });

  // ── B) Mapa de Montagem ────────────────────────────────────────────────────
  const mapaMontagem = versaoAtiva.lotes.map((lote) => {
    const itensOrdenados = [...lote.itens].sort((a, b) => {
      const oa = GRUPO_ORDER.indexOf(a.grupoNome);
      const ob = GRUPO_ORDER.indexOf(b.grupoNome);
      return oa - ob;
    });
    return {
      quantidade: lote.quantidade,
      itens: itensOrdenados.map((item) => ({
        grupoNome:  item.grupoNome,
        preparo:    item.preparo.nome,
        alimento:   item.preparo.alimento.nome,
        gramagem:   item.gramagem,
        nomeManual: item.nomeManual || null,
        obs:        item.obs        || null,
      })),
    };
  });

  const totalPratos = versaoAtiva.lotes.reduce((s, l) => s + l.quantidade, 0);

  const itensConsolidados = {
    versaoNumero:     versaoAtiva.numero,
    geradoEm:         new Date().toISOString(),
    totalPratos,
    consolidadoCozinha,
    mapaMontagem,
  };

  // Atomic: revalida status + cria ordem + atualiza pedido em uma única transação,
  // protegendo contra duplo clique e contra mudança de status concorrente.
  const ordem = await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedidoDieta.findUnique({
      where: { id: pedidoId },
      select: { status: true },
    });
    if (!pedido) throw new Error('Pedido não encontrado.');
    if (pedido.status !== 'APROVADO')
      throw new Error(`Apenas pedidos com status APROVADO podem gerar ordem de produção. Status atual: "${pedido.status}".`);

    const existente = await tx.ordemProducao.findUnique({ where: { pedidoId } });
    if (existente) {
      const err = new Error('Já existe uma ordem de produção para este pedido.');
      err.code = 'ORDEM_DUPLICADA';
      err.ordem = existente;
      throw err;
    }

    const criada = await tx.ordemProducao.create({
      data: { pedidoId, itensConsolidados },
    });
    await tx.pedidoDieta.update({
      where: { id: pedidoId },
      data: { status: 'EM_PRODUCAO' },
    });
    return criada;
  }, { isolationLevel: 'Serializable' });

  return ordem;
}

module.exports = { gerarOrdem };
