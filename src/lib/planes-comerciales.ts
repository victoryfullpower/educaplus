/** Precios y catálogo comercial EducaPlus (soles) — fuente única para /planes y /planes/comprar */

export type AreaTipoComercial = 'A' | 'B'

export type GradosVentaUnidad = '1' | '2' | '3' | '4' | '15'

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

/** Venta por unidad: precio según cantidad de grados cubiertos */
export const PRECIO_UNIDAD: Record<
  AreaTipoComercial,
  Record<GradosVentaUnidad, number>
> = {
  A: { '1': 18, '2': 35, '3': 50, '4': 60, '15': 69 },
  B: { '1': 15, '2': 28, '3': 42, '4': 50, '15': 55 }
}

/** Kit anual (8 unidades), grados 1° a 5° */
export const PRECIO_KIT_ANUAL: Record<AreaTipoComercial, number> = {
  A: 399,
  B: 249
}

export const ETIQUETA_GRADOS_UNIDAD: Record<GradosVentaUnidad, string> = {
  '1': 'Un grado',
  '2': 'Dos grados',
  '3': 'Tres grados',
  '4': 'Cuatro grados',
  '15': '1° a 5° grado'
}

export function precioUnidad(tipo: AreaTipoComercial, grados: GradosVentaUnidad): number {
  return PRECIO_UNIDAD[tipo][grados]
}

export function precioKit(tipo: AreaTipoComercial): number {
  return PRECIO_KIT_ANUAL[tipo]
}
