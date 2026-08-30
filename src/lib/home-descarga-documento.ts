import { errorDesdeResponse } from '@/lib/error-generacion-documento'

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
    throw await errorDesdeResponse(response, 'Error al descargar el documento')
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

type UnidadAprendizajeRecord = {
  area?: string | null
  areaId?: string | null
  grado?: string | null
  gradoId?: string | null
  ciclo?: string | null
  cicloId?: string | null
  unidad?: string | null
  institucion?: string | null
  tipoIE?: string | null
  director?: string | null
  docente?: string | null
  duracion?: string | null
  fechaInicio?: string | null
  fechaTermino?: string | null
  situacionSignificativa?: string | null
  producto?: string | null
  tituloUnidad?: string | null
  propositoUnidad?: string | null
  campoTematico?: string | null
  numeroSesiones?: string | null
  instrumentoEvaluacion?: string | null
  competencias?: unknown
  sesiones?: unknown
  anio?: number | null
}

async function cargarUnidadAprendizaje(unidadId: number): Promise<UnidadAprendizajeRecord> {
  const resUa = await fetch(`/api/unidad-aprendizaje?id=${unidadId}`)
  if (!resUa.ok) throw new Error('No se encontró la unidad')
  const data = await resUa.json()
  const ua = data.unidadAprendizaje
  if (!ua) throw new Error('Unidad no encontrada')
  return ua as UnidadAprendizajeRecord
}

function formDataDesdeUnidad(
  ua: UnidadAprendizajeRecord,
  opts: { forzarRegeneracion: boolean }
) {
  const sesiones = Array.isArray(ua.sesiones) ? ua.sesiones : []
  return {
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
    tituloUnidad: ua.tituloUnidad,
    propositoUnidad: ua.propositoUnidad,
    campoTematico: ua.campoTematico,
    numeroSesiones: ua.numeroSesiones,
    instrumentoEvaluacion: ua.instrumentoEvaluacion,
    competencias: ua.competencias,
    sesiones,
    anio: ua.anio,
    forzarRegeneracion: opts.forzarRegeneracion
  }
}

function nombreArchivoUnidad(ua: UnidadAprendizajeRecord) {
  const slug = (ua.area || 'unidad').replace(/\s+/g, '_')
  return `Unidad_${ua.unidad}_${slug}.docx`
}

async function solicitarDocumentoUnidad(unidadId: number, forzarRegeneracion: boolean) {
  const ua = await cargarUnidadAprendizaje(unidadId)
  const res = await fetch('/api/unidades-aprendizaje/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: formDataDesdeUnidad(ua, { forzarRegeneracion })
    })
  })
  return { res, ua }
}

export async function descargarUnidadAprendizaje(unidadId: number): Promise<void> {
  const { res, ua } = await solicitarDocumentoUnidad(unidadId, false)
  await descargarBlobDesdeResponse(res, nombreArchivoUnidad(ua))
}

/** Regenera el cuadro de sesiones con IA y descarga el documento actualizado. */
export async function regenerarUnidadAprendizaje(unidadId: number): Promise<void> {
  const { res, ua } = await solicitarDocumentoUnidad(unidadId, true)
  await descargarBlobDesdeResponse(res, nombreArchivoUnidad(ua))
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
      contenidoDesdeBD: payload.contenidoDesdeBD,
      formato: 'json'
    })
  })

  const area = payload.formData?.area || 'sesion'
  const num = payload.sesionData?.numeroSesion || sesionId
  await descargarSesionDesdeRespuestaJson(
    res,
    `Sesion_${num}_${String(area).replace(/\s+/g, '_')}.docx`
  )
}

/** Regenera sesión con GPT e incluye ficha, solucionario y rúbrica (1 crédito de regeneración). */
export async function regenerarSesionAprendizaje(sesionId: number): Promise<void> {
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
      forzarRegeneracion: true,
      formato: 'json'
    })
  })

  const area = payload.formData?.area || 'sesion'
  const num = payload.sesionData?.numeroSesion || sesionId
  await descargarSesionDesdeRespuestaJson(
    res,
    `Sesion_${num}_${String(area).replace(/\s+/g, '_')}_regen.docx`
  )
}

export type FichaAprendizajeGenerada = {
  vista: FichaVistaData & { sesionId: number }
}

/**
 * Genera la ficha con IA (si hace falta), abre datos de vista y descarga el Word
 * con el mismo contenido HTML de la vista previa.
 */
export async function generarFichaAprendizaje(
  sesionId: number
): Promise<FichaAprendizajeGenerada> {
  const res = await fetch('/api/sesiones-fichas/generate-document-ficha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId, forceRegenerate: false, formato: 'json' })
  })
  if (!res.ok) {
    throw await errorDesdeResponse(res, 'Error al generar la ficha de aprendizaje')
  }
  const data = (await res.json()) as {
    vista?: FichaVistaData & { sesionId: number }
    respuesta?: { docxBase64: string; fileName: string }
  }
  if (!data.vista?.respuestaprompt) {
    throw new Error('La IA no devolvió contenido para la vista de la ficha')
  }
  if (data.respuesta?.docxBase64) {
    descargarDocxBase64(data.respuesta.docxBase64, data.respuesta.fileName)
  }
  await descargarFichaAprendizaje(sesionId)
  return { vista: data.vista }
}

