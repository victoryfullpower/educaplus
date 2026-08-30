-- CreateTable
CREATE TABLE "registro_sello_documento" (
    "id" SERIAL NOT NULL,
    "codigoeducaplus" TEXT NOT NULL,
    "cantidad_archivos" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_sello_documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registro_sello_documento_codigoeducaplus_idx" ON "registro_sello_documento"("codigoeducaplus");

-- CreateIndex
CREATE INDEX "registro_sello_documento_created_at_idx" ON "registro_sello_documento"("created_at");
