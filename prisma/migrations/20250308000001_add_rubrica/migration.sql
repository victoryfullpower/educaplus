-- CreateTable
CREATE TABLE "rubrica" (
    "id" SERIAL NOT NULL,
    "idsesion" INTEGER NOT NULL,
    "area" TEXT,
    "competencia" TEXT,
    "capacidad" TEXT,
    "standar" TEXT,
    "grado" TEXT,
    "titulosesion" TEXT,
    "evidencia" TEXT,
    "proposito" TEXT,
    "tabladinamica" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rubrica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rubrica_idsesion_key" ON "rubrica"("idsesion");

-- AddForeignKey
ALTER TABLE "rubrica" ADD CONSTRAINT "rubrica_idsesion_fkey" FOREIGN KEY ("idsesion") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
