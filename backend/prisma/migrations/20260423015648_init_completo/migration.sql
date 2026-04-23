-- CreateEnum
CREATE TYPE "TipoRefeicao" AS ENUM ('ALMOCO', 'JANTAR');

-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'GERADO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO', 'EM_PRODUCAO', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "StatusOrdem" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('AGUARDANDO', 'EM_ORCAMENTO', 'ORCAMENTO_ENVIADO', 'APROVADO', 'REPROVADO');

-- CreateTable
CREATE TABLE "GrupoAlimentar" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrupoAlimentar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlimentoBase" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "carboidratosPor100g" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlimentoBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparoAlimento" (
    "id" TEXT NOT NULL,
    "alimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "gramagem" DOUBLE PRECISION,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreparoAlimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquivalenciaAlimento" (
    "id" TEXT NOT NULL,
    "alimentoOrigemId" TEXT NOT NULL,
    "alimentoDestinoId" TEXT NOT NULL,
    "fator" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquivalenciaAlimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoDieta" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipoRefeicao" "TipoRefeicao" NOT NULL DEFAULT 'ALMOCO',
    "totalPratos" INTEGER NOT NULL,
    "maxRepeticoes" INTEGER NOT NULL,
    "minRepeticoesLote" INTEGER NOT NULL DEFAULT 2,
    "observacoes" TEXT,
    "obsLegumes" TEXT,
    "nutricionista" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "valorTotal" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoDieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoProteina" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "alimentoBaseId" TEXT NOT NULL,
    "gramagem" DOUBLE PRECISION NOT NULL,
    "quantidadePratos" INTEGER NOT NULL,
    "preparosIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "PedidoProteina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PedidoItemPermitido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "grupoNome" TEXT NOT NULL,
    "preparoId" TEXT NOT NULL,
    "gramagemBase" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PedidoItemPermitido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardapioVersao" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardapioVersao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoteCardapio" (
    "id" TEXT NOT NULL,
    "versaoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "LoteCardapio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemLote" (
    "id" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "preparoId" TEXT NOT NULL,
    "gramagem" DOUBLE PRECISION NOT NULL,
    "grupoNome" TEXT NOT NULL,
    "nomeManual" TEXT,
    "obs" TEXT,

    CONSTRAINT "ItemLote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AprovacaoCliente" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "status" "StatusAprovacao" NOT NULL DEFAULT 'PENDENTE',
    "dataAprovacao" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AprovacaoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemProducao" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "status" "StatusOrdem" NOT NULL DEFAULT 'PENDENTE',
    "dataGeracao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPrevisao" TIMESTAMP(3),
    "observacoes" TEXT,
    "itensConsolidados" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdemProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoOrcamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT,
    "totalPratos" INTEGER NOT NULL,
    "proteinas" JSONB NOT NULL,
    "carboidrato" JSONB,
    "leguminosa" JSONB,
    "legume" JSONB,
    "molhos" JSONB,
    "observacoes" TEXT,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'AGUARDANDO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SolicitacaoOrcamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoAlimentar_nome_key" ON "GrupoAlimentar"("nome");

-- CreateIndex
CREATE INDEX "AlimentoBase_grupoId_idx" ON "AlimentoBase"("grupoId");

-- CreateIndex
CREATE INDEX "PreparoAlimento_alimentoId_idx" ON "PreparoAlimento"("alimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "EquivalenciaAlimento_alimentoOrigemId_alimentoDestinoId_key" ON "EquivalenciaAlimento"("alimentoOrigemId", "alimentoDestinoId");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE INDEX "PedidoDieta_clienteId_idx" ON "PedidoDieta"("clienteId");

-- CreateIndex
CREATE INDEX "PedidoDieta_status_idx" ON "PedidoDieta"("status");

-- CreateIndex
CREATE INDEX "PedidoProteina_pedidoId_idx" ON "PedidoProteina"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoProteina_pedidoId_alimentoBaseId_key" ON "PedidoProteina"("pedidoId", "alimentoBaseId");

-- CreateIndex
CREATE INDEX "PedidoItemPermitido_pedidoId_idx" ON "PedidoItemPermitido"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "PedidoItemPermitido_pedidoId_preparoId_key" ON "PedidoItemPermitido"("pedidoId", "preparoId");

-- CreateIndex
CREATE INDEX "CardapioVersao_pedidoId_idx" ON "CardapioVersao"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "CardapioVersao_pedidoId_numero_key" ON "CardapioVersao"("pedidoId", "numero");

-- CreateIndex
CREATE INDEX "LoteCardapio_versaoId_idx" ON "LoteCardapio"("versaoId");

-- CreateIndex
CREATE INDEX "ItemLote_loteId_idx" ON "ItemLote"("loteId");

-- CreateIndex
CREATE INDEX "ItemLote_preparoId_idx" ON "ItemLote"("preparoId");

-- CreateIndex
CREATE UNIQUE INDEX "AprovacaoCliente_pedidoId_key" ON "AprovacaoCliente"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemProducao_pedidoId_key" ON "OrdemProducao"("pedidoId");

-- AddForeignKey
ALTER TABLE "AlimentoBase" ADD CONSTRAINT "AlimentoBase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoAlimentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparoAlimento" ADD CONSTRAINT "PreparoAlimento_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "AlimentoBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquivalenciaAlimento" ADD CONSTRAINT "EquivalenciaAlimento_alimentoOrigemId_fkey" FOREIGN KEY ("alimentoOrigemId") REFERENCES "AlimentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquivalenciaAlimento" ADD CONSTRAINT "EquivalenciaAlimento_alimentoDestinoId_fkey" FOREIGN KEY ("alimentoDestinoId") REFERENCES "AlimentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDieta" ADD CONSTRAINT "PedidoDieta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoProteina" ADD CONSTRAINT "PedidoProteina_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoProteina" ADD CONSTRAINT "PedidoProteina_alimentoBaseId_fkey" FOREIGN KEY ("alimentoBaseId") REFERENCES "AlimentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItemPermitido" ADD CONSTRAINT "PedidoItemPermitido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoItemPermitido" ADD CONSTRAINT "PedidoItemPermitido_preparoId_fkey" FOREIGN KEY ("preparoId") REFERENCES "PreparoAlimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardapioVersao" ADD CONSTRAINT "CardapioVersao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoteCardapio" ADD CONSTRAINT "LoteCardapio_versaoId_fkey" FOREIGN KEY ("versaoId") REFERENCES "CardapioVersao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLote" ADD CONSTRAINT "ItemLote_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "LoteCardapio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemLote" ADD CONSTRAINT "ItemLote_preparoId_fkey" FOREIGN KEY ("preparoId") REFERENCES "PreparoAlimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprovacaoCliente" ADD CONSTRAINT "AprovacaoCliente_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemProducao" ADD CONSTRAINT "OrdemProducao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
