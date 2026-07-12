-- AlterTable
ALTER TABLE "PreparoAlimento"
  ADD COLUMN "mealcontrolRecipeId"          INTEGER,
  ADD COLUMN "mealcontrolRecipeName"        TEXT,
  ADD COLUMN "mealcontrolIsRepresentative"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mealcontrolLinkedAt"          TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PreparoAlimento_mealcontrolRecipeId_idx"
  ON "PreparoAlimento"("mealcontrolRecipeId");
