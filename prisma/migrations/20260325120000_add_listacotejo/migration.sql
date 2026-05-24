-- CreateTable
CREATE TABLE "listacotejo" (
    "id" SERIAL NOT NULL,
    "idsesion" INTEGER NOT NULL,
    "area" TEXT,
    "grado" TEXT,
    "docente" TEXT,
    "ciclo" TEXT,
    "titulosesion" TEXT,
    "proposito" TEXT,
    "competencia" TEXT,
    "capacidades" TEXT,
    "evidencia" TEXT,
    "criterio1" TEXT,
    "criterio2" TEXT,
    "criterio3" TEXT,
    "criterio4" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listacotejo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listacotejo_idsesion_key" ON "listacotejo"("idsesion");

-- AddForeignKey
ALTER TABLE "listacotejo" ADD CONSTRAINT "listacotejo_idsesion_fkey" FOREIGN KEY ("idsesion") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
