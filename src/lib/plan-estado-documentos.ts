export type EstadoDocumentosPlan = {
  planAnual: boolean
  unidad: boolean
  sesiones: boolean
  fichas: boolean
  rubrica: boolean
  /** Números de unidad (1–8) ya generadas en BD para este plan */
  unidadesGeneradas?: number[]
}

type PlanLike = {
  id: number
  anio: number
  areaId: string
  gradoId: string
  unidades?: unknown
}

type SesionLike = {
  titulo?: string | null
  motivacion?: string | null
  desarrollo?: string | null
  proposito?: string | null
  saberes?: string | null
  fichaAprendizaje?: { id: number } | null
  rubrica?: { id: number } | null
}

type UnidadLike = {
  idplananual: number | null
  anio: number
  areaId: string | null
  gradoId: string | null
  enfoquesTransversales?: unknown
  variablesTemplate?: unknown
  propositoUnidad?: string | null
  tituloUnidad?: string | null
  sesiones?: unknown
  listaSesiones: SesionLike[]
}

function unidadPerteneceAlPlan(unidad: UnidadLike, plan: PlanLike): boolean {
  if (unidad.idplananual === plan.id) return true
  return (
    unidad.anio === plan.anio &&
    String(unidad.areaId ?? '') === String(plan.areaId ?? '') &&
    String(unidad.gradoId ?? '') === String(plan.gradoId ?? '')
  )
}

export type UnidadAprendizajeGeneradaCheck = {
  unidad?: string | null
  enfoquesTransversales?: unknown
  variablesTemplate?: unknown
  propositoUnidad?: string | null
  tituloUnidad?: string | null
  sesiones?: unknown
  listaSesiones?: SesionLike[]
}

/** Indica si la unidad de aprendizaje ya fue generada y guardada en BD. */
export function unidadAprendizajeEstaGenerada(u: UnidadAprendizajeGeneradaCheck): boolean {
  if (u.enfoquesTransversales) return true
  if (u.variablesTemplate) return true
  if (u.propositoUnidad?.trim()) return true
  if (u.tituloUnidad?.trim()) return true
  if (u.listaSesiones && u.listaSesiones.length > 0) return true
  const sesionesJson = u.sesiones
  if (Array.isArray(sesionesJson) && sesionesJson.length > 0) return true
  return false
}

/** Primer tipoIE definido entre las unidades de un plan (p. ej. "1" = Pública, "2" = Privado). */
export function obtenerTipoIEDelPlan(
  unidades: Array<{ tipoIE?: string | null }>
): string {
  for (const u of unidades) {
    const t = String(u.tipoIE ?? '').trim()
    if (t) return t
  }
  return ''
}

export function numerosUnidadYaGenerados(
  unidadesDb: UnidadAprendizajeGeneradaCheck[]
): Set<number> {
  const nums = new Set<number>()
  for (const u of unidadesDb) {
    if (!unidadAprendizajeEstaGenerada(u)) continue
    const n = parseInt(String(u.unidad ?? ''), 10)
    if (!Number.isNaN(n) && n >= 1) nums.add(n)
  }
  return nums
}

function unidadTieneDocumentoGenerado(unidad: UnidadLike): boolean {
  return unidadAprendizajeEstaGenerada(unidad)
}

export function sesionTieneDocumento(s: SesionLike): boolean {
  return !!(
    s.titulo?.trim() ||
    s.motivacion?.trim() ||
    s.desarrollo?.trim() ||
    s.proposito?.trim() ||
    s.saberes?.trim()
  )
}

/** Mismo criterio que el listado del modal Home y /api/plan-anual/documentos. */
export function sesionVisibleEnModal(s: SesionLike): boolean {
  return !!(
    s.titulo?.trim() ||
    s.motivacion?.trim() ||
    s.desarrollo?.trim() ||
    s.proposito?.trim()
  )
}

type SesionPlanificadaJson = {
  titulo?: string
  competenciasSeleccionadas?: string[]
}

