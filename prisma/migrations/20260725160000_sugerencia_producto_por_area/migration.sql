-- AlterTable: relacionar sugerencias de producto con área curricular
ALTER TABLE "sugerencia_producto_plan" ADD COLUMN IF NOT EXISTS "idarea" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sugerencia_producto_plan_idarea_fkey'
  ) THEN
    ALTER TABLE "sugerencia_producto_plan"
      ADD CONSTRAINT "sugerencia_producto_plan_idarea_fkey"
      FOREIGN KEY ("idarea") REFERENCES "area"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "sugerencia_producto_plan_idarea_idx"
  ON "sugerencia_producto_plan"("idarea");