export async function descargarFichaAprendizaje(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/ficha-word-vista/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId })
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

/** Genera rúbrica con IA (Prompt_Rubrica), guarda en BD y descarga Word. */
export async function generarRubricaAnalitica(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/generate-document-rubrica', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // forceRegenerate false: si no hay rúbrica en BD, la genera y guarda
    body: JSON.stringify({ sesionId, forceRegenerate: false })
  })
  await descargarBlobDesdeResponse(res, `Rubrica_Sesion_${sesionId}.docx`)
}

export async function descargarSolucionario(sesionId: number): Promise<void> {
  const res = await fetch('/api/sesiones-fichas/solucionario-word-vista/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId })
  })
  await descargarBlobDesdeResponse(res, `Solucionario_Sesion_${sesionId}.docx`)
}

function descargarDocxBase64(docxBase64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(docxBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

function descargarArchivoBase64(
  base64: string,
  fileName: string,
  contentType: string
): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: contentType })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

type RespuestaSesionJson = {
  documento?: { docxBase64: string; fileName: string; contentType?: string }
  prompt?: { docxBase64: string; fileName: string }
  respuesta?: { tableText: string }
}

export async function descargarSesionDesdeRespuestaJson(
  res: Response,
  nombreDocumentoFallback: string
): Promise<void> {
  if (!res.ok) {
    throw await errorDesdeResponse(res, 'Error al generar la sesión')
  }
  const data = (await res.json()) as RespuestaSesionJson
  if (data.prompt?.docxBase64) {
    descargarDocxBase64(data.prompt.docxBase64, data.prompt.fileName)
  }
  if (data.documento?.docxBase64) {
    descargarArchivoBase64(
      data.documento.docxBase64,
      data.documento.fileName || nombreDocumentoFallback,
      data.documento.contentType ||
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  }
  if (data.respuesta?.tableText?.trim()) {
    const areaSlug = nombreDocumentoFallback
      .replace(/^Sesion_/i, '')
      .replace(/\.(docx|pdf)$/i, '')
    const nombreGpt = `SESION_GPT_${areaSlug}.docx`
    const responseGpt = await fetch('/api/sesiones-fichas/respuesta-gpt-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableText: data.respuesta.tableText, fileName: nombreGpt })
    })
    await descargarBlobDesdeResponse(responseGpt, nombreGpt)
  }
}

import type { SesionRefuerzoVistaData } from '@/lib/sesion-refuerzo-vista-html'
import type { ExamenUnidadVistaData } from '@/lib/examen-vista-html'
import type { ConclusionesVistaData } from '@/lib/conclusiones-vista-html'
import type { FichaVistaData } from '@/lib/ficha-vista-html'

export type SesionRefuerzoGenerada = {
  vista: SesionRefuerzoVistaData
  respuesta?: { docxBase64: string; fileName: string }
  prompt?: { docxBase64: string; fileName: string }
}

/**
 * Genera con IA la Sesión de Refuerzo, descarga los Word (respuesta + prompt)
 * y devuelve los datos para la vista previa HTML.
 */
export async function generarSesionRefuerzo(sesionId: number): Promise<SesionRefuerzoGenerada> {
  const res = await fetch('/api/sesiones-fichas/generate-sesion-refuerzo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sesionId })
  })
  if (!res.ok) {
    throw await errorDesdeResponse(res, 'Error al generar la sesión de refuerzo')
  }
  const data = (await res.json()) as SesionRefuerzoGenerada
  if (data.prompt?.docxBase64) {
    descargarDocxBase64(data.prompt.docxBase64, data.prompt.fileName)
  }
  if (data.respuesta?.docxBase64) {
    descargarDocxBase64(data.respuesta.docxBase64, data.respuesta.fileName)
  }
  if (!data.vista?.respuestaprompt) {
    throw new Error('La IA no devolvió contenido para la vista previa')
  }
  return data
}

/** @deprecated Usar generarSesionRefuerzo para obtener también la vista HTML. */
export async function descargarSesionRefuerzo(sesionId: number): Promise<void> {
  await generarSesionRefuerzo(sesionId)
}

export type ExamenUnidadGenerado = {
  vista: ExamenUnidadVistaData
  respuesta?: { docxBase64: string; fileName: string }
  prompt?: { docxBase64: string; fileName: string }
}

/** Genera con IA el examen de fin de unidad, descarga Word y devuelve vista HTML. */
export async function generarExamenUnidad(
  unidadAprendizajeId: number
): Promise<ExamenUnidadGenerado> {
  const res = await fetch('/api/unidades-aprendizaje/generate-examen', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unidadAprendizajeId })
  })
  if (!res.ok) {
    throw await errorDesdeResponse(res, 'Error al generar el examen de la unidad')
  }
  const data = (await res.json()) as ExamenUnidadGenerado
  if (data.prompt?.docxBase64) {
    descargarDocxBase64(data.prompt.docxBase64, data.prompt.fileName)
  }
  if (data.respuesta?.docxBase64) {
    descargarDocxBase64(data.respuesta.docxBase64, data.respuesta.fileName)
  }
  if (!data.vista?.respuestaprompt) {
    throw new Error('La IA no devolvió contenido para la vista previa del examen')
  }
  return data
}

