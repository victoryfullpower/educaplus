-- CreateTable: Crear tabla ciclo primero
CREATE TABLE IF NOT EXISTS "ciclo" (
    "idciclo" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "ciclo_pkey" PRIMARY KEY ("idciclo")
);

-- Insertar datos de ciclo
INSERT INTO "ciclo" ("idciclo", "descripcion") VALUES (1, 'VI') ON CONFLICT ("idciclo") DO NOTHING;
INSERT INTO "ciclo" ("idciclo", "descripcion") VALUES (2, 'VII') ON CONFLICT ("idciclo") DO NOTHING;

-- AlterTable: Agregar idciclo como nullable primero
ALTER TABLE "grado" ADD COLUMN IF NOT EXISTS "idciclo" INTEGER;

-- Actualizar grados existentes con idciclo
UPDATE "grado" SET "idciclo" = 1 WHERE "id" IN (1, 2);
UPDATE "grado" SET "idciclo" = 2 WHERE "id" IN (3, 4, 5);

-- Ahora hacer idciclo NOT NULL
ALTER TABLE "grado" ALTER COLUMN "idciclo" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "grado" ADD CONSTRAINT "grado_idciclo_fkey" FOREIGN KEY ("idciclo") REFERENCES "ciclo"("idciclo") ON DELETE RESTRICT ON UPDATE CASCADE;
