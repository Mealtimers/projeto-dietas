'use strict';

/**
 * Motor de geração de cardápio — Meal Time
 *
 * Proteína: escolhida pelo usuário (alimento base + gramagem + qtd pratos).
 * Carboidrato / Leguminosa / Legume: o usuário seleciona preparos específicos.
 *   Cada grupo tem uma gramagem de referência.
 *   Para carboidratos: gramagem ajustada proporcionalmente usando carbs/100g (TACO),
 *     tendo Arroz Branco (28.1g/100g) como referência fixa.
 *   O algoritmo diversifica APENAS entre os preparos selecionados no pedido.
 */

const prisma = require('../lib/prisma');

// Referência fixa de carboidratos — Arroz Branco cozido (Tabela TACO/IBGE)
const ARROZ_BRANCO_CARBS_POR_100G = 28.1;

// ─── Ponto de entrada ────────────────────────────────────────────────────────

async function gerarCardapio(pedidoId) {
  const pedido = await carregarPedido(pedidoId);
  validarPedido(pedido);

  const ultimoNumero = pedido.versoes[0]?.numero ?? 0;
  const novoNumero   = ultimoNumero + 1;
  const { maxRepeticoes } = pedido;

  const carbOpcoes = montarOpcoesCarboidrato(pedido.itensPermitidos);
  const legOpcoes  = montarOpcoesSimples(pedido.itensPermitidos, 'Leguminosa');
  const vegOpcoes  = montarOpcoesSimples(pedido.itensPermitidos, 'Legumes');

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

function particionarComLimite(n, maxRepeticoes) {
  if (n <= 0) return [];
  if (n <= maxRepeticoes) return [n];
  const numBlocos = Math.ceil(n / maxRepeticoes);
  const base      = Math.floor(n / numBlocos);
  const extra     = n % numBlocos;
  return Array.from({ length: numBlocos }, (_, i) => (i < extra ? base + 1 : base));
}

// ─── Geração de combos por proteína ──────────────────────────────────────────

function gerarLotesProteina(proteina, carbOpcoes, legOpcoes, vegOpcoes, blocoIdx, versaoNumero, maxLote) {
  let preparos = proteina.alimentoBase.preparos;
  if (proteina.preparosIds && proteina.preparosIds.length > 0) {
    const allowed = new Set(proteina.preparosIds);
    preparos = preparos.filter((p) => allowed.has(p.id));
  }
  if (preparos.length === 0) return [];

  const sublotes = particionarComLimite(proteina.quantidadePratos, maxLote);
  const N = sublotes.length;

  const nProt = preparos.length;
  const nCarb = carbOpcoes.length;
  const nLeg  = legOpcoes.length;
  const nVeg  = vegOpcoes.length;

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

    const chave = [
      prep.id,
      carb?.preparoId ?? '',
      leg?.preparoId  ?? '',
      veg?.preparoId  ?? '',
    ].join('|');

    if (!usados.has(chave)) {
      usados.add(chave);
      const itens = [{ preparoId: prep.id, gramagem: proteina.gramagem, grupoNome: 'Proteína' }];
      if (carb) itens.push({ preparoId: carb.preparoId, gramagem: carb.gramagem, grupoNome: 'Carboidrato' });
      if (leg)  itens.push({ preparoId: leg.preparoId,  gramagem: leg.gramagem,  grupoNome: 'Leguminosa' });
      if (veg)  itens.push({ preparoId: veg.preparoId,  gramagem: veg.gramagem,  grupoNome: 'Legumes' });
      combos.push(itens);
    }
  }

  while (combos.length < N) combos.push(combos[(combos.length - 1) % Math.max(combos.length, 1)]);

  return sublotes.map((quantidade, i) => ({ quantidade, itens: combos[i] }));
}

// ─── Montagem de pools ────────────────────────────────────────────────────────

/**
 * Intercala preparos por alimento base: [a0p0, a1p0, a2p0, a0p1, ...]
 * Cada elemento: { preparoId, gramagem, alimentoId }
 */
function intercalarPreparos(grupos) {
  if (!grupos || grupos.length === 0) return [];
  const maxP = Math.max(...grupos.map((g) => g.preparos.length));
  const result = [];
  for (let p = 0; p < maxP; p++) {
    for (const grupo of grupos) {
      if (p < grupo.preparos.length) result.push(grupo.preparos[p]);
    }
  }
  return result;
}

/**
 * Pool de carboidratos.
 * Gramagem ajustada por tabela TACO — referência fixa: Arroz Branco (28.1g carbs/100g).
 *   targetCarbs = gramagemRef × 28.1 / 100
 *   gramagem_preparo = targetCarbs × 100 / carbs_alimento (se disponível)
 */
function montarOpcoesCarboidrato(itensPermitidos) {
  const itens = itensPermitidos.filter((i) => i.grupoNome === 'Carboidrato');
  if (itens.length === 0) return [];

  const gramagemRef = itens[0].gramagemBase;
  const targetCarbs = parseFloat((gramagemRef * ARROZ_BRANCO_CARBS_POR_100G / 100).toFixed(2));

  // Agrupa por alimento para interleaving
  const porAlimento = new Map();
  for (const item of itens) {
    const alimento   = item.preparo.alimento;
    const carbsItem  = alimento.carboidratosPor100g;
    const gramagem   = (carbsItem && carbsItem > 0)
      ? parseFloat((targetCarbs * 100 / carbsItem).toFixed(1))
      : gramagemRef;

    if (!porAlimento.has(alimento.id)) porAlimento.set(alimento.id, []);
    porAlimento.get(alimento.id).push({ preparoId: item.preparoId, gramagem, alimentoId: alimento.id });
  }

  const grupos = Array.from(porAlimento.values()).map((preparos) => ({ preparos }));
  return intercalarPreparos(grupos);
}

/**
 * Pool de Leguminosa ou Legume.
 * Usa a gramagem definida no pedido diretamente para todos os preparos.
 */
function montarOpcoesSimples(itensPermitidos, grupoNome) {
  const itens = itensPermitidos.filter((i) => i.grupoNome === grupoNome);
  if (itens.length === 0) return [];

  const porAlimento = new Map();
  for (const item of itens) {
    const alimentoId = item.preparo.alimentoId;
    if (!porAlimento.has(alimentoId)) porAlimento.set(alimentoId, []);
    porAlimento.get(alimentoId).push({ preparoId: item.preparoId, gramagem: item.gramagemBase, alimentoId });
  }

  const grupos = Array.from(porAlimento.values()).map((preparos) => ({ preparos }));
  return intercalarPreparos(grupos);
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
        include: {
          preparo: {
            include: { alimento: { select: { id: true, nome: true, carboidratosPor100g: true } } },
          },
        },
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
