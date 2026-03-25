-- CreateTable
CREATE TABLE "areacomercial" (
    "idareacomercial" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "area_ids" JSONB NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "areacomercial_pkey" PRIMARY KEY ("idareacomercial")
);
