/**
 * restore-seed-original.js
 * Restaura a base alimentar original (dados de exemplo da fase inicial do projeto).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Restaurando base alimentar original...\n');

  // ── Limpeza ──────────────────────────────────────────────────────────────
  await prisma.ordemProducao.deleteMany();
  await prisma.aprovacaoCliente.deleteMany();
  await prisma.itemLote.deleteMany();
  await prisma.loteCardapio.deleteMany();
  await prisma.cardapioVersao.deleteMany();
  await prisma.pedidoItemPermitido.deleteMany();
  await prisma.pedidoProteina.deleteMany();
  await prisma.pedidoDieta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.equivalenciaAlimento.deleteMany();
  await prisma.preparoAlimento.deleteMany();
  await prisma.alimentoBase.deleteMany();
  await prisma.grupoAlimentar.deleteMany();
  console.log('✓ Base limpa.\n');

  // ── 1. Grupos ─────────────────────────────────────────────────────────────
  const grupoProteina    = await prisma.grupoAlimentar.create({ data: { nome: 'Proteína',    descricao: 'Fontes de proteína animal', ordem: 1 } });
  const grupoCarboidrato = await prisma.grupoAlimentar.create({ data: { nome: 'Carboidrato', descricao: 'Fontes de energia complexa', ordem: 2 } });
  const grupoLeguminosa  = await prisma.grupoAlimentar.create({ data: { nome: 'Leguminosa',  descricao: 'Leguminosas e grãos',       ordem: 3 } });
  const grupoLegume      = await prisma.grupoAlimentar.create({ data: { nome: 'Legume',      descricao: 'Legumes e verduras',        ordem: 4 } });

  // ── 2. Alimentos + Preparos ───────────────────────────────────────────────

  // Proteínas
  const frango = await prisma.alimentoBase.create({ data: { nome: 'Frango', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: frango.id, nome: 'Frango Desfiado' },
    { alimentoId: frango.id, nome: 'Frango Grelhado' },
    { alimentoId: frango.id, nome: 'Frango em Cubos' },
    { alimentoId: frango.id, nome: 'Frango Acebolado' },
    { alimentoId: frango.id, nome: 'Strogonoff de Frango' },
    { alimentoId: frango.id, nome: 'Frango ao Molho' },
  ]});

  const carneBovina = await prisma.alimentoBase.create({ data: { nome: 'Carne Bovina', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: carneBovina.id, nome: 'Carne Moída Temperada' },
    { alimentoId: carneBovina.id, nome: 'Carne em Tiras' },
    { alimentoId: carneBovina.id, nome: 'Picadinho de Carne' },
    { alimentoId: carneBovina.id, nome: 'Bife Acebolado' },
  ]});

  const tilapia = await prisma.alimentoBase.create({ data: { nome: 'Tilápia', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: tilapia.id, nome: 'Filé de Tilápia Grelhado' },
    { alimentoId: tilapia.id, nome: 'Filé de Tilápia ao Molho Branco' },
    { alimentoId: tilapia.id, nome: 'Tilápia ao Forno' },
  ]});

  const salmao = await prisma.alimentoBase.create({ data: { nome: 'Salmão', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: salmao.id, nome: 'Salmão Grelhado' },
    { alimentoId: salmao.id, nome: 'Salmão ao Molho de Limão' },
  ]});

  // Carboidratos
  const arrozBranco = await prisma.alimentoBase.create({ data: { nome: 'Arroz Branco', grupoId: grupoCarboidrato.id, carboidratosPor100g: 28.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: arrozBranco.id, nome: 'Arroz Branco Cozido' },
    { alimentoId: arrozBranco.id, nome: 'Arroz à Grega' },
    { alimentoId: arrozBranco.id, nome: 'Arroz com Legumes' },
  ]});

  const arrozIntegral = await prisma.alimentoBase.create({ data: { nome: 'Arroz Integral', grupoId: grupoCarboidrato.id, carboidratosPor100g: 23.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: arrozIntegral.id, nome: 'Arroz Integral Cozido' },
  ]});

  const batataDoce = await prisma.alimentoBase.create({ data: { nome: 'Batata Doce', grupoId: grupoCarboidrato.id, carboidratosPor100g: 20.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: batataDoce.id, nome: 'Batata Doce Cozida' },
    { alimentoId: batataDoce.id, nome: 'Batata Doce Assada' },
    { alimentoId: batataDoce.id, nome: 'Purê de Batata Doce' },
  ]});

  const batataInglesa = await prisma.alimentoBase.create({ data: { nome: 'Batata Inglesa', grupoId: grupoCarboidrato.id, carboidratosPor100g: 17.6 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: batataInglesa.id, nome: 'Purê de Batata Inglesa' },
    { alimentoId: batataInglesa.id, nome: 'Batata Cozida' },
  ]});

  const mandioca = await prisma.alimentoBase.create({ data: { nome: 'Mandioca', grupoId: grupoCarboidrato.id, carboidratosPor100g: 30.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: mandioca.id, nome: 'Mandioca Cozida' },
    { alimentoId: mandioca.id, nome: 'Purê de Mandioca' },
  ]});

  // Leguminosas
  const feijCarioca = await prisma.alimentoBase.create({ data: { nome: 'Feijão Carioca', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: feijCarioca.id, nome: 'Feijão Carioca Temperado' },
    { alimentoId: feijCarioca.id, nome: 'Feijão Tropeiro' },
  ]});

  const feijaoPreto = await prisma.alimentoBase.create({ data: { nome: 'Feijão Preto', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: feijaoPreto.id, nome: 'Feijão Preto Temperado' },
  ]});

  const graoDeBico = await prisma.alimentoBase.create({ data: { nome: 'Grão de Bico', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: graoDeBico.id, nome: 'Grão de Bico Refogado' },
    { alimentoId: graoDeBico.id, nome: 'Grão de Bico ao Azeite' },
  ]});

  const lentilha = await prisma.alimentoBase.create({ data: { nome: 'Lentilha', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: lentilha.id, nome: 'Lentilha Refogada' },
    { alimentoId: lentilha.id, nome: 'Lentilha ao Curry' },
  ]});

  // Legumes
  const brocolis = await prisma.alimentoBase.create({ data: { nome: 'Brócolis', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: brocolis.id, nome: 'Brócolis no Vapor' },
    { alimentoId: brocolis.id, nome: 'Brócolis Refogado' },
  ]});

  const abobrinha = await prisma.alimentoBase.create({ data: { nome: 'Abobrinha', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: abobrinha.id, nome: 'Abobrinha Refogada' },
    { alimentoId: abobrinha.id, nome: 'Abobrinha Grelhada' },
  ]});

  const cenoura = await prisma.alimentoBase.create({ data: { nome: 'Cenoura', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: cenoura.id, nome: 'Cenoura Cozida' },
    { alimentoId: cenoura.id, nome: 'Cenoura Refogada' },
  ]});

  const vagem = await prisma.alimentoBase.create({ data: { nome: 'Vagem', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: vagem.id, nome: 'Vagem Refogada' },
    { alimentoId: vagem.id, nome: 'Vagem no Vapor' },
  ]});

  // ── 3. Equivalências ──────────────────────────────────────────────────────
  await prisma.equivalenciaAlimento.createMany({ data: [
    { alimentoOrigemId: arrozBranco.id, alimentoDestinoId: batataDoce.id,    fator: 1.5, descricao: '100g arroz branco = 150g batata doce' },
    { alimentoOrigemId: arrozBranco.id, alimentoDestinoId: batataInglesa.id, fator: 1.5, descricao: '100g arroz branco = 150g batata inglesa' },
    { alimentoOrigemId: arrozBranco.id, alimentoDestinoId: mandioca.id,      fator: 1.8, descricao: '100g arroz branco = 180g mandioca' },
    { alimentoOrigemId: arrozBranco.id, alimentoDestinoId: arrozIntegral.id, fator: 1.0, descricao: '100g arroz branco = 100g arroz integral' },
  ]});

  // ── 4. Clientes ───────────────────────────────────────────────────────────
  await prisma.cliente.createMany({ data: [
    { nome: 'João Silva',  email: 'joao@email.com',   telefone: '(11) 99999-1111' },
    { nome: 'Maria Souza', email: 'maria@email.com',  telefone: '(11) 99999-2222' },
    { nome: 'Carlos Lima', email: 'carlos@email.com', telefone: '(11) 99999-3333' },
  ]});

  const total = {
    grupos:    await prisma.grupoAlimentar.count(),
    alimentos: await prisma.alimentoBase.count(),
    preparos:  await prisma.preparoAlimento.count(),
    equiv:     await prisma.equivalenciaAlimento.count(),
    clientes:  await prisma.cliente.count(),
  };

  console.log('✅ Base original restaurada!');
  console.log(`  ${total.grupos} grupos | ${total.alimentos} alimentos | ${total.preparos} preparos | ${total.equiv} equivalências | ${total.clientes} clientes`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
