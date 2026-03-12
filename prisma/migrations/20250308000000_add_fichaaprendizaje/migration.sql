-- CreateTable
CREATE TABLE "fichaaprendizaje" (
    "id" SERIAL NOT NULL,
    "idsesion" INTEGER NOT NULL,
    "area" TEXT,
    "grado" TEXT,
    "titulosesion" TEXT,
    "titulodesesion" TEXT,
    "proposito" TEXT,
    "competencia" TEXT,
    "capacidad" TEXT,
    "evidencia" TEXT,
    "criterios" TEXT,
    "saber1" TEXT,
    "saber2" TEXT,
    "saber3" TEXT,
    "respuestaprompt" TEXT,
    "duracion" TEXT,
    "desarrolloantes" TEXT,
    "desarrollodurante" TEXT,
    "desarrollodespues" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fichaaprendizaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fichaaprendizaje_idsesion_key" ON "fichaaprendizaje"("idsesion");

-- AddForeignKey
ALTER TABLE "fichaaprendizaje" ADD CONSTRAINT "fichaaprendizaje_idsesion_fkey" FOREIGN KEY ("idsesion") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
