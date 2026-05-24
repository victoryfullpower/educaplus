function nombreDesdeContentDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback
  const match = header.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
  if (match?.[1]) {
    return decodeURIComponent(match[1].replace(/['"]/g, ''))
  }
  return fallback
}

export async function descargarBlobDesdeResponse(
  response: Response,
  nombrePorDefecto: string
): Promise<void> {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      (err as { error?: string }).error || `Error al descargar (${response.status})`
    )
  }
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreDesdeContentDisposition(
    response.headers.get('Content-Disposition'),
    nombrePorDefecto
  )
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export async function descargarUnidadAprendizaje(unidadId: number): Promise<void> {
  const resUa = await fetch(`/api/unidad-aprendizaje?id=${unidadId}`)
  if (!resUa.ok) throw new Error('No se encontró la unidad')
  const data = await resUa.json()
  const ua = data.unidadAprendizaje
  if (!ua) throw new Error('Unidad no encontrada')

  const res = await fetch('/api/unidades-aprendizaje/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: {
        area: ua.area,
        areaId: ua.areaId,
        grado: ua.grado,
        gradoId: ua.gradoId,
        ciclo: ua.ciclo,
        cicloId: ua.cicloId,
        unidad: ua.unidad,
        institucion: ua.institucion,
        tipoIE: ua.tipoIE,
        director: ua.director,
        docente: ua.docente,
        duracion: ua.duracion,
        fechaInicio: ua.fechaInicio,
        fechaTermino: ua.fechaTermino,
        situacionSignificativa: ua.situacionSignificativa,
        producto: ua.producto,
        propositoUnidad: ua.propositoUnidad,
        anio: ua.anio,
        forzarRegeneracion: false
      }
    })
  })

  const slug = (ua.area || 'unidad').replace(/\s+/g, '_')
  await descargarBlobDesdeResponse(res, `Unidad_${ua.unidad}_${slug}.docx`)
}

export async function descargarSesionAprendizaje(sesionId: number): Promise<void> {
  const resPrep = await fetch(`/api/sesiones-fichas/sesion-para-descarga?id=${sesionId}`)
  if (!resPrep.ok) throw new Error('No se pudo cargar la sesión')
  const payload = await resPrep.json()

  const res = await fetch('/api/sesiones-fichas/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: payload.formData,
      sesionData: payload.sesionData,
      unidadData: payload.unidadData,
      contenidoDesdeBD: payload.contenidoDesdeBD
    })
  })

  const area = payload.formData?.area || 'sesion'
  const num = payload.sesionData?.numeroSesion || sesionId
  await descargarBlobDesdeResponse(
    res,
    `Sesion_${num}_${String(area).replace(/\s+/g, '_')}.docx`
  )
}

export async function descargarFichaAprendizaje(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/generate-document-ficha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId, forceRegenerate: false })
  })
  await descargarBlobDesdeResponse(res, `Ficha_Sesion_${sesionId}.docx`)
}

export async function descargarRubricaAnalitica(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/generate-document-rubrica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId, forceRegenerate: false })
  })
  await descargarBlobDesdeResponse(res, `Rubrica_Sesion_${sesionId}.docx`)
}

/** Genera o descarga Lista de Cotejo (sin IA; guarda en BD la primera vez). */
export async function descargarListaCotejo(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/generate-document-lista-cotejo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId, forceRegenerate: false })
  })
  await descargarBlobDesdeResponse(res, `Lista_Cotejo_Sesion_${sesionId}.docx`)
}

type UnidadPlanGuardada = {
  problemaPotencialidad?: string
  producto?: string
  competenciasSeleccionadas?: unknown[]
  conocimientosSeleccionados?: unknown[]
  desempeniosSeleccionados?: unknown[]
  tituloUnidad?: string
  tieneTituloIA?: boolean
  situacionSignificativa?: string
  campoTematico?: string
  competenciaSeleccionada?: string
  capacidadSeleccionada?: string
  conocimientos?: string
}

const UNIDAD_PLAN_VACIA: UnidadPlanGuardada = {
  problemaPotencialidad: '',
  producto: '',
  competenciasSeleccionadas: [],
  conocimientosSeleccionados: [],
  desempeniosSeleccionados: [],
  tituloUnidad: '',
  tieneTituloIA: true
}

export type PlanAnualParaDescarga = {
  id: number
  anio?: number
  area?: string | null
  areaId?: string | null
  grado?: string | null
  gradoId?: string | null
  nivel?: string | null
  nivelId?: string | null
  institucion?: string | null
  docente?: string | null
  departamento?: string | null
  provincia?: string | null
  distrito?: string | null
  unidades?: unknown
}

/** Exporta el Word del plan con datos ya guardados; no llama a la IA. */
export async function descargarPlanAnual(plan: PlanAnualParaDescarga): Promise<void> {
  let unidadesRaw = plan.unidades
  const planRes = await fetch(`/api/plan-anual?id=${plan.id}`)
  if (planRes.ok) {
    const data = await planRes.json()
    if (data.planAnual?.unidades) {
      unidadesRaw = data.planAnual.unidades
    }
  }

  const arr = Array.isArray(unidadesRaw) ? (unidadesRaw as UnidadPlanGuardada[]) : []
  const unidadesParaEnviar: UnidadPlanGuardada[] = []
  const datosExistentes: Record<
    number,
    { situacionSignificativa: string; campoTematico: string; tituloUnidad: string }
  > = {}

  for (let i = 0; i < 9; i++) {
    const u = arr[i]
    unidadesParaEnviar[i] = u ? { ...UNIDAD_PLAN_VACIA, ...u } : { ...UNIDAD_PLAN_VACIA }

    if (!u) continue
    const tieneDatosGenerados =
      (u.situacionSignificativa?.trim()?.length ?? 0) > 0 ||
      (u.campoTematico?.trim()?.length ?? 0) > 0 ||
      (u.tituloUnidad?.trim()?.length ?? 0) > 0

    if (tieneDatosGenerados) {
      datosExistentes[i] = {
        situacionSignificativa: u.situacionSignificativa || '',
        campoTematico: u.campoTematico || '',
        tituloUnidad: u.tituloUnidad || ''
      }
    }
  }

  const response = await fetch('/api/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: {
        area: plan.area,
        areaId: plan.areaId,
        grado: plan.grado,
        gradoId: plan.gradoId,
        nivel: plan.nivel,
        nivelId: plan.nivelId,
        institucion: plan.institucion,
        docente: plan.docente,
        departamento: plan.departamento,
        provincia: plan.provincia,
        distrito: plan.distrito
      },
      unidades: unidadesParaEnviar,
      modoGeneracion: 'actualizar',
      unidadesParaGenerar: [],
      datosExistentes,
      planAnualId: plan.id,
      soloExportar: true
    })
  })

  const areaSlug = (plan.area || 'plan').replace(/\s+/g, '_')
  await descargarBlobDesdeResponse(
    response,
    `PLANIFICACION_ANUAL_${areaSlug}_${plan.grado || plan.anio || 'plan'}.docx`
  )
}
