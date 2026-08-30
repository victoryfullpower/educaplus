-- CreateTable
CREATE TABLE "solucionario" (
    "id" SERIAL NOT NULL,
    "idsesion" INTEGER NOT NULL,
    "area" TEXT,
    "grado" TEXT,
    "titulosesion" TEXT,
    "respuestaprompt" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solucionario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "solucionario_idsesion_key" ON "solucionario"("idsesion");

-- AddForeignKey
ALTER TABLE "solucionario" ADD CONSTRAINT "solucionario_idsesion_fkey" FOREIGN KEY ("idsesion") REFERENCES "sesion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
