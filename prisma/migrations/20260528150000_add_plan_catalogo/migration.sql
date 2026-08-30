-- Catálogo de planes comerciales (Básico, Premium, Anual)

CREATE TABLE "plan_catalogo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "periodo" TEXT NOT NULL,
    "vigencia" TEXT NOT NULL,
    "sesiones_por_unidad" INTEGER NOT NULL,
    "creditos_regeneracion" INTEGER NOT NULL,
    "creditos_etiqueta" TEXT NOT NULL,
    "max_pares_area_grado" INTEGER NOT NULL,
    "generacion_titulo" TEXT NOT NULL,
    "destacado" TEXT,
    "etiqueta" TEXT,
    "cta" TEXT NOT NULL,
    "tema" TEXT NOT NULL DEFAULT 'azul',
    "nota_uso_justo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_catalogo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_catalogo_codigo_key" ON "plan_catalogo"("codigo");

CREATE TABLE "plan_catalogo_item" (
    "id" SERIAL NOT NULL,
    "id_plan_catalogo" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "plan_catalogo_item_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plan_catalogo_item_id_plan_catalogo_tipo_orden_idx" ON "plan_catalogo_item"("id_plan_catalogo", "tipo", "orden");

CREATE TABLE "plan_catalogo_limite" (
    "id" SERIAL NOT NULL,
    "id_plan_catalogo" INTEGER NOT NULL,
    "tipo_documento" TEXT NOT NULL,
    "limite_mensual" INTEGER,
    "limite_anual" INTEGER,

    CONSTRAINT "plan_catalogo_limite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plan_catalogo_limite_id_plan_catalogo_tipo_documento_key" ON "plan_catalogo_limite"("id_plan_catalogo", "tipo_documento");

ALTER TABLE "plan_catalogo_item" ADD CONSTRAINT "plan_catalogo_item_id_plan_catalogo_fkey" FOREIGN KEY ("id_plan_catalogo") REFERENCES "plan_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_catalogo_limite" ADD CONSTRAINT "plan_catalogo_limite_id_plan_catalogo_fkey" FOREIGN KEY ("id_plan_catalogo") REFERENCES "plan_catalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- PLAN BÁSICO
INSERT INTO "plan_catalogo" (
  "codigo", "nombre", "precio", "periodo", "vigencia", "sesiones_por_unidad",
  "creditos_regeneracion", "creditos_etiqueta", "max_pares_area_grado",
  "generacion_titulo", "cta", "tema", "orden", "updated_at"
) VALUES (
  'basico', 'PLAN BÁSICO', 39.90, 'mes', 'mensual', 5,
  150, '150 TOTAL CRÉDITOS', 1,
  '¿Qué podrás generar al mes?', 'Empezar con el Plan Básico', 'azul', 1, CURRENT_TIMESTAMP
);

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'generacion', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('5 Programaciones Anuales', 1),
  ('5 Unidades de Aprendizaje', 2),
  ('30 Sesiones de Aprendizaje', 3),
  ('30 Fichas / actividades de Aprendizaje', 4),
  ('30 Listas de Cotejo', 5),
  ('30 Rúbricas', 6),
  ('Límite de regeneración de documentos incluido', 7)
) AS v(texto, ord) WHERE codigo = 'basico';

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'beneficio', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('Descarga de todos los documentos en Word 100% editable.', 1),
  ('Estructuras actualizadas y alineadas a los estándares del MINEDU.', 2),
  ('Historial en la nube: tus documentos guardados de forma segura durante tu mes activo.', 3)
) AS v(texto, ord) WHERE codigo = 'basico';

INSERT INTO "plan_catalogo_limite" ("id_plan_catalogo", "tipo_documento", "limite_mensual", "limite_anual")
SELECT id, v.tipo, v.mensual, NULL FROM "plan_catalogo", (VALUES
  ('plan_anual', 5),
  ('unidad', 5),
  ('sesion', 30),
  ('ficha', 30),
  ('lista_cotejo', 30),
  ('rubrica', 30)
) AS v(tipo, mensual) WHERE codigo = 'basico';