/** Total planificado en la unidad, generadas en BD y pendientes (alineado al modal Home). */
export function resumenSesionesUnidad(u: {
  sesiones?: unknown
  listaSesiones?: Array<SesionLike & { numeroSesion?: number }>
}): { total: number; generadas: number; pendientes: number } {
  const numerosPlanificados = new Set<number>()
  if (Array.isArray(u.sesiones)) {
    u.sesiones.forEach((raw, index) => {
      const s = raw as SesionPlanificadaJson
      const tieneDatos =
        !!s &&
        (!!s.titulo?.trim() ||
          (Array.isArray(s.competenciasSeleccionadas) &&
            s.competenciasSeleccionadas.length > 0))
      if (tieneDatos) numerosPlanificados.add(index + 1)
    })
  }

  const numerosGeneradosVisibles = new Set<number>(
    (u.listaSesiones ?? [])
      .filter(sesionVisibleEnModal)
      .map((s) => s.numeroSesion)
      .filter((n): n is number => typeof n === 'number' && n >= 1)
  )

  const todosNumeros = new Set<number>([
    ...numerosPlanificados,
    ...numerosGeneradosVisibles
  ])
  let pendientes = 0
  for (const n of numerosPlanificados) {
    if (!numerosGeneradosVisibles.has(n)) pendientes += 1
  }

  const total =
    numerosPlanificados.size > 0 ? numerosPlanificados.size : todosNumeros.size

  return {
    total,
    generadas: numerosGeneradosVisibles.size,
    pendientes
  }
}

/** Texto corto para botón: generadas de total planificadas (ej. "2 de 5"). */
export function etiquetaContadorSesionesPendientes(resumen: {
  total: number
  generadas: number
  pendientes: number
}): string | null {
  if (resumen.total <= 0) return null
  return ` (${resumen.generadas} de ${resumen.total})`
}

export function calcularEstadoDocumentos(
  plan: PlanLike,
  unidadesUsuario: UnidadLike[]
): EstadoDocumentosPlan {
  const relacionadas = unidadesUsuario.filter((u) => unidadPerteneceAlPlan(u, plan))
  const todasSesiones = relacionadas.flatMap((u) => u.listaSesiones)

  const unidadesArr = Array.isArray(plan.unidades) ? plan.unidades : []
  const planConContenido = unidadesArr.some((u, i) => {
    if (i === 0) return false
    const slot = u as { problemaPotencialidad?: string; producto?: string }
    return !!(slot?.problemaPotencialidad?.trim() || slot?.producto?.trim())
  })

  return {
    planAnual: planConContenido || true,
    unidad: relacionadas.some(unidadTieneDocumentoGenerado),
    sesiones: todasSesiones.some(sesionTieneDocumento),
    fichas: todasSesiones.some((s) => !!s.fichaAprendizaje),
    rubrica: todasSesiones.some((s) => !!s.rubrica)
  }
}

export function unidadesGeneradasDelPlan(
  plan: PlanLike,
  unidadesUsuario: UnidadAprendizajeGeneradaCheck[]
): number[] {
  const relacionadas = unidadesUsuario.filter((u) =>
    unidadPerteneceAlPlan(u as UnidadLike, plan)
  )
  return Array.from(numerosUnidadYaGenerados(relacionadas)).sort((a, b) => a - b)
}

export function enriquecerPlanesConEstado<T extends PlanLike>(
  planes: T[],
  unidadesUsuario: UnidadLike[]
): Array<T & { estadoDocumentos: EstadoDocumentosPlan }> {
  return planes.map((plan) => {
    const base = calcularEstadoDocumentos(plan, unidadesUsuario)
    const unidadesGeneradas = unidadesGeneradasDelPlan(plan, unidadesUsuario)
    return {
      ...plan,
      estadoDocumentos: {
        ...base,
        unidadesGeneradas
      }
    }
  })
}
