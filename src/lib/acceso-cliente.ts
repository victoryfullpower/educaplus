export {
  MAX_SESION_NUMERO_TRIAL,
  MAX_UNIDAD_INDEX_TRIAL_PLAN,
  MSG_TRIAL_SOLO_SESION_1,
  MSG_TRIAL_SOLO_UNIDAD_1,
  SESION_NUMERO_TRIAL,
  UNIDAD_NUMERO_TRIAL,
  parseNumeroUnidad,
  sesionPermitidaEnTrial,
  unidadPermitidaEnTrial
} from '@/lib/acceso-trial'

export type SuscripcionGradoCliente = {
  areaId: string
  gradoId: string
  nivelId?: string | null
}

export type SuscripcionActivaCliente = {
  id: number
  grados?: SuscripcionGradoCliente[]
} | null

export function tieneSuscripcionActivaParaGrado(
  suscripcion: SuscripcionActivaCliente | undefined | null,
  areaId: string,
  gradoId: string
): boolean {
  if (!suscripcion) return false
  const grados = suscripcion.grados ?? []
  if (grados.length === 0) return true
  if (!areaId || !gradoId) return false
  return grados.some(
    (g) => String(g.areaId) === String(areaId) && String(g.gradoId) === String(gradoId)
  )
}

export type UnidadPlanConfigInput = {
  problemaPotencialidad?: string
  producto?: string
  competenciaSeleccionada?: string
  competenciasSeleccionadas?: string[]
  desempeniosSeleccionados?: string[]
  tituloUnidad?: string
}

export function unidadPlanTieneConfiguracion(unidad: UnidadPlanConfigInput): boolean {
  return !!(
    unidad.problemaPotencialidad?.trim() ||
    unidad.producto?.trim() ||
    unidad.competenciaSeleccionada?.trim() ||
    (unidad.competenciasSeleccionadas?.length ?? 0) > 0 ||
    (unidad.desempeniosSeleccionados?.length ?? 0) > 0 ||
    unidad.tituloUnidad?.trim()
  )
}

export function unidadAprendizajeTieneContenidoGuardado(u: {
  situacionSignificativa?: string | null
  producto?: string | null
  propositoUnidad?: string | null
  sesiones?: unknown
}): boolean {
  if (u.situacionSignificativa?.trim() || u.producto?.trim() || u.propositoUnidad?.trim()) {
    return true
  }
  if (u.sesiones == null) return false
  try {
    const sesiones =
      typeof u.sesiones === 'string' ? JSON.parse(u.sesiones) : u.sesiones
    return Array.isArray(sesiones) && sesiones.length > 0
  } catch {
    return String(u.sesiones).length > 2
  }
}

export function payloadUnidadPlanVacia() {
  return {
    problemaPotencialidad: '',
    producto: '',
    tieneTituloIA: true,
    tieneSituacionIA: true,
    tituloUnidad: '',
    situacionSignificativa: '',
    camposTematicos: [] as string[],
    campoTematico: '',
    competenciaSeleccionada: '',
    competenciasSeleccionadas: [] as string[],
    capacidadSeleccionada: '',
    capacidadesSeleccionadas: [] as string[],
    desempeniosSeleccionados: [] as string[],
    conocimientos: ''
  }
}