-- PLAN PREMIUM
INSERT INTO "plan_catalogo" (
  "codigo", "nombre", "precio", "periodo", "vigencia", "sesiones_por_unidad",
  "creditos_regeneracion", "creditos_etiqueta", "max_pares_area_grado",
  "generacion_titulo", "destacado", "cta", "tema", "orden", "updated_at"
) VALUES (
  'premium', 'PLAN PREMIUM', 74.90, 'mes', 'mensual', 10,
  320, '320 TOTAL CRÉDITOS', 5,
  '¿Qué podrás generar al mes?', 'El más vendido', 'Empezar con el Plan Premium', 'dorado', 2, CURRENT_TIMESTAMP
);

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'generacion', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('6 Programaciones Anuales', 1),
  ('6 Unidades de Aprendizaje', 2),
  ('50 Sesiones de Aprendizaje', 3),
  ('50 Fichas de Aprendizaje', 4),
  ('50 Solucionarios de ficha', 5),
  ('50 Rúbricas analíticas', 6),
  ('50 Listas de cotejo', 7),
  ('BONUS: 25 Sesiones de Refuerzo', 8),
  ('Mayor capacidad de regeneración de documentos', 9)
) AS v(texto, ord) WHERE codigo = 'premium';

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'beneficio', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('Descarga de todos los documentos en Word 100% editable.', 1),
  ('Soporte y asesoría técnica y pedagógica prioritaria.', 2),
  ('Acceso exclusivo a nuestra Comunidad Privada de WhatsApp para docentes EducaPlus.', 3),
  ('Notificaciones prioritarias ante cualquier cambio normativo o actualización del esquema de evaluación.', 4)
) AS v(texto, ord) WHERE codigo = 'premium';

INSERT INTO "plan_catalogo_limite" ("id_plan_catalogo", "tipo_documento", "limite_mensual", "limite_anual")
SELECT id, v.tipo, v.mensual, NULL FROM "plan_catalogo", (VALUES
  ('plan_anual', 6),
  ('unidad', 6),
  ('sesion', 50),
  ('ficha', 50),
  ('solucionario', 50),
  ('rubrica', 50),
  ('lista_cotejo', 50),
  ('sesion_refuerzo', 25)
) AS v(tipo, mensual) WHERE codigo = 'premium';

-- PLAN ANUAL
INSERT INTO "plan_catalogo" (
  "codigo", "nombre", "precio", "periodo", "vigencia", "sesiones_por_unidad",
  "creditos_regeneracion", "creditos_etiqueta", "max_pares_area_grado",
  "generacion_titulo", "cta", "tema", "nota_uso_justo", "orden", "updated_at"
) VALUES (
  'anual', 'PLAN ANUAL', 449.90, 'anual', 'anual', 10,
  2500, '2500 TOTAL CRÉDITOS', 5,
  '¿Qué podrás generar en este plan?', 'Empezar con el Plan Anual', 'verde',
  'Política de uso justo: para garantizar la velocidad del sistema, dispones de hasta 350 generaciones de documentos cada mes.',
  3, CURRENT_TIMESTAMP
);

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'generacion', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('12 Programaciones Anuales', 1),
  ('12 Unidades de Aprendizaje', 2),
  ('450 Sesiones de Aprendizaje en el año', 3),
  ('450 Fichas de aprendizaje', 4),
  ('450 Solucionarios de ficha', 5),
  ('450 Rúbricas', 6),
  ('450 Listas de cotejo', 7),
  ('BONUS: 200 Sesiones de Refuerzo', 8),
  ('Máxima capacidad de regeneración de documentos', 9)
) AS v(texto, ord) WHERE codigo = 'anual';

INSERT INTO "plan_catalogo_item" ("id_plan_catalogo", "tipo", "texto", "orden")
SELECT id, 'beneficio', v.texto, v.ord FROM "plan_catalogo", (VALUES
  ('Descarga ilimitada de tus creaciones en Word editable.', 1),
  ('Soporte pedagógico VIP con línea directa.', 2),
  ('Acceso anticipado a nuevas herramientas (sé el primero en usar los módulos de conclusiones descriptivas automáticas).', 3),
  ('Masterclass grabada exclusiva: "Cómo usar la IA de EducaPlus para reducir tu trabajo a la mitad".', 4),
  ('Acceso exclusivo a nuestra Comunidad Privada de WhatsApp para docentes EducaPlus (networking y tips de uso).', 5),
  ('Notificaciones prioritarias ante cualquier cambio normativo o actualización del esquema de evaluación.', 6)
) AS v(texto, ord) WHERE codigo = 'anual';

INSERT INTO "plan_catalogo_limite" ("id_plan_catalogo", "tipo_documento", "limite_mensual", "limite_anual")
SELECT id, v.tipo, v.mensual, v.anual FROM "plan_catalogo", (VALUES
  ('plan_anual', NULL, 12),
  ('unidad', NULL, 12),
  ('sesion', 350, 450),
  ('ficha', NULL, 450),
  ('solucionario', NULL, 450),
  ('rubrica', NULL, 450),
  ('lista_cotejo', NULL, 450),
  ('sesion_refuerzo', NULL, 200)
) AS v(tipo, mensual, anual) WHERE codigo = 'anual';
