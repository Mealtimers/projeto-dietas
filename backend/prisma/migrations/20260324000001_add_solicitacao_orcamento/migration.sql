CREATE TYPE "StatusSolicitacao" AS ENUM ('AGUARDANDO', 'EM_ORCAMENTO', 'ORCAMENTO_ENVIADO', 'APROVADO', 'REPROVADO');

CREATE TABLE "SolicitacaoOrcamento" (
  "id"          TEXT NOT NULL,
  "nome"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "telefone"    TEXT,
  "totalPratos" INTEGER NOT NULL,
  "proteinas"   JSONB NOT NULL,
  "carboidrato" JSONB,
  "leguminosa"  JSONB,
  "legume"      JSONB,
  "molhos"      JSONB,
  "observacoes" TEXT,
  "status"      "StatusSolicitacao" NOT NULL DEFAULT 'AGUARDANDO',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SolicitacaoOrcamento_pkey" PRIMARY KEY ("id")
);
