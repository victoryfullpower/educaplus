import type { EstadoDocumentosPlan } from '@/lib/plan-estado-documentos'
import type { ModalReturnPaso } from '@/lib/plan-modal-return'

type PlanLinkInput = {
  id: number
  anio?: number
  areaId?: string | null
  gradoId?: string | null
}

/** Enlace a sesiones con datos precargados desde una unidad del plan. */
export function linkSesionesDesdeUnidadPlan(
  plan: PlanLinkInput,
  unidadNumero: string | number | null | undefined,
  opciones?: { volver?: ModalReturnPaso }
): string {
  const params = new URLSearchParams()
  if (plan.areaId) params.set('areaId', String(plan.areaId))
  if (plan.gradoId) params.set('gradoId', String(plan.gradoId))
  if (unidadNumero != null && String(unidadNumero).trim() !== '') {
    params.set('unidad', String(unidadNumero))
  }
  params.set('planId', String(plan.id))
  params.set('desdeUnidad', '1')
  if (opciones?.volver) params.set('volver', opciones.volver)
  return `/servicios/crear-material/sesiones-fichas?${params.toString()}`
}

/** Enlace a ficha de aprendizaje tras generar una sesión del plan. */
export function linkFichasDesdeSesionPlan(
  plan: PlanLinkInput,
  unidadNumero: string | number | null | undefined,
  numeroSesion: number | string
): string {
  const params = new URLSearchParams()
  params.set('planId', String(plan.id))
  if (plan.areaId) params.set('areaId', String(plan.areaId))
  if (plan.gradoId) params.set('gradoId', String(plan.gradoId))
  if (unidadNumero != null && String(unidadNumero).trim() !== '') {
    params.set('unidad', String(unidadNumero))
  }
  params.set('sesion', String(numeroSesion))
  params.set('desdeSesion', '1')
  return `/servicios/crear-material/ficha-aprendizaje?${params.toString()}`
}

/** Enlace a rúbrica analítica desde una sesión del plan. */
export function linkRubricaDesdeSesionPlan(
  plan: PlanLinkInput,
  unidadNumero: string | number | null | undefined,
  numeroSesion: number | string
): string {
  const params = new URLSearchParams()
  params.set('planId', String(plan.id))
  if (plan.areaId) params.set('areaId', String(plan.areaId))
  if (plan.gradoId) params.set('gradoId', String(plan.gradoId))
  if (unidadNumero != null && String(unidadNumero).trim() !== '') {
    params.set('unidad', String(unidadNumero))
  }
  params.set('sesion', String(numeroSesion))
  params.set('desdeSesion', '1')
  return `/servicios/crear-material/rubricas-solo?${params.toString()}`
}

export function unidadInicialDesdePlanUnidades(unidades: unknown): number {
  if (!Array.isArray(unidades)) return 1
  for (let i = 1; i <= 8; i++) {
    const u = unidades[i] as {
      problemaPotencialidad?: string
      producto?: string
      situacionSignificativa?: string
    }
    if (
      u?.problemaPotencialidad?.trim() ||
      u?.producto?.trim() ||
      u?.situacionSignificativa?.trim()
    ) {
      return i
    }
  }
  return 1
}

export function linkGenerarDocumento(
  paso: keyof EstadoDocumentosPlan,
  plan: PlanLinkInput,
  unidades?: unknown
): string {
  const unidadNum = unidadInicialDesdePlanUnidades(unidades)
  switch (paso) {
    case 'planAnual':
      return `/servicios/crear-material/programacion-anual?planId=${plan.id}`
    case 'unidad':
      return `/servicios/crear-material/unidades-aprendizaje?planId=${plan.id}&unidad=${unidadNum}`
    case 'sesiones':
      return `/servicios/crear-material/sesiones-fichas`
    case 'fichas':
      return `/servicios/crear-material/ficha-aprendizaje`
    case 'rubrica':
      return `/servicios/crear-material/rubricas-solo`
    default:
      return '/servicios/crear-material'
  }
}

export function etiquetaLinkGenerar(paso: keyof EstadoDocumentosPlan): string {
  switch (paso) {
    case 'planAnual':
      return 'Editar Plan anual'
    case 'unidad':
      return 'Generar unidad de aprendizaje desde este plan'
    case 'sesiones':
      return 'Generar sesiones de aprendizaje'
    case 'fichas':
      return 'Generar fichas de aprendizaje'
    case 'rubrica':
      return 'Generar rúbrica analítica'
    default:
      return 'Generar documento'
  }
}
