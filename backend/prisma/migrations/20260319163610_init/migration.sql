-- CreateEnum
CREATE TYPE "StatusPedido" AS ENUM ('PENDENTE', 'GERADO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO', 'EM_PRODUCAO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "StatusOrdem" AS ENUM ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA');

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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlimentoBase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreparoAlimento" (
    "id" TEXT NOT NULL,
    "alimentoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreparoAlimento_pkey" PRIMARY KEY ("id")
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
    "totalPratos" INTEGER NOT NULL,
    "maxRepeticoes" INTEGER NOT NULL,
    "observacoes" TEXT,
    "status" "StatusPedido" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PedidoDieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrupoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "gramagem" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "GrupoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlimentoProibidoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "alimentoId" TEXT NOT NULL,

    CONSTRAINT "AlimentoProibidoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PratoPedido" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,

    CONSTRAINT "PratoPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPrato" (
    "id" TEXT NOT NULL,
    "pratoId" TEXT NOT NULL,
    "preparoId" TEXT NOT NULL,
    "gramagem" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemPrato_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "GrupoAlimentar_nome_key" ON "GrupoAlimentar"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GrupoPedido_pedidoId_grupoId_key" ON "GrupoPedido"("pedidoId", "grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "AlimentoProibidoPedido_pedidoId_alimentoId_key" ON "AlimentoProibidoPedido"("pedidoId", "alimentoId");

-- CreateIndex
CREATE UNIQUE INDEX "AprovacaoCliente_pedidoId_key" ON "AprovacaoCliente"("pedidoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemProducao_pedidoId_key" ON "OrdemProducao"("pedidoId");

-- AddForeignKey
ALTER TABLE "AlimentoBase" ADD CONSTRAINT "AlimentoBase_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoAlimentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreparoAlimento" ADD CONSTRAINT "PreparoAlimento_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "AlimentoBase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoDieta" ADD CONSTRAINT "PedidoDieta_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoPedido" ADD CONSTRAINT "GrupoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoPedido" ADD CONSTRAINT "GrupoPedido_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "GrupoAlimentar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlimentoProibidoPedido" ADD CONSTRAINT "AlimentoProibidoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlimentoProibidoPedido" ADD CONSTRAINT "AlimentoProibidoPedido_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "AlimentoBase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PratoPedido" ADD CONSTRAINT "PratoPedido_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrato" ADD CONSTRAINT "ItemPrato_pratoId_fkey" FOREIGN KEY ("pratoId") REFERENCES "PratoPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPrato" ADD CONSTRAINT "ItemPrato_preparoId_fkey" FOREIGN KEY ("preparoId") REFERENCES "PreparoAlimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AprovacaoCliente" ADD CONSTRAINT "AprovacaoCliente_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemProducao" ADD CONSTRAINT "OrdemProducao_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "PedidoDieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
