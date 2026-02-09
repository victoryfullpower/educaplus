/*
  Warnings:

  - A unique constraint covering the columns `[idusuario,anio]` on the table `plananual` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "plananual_idusuario_anio_key" ON "plananual"("idusuario", "anio");
