/** Precios y catálogo comercial EducaPlus (soles) — fuente única para /planes y /planes/comprar */

export type AreaTipoComercial = 'A' | 'B'
export type PlanVigencia = 'mensual' | 'anual'
export type SesionesPorUnidad = 5 | 10
export type CantidadGrados = '1' | '2' | '3' | '4' | '5'

/** @deprecated usar CantidadGrados en flujos nuevos */
export type GradosVentaUnidad = CantidadGrados | '15'

export const AREAS_TIPO_A: string[] = [
  'Comunicación',
  'Matemática',
  'Ciencia y Tecnología',
  'CCSS'
]

export const AREAS_TIPO_B: string[] = [
  'DPCC',
  'Inglés',
  'Arte',
  'Física',
  'Tutoría',
  'Religión',
  'Quechua',
  'EPT Computación',
  'EPT Agropecuaria',
  'EPT Emprendimiento'
]

export const ETIQUETA_GRADOS: Record<CantidadGrados, string> = {
  '1': 'Un grado',
  '2': 'Dos grados',
  '3': 'Tres grados',
  '4': 'Cuatro grados',
  '5': 'Cinco grados'
}

/** @deprecated usar ETIQUETA_GRADOS */
export const ETIQUETA_GRADOS_UNIDAD: Record<GradosVentaUnidad, string> = {
  ...ETIQUETA_GRADOS,
  '15': '1° a 5° grado'
}

/** Plan mensual (por unidad) — 5 sesiones ≈ tipo B, 10 sesiones ≈ tipo A */
export const PRECIO_MENSUAL: Record<SesionesPorUnidad, Record<CantidadGrados, number>> = {
  5: { '1': 15, '2': 28, '3': 39, '4': 48, '5': 55 },
  10: { '1': 18, '2': 35, '3': 50, '4': 60, '5': 69 }
}

/** Plan anual (kit) */
export const PRECIO_ANUAL: Record<SesionesPorUnidad, Record<CantidadGrados, number>> = {
  5: { '1': 99, '2': 169, '3': 239, '4': 289, '5': 329 },
  10: { '1': 119, '2': 239, '3': 299, '4': 359, '5': 399 }
}

/** Venta por unidad (legacy — alineado a 5 y 10 sesiones) */
export const PRECIO_UNIDAD: Record<
  AreaTipoComercial,
  Record<CantidadGrados, number>
> = {
  A: PRECIO_MENSUAL[10],
  B: PRECIO_MENSUAL[5]
}

/** Kit anual legacy (máximo alcance 5 grados) */
export const PRECIO_KIT_ANUAL: Record<AreaTipoComercial, number> = {
  A: PRECIO_ANUAL[10]['5'],
  B: PRECIO_ANUAL[5]['5']
}

export const GRADOS_KEYS: CantidadGrados[] = ['1', '2', '3', '4', '5']

export function areaTipoFromSesiones(sesiones: SesionesPorUnidad): AreaTipoComercial {
  return sesiones === 5 ? 'B' : 'A'
}

export function precioPlan(
  vigencia: PlanVigencia,
  sesiones: SesionesPorUnidad,
  grados: CantidadGrados
): number {
  const tabla = vigencia === 'mensual' ? PRECIO_MENSUAL : PRECIO_ANUAL
  return tabla[sesiones][grados]
}

export function precioUnidad(tipo: AreaTipoComercial, grados: CantidadGrados): number {
  return PRECIO_UNIDAD[tipo][grados]
}

export function precioKit(tipo: AreaTipoComercial): number {
  return PRECIO_KIT_ANUAL[tipo]
}

export function includesPorGrado(sesiones: SesionesPorUnidad): string[] {
  return [
    'Programación anual',
    'Unidad de aprendizaje',
    `${sesiones} sesiones de aprendizaje (con procesos pedagógicos y didácticos)`,
    `${sesiones} fichas / actividades de aprendizaje`,
    `${sesiones} rúbricas analíticas`,
    `${sesiones} solucionarios`
  ]
}
