-- CreateTable
CREATE TABLE "tipoventa" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "tipoventa_pkey" PRIMARY KEY ("id")
);
