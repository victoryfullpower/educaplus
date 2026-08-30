-- CreateTable
CREATE TABLE "sugerencia_problema_plan" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "sugerencia_problema_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sugerencia_producto_plan" (
    "id" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "sugerencia_producto_plan_pkey" PRIMARY KEY ("id")
);
