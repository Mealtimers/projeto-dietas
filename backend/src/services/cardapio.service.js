'use strict';

/**
 * Motor de geração de cardápio — Meal Time
 *
 * Pools vêm exclusivamente dos itensPermitidos do pedido.
 * Carboidrato, Leguminosa e Legume são todos opcionais.
 *
 * Algoritmo:
 *   - particionarComLimite(n, max): sublotes respeitando teto real
 *   - intercalarBases(bases): flatten interleaved para diversidade de fonte
 *   - Cycling simples com dedup completo (prot+carb+leg+veg)
 *   - Offset por versão e bloco garante V1 ≠ V2
 */

const prisma = require('../lib/prisma');

// ─── Ponto de entrada ────────────────────────────────────────────────────────

async function gerarCardapio(pedidoId) {
  const pedido = await carregarPedido(pedidoId);
  validarPedido(pedido);

  const ultimoNumero = pedido.versoes[0]?.numero ?? 0;
  const novoNumero   = ultimoNumero + 1;
  const { maxRepeticoes } = pedido;

  const carbOpcoes = await montarOpcoesCarboidrato(pedido.itensPermitidos);
  const legOpcoes  = montarOpcoesSimples(pedido.itensPermitidos, 'Leguminosa');
  const vegOpcoes  = montarOpcoesSimples(pedido.itensPermitidos, 'Legume');

  const todosLotes = [];
  for (let blocoIdx = 0; blocoIdx < pedido.proteinas.length; blocoIdx++) {
    const proteina = pedido.proteinas[blocoIdx];
    const lotes = gerarLotesProteina(
      proteina, carbOpcoes, legOpcoes, vegOpcoes,
      blocoIdx, novoNumero, maxRepeticoes,
    );
    todosLotes.push(...lotes);
  }

  if (todosLotes.length === 0)
    throw new Error('Não foi possível gerar nenhum lote. Verifique proteínas e itens permitidos do pedido.');

  await persistirVersao(pedidoId, novoNumero, todosLotes);
  return { versaoNumero: novoNumero, totalLotes: todosLotes.length, totalPratos: pedido.totalPratos };
}

// ─── Particionamento ──────────────────────────────────────────────────────────

/**
 * Divide `n` pratos em sublotes, cada um com no máximo `maxRepeticoes`.
 * Permite lote de 1 quando inevitável.
 *
 * Exemplos:
 *   5/max3 → [3,2]   5/max2 → [2,2,1]
 *   6/max3 → [3,3]   7/max3 → [3,2,2]   8/max2 → [2,2,2,2]
 */
function particionarComLimite(n, maxRepeticoes) {
  if (n <= 0) return [];
  if (n <= maxRepeticoes) return [n];
  const numBlocos = Math.ceil(n / maxRepeticoes);
  const base      = Math.floor(n / numBlocos);
  const extra     = n % numBlocos;
  // blocos com extra recebem base+1, demais recebem base
  return Array.from({ length: numBlocos }, (_, i) => (i < extra ? base + 1 : base));
}

// ─── Geração de combos por proteína ──────────────────────────────────────────

function gerarLotesProteina(proteina, carbOpcoes, legOpcoes, vegOpcoes, blocoIdx, versaoNumero, maxLote) {
  const preparos = proteina.alimentoBase.preparos;
  if (preparos.length === 0) return [];

  const sublotes = particionarComLimite(proteina.quantidadePratos, maxLote);
  const N = sublotes.length;

  const nProt = preparos.length;
  const nCarb = carbOpcoes.length;
  const nLeg  = legOpcoes.length;
  const nVeg  = vegOpcoes.length;

  // Offset por bloco e versão → diversidade entre proteínas e entre V1/V2
  const PRIMO_A = 37, PRIMO_B = 53;
  const offset  = blocoIdx * PRIMO_A + (versaoNumero - 1) * PRIMO_B;

  const usados = new Set();
  const combos = [];

  for (let t = 0; combos.length < N && t < N * 2000; t++) {
    const i = offset + t;

    const prep = preparos[i % nProt];
    const carb = nCarb > 0 ? carbOpcoes[i % nCarb] : null;
    const leg  = nLeg  > 0 ? legOpcoes[i % nLeg]   : null;
    const veg  = nVeg  > 0 ? vegOpcoes[i % nVeg]   : null;

    // Dedup completo: prot + carb (base+preparo) + leg (base+preparo) + veg (base+preparo)
    const chave = [
      prep.id,
      carb?.baseId ?? '', carb?.preparo.id ?? '',
      leg?.baseId  ?? '', leg?.preparo.id  ?? '',
      veg?.baseId  ?? '', veg?.preparo.id  ?? '',
    ].join('|');

    if (!usados.has(chave)) {
      usados.add(chave);
      const itens = [{ preparoId: prep.id, gramagem: proteina.gramagem, grupoNome: 'Proteína' }];
      if (carb) itens.push({ preparoId: carb.preparo.id, gramagem: carb.gramagem, grupoNome: 'Carboidrato' });
      if (leg)  itens.push({ preparoId: leg.preparo.id,  gramagem: leg.gramagem,  grupoNome: 'Leguminosa' });
      if (veg)  itens.push({ preparoId: veg.preparo.id,  gramagem: veg.gramagem,  grupoNome: 'Legume' });
      combos.push(itens);
    }
  }

  // Fallback se combinações únicas insuficientes
  while (combos.length < N) combos.push(combos[(combos.length - 1) % Math.max(combos.length, 1)]);

  return sublotes.map((quantidade, i) => ({ quantidade, itens: combos[i] }));
}

