-- Plan comercial Básico / Premium / Anual + créditos de regeneración IA
ALTER TABLE "orden_compra" ADD COLUMN IF NOT EXISTS "plan_codigo" TEXT;

ALTER TABLE "suscripcion_usuario" ADD COLUMN IF NOT EXISTS "plan_codigo" TEXT;
ALTER TABLE "suscripcion_usuario" ADD COLUMN IF NOT EXISTS "creditos_regeneracion_total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "suscripcion_usuario" ADD COLUMN IF NOT EXISTS "creditos_regeneracion_usados" INTEGER NOT NULL DEFAULT 0;
