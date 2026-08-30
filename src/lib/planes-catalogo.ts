/** Catálogo de planes — tipos y respaldo estático si la BD aún no tiene datos. */

export type PlanSuscripcionId = 'basico' | 'premium' | 'anual'

export type PlanSuscripcionCatalogo = {
  id: PlanSuscripcionId
  nombre: string
  precio: number
  periodo: 'mes' | 'anual'
  creditos: string
  destacado?: string
  etiqueta?: string
  generacionTitulo: string
  generacion: string[]
  beneficios: string[]
  cta: string
  tema: 'verde' | 'naranja' | 'azul'
}

export const PLANES_SUSCRIPCION: PlanSuscripcionCatalogo[] = [
  
  
]

export const NOTA_USO_JUSTO_ANUAL =
  'Política de uso justo: para garantizar la velocidad del sistema, dispones de hasta 350 generaciones de documentos cada mes.'

export function hrefComprarSuscripcion(id: PlanSuscripcionId): string {
  return `/planes/comprar?suscripcion=${id}`
}

export function formatearPrecioPlan(precio: number, periodo: 'mes' | 'anual'): string {
  const monto = precio.toFixed(2)
  if (periodo === 'mes') return `S/ ${monto} al mes`
  return `S/ ${monto} / anual`
}