// ─── Montagem de pools ────────────────────────────────────────────────────────

/**
 * Intercala preparos por base: [b0p0, b1p0, b2p0, b0p1, b1p1, ...]
 * Garante que índices consecutivos alternam FONTE antes de repetir preparo.
 * Cada elemento: { preparo, gramagem, baseId }
 */
function intercalarBases(bases) {
  if (!bases || bases.length === 0) return [];
  const maxP = Math.max(...bases.map((b) => b.preparos.length));
  const result = [];
  for (let p = 0; p < maxP; p++) {
    for (const base of bases) {
      if (p < base.preparos.length) {
        result.push({ ...base.preparos[p], baseId: base.baseId });
      }
    }
  }
  return result;
}

async function montarOpcoesCarboidrato(itensPermitidos) {
  const itens = itensPermitidos.filter((i) => i.grupoNome === 'Carboidrato');
  if (itens.length === 0) return [];

  const bases = [];

  for (const item of itens) {
    const preparos = item.alimentoBase.preparos
      .filter((p) => p.ativo)
      .map((p) => ({ preparo: p, gramagem: item.gramagemBase }));
    if (preparos.length > 0)
      bases.push({ baseId: item.alimentoBaseId, preparos });

    const equivs = await prisma.equivalenciaAlimento.findMany({
      where: { alimentoOrigemId: item.alimentoBaseId },
      include: { alimentoDestino: { include: { preparos: { where: { ativo: true } } } } },
    });
    for (const eq of equivs) {
      if (!eq.alimentoDestino.ativo) continue;
      const gram  = parseFloat((item.gramagemBase * eq.fator).toFixed(1));
      const preps = eq.alimentoDestino.preparos.map((p) => ({ preparo: p, gramagem: gram }));
      if (preps.length > 0) bases.push({ baseId: eq.alimentoDestinoId, preparos: preps });
    }
  }

  // Dedup por baseId (um mesmo equivalente pode surgir de múltiplos itens)
  const seen = new Set();
  const deduped = bases.filter(({ baseId }) => (seen.has(baseId) ? false : seen.add(baseId)));
  return intercalarBases(deduped);
}

function montarOpcoesSimples(itensPermitidos, grupoNome) {
  const bases = itensPermitidos
    .filter((i) => i.grupoNome === grupoNome)
    .map((item) => ({
      baseId: item.alimentoBaseId,
      preparos: item.alimentoBase.preparos
        .filter((p) => p.ativo)
        .map((p) => ({ preparo: p, gramagem: item.gramagemBase })),
    }))
    .filter((b) => b.preparos.length > 0);
  return intercalarBases(bases);
}

// ─── Persistência ─────────────────────────────────────────────────────────────

async function persistirVersao(pedidoId, numero, lotes) {
  await prisma.$transaction(async (tx) => {
    await tx.cardapioVersao.updateMany({ where: { pedidoId, ativo: true }, data: { ativo: false } });
    const versao = await tx.cardapioVersao.create({ data: { pedidoId, numero, ativo: true } });
    for (const lote of lotes) {
      const loteCreado = await tx.loteCardapio.create({ data: { versaoId: versao.id, quantidade: lote.quantidade } });
      await tx.itemLote.createMany({ data: lote.itens.map((item) => ({ loteId: loteCreado.id, ...item })) });
    }
    await tx.pedidoDieta.update({ where: { id: pedidoId }, data: { status: 'GERADO' } });
  });
}

// ─── Carregamento e validação ──────────────────────────────────────────────────

async function carregarPedido(pedidoId) {
  return prisma.pedidoDieta.findUnique({
    where: { id: pedidoId },
    include: {
      proteinas: {
        include: { alimentoBase: { include: { preparos: { where: { ativo: true } } } } },
        orderBy: { quantidadePratos: 'desc' },
      },
      itensPermitidos: {
        include: { alimentoBase: { include: { preparos: { where: { ativo: true } } } } },
      },
      versoes: { orderBy: { numero: 'desc' }, take: 1 },
    },
  });
}

function validarPedido(pedido) {
  if (!pedido) throw new Error('Pedido não encontrado.');
  if (!pedido.proteinas.length) throw new Error('Pedido não possui proteínas definidas.');
  if (pedido.totalPratos < 5) throw new Error('Pedido deve ter no mínimo 5 pratos.');
  const soma = pedido.proteinas.reduce((s, p) => s + p.quantidadePratos, 0);
  if (soma !== pedido.totalPratos)
    throw new Error(`Soma das proteínas (${soma}) ≠ totalPratos (${pedido.totalPratos}).`);
}

module.exports = { gerarCardapio };
