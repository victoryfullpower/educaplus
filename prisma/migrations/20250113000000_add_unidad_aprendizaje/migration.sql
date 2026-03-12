-- CreateTable
CREATE TABLE "unidadaprendizaje" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "idplananual" INTEGER,
    "anio" INTEGER NOT NULL,
    "fechahora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "area" TEXT,
    "area_id" TEXT,
    "grado" TEXT,
    "grado_id" TEXT,
    "ciclo" TEXT,
    "ciclo_id" TEXT,
    "unidad" TEXT,
    "institucion" TEXT,
    "tipo_ie" TEXT,
    "director" TEXT,
    "docente" TEXT,
    "duracion" TEXT,
    "fecha_inicio" TEXT,
    "fecha_termino" TEXT,
    "situacion_significativa" TEXT,
    "producto" TEXT,
    "titulo_unidad" TEXT,
    "proposito_unidad" TEXT,
    "competencias" JSONB,
    "campo_tematico" TEXT,
    "numero_sesiones" TEXT,
    "instrumento_evaluacion" TEXT,
    "sesiones" JSONB,
    "variables_template" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unidadaprendizaje_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidadaprendizaje_idusuario_anio_area_id_grado_id_unidad_key" ON "unidadaprendizaje"("idusuario", "anio", "area_id", "grado_id", "unidad");

-- AddForeignKey
ALTER TABLE "unidadaprendizaje" ADD CONSTRAINT "unidadaprendizaje_idusuario_fkey" FOREIGN KEY ("idusuario") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

