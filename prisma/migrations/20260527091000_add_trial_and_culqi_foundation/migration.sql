-- AlterTable
ALTER TABLE "User"
ADD COLUMN "trial_plan_usado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trial_unidad_usada" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "trial_sesion_usada" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "orden_compra" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "vigencia" TEXT NOT NULL,
    "sesiones_por_unidad" INTEGER NOT NULL,
    "cantidad_grados" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "culqi_order_id" TEXT,
    "culqi_charge_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orden_compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pago_culqi" (
    "id" SERIAL NOT NULL,
    "idorden" INTEGER NOT NULL,
    "culqi_id" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "metodo" TEXT,
    "monto" DECIMAL(10,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'PEN',
    "respuesta_raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pago_culqi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcion_usuario" (
    "id" SERIAL NOT NULL,
    "idusuario" INTEGER NOT NULL,
    "idorden" INTEGER,
    "vigencia" TEXT NOT NULL,
    "sesiones_por_unidad" INTEGER NOT NULL,
    "cantidad_grados" INTEGER NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripcion_usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcion_grado" (
    "id" SERIAL NOT NULL,
    "idsuscripcion" INTEGER NOT NULL,
    "area_id" TEXT NOT NULL,
    "grado_id" TEXT NOT NULL,
    "nivel_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripcion_grado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orden_compra_idusuario_estado_idx" ON "orden_compra"("idusuario", "estado");
CREATE INDEX "orden_compra_culqi_order_id_idx" ON "orden_compra"("culqi_order_id");
CREATE INDEX "orden_compra_culqi_charge_id_idx" ON "orden_compra"("culqi_charge_id");

-- CreateIndex
CREATE INDEX "pago_culqi_idorden_idx" ON "pago_culqi"("idorden");
CREATE UNIQUE INDEX "pago_culqi_culqi_id_key" ON "pago_culqi"("culqi_id");

-- CreateIndex
CREATE INDEX "suscripcion_usuario_idusuario_estado_fecha_fin_idx" ON "suscripcion_usuario"("idusuario", "estado", "fecha_fin");
CREATE INDEX "suscripcion_usuario_idorden_idx" ON "suscripcion_usuario"("idorden");

-- CreateIndex
CREATE INDEX "suscripcion_grado_area_id_grado_id_idx" ON "suscripcion_grado"("area_id", "grado_id");
CREATE UNIQUE INDEX "suscripcion_area_grado_unico" ON "suscripcion_grado"("idsuscripcion", "area_id", "grado_id");

-- AddForeignKey
ALTER TABLE "orden_compra" ADD CONSTRAINT "orden_compra_idusuario_fkey"
FOREIGN KEY ("idusuario") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pago_culqi" ADD CONSTRAINT "pago_culqi_idorden_fkey"
FOREIGN KEY ("idorden") REFERENCES "orden_compra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suscripcion_usuario" ADD CONSTRAINT "suscripcion_usuario_idusuario_fkey"
FOREIGN KEY ("idusuario") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suscripcion_usuario" ADD CONSTRAINT "suscripcion_usuario_idorden_fkey"
FOREIGN KEY ("idorden") REFERENCES "orden_compra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "suscripcion_grado" ADD CONSTRAINT "suscripcion_grado_idsuscripcion_fkey"
FOREIGN KEY ("idsuscripcion") REFERENCES "suscripcion_usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