export type ConclusionesDescriptivasGenerado = {
  numunidad1: string
  numunidad2: string
  vista: ConclusionesVistaData
  respuesta?: { docxBase64: string; fileName: string }
  prompt?: { docxBase64: string; fileName: string }
}

/**
 * Genera el prompt dinámico de conclusiones descriptivas (par de unidades),
 * lo envía a la IA, descarga la respuesta en Word y devuelve la vista HTML.
 */
export async function generarConclusionesDescriptivas(
  unidadAprendizajeId: number
): Promise<ConclusionesDescriptivasGenerado> {
  const res = await fetch('/api/unidades-aprendizaje/generate-conclusiones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ unidadAprendizajeId })
  })
  if (!res.ok) {
    throw await errorDesdeResponse(res, 'Error al generar las conclusiones descriptivas')
  }
  const data = (await res.json()) as ConclusionesDescriptivasGenerado
  if (data.respuesta?.docxBase64) {
    descargarDocxBase64(data.respuesta.docxBase64, data.respuesta.fileName)
  }
  if (!data.vista?.respuestaprompt) {
    throw new Error('La IA no devolvió contenido para la vista de conclusiones')
  }
  return data
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

type PlanAnualCargado = PlanAnualParaDescarga & {
  anio?: number
}

type PayloadPlanAnual = {
  plan: PlanAnualCargado
  unidadesParaEnviar: UnidadPlanGuardada[]
  datosExistentes: Record<
    number,
    { situacionSignificativa: string; campoTematico: string; tituloUnidad: string }
  >
}

async function cargarPayloadPlanAnual(plan: PlanAnualParaDescarga): Promise<PayloadPlanAnual> {
  let planCompleto: PlanAnualCargado = { ...plan }
  let unidadesRaw = plan.unidades

  const planRes = await fetch(`/api/plan-anual?id=${plan.id}`)
  if (planRes.ok) {
    const data = await planRes.json()
    if (data.planAnual) {
      planCompleto = { ...planCompleto, ...data.planAnual }
      if (data.planAnual.unidades) {
        unidadesRaw = data.planAnual.unidades
      }
    }
  }

  const arr = Array.isArray(unidadesRaw) ? (unidadesRaw as UnidadPlanGuardada[]) : []
  const unidadesParaEnviar: UnidadPlanGuardada[] = []
  const datosExistentes: PayloadPlanAnual['datosExistentes'] = {}

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

  return { plan: planCompleto, unidadesParaEnviar, datosExistentes }
}

function formDataDesdePlan(plan: PlanAnualCargado) {
  return {
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
    distrito: plan.distrito,
    anio: plan.anio
  }
}

function nombreArchivoPlan(plan: PlanAnualCargado) {
  const areaSlug = (plan.area || 'plan').replace(/\s+/g, '_')
  return `PLANIFICACION_ANUAL_${areaSlug}_${plan.grado || plan.anio || 'plan'}.docx`
}

/** Exporta el Word del plan con datos ya guardados; no llama a la IA. */
export async function descargarPlanAnual(plan: PlanAnualParaDescarga): Promise<void> {
  const { plan: planCompleto, unidadesParaEnviar, datosExistentes } =
    await cargarPayloadPlanAnual(plan)

  const response = await fetch('/api/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: formDataDesdePlan(planCompleto),
      unidades: unidadesParaEnviar,
      modoGeneracion: 'actualizar',
      unidadesParaGenerar: [],
      datosExistentes,
      planAnualId: plan.id,
      soloExportar: true
    })
  })

  await descargarBlobDesdeResponse(response, nombreArchivoPlan(planCompleto))
}

/** Regenera con IA solo las unidades indicadas (índices 1–8) y descarga el .docx actualizado. */
export async function regenerarPlanAnualUnidades(
  plan: PlanAnualParaDescarga,
  indicesUnidad: number[]
): Promise<void> {
  const unidadesParaGenerar = [...new Set(indicesUnidad)]
    .filter((i) => i >= 1 && i <= 8)
    .sort((a, b) => a - b)

  if (unidadesParaGenerar.length === 0) {
    throw new Error('Selecciona al menos una unidad para regenerar.')
  }

  const { plan: planCompleto, unidadesParaEnviar, datosExistentes } =
    await cargarPayloadPlanAnual(plan)

  const response = await fetch('/api/generate-document', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      formData: formDataDesdePlan(planCompleto),
      unidades: unidadesParaEnviar,
      modoGeneracion: 'actualizar',
      unidadesParaGenerar,
      datosExistentes,
      planAnualId: plan.id,
      soloExportar: false
    })
  })

  await descargarBlobDesdeResponse(response, nombreArchivoPlan(planCompleto))
}
