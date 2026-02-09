-- CreateTable
CREATE TABLE "plananual" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "fechahora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" TEXT,
    "area_id" TEXT,
    "grado" TEXT,
    "grado_id" TEXT,
    "institucion" TEXT,
    "docente" TEXT,
    "dre" TEXT,
    "ugel" TEXT,
    "director" TEXT,
    "coordinador" TEXT,
    "nivel" TEXT,
    "nivel_id" TEXT,
    "departamento" TEXT,
    "provincia" TEXT,
    "distrito" TEXT,
    "unidades" JSONB,
    "variables_template" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plananual_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "plananual" ADD CONSTRAINT "plananual_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
