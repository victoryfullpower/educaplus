-- CreateTable
CREATE TABLE "area" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nivel" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,

    CONSTRAINT "nivel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grado" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "grado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competencia" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "numero_competencia" INTEGER NOT NULL,
    "idarea" INTEGER NOT NULL,
    "idgrado" INTEGER NOT NULL,
    "idnivel" INTEGER NOT NULL,

    CONSTRAINT "competencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estandar" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "ordenamiento" INTEGER NOT NULL,
    "idcompetencia" INTEGER NOT NULL,

    CONSTRAINT "estandar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacidad" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "idcompetencia" INTEGER NOT NULL,
    "idstandar" INTEGER NOT NULL,

    CONSTRAINT "capacidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "desempenio" (
    "id" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "idcapacidad" INTEGER NOT NULL,

    CONSTRAINT "desempenio_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "competencia" ADD CONSTRAINT "competencia_idarea_fkey" FOREIGN KEY ("idarea") REFERENCES "area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencia" ADD CONSTRAINT "competencia_idgrado_fkey" FOREIGN KEY ("idgrado") REFERENCES "grado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competencia" ADD CONSTRAINT "competencia_idnivel_fkey" FOREIGN KEY ("idnivel") REFERENCES "nivel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estandar" ADD CONSTRAINT "estandar_idcompetencia_fkey" FOREIGN KEY ("idcompetencia") REFERENCES "competencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad" ADD CONSTRAINT "capacidad_idcompetencia_fkey" FOREIGN KEY ("idcompetencia") REFERENCES "competencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacidad" ADD CONSTRAINT "capacidad_idstandar_fkey" FOREIGN KEY ("idstandar") REFERENCES "estandar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "desempenio" ADD CONSTRAINT "desempenio_idcapacidad_fkey" FOREIGN KEY ("idcapacidad") REFERENCES "capacidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
