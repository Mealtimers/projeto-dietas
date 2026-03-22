/**
 * populate-base-alimentar.js
 * Popula a Base Alimentar completa com os dados reais da Meal Time Pelotas.
 * Limpa: food base + lotes/ordens (sem apagar clientes nem pedidoDieta).
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🍽️  Populando Base Alimentar — Meal Time...\n');

  // ── Limpeza da base alimentar (preserva clientes e pedidoDieta) ──────────
  await prisma.ordemProducao.deleteMany();
  await prisma.aprovacaoCliente.deleteMany();
  await prisma.itemLote.deleteMany();
  await prisma.loteCardapio.deleteMany();
  await prisma.cardapioVersao.deleteMany();
  await prisma.pedidoItemPermitido.deleteMany();
  await prisma.pedidoProteina.deleteMany();
  await prisma.equivalenciaAlimento.deleteMany();
  await prisma.preparoAlimento.deleteMany();
  await prisma.alimentoBase.deleteMany();
  await prisma.grupoAlimentar.deleteMany();
  console.log('✓ Base alimentar anterior limpa.\n');

  // ════════════════════════════════════════════════════════════════════════
  // 1. GRUPOS ALIMENTARES
  // ════════════════════════════════════════════════════════════════════════
  const grupoProteina    = await prisma.grupoAlimentar.create({ data: { nome: 'Proteína',        descricao: 'Fontes proteicas: carnes, frango, peixes e proteínas vegetais', ordem: 1 } });
  const grupoCarboidrato = await prisma.grupoAlimentar.create({ data: { nome: 'Carboidrato',     descricao: 'Fontes de energia: arroz, macarrão, batatas, risotos e similares',  ordem: 2 } });
  const grupoLeguminosa  = await prisma.grupoAlimentar.create({ data: { nome: 'Leguminosa',      descricao: 'Feijões, grão-de-bico e lentilhas',                                  ordem: 3 } });
  const grupoLegume      = await prisma.grupoAlimentar.create({ data: { nome: 'Legume/Vegetal',  descricao: 'Legumes e vegetais como acompanhamento',                              ordem: 4 } });
  const grupoMolho       = await prisma.grupoAlimentar.create({ data: { nome: 'Molho',           descricao: 'Molhos e bases de tempero aplicados às proteínas',                   ordem: 5 } });

  console.log('✓ 5 grupos criados: Proteína | Carboidrato | Leguminosa | Legume/Vegetal | Molho\n');

  // ════════════════════════════════════════════════════════════════════════
  // 2. PROTEÍNAS
  // ════════════════════════════════════════════════════════════════════════
  console.log('→ Criando proteínas...');

  // Filé de Peito de Frango
  const peito = await prisma.alimentoBase.create({ data: { nome: 'Filé de Peito de Frango', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: peito.id, nome: 'Acebolado em tiras',                          descricao: 'Tiras de filé aceboladas com temperos naturais' },
    { alimentoId: peito.id, nome: 'Em tiras ao sugo',                            descricao: 'Tiras de frango ao molho de tomate caseiro' },
    { alimentoId: peito.id, nome: 'Em tiras ao molho de queijo',                 descricao: 'Tiras de frango ao cremoso molho de queijo' },
    { alimentoId: peito.id, nome: 'Em tiras ao molho de mostarda Dijon',         descricao: 'Tiras de frango ao molho cremoso de mostarda Dijon' },
    { alimentoId: peito.id, nome: 'Em cubos refogado',                           descricao: 'Cubos de frango temperados e refogados' },
    { alimentoId: peito.id, nome: 'Desfiado',                                    descricao: 'Frango cozido e desfiado' },
    { alimentoId: peito.id, nome: 'À parmegiana',                                descricao: 'Empanado c/ farinha de mandioca, molho de tomate e muçarela' },
    { alimentoId: peito.id, nome: 'Strogonoff',                                  descricao: 'Strogonoff com creme de leite light' },
    { alimentoId: peito.id, nome: 'Fricassê',                                    descricao: 'Pedaços suculentos em molho cremoso encorpado' },
  ]});

  // Sobrecoxa de Frango
  const sobrecoxa = await prisma.alimentoBase.create({ data: { nome: 'Sobrecoxa de Frango', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: sobrecoxa.id, nome: 'Lascas refogadas em molho caseiro', descricao: 'Lascas de sobrecoxa magra refogadas em molho caseiro rico em sabor' },
  ]});

  // Iscas de Patinho
  const iscasPatinho = await prisma.alimentoBase.create({ data: { nome: 'Iscas de Patinho', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: iscasPatinho.id, nome: 'Aceboladas',        descricao: 'Iscas de patinho aceboladas com temperos naturais' },
    { alimentoId: iscasPatinho.id, nome: 'Ao molho de ricota', descricao: 'Iscas de patinho ao cremoso molho de ricota' },
  ]});

  // Carne de Panela (Patinho)
  const carnePanela = await prisma.alimentoBase.create({ data: { nome: 'Carne de Panela (Patinho)', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: carnePanela.id, nome: 'Carne de panela (pressão)',     descricao: 'Patinho cozido na pressão com temperos naturais' },
    { alimentoId: carnePanela.id, nome: 'Bolonhesa',                     descricao: 'Patinho moído ao molho bolonhesa' },
    { alimentoId: carnePanela.id, nome: 'Ao sugo c/ milho e ervilha',    descricao: 'Patinho moído ao sugo com milho, ervilha e muçarela' },
  ]});

  // Alcatra
  const alcatra = await prisma.alimentoBase.create({ data: { nome: 'Alcatra', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: alcatra.id, nome: 'Strogonoff s/ lactose', descricao: 'Strogonoff de alcatra com creme de leite light sem lactose' },
  ]});

  // Filé Mignon
  const fileMignon = await prisma.alimentoBase.create({ data: { nome: 'Filé Mignon', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: fileMignon.id, nome: 'Grelhado ao molho gorgonzola', descricao: 'Filé mignon grelhado com molho gorgonzola encorpado' },
    { alimentoId: fileMignon.id, nome: 'À parmegiana',                  descricao: 'Empanado c/ farinha de mandioca, molho de tomate e muçarela' },
    { alimentoId: fileMignon.id, nome: 'Medalhão ao molho madeira',     descricao: 'Medalhão de mignon ao saboroso molho madeira' },
    { alimentoId: fileMignon.id, nome: 'Lascas aceboladas',             descricao: 'Lascas de filé mignon suculentas com cebola' },
  ]});

  // Salmão
  const salmao = await prisma.alimentoBase.create({ data: { nome: 'Salmão', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: salmao.id, nome: 'Grelhado ao molho branco',          descricao: 'Salmão grelhado ao delicado molho branco s/ lactose' },
    { alimentoId: salmao.id, nome: 'Grelhado ao molho de mostarda',     descricao: 'Salmão grelhado c/ molho cremoso de mostarda' },
    { alimentoId: salmao.id, nome: 'Grelhado ao molho de maracujá',     descricao: 'Salmão grelhado c/ molho de maracujá agridoce' },
    { alimentoId: salmao.id, nome: 'Grelhado c/ crosta de castanha',    descricao: 'Salmão grelhado com crosta de castanha de caju' },
  ]});

  // Tilápia
  const tilapia = await prisma.alimentoBase.create({ data: { nome: 'Tilápia', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: tilapia.id, nome: 'Grelhada pura',             descricao: 'Filé de tilápia grelhada com temperos naturais' },
    { alimentoId: tilapia.id, nome: 'Grelhada ao molho branco',  descricao: 'Tilápia grelhada ao molho bechamel s/ lactose' },
  ]});

  // Camarão
  const camarao = await prisma.alimentoBase.create({ data: { nome: 'Camarão', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: camarao.id, nome: 'Ao risoto com parmesão', descricao: 'Camarões frescos ao risoto de arroz carnaroli com parmesão' },
  ]});

  // Grão de Bico (proteína vegetal)
  const graoBicoProteina = await prisma.alimentoBase.create({ data: { nome: 'Grão de Bico (proteína vegetal)', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: graoBicoProteina.id, nome: 'Strogonoff vegetariano', descricao: 'Grão de bico cozido ao strogonoff c/ creme de leite light' },
  ]});

  // Cogumelos
  const cogumelos = await prisma.alimentoBase.create({ data: { nome: 'Cogumelos (Paris/Shiitake/Shimeji)', grupoId: grupoProteina.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: cogumelos.id, nome: 'Risoto vegetariano c/ parmesão', descricao: 'Risoto de cogumelos Paris, Shiitake e Shimeji com parmesão' },
  ]});

  console.log('  ✓ 11 alimentos proteicos | 29 preparos');

  // ════════════════════════════════════════════════════════════════════════
  // 3. CARBOIDRATOS
  // ════════════════════════════════════════════════════════════════════════
  console.log('→ Criando carboidratos...');

  // Arroz Parboilizado
  const arrozParb = await prisma.alimentoBase.create({ data: { nome: 'Arroz Parboilizado', grupoId: grupoCarboidrato.id, carboidratosPor100g: 28.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: arrozParb.id, nome: 'Temperado simples', descricao: 'Arroz parboilizado bem temperado' },
  ]});

  // Arroz Integral
  const arrozInt = await prisma.alimentoBase.create({ data: { nome: 'Arroz Integral', grupoId: grupoCarboidrato.id, carboidratosPor100g: 23.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: arrozInt.id, nome: 'Temperado simples',             descricao: 'Arroz integral cozido temperado' },
    { alimentoId: arrozInt.id, nome: '7 Grãos integrais',             descricao: 'Blend de 7 grãos integrais' },
    { alimentoId: arrozInt.id, nome: 'À primavera',                   descricao: 'Arroz com legumes coloridos e ervas' },
    { alimentoId: arrozInt.id, nome: 'Cremoso com ervilha',           descricao: 'Arroz cremoso com ervilha' },
    { alimentoId: arrozInt.id, nome: 'Com cenoura salteada',          descricao: 'Arroz integral com cenoura salteada' },
    { alimentoId: arrozInt.id, nome: 'Com brócolis',                  descricao: 'Arroz integral com brócolis cozido' },
    { alimentoId: arrozInt.id, nome: 'Negro temperado',               descricao: 'Arroz negro nutritivo levemente adocicado' },
  ]});

  // Arroz de Couve-Flor (Low Carb)
  const arrozCouve = await prisma.alimentoBase.create({ data: { nome: 'Arroz de Couve-Flor', grupoId: grupoCarboidrato.id, carboidratosPor100g: 4.5 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: arrozCouve.id, nome: 'Low carb', descricao: 'Couve-flor ralada e refogada no estilo arroz — baixo carboidrato' },
  ]});

  // Macarrão Talharim
  const talharim = await prisma.alimentoBase.create({ data: { nome: 'Macarrão Talharim', grupoId: grupoCarboidrato.id, carboidratosPor100g: 25.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: talharim.id, nome: 'Ao azeite', descricao: 'Talharim cozido al dente finalizado com azeite' },
  ]});

  // Espaguete Integral
  const espaguete = await prisma.alimentoBase.create({ data: { nome: 'Espaguete Integral', grupoId: grupoCarboidrato.id, carboidratosPor100g: 22.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: espaguete.id, nome: 'Ao azeite',    descricao: 'Espaguete integral ao azeite' },
    { alimentoId: espaguete.id, nome: 'À bolonhesa',  descricao: 'Espaguete integral ao molho bolonhesa' },
  ]});

  // Penne
  const penne = await prisma.alimentoBase.create({ data: { nome: 'Penne', grupoId: grupoCarboidrato.id, carboidratosPor100g: 25.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: penne.id, nome: 'Ao molho branco c/ brócolis', descricao: 'Penne al dente com brócolis ao molho branco' },
  ]});

  // Fusilli Integral
  const fusilli = await prisma.alimentoBase.create({ data: { nome: 'Fusilli Integral', grupoId: grupoCarboidrato.id, carboidratosPor100g: 22.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: fusilli.id, nome: 'Ao sugo', descricao: 'Fusilli integral ao molho sugo' },
  ]});

  // Panqueca Integral
  const panqueca = await prisma.alimentoBase.create({ data: { nome: 'Panqueca Integral', grupoId: grupoCarboidrato.id, carboidratosPor100g: 20.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: panqueca.id, nome: 'Recheada', descricao: 'Panqueca integral recheada da casa' },
  ]});

  // Nhoque de Batata Doce
  const nhoque = await prisma.alimentoBase.create({ data: { nome: 'Nhoque de Batata Doce', grupoId: grupoCarboidrato.id, carboidratosPor100g: 22.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: nhoque.id, nome: 'Ao molho sugo', descricao: 'Nhoque de batata doce ao molho sugo com carne de panela' },
  ]});

  // Risoto
  const risoto = await prisma.alimentoBase.create({ data: { nome: 'Risoto', grupoId: grupoCarboidrato.id, carboidratosPor100g: 24.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: risoto.id, nome: 'De alho-poró',            descricao: 'Risoto cremoso de alho-poró (arroz carnaroli)' },
    { alimentoId: risoto.id, nome: 'De pimentões coloridos',  descricao: 'Risoto de pimentões coloridos' },
    { alimentoId: risoto.id, nome: 'Integral de frango',      descricao: 'Risoto de arroz integral com frango desfiado' },
  ]});

  // Polenta
  const polenta = await prisma.alimentoBase.create({ data: { nome: 'Polenta', grupoId: grupoCarboidrato.id, carboidratosPor100g: 18.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: polenta.id, nome: 'Cremosa', descricao: 'Polenta cremosa feita com ingredientes naturais' },
  ]});

  // Batata Inglesa
  const batataInglesa = await prisma.alimentoBase.create({ data: { nome: 'Batata Inglesa', grupoId: grupoCarboidrato.id, carboidratosPor100g: 17.6 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: batataInglesa.id, nome: 'Rústica assada',    descricao: 'Batata rústica assada a 250°C sem adição de óleos' },
    { alimentoId: batataInglesa.id, nome: 'Purê s/ lactose',   descricao: 'Purê de batata inglesa sem lactose' },
    { alimentoId: batataInglesa.id, nome: 'Salada light',      descricao: 'Salada de batata temperada sem maionese' },
    { alimentoId: batataInglesa.id, nome: 'Sauté c/ alecrim',  descricao: 'Batata salteada com alecrim' },
  ]});

  // Batata Doce
  const batataDoce = await prisma.alimentoBase.create({ data: { nome: 'Batata Doce', grupoId: grupoCarboidrato.id, carboidratosPor100g: 20.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: batataDoce.id, nome: 'Assada',  descricao: 'Batata doce assada ao forno' },
    { alimentoId: batataDoce.id, nome: 'Purê',    descricao: 'Purê de batata doce' },
  ]});

  // Aipim (Mandioca)
  const aipim = await prisma.alimentoBase.create({ data: { nome: 'Aipim (Mandioca)', grupoId: grupoCarboidrato.id, carboidratosPor100g: 30.1 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: aipim.id, nome: 'Purê cremoso', descricao: 'Purê cremoso de aipim' },
  ]});

  // Abóbora (como carboidrato)
  const abobora = await prisma.alimentoBase.create({ data: { nome: 'Abóbora', grupoId: grupoCarboidrato.id, carboidratosPor100g: 6.5 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: abobora.id, nome: 'Rústica', descricao: 'Abóbora cortada em pedaços rústicos temperada' },
  ]});

  // Abóbora Cabotiá
  const aboboraCab = await prisma.alimentoBase.create({ data: { nome: 'Abóbora Cabotiá', grupoId: grupoCarboidrato.id, carboidratosPor100g: 7.0 } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: aboboraCab.id, nome: 'Purê', descricao: 'Purê de abóbora cabotiá — baixo teor de carboidrato e rico em fibras' },
  ]});

  console.log('  ✓ 16 alimentos de carboidrato | 29 preparos');

  // ════════════════════════════════════════════════════════════════════════
  // 4. LEGUMINOSAS
  // ════════════════════════════════════════════════════════════════════════
  console.log('→ Criando leguminosas...');

  const feijaoPreto = await prisma.alimentoBase.create({ data: { nome: 'Feijão Preto', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: feijaoPreto.id, nome: 'Cozido temperado', descricao: 'Feijão preto cozido com temperos naturais' },
  ]});

  const feijCarioca = await prisma.alimentoBase.create({ data: { nome: 'Feijão Carioca', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: feijCarioca.id, nome: 'Cozido temperado', descricao: 'Feijão carioca cozido com temperos naturais' },
  ]});

  const graoBico = await prisma.alimentoBase.create({ data: { nome: 'Grão de Bico', grupoId: grupoLeguminosa.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: graoBico.id, nome: 'Cozido', descricao: 'Grão de bico cozido' },
  ]});

  console.log('  ✓ 3 leguminosas | 3 preparos');

  // ════════════════════════════════════════════════════════════════════════
  // 5. LEGUMES / VEGETAIS
  // ════════════════════════════════════════════════════════════════════════
  console.log('→ Criando legumes/vegetais...');

  const mixLegumes = await prisma.alimentoBase.create({ data: { nome: 'Mix de Legumes', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: mixLegumes.id, nome: 'Cozidos a vapor',                   descricao: 'Mix de legumes sortidos cozidos a vapor' },
    { alimentoId: mixLegumes.id, nome: 'Salteados ao azeite',               descricao: 'Mix de legumes frescos salteados no azeite' },
    { alimentoId: mixLegumes.id, nome: 'Refogados',                          descricao: 'Mix de legumes refogados com temperos' },
    { alimentoId: mixLegumes.id, nome: 'Ratatouille (assados ao forno)',     descricao: 'Legumes assados ao forno com ervas — estilo Ratatouille' },
  ]});

  const brocolis = await prisma.alimentoBase.create({ data: { nome: 'Brócolis', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: brocolis.id, nome: 'Cozido a vapor', descricao: 'Brócolis cozido no vapor preservando nutrientes' },
  ]});

  const cenoura = await prisma.alimentoBase.create({ data: { nome: 'Cenoura', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: cenoura.id, nome: 'Salteada', descricao: 'Cenoura salteada levemente temperada' },
  ]});

  const couve = await prisma.alimentoBase.create({ data: { nome: 'Couve', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: couve.id, nome: 'Refogada', descricao: 'Couve refogada com temperos naturais' },
  ]});

  const aboboraLegume = await prisma.alimentoBase.create({ data: { nome: 'Abóbora (legume)', grupoId: grupoLegume.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: aboboraLegume.id, nome: 'Rústica (acompanhamento)', descricao: 'Abóbora em pedaços como acompanhamento' },
  ]});

  console.log('  ✓ 5 legumes/vegetais | 8 preparos');

  // ════════════════════════════════════════════════════════════════════════
  // 6. MOLHOS
  // ════════════════════════════════════════════════════════════════════════
  console.log('→ Criando molhos...');

  const molhoSugo = await prisma.alimentoBase.create({ data: { nome: 'Molho Sugo', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoSugo.id, nome: 'Tomate caseiro', descricao: 'Molho de tomate caseiro temperado — base das parmegianas e sugo' },
  ]});

  const molhoQueijo = await prisma.alimentoBase.create({ data: { nome: 'Molho de Queijo', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoQueijo.id, nome: 'Cremoso', descricao: 'Molho cremoso de queijo' },
  ]});

  const molhoDijon = await prisma.alimentoBase.create({ data: { nome: 'Molho de Mostarda Dijon', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoDijon.id, nome: 'Cremoso marcante', descricao: 'Molho cremoso de mostarda Dijon — sabor marcante e equilibrado' },
  ]});

  const molhoMostarda = await prisma.alimentoBase.create({ data: { nome: 'Molho de Mostarda', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoMostarda.id, nome: 'Cremoso simples', descricao: 'Molho cremoso de mostarda simples' },
  ]});

  const molhoBranco = await prisma.alimentoBase.create({ data: { nome: 'Molho Branco', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoBranco.id, nome: 'Bechamel s/ lactose', descricao: 'Molho bechamel sem lactose — leve e saboroso' },
  ]});

  const molhoRicota = await prisma.alimentoBase.create({ data: { nome: 'Molho de Ricota', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoRicota.id, nome: 'Cremoso', descricao: 'Molho cremoso de ricota' },
  ]});

  const molhoMadeira = await prisma.alimentoBase.create({ data: { nome: 'Molho Madeira', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoMadeira.id, nome: 'Encorpado', descricao: 'Molho madeira encorpado clássico' },
  ]});

  const molhoGorgonzola = await prisma.alimentoBase.create({ data: { nome: 'Molho Gorgonzola', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoGorgonzola.id, nome: 'Cremoso', descricao: 'Molho gorgonzola cremoso e encorpado' },
  ]});

  const molhoMaracuja = await prisma.alimentoBase.create({ data: { nome: 'Molho de Maracujá', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: molhoMaracuja.id, nome: 'Agridoce', descricao: 'Molho de maracujá levemente adocicado e ácido na medida certa' },
  ]});

  const cremeLeite = await prisma.alimentoBase.create({ data: { nome: 'Creme de Leite Light', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: cremeLeite.id, nome: 'Base de strogonoff', descricao: 'Creme de leite light — base clássica de strogonoff' },
  ]});

  const azeite = await prisma.alimentoBase.create({ data: { nome: 'Azeite', grupoId: grupoMolho.id } });
  await prisma.preparoAlimento.createMany({ data: [
    { alimentoId: azeite.id, nome: 'Finalização', descricao: 'Azeite extravirgem para finalização de pratos e legumes' },
  ]});

  console.log('  ✓ 11 molhos | 11 preparos');

  // ════════════════════════════════════════════════════════════════════════
  // 7. EQUIVALÊNCIAS NUTRICIONAIS (carboidratos, base Arroz Parboilizado)
  // ════════════════════════════════════════════════════════════════════════
  await prisma.equivalenciaAlimento.createMany({ data: [
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: arrozInt.id,      fator: 1.22, descricao: '100g arroz parboilizado ≈ 122g arroz integral' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: batataDoce.id,    fator: 1.40, descricao: '100g arroz parboilizado ≈ 140g batata doce' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: batataInglesa.id, fator: 1.60, descricao: '100g arroz parboilizado ≈ 160g batata inglesa' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: aipim.id,         fator: 0.93, descricao: '100g arroz parboilizado ≈ 93g aipim' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: abobora.id,       fator: 4.32, descricao: '100g arroz parboilizado ≈ 432g abóbora' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: aboboraCab.id,    fator: 4.01, descricao: '100g arroz parboilizado ≈ 401g abóbora cabotiá' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: polenta.id,       fator: 1.56, descricao: '100g arroz parboilizado ≈ 156g polenta' },
    { alimentoOrigemId: arrozParb.id, alimentoDestinoId: arrozCouve.id,    fator: 6.24, descricao: '100g arroz parboilizado ≈ 624g arroz de couve-flor (low carb)' },
  ]});

  // ════════════════════════════════════════════════════════════════════════
  // RESUMO FINAL
  // ════════════════════════════════════════════════════════════════════════
  const totalGrupos    = await prisma.grupoAlimentar.count();
  const totalAlimentos = await prisma.alimentoBase.count();
  const totalPreparos  = await prisma.preparoAlimento.count();
  const totalEquiv     = await prisma.equivalenciaAlimento.count();

  console.log('\n════════════════════════════════════════');
  console.log('✅ Base Alimentar Meal Time — concluída!');
  console.log('════════════════════════════════════════');
  console.log(`  Grupos alimentares : ${totalGrupos}`);
  console.log(`  Alimentos base     : ${totalAlimentos}`);
  console.log(`  Preparos           : ${totalPreparos}`);
  console.log(`  Equivalências      : ${totalEquiv}`);
  console.log('════════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
