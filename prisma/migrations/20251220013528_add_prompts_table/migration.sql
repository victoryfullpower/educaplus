-- CreateTable
CREATE TABLE "prompt" (
    "idprompt" SERIAL NOT NULL,
    "descripcion" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fechacreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechamodificacion" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',

    CONSTRAINT "prompt_pkey" PRIMARY KEY ("idprompt")
);
