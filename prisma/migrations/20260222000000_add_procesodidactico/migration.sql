-- CreateTable
CREATE TABLE "procesodidactico" (
    "idproceso" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "competencia_proceso" JSONB NOT NULL,
    "idarea" INTEGER NOT NULL,

    CONSTRAINT "procesodidactico_pkey" PRIMARY KEY ("idproceso")
);

-- AddForeignKey
ALTER TABLE "procesodidactico" ADD CONSTRAINT "procesodidactico_idarea_fkey" FOREIGN KEY ("idarea") REFERENCES "area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
