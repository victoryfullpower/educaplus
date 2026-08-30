import { respuestaPromptABloques } from '@/lib/respuesta-prompt-word'

export type SesionRefuerzoVistaData = {
  sesionId?: number
  numeroSesion?: number
  tituloSesion?: string
  area?: string
  grado?: string
  ciclo?: string
  docente?: string
  institucion?: string
  /** Respaldo desde la sesión principal si la IA no lo devuelve etiquetado. */
  campoTematico?: string
  /** Solo informativo en API; el HTML usa el propósito extraído del prompt. */
  proposito?: string
  /** Texto formateado desde la sesión (API). */
  competencia?: string
  /** Origen de verdad: competencias guardadas en la sesión. */
  competenciasSeleccionadas?: string[]
  capacidades?: string
  desempenios?: string
  criterios?: string
  evidencia?: string
  respuestaprompt: string
}

type CamposRefuerzo = {
  titulo: string
  campotematico: string
  competencia: string
  capacidades: string
  desempenios: string
  criterios: string
  evidencia: string
  proposito: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textoHtml(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br>')
}

function celdaVacia(): string {
  return '<span class="refuerzo-doc-vacio">—</span>'
}

const RE_GUION_INICIAL = /^[\uFEFF\u200B\s]*[-–—−•*]\s*/

function quitarGuionListaInicial(s: string): string {
  return s.trim().replace(RE_GUION_INICIAL, '')
}

function limpiarMarcadorLista(s: string): string {
  return quitarGuionListaInicial(s).replace(/^\d+[.)]\s*/, '').trim()
}

function normalizarTextoInstruccionLista(item: string): string {
  return item
    .replace(/^[-•*]\s*/, '')
    .trim()
    .normalize('NFD')
    .replace(/\u0300-\u036f/g, '')
    .replace(/^\(+|\)+$/g, '')
    .replace(/[.:]\s*$/, '')
    .trim()
    .toLowerCase()
}

function esInstruccionListaRefuerzo(item: string): boolean {
  const crudo = item.replace(/^[-•*]\s*/, '').trim()
  if (/^\([^)]+\)\s*:?\s*$/.test(crudo)) return true

  const t = normalizarTextoInstruccionLista(item)
  if (!t) return true

  if (
    /^(?:obtiene|infiere|reflexiona|escribe|lee|analiza|identifica|explica|desarrolla|aprecia|asume|gestiona|adapta|participa|organiza|formula|utiliza|demuestra|evalua|interpreta|produce|construye|elabora|comunica|plantea|resuelve|comprende|redacta|relaciona|integra|contrasta|resume|sintetiza|argumenta|verifica|valida)\b/.test(
      t
    )
  ) {
    return false
  }

  if (
    /^(?:elige|elije|elija|eliger|selecciona|seleccionar|escoge|escoger)\b/.test(t) &&
    (/\b(?:solo|solamente|unicamente|exactamente)\b/.test(t) ||
      /\b(?:\d+|dos|tres|cuatro|una?)\b/.test(t)) &&
    t.length <= 60
  ) {
    return true
  }

  if (
    /^seleccion(?:ar|a)\b/.test(t) &&
    /\b(?:\d+|dos|tres|cuatro|una?)\b/.test(t) &&
    t.length <= 60
  ) {
    return true
  }

  if (/^exactamente\s+(?:\d+|dos|tres|cuatro|una?)\b/.test(t) && t.length <= 40) {
    return true
  }

  return (
    /^(?:elige|elije|elija)\s+solamente\s+\d+\s*$/.test(t) ||
    /^exactamente\s+\d+\s*$/.test(t) ||
    /^seleccion(?:ar|a)\s+(?:solo\s+|solamente\s+|unicamente\s+)?(?:\d+|dos|tres|cuatro)\b/.test(
      t
    ) ||
    /^seleccion(?:ar|a)\s+(?:\d+|dos|tres|cuatro)\s+(?:solo|solamente|unicamente)?\b/.test(t) ||
    /^(?:elige|elije|elija|eliger)\s+(?:solo\s+|solamente\s+|unicamente\s+)?(?:\d+|dos|tres|cuatro)\b/.test(
      t
    ) ||
    /^(?:elige|elije|elija|eliger)\s+(?:\d+|dos|tres|cuatro)\b/.test(t)
  )
}

function renderLista(texto: string): string {
  const t = texto.trim()
  if (!t) return celdaVacia()
  const items = t
    .split(/\n+/)
    .map((l) => quitarEtiquetasConDosPuntos(limpiarMarcadorLista(l)))
    .filter(Boolean)
    .filter((item) => !esInstruccionListaRefuerzo(item))
  if (items.length === 0) return celdaVacia()
  if (items.length === 1 && !t.includes('\n')) {
    return `<p class="refuerzo-doc-texto">${textoHtml(items[0])}</p>`
  }
  return `<ul class="refuerzo-doc-lista">${items.map((i) => `<li>${textoHtml(i)}</li>`).join('')}</ul>`
}

function limpiarLineaEtiqueta(linea: string): string {
  return linea
    .trim()
    .replace(/^[-•*]\s*/, '')
    .replace(/^#+\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .trim()
}

const PATRON_ETIQUETAS =
  '(?:T[ií]tulo(?:\\s+de\\s+la\\s+sesi[oó]n)?|Campo\\s*tem[aá]tico|Competencia|Capacidad(?:es)?|Desempe[nñ]os\\s*precisados|Desempe[nñ]os|Criterio(?:s)?\\s*de\\s*evaluaci[oó]n|Evidencia(?:s)?\\s*de\\s*aprendizaje|Prop[oó]sito|Criterio(?:s)?|Evidencia(?:s)?)'

function etiquetaNormalizada(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normalizarEtiqueta(linea: string): string | null {
  const t = limpiarLineaEtiqueta(linea)
  const conValor = t.match(new RegExp(`^(${PATRON_ETIQUETAS})\\s*:\\s*(.*)$`, 'i'))
  if (conValor) return etiquetaNormalizada(conValor[1])

  const soloEtiqueta = t.match(new RegExp(`^(${PATRON_ETIQUETAS})\\s*$`, 'i'))
  if (soloEtiqueta) return etiquetaNormalizada(soloEtiqueta[1])

  return null
}

function quitarComillasExternas(s: string): string {
  let t = s.trim()
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'")) ||
    (t.startsWith('«') && t.endsWith('»'))
  ) {
    return t.slice(1, -1).trim()
  }
  return t
}

function valorInicialEtiqueta(linea: string): string {
  const t = limpiarLineaEtiqueta(linea)
  const m = t.match(new RegExp(`^${PATRON_ETIQUETAS}\\s*:\\s*([\\s\\S]*)$`, 'i'))
  return limpiarMarcadorLista((m?.[1] ?? '').trim())
}

function parsearCamposIntro(texto: string): CamposRefuerzo {
  const campos: CamposRefuerzo = {
    titulo: '',
    campotematico: '',
    competencia: '',
    capacidades: '',
    desempenios: '',
    criterios: '',
    evidencia: '',
    proposito: ''
  }

  const corte = texto.search(
    /\n\s*(?:FORMATO\s+OBLIGATORIO|SECUENCIA\s+DID[AÁ]CTICA|FASE\s*2\b)/i
  )
  const intro = (corte >= 0 ? texto.slice(0, corte) : texto).trim()
  if (!intro) return campos

  const lineas = intro.split('\n')
  let etiquetaActual: keyof CamposRefuerzo | null = null
  const acumulado: string[] = []

  const guardar = () => {
    if (!etiquetaActual) return
    campos[etiquetaActual] = acumulado.join('\n').trim()
    acumulado.length = 0
  }

  for (const linea of lineas) {
    const key = normalizarEtiqueta(linea)
    if (key) {
      guardar()
      if (key.startsWith('titulo')) etiquetaActual = 'titulo'
      else if (key === 'competencia') {
        etiquetaActual = null
        continue
      }
      else if (key.includes('campo tematico')) etiquetaActual = 'campotematico'
      else if (key.startsWith('capacidad')) etiquetaActual = 'capacidades'
      else if (key.includes('desempen')) etiquetaActual = 'desempenios'
      else if (key.includes('criterio')) etiquetaActual = 'criterios'
      else if (key.includes('evidencia')) etiquetaActual = 'evidencia'
      else if (key === 'proposito') etiquetaActual = 'proposito'
      else etiquetaActual = null

      const resto = valorInicialEtiqueta(linea)
      if (resto) acumulado.push(resto)
      continue
    }

    if (etiquetaActual && linea.trim()) {
      if (esLineaFinSeccionContenido(linea)) {
        guardar()
        etiquetaActual = null
        continue
      }
      if (esEncabezadoSeccionDocumento(linea)) {
        guardar()
        etiquetaActual = null
        continue
      }
      acumulado.push(linea.trim())
    }
  }
  guardar()
  return campos
}

const CORTE_SECCION =
  /\n\s*(?:FORMATO\s+OBLIGATORIO[^\n]*|SECUENCIA\s+DID[AÁ]CTICA|FASE\s*2\b)/i
/** Etiquetas completas para delimitar bloques (incluye «Criterios de evaluación», etc.). */
const ETIQUETA_SIGUIENTE =
  'T[ií]tulo(?:\\s+de\\s+la\\s+sesi[oó]n)?|Campo\\s*tem[aá]tico|Competencia|Capacidad(?:es)?|Desempe[nñ]os(?:\\s*precisados)?|Criterio(?:s)?(?:\\s*de\\s*evaluaci[oó]n)?|Evidencia(?:s)?(?:\\s*de\\s*aprendizaje)?|Prop[oó]sito|FORMATO\\s+OBLIGATORIO|SECUENCIA(?:\\s+DID[AÁ]CTICA)?|FASE\\s*2'

function esEncabezadoSeccionDocumento(linea: string): boolean {
  const t = limpiarLineaEtiqueta(linea).trim()
  if (!t) return false
  return (
    /^prop[oó]sitos?\s+de\s+aprendizaje(?:\s+y\s+evaluaci[oó]n)?\.?$/i.test(t) ||
    /^datos\s+informativos\.?$/i.test(t) ||
    /^evaluaci[oó]n\s+de\s+los\s+aprendizajes\.?$/i.test(t) ||
    /^secuencia\s+did[aá]ctica(?:\s*\([^)]*\))?\.?$/i.test(t) ||
    /^formato\s+obligatorio/i.test(t) ||
    /^ficha\s+de\s+refuerzo\.?$/i.test(t)
  )
}

function esLineaOtraEtiqueta(linea: string): boolean {
  return normalizarEtiqueta(linea) !== null || esEncabezadoSeccionDocumento(linea)
}

function quitarNumeroInicialTitulo(titulo: string): string {
  return titulo.replace(/^\d+[.)]\s*/, '').trim()
}

const PATRON_ETIQUETA_TITULO =
  '(?:T[ií]tulo(?:\\s+de\\s+la\\s+sesi[oó]n)?)(?:\\*\\*)?\\s*:'

/** Limpia el valor capturado tras «Título: …» (sin reglas de guion). */
function sanitizarTituloExtraido(titulo: string): string {
  let t = titulo.trim()
  if (!t) return ''

  t = t.replace(new RegExp(`^${PATRON_ETIQUETA_TITULO}\\s*`, 'i'), '').trim()
  if (!t) return ''

  if (
    /^(?:Campo\s*tem[aá]tico|El\s+Campo\s*tem[aá]tico|Competencia|Capacidades|Desempe[nñ]os|Criterios|Evidencia|Prop[oó]sito)\s*:/i.test(
      t
    )
  ) {
    return ''
  }

  return quitarNumeroInicialTitulo(quitarComillasExternas(t))
}

/** Extrae «Título: …» de la respuesta de la IA (misma línea o líneas siguientes). */
function extraerTituloDesdeTexto(texto: string): string {
  const bloque = (texto.split(CORTE_SECCION)[0] ?? texto).trim()
  if (!bloque) return ''

  const reInline = new RegExp(
    `${PATRON_ETIQUETA_TITULO}\\s*([^\\n\\r]+?)(?=\\n\\s*(?:${ETIQUETA_SIGUIENTE})\\s*:|\\n\\s*Prop[oó]sitos?\\s+de\\s+aprendizaje|$)`,
    'i'
  )
  const inline = bloque.match(reInline)?.[1]?.trim()
  if (inline) return sanitizarTituloExtraido(inline)

  const reMultilinea = new RegExp(
    `${PATRON_ETIQUETA_TITULO}\\s*\\n+([\\s\\S]+?)(?=\\n\\s*(?:${ETIQUETA_SIGUIENTE})\\s*:|\\n\\s*Prop[oó]sitos?\\s+de\\s+aprendizaje|$)`,
    'i'
  )
  const multilinea = bloque.match(reMultilinea)?.[1]?.trim()
  if (multilinea) return sanitizarTituloExtraido(multilinea)

  return ''
}

/** Busca «Campo temático: …» en todo el bloque previo a la secuencia (una o varias líneas). */
function extraerCampoTematicoDesdeTexto(texto: string): string {
  const bloque = texto.split(CORTE_SECCION)[0] ?? texto
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:\\*\\*)?(?:El\\s+)?Campo\\s*tem[aá]tico(?:\\*\\*)?\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:${ETIQUETA_SIGUIENTE})\\s*:|$)`,
    'i'
  )
  const m = bloque.match(re)
  return m?.[1]?.trim() ?? ''
}

function esLineaFinSeccionContenido(linea: string): boolean {
  const t = linea.trim()
  if (!t) return false
  if (/^\|/.test(t) || /^[-•*]\s*\|/.test(t)) return true
  if (/FORMATO\s+OBLIGATORIO/i.test(t)) return true
  if (/SECUENCIA\s+DID[AÁ]CTICA/i.test(t)) return true
  if (/^FASE\s*\d/i.test(t)) return true
  if (/^[\p{Extended_Pictographic}\uFE0F]/u.test(t)) return true
  if (/MOMENTOS\s*\|\s*PROCESOS/i.test(t)) return true
  if (/^MOMENTOS[\t|]/i.test(t)) return true
  return false
}

function filtrarLineasCampo(lineas: string[], unaSolaLinea = false): string {
  const validas: string[] = []
  for (const linea of lineas) {
    const t = linea.trim()
    if (!t) continue
    if (esLineaFinSeccionContenido(t)) break
    const etiqueta = normalizarEtiqueta(t)
    if (etiqueta?.includes('evidencia')) break
    if (etiqueta && !etiqueta.includes('criterio')) break
    const limpia = limpiarMarcadorLista(t)
    if (esInstruccionListaRefuerzo(limpia)) continue
    validas.push(t)
    if (unaSolaLinea) break
  }
  return validas.join('\n').trim()
}

/** Evidencia: una sola línea (producto/evidencia), sin arrastrar la secuencia didáctica. */
function normalizarEvidencia(texto: string): string {
  const t = texto.trim()
  if (!t) return ''
  const lineas = t
    .split('\n')
    .map((l) => limpiarMarcadorLista(l.trim()))
    .filter(Boolean)
  const filtradas = filtrarLineasCampo(lineas, true)
  if (filtradas) return limpiarMarcadorLista(filtradas.split('\n')[0] ?? filtradas)
  const primera = t.split(/\n+/).map((l) => limpiarMarcadorLista(l.trim())).find(Boolean)
  return primera ?? t
}

/** Extrae listas bajo una etiqueta (con o sin «:», viñetas en líneas siguientes). */
function extraerListaEtiqueta(
  texto: string,
  etiquetaPatron: string,
  opts?: { unaSolaLinea?: boolean }
): string {
  const bloque = (texto.split(CORTE_SECCION)[0] ?? texto).trim()
  if (!bloque) return ''

  const re = new RegExp(
    `(?:^|\\n)\\s*(?:[-•*]\\s*)?(?:#+\\s*)?(?:\\*\\*)?(?:${etiquetaPatron})(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]+?)(?=\\n\\s*(?:[-•*]\\s*)?(?:${ETIQUETA_SIGUIENTE})\\s*(?::|\\s|$)|\\n\\s*FORMATO\\s+OBLIGATORIO|\\n\\s*SECUENCIA|\\n\\s*[-•*]\\s*(?:📝\\s*)?FORMATO|\\n\\s*\\||$)`,
    'i'
  )
  const m = bloque.match(re)
  if (!m?.[1]) return ''

  const lineas = m[1].split('\n').map((l) => l.trim()).filter(Boolean)
  return filtrarLineasCampo(lineas, opts?.unaSolaLinea ?? false)
}

function extraerCapacidadesDesdeTexto(texto: string): string {
  return extraerListaEtiqueta(texto, 'Capacidad(?:es)?')
}

function extraerDesempeniosDesdeTexto(texto: string): string {
  const precisados = extraerListaEtiqueta(texto, 'Desempe[nñ]os\\s*precisados')
  if (precisados) return precisados
  return extraerListaEtiqueta(texto, 'Desempe[nñ]os')
}

/** Criterios tal cual entre «Criterios de evaluación» y «Evidencia de aprendizaje». */
function extraerCriteriosAntesDeEvidencia(texto: string): string {
  const bloque = (texto.split(CORTE_SECCION)[0] ?? texto).trim()
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:[-•*]\\s*)?(?:#+\\s*)?(?:\\*\\*)?Criterio(?:s)?(?:\\s*de\\s*evaluaci[oó]n)?(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]+?)(?=(?:^|\\n)\\s*(?:[-•*]\\s*)?(?:#+\\s*)?(?:\\*\\*)?Evidencia(?:s)?(?:\\s*de\\s*aprendizaje)?(?:\\*\\*)?\\s*:?)`,
    'i'
  )
  const m = bloque.match(re)
  if (!m?.[1]) return ''
  const lineas = m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return filtrarLineasCampo(lineas, false)
}

function extraerCriteriosDesdeTexto(texto: string): string {
  return (
    extraerCriteriosAntesDeEvidencia(texto) ||
    extraerListaEtiqueta(texto, 'Criterio(?:s)?\\s*de\\s*evaluaci[oó]n') ||
    extraerListaEtiqueta(texto, 'Criterio(?:s)?')
  )
}

function extraerEvidenciaDesdeTexto(texto: string): string {
  const bloque = (texto.split(CORTE_SECCION)[0] ?? texto).trim()
  const re = new RegExp(
    `(?:^|\\n)\\s*(?:[-•*]\\s*)?(?:#+\\s*)?(?:\\*\\*)?Evidencia(?:s)?(?:\\s*de\\s*aprendizaje)?(?:\\*\\*)?\\s*:?\\s*\\n?([\\s\\S]+?)(?=(?:^|\\n)\\s*(?:FORMATO\\s+OBLIGATORIO|SECUENCIA\\s+DID[AÁ]CTICA|FASE\\s*2\\b)|$)`,
    'i'
  )
  const m = bloque.match(re)
  if (!m?.[1]) return ''
  const lineas = m[1]
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return normalizarEvidencia(filtrarLineasCampo(lineas, false))
}

/** Normaliza texto de sesión (párrafos o HTML) a viñetas para la vista. */
export function formatearTextoComoLista(texto: string): string {
  const t = texto.trim()
  if (!t) return ''
  const lineas = t
    .split(/\n+/)
    .flatMap((l) => l.split(/(?<=[.;])\s+/))
    .map((l) => l.trim())
    .filter(Boolean)
  if (lineas.length === 0) return t
  return lineas
    .map((l) => {
      if (/^[-•*]\s/.test(l)) return l
      if (/^\d+[.)]\s/.test(l)) return `- ${l.replace(/^\d+[.)]\s*/, '')}`
      return `- ${l}`
    })
    .join('\n')
}

function limpiarPropositoExtraido(raw: string): string {
  let t = raw.replace(/^-\s*/, '').trim()
  t = t.replace(/\s*[\t|│]\s*[\d-]+(?:\s*min(?:utos)?)?(?:\s*[\t|│]\s*)?.*$/i, '')
  t = t.replace(/\s+-\s+(?:Motivaci[oó]n|Saberes|Conflicto|Problematizaci[oó]n)[\s\S]*$/i, '')
  return t.trim()
}

/** Propósito desde la fila INICIO → Propósito / Propósito y organización de la secuencia. */
function extraerPropositoDesdeSecuencia(texto: string): string {
  const filas = parsearSecuenciaDidactica(texto)
  if (filas.length === 0) return ''

  const expandido = esFormatoSecuenciaExpandido(filas)
  const inicio = agruparFilasSecuencia(filas, expandido).find((g) => g.momento === 'INICIO')
  if (!inicio) return ''

  for (const f of inicio.filas) {
    if (esProcesoProposito(f.proceso) && f.actividad.trim()) {
      return limpiarItemActividad(f.actividad)
    }
  }

  if (inicio.filas.length === 1) {
    const secciones = extraerSeccionesEtiquetadas(inicio.filas[0].actividad, ETIQUETAS_INICIO)
    const prop = secciones.find((s) => /prop[oó]sito/i.test(s.proceso))
    if (prop?.actividad) {
      return limpiarItemActividad(prop.actividad)
    }
  }

  return ''
}

/** Propósito solo desde la respuesta de la IA (secuencia INICIO, intro o etiqueta suelta). */
function extraerPropositoDesdeTexto(texto: string): string {
  const bloqueIntro = texto.split(CORTE_SECCION)[0] ?? ''
  const reIntro = new RegExp(
    `(?:^|\\n)\\s*(?:\\*\\*)?Propósito(?:\\*\\*)?\\s*:\\s*([\\s\\S]+?)(?=\\n\\s*(?:${ETIQUETA_SIGUIENTE})\\s*:|$)`,
    'i'
  )
  const intro = bloqueIntro.match(reIntro)?.[1]?.trim()
  if (intro) return limpiarPropositoExtraido(intro)

  const idx = texto.search(/(?:^|\n)\s*(?:-\s*)?Prop[oó]sito\s*:/i)
  if (idx < 0) return ''
  const slice = texto.slice(idx).replace(/^[\s\S]*?Prop[oó]sito\s*:\s*/i, '')
  const fin = slice.search(
    /(?:\t|\s\|\s|\n\s*(?:-\s*(?:Saberes|Conflicto|Motivaci[oó]n|Problematizaci[oó]n)|[\p{Extended_Pictographic}\uFE0F]|DESARROLLO|CIERRE|MOMENTOS\b))/iu
  )
  const chunk = fin >= 0 ? slice.slice(0, fin) : slice.slice(0, 500)
  return limpiarPropositoExtraido(chunk)
}

function limpiarBrSesion(s: string): string {
  return (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
}

/** Competencia solo desde la sesión (BD), nunca desde la respuesta de la IA. */
function formatearCompetenciasDesdeSesion(data: SesionRefuerzoVistaData): string {
  const arr = Array.isArray(data.competenciasSeleccionadas)
    ? data.competenciasSeleccionadas
        .map((c) => limpiarBrSesion(String(c ?? '')))
        .filter(Boolean)
    : []
  if (arr.length > 0) {
    return arr.map((c) => `- ${c}`).join('\n')
  }
  return limpiarBrSesion(data.competencia ?? '')
}

function renderCompetenciaSesion(texto: string): string {
  const t = texto.trim()
  if (!t) return celdaVacia()
  const items = t
    .split(/\n+/)
    .map((l) => limpiarMarcadorLista(l))
    .filter(Boolean)
  if (items.length <= 1) {
    return `<p class="refuerzo-doc-texto">${textoHtml(items[0] ?? t)}</p>`
  }
  return renderLista(t)
}

function resolverCamposRefuerzo(
  texto: string,
  data: SesionRefuerzoVistaData
): CamposRefuerzo {
  const parseados = parsearCamposIntro(texto)
  return {
    titulo: sanitizarTituloExtraido(
      parseados.titulo.trim() || extraerTituloDesdeTexto(texto)
    ),
    campotematico:
      parseados.campotematico.trim() ||
      extraerCampoTematicoDesdeTexto(texto) ||
      (data.campoTematico ?? '').trim(),
    competencia: formatearCompetenciasDesdeSesion(data),
    capacidades:
      parseados.capacidades.trim() ||
      extraerCapacidadesDesdeTexto(texto) ||
      (data.capacidades ?? '').trim(),
    desempenios:
      parseados.desempenios.trim() ||
      extraerDesempeniosDesdeTexto(texto) ||
      (data.desempenios ?? '').trim(),
    criterios:
      extraerCriteriosDesdeTexto(texto) ||
      parseados.criterios.trim() ||
      formatearTextoComoLista(data.criterios ?? ''),
    evidencia: normalizarEvidencia(
      extraerEvidenciaDesdeTexto(texto) ||
        parseados.evidencia.trim() ||
        formatearTextoComoLista(data.evidencia ?? '')
    ),
    proposito:
      extraerPropositoDesdeSecuencia(texto) ||
      parseados.proposito.trim() ||
      extraerPropositoDesdeTexto(texto) ||
      limpiarBrSesion(data.proposito ?? '')
  }
}

function parsearFilasTabla(linea: string): string[] {
  if (linea.includes('|')) {
    const partes = linea.split('|').map((c) => c.trim())
    if (partes[0] === '' && partes[partes.length - 1] === '') return partes.slice(1, -1)
    return partes.filter(Boolean)
  }
  if (linea.includes('\t')) {
    return linea.split('\t').map((c) => c.trim())
  }
  return []
}

function esSeparadorTabla(linea: string): boolean {
  const celdas = parsearFilasTabla(linea)
  return celdas.length >= 2 && celdas.every((c) => /^[\s\-:]+$/.test(c))
}

function esEncabezadoSecuencia(celdas: string[]): boolean {
  const joined = celdas.join(' ').toLowerCase()
  return (
    (joined.includes('momentos') && joined.includes('tiempo')) ||
    celdas.some((c) => /^momentos$/i.test(c.trim()))
  )
}

function parsearSecuenciaDidactica(texto: string): string[][] {
  const idx = texto.search(
    /(?:^|\n)\s*(?:FORMATO\s+OBLIGATORIO[^\n]*[-–—]\s*)?SECUENCIA\s+DID[AÁ]CTICA\b/i
  )
  if (idx < 0) return []

  const afterHeader = texto
    .slice(idx)
    .replace(/^[\s\S]*?SECUENCIA\s+DID[AÁ]CTICA\b\s*/i, '')
  const finMatch = afterHeader.match(/\n\s*FASE\s*2\b/i)
  const bloque = (
    finMatch && finMatch.index !== undefined
      ? afterHeader.slice(0, finMatch.index)
      : afterHeader
  ).trim()

  const filas: string[][] = []
  for (const linea of bloque.split('\n')) {
    const t = linea.trim()
    if (!t || esSeparadorTabla(t) || /FORMATO\s+OBLIGATORIO/i.test(t)) continue
    const celdas = parsearFilasTabla(t)
    if (celdas.length < 2) continue
    if (filas.length === 0 && esEncabezadoSecuencia(celdas)) continue
    while (celdas.length < 4) celdas.push('')
    filas.push(celdas.slice(0, 4))
  }
  return filas
}

type FilaProcesoSecuencia = { proceso: string; actividad: string; tiempo?: string }

type GrupoMomentoSecuencia = {
  momento: 'INICIO' | 'DESARROLLO' | 'CIERRE'
  momentoEtiqueta: string
  tiempo: string
  tiempoPorFila: boolean
  filas: FilaProcesoSecuencia[]
}

const TIEMPOS_SECUENCIA_POR_MOMENTO: Record<GrupoMomentoSecuencia['momento'], string> = {
  INICIO: '15 min',
  DESARROLLO: '60 min',
  CIERRE: '15 min'
}

const ETIQUETAS_INICIO = [
  { label: 'Motivación', re: /motivaci[oó]n/i },
  { label: 'Saberes previos.', re: /saberes\s*previos?|activaci[oó]n\s*(?:de\s*)?conocimientos/i },
  {
    label: 'Problematización/ Conflicto cognitivo:',
    re: /conflicto\s*cognitivo|problematizaci[oó]n|generaci[oó]n\s*(?:de\s*)?discrepancia|discrepancia/i
  },
  {
    label: 'Propósito y organización',
    re: /prop[oó]sito(?:\s*y\s*organizaci[oó]n)?|orientaci[oó]n\s*(?:del\s*)?aprendizaje/i
  }
] as const

function claveProcesoInicio(proceso: string): string {
  const def = ETIQUETAS_INICIO.find((e) => e.label === proceso || e.re.test(proceso))
  return def?.label ?? proceso.trim()
}

function actividadPropositoDesdeMapa(
  mapa: Map<string, string>,
  propositoPrompt: string,
  tituloSesion: string
): string {
  const prop =
    mapa.get('Propósito y organización')?.trim() ||
    mapa.get('Propósito')?.trim() ||
    [...mapa.entries()].find(([k]) => /^prop[oó]sito/i.test(k))?.[1]?.trim() ||
    ''
  return prop || renderTextoPropositoOrganizacion(propositoPrompt.trim(), tituloSesion)
}

function extraerSubprocesoDesdeMomento(momentoRaw: string): string | null {
  const t = momentoRaw.replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '').trim()
  const m = t.match(/^(?:INICIO|DESARROLLO|CIERRE)\s*[-–—]\s*(.+)$/i)
  return m?.[1]?.trim() ?? null
}

function esEtiquetaSubprocesoInicio(texto: string): boolean {
  const t = texto.trim()
  if (!t) return false
  return ETIQUETAS_INICIO.some((e) => e.re.test(t))
}

function esFormatoSecuenciaExpandido(filas: string[][]): boolean {
  return filas.some(([momentoRaw]) => extraerSubprocesoDesdeMomento(momentoRaw) !== null)
}

function mapearProcesoInicioEstandar(momentoRaw: string, procesoCol: string): string {
  const sub = extraerSubprocesoDesdeMomento(momentoRaw)
  const blob = `${sub ?? ''} ${procesoCol}`.trim()

  for (const { label, re } of ETIQUETAS_INICIO) {
    if (re.test(blob)) return label
  }

  if (sub) {
    for (const { label, re } of ETIQUETAS_INICIO) {
      if (re.test(sub)) return label
    }
  }

  return procesoCol.trim() || sub || '—'
}

function esTiempoSecuencia(texto: string): boolean {
  return /^\d+\s*min(?:utos)?\.?$/i.test(texto.trim())
}

const RE_PROCESO_DESARROLLO =
  /andamiaje|modelado|gesti[oó]n\s*y\s*acompa|acompa[nñ]amiento\s*del\s*aprendizaje|aprendizaje\s*guiado|tarea\s*aut[oó]noma|pr[aá]ctica\s*(?:guiada|aut[oó]noma)|secuencialidad/i

function esProcesoDesarrollo(proceso: string, actividad?: string): boolean {
  return RE_PROCESO_DESARROLLO.test(`${proceso} ${actividad ?? ''}`.trim())
}

function pareceTextoActividad(texto: string): boolean {
  const t = texto.trim()
  if (!t) return false
  return (
    /^[-•*\d(]/.test(t) ||
    /^(?:El|La|Los|Las|Cada)\s+(?:docente|estudiantes|estudiante|equipo)/i.test(t) ||
    t.length > 120
  )
}

function repararFilaSecuencia(
  momentoRaw: string,
  proceso: string,
  actividad: string,
  tiempo: string
): { momentoRaw: string; proceso: string; actividad: string; tiempo: string } {
  const momento = normalizarMomento(momentoRaw)
  if (momento) {
    const sub = extraerSubprocesoDesdeMomento(momentoRaw)
    if (momento === 'DESARROLLO' && sub && pareceTextoActividad(proceso) && !pareceTextoActividad(sub)) {
      return {
        momentoRaw: 'DESARROLLO',
        proceso: sub,
        actividad: proceso.trim(),
        tiempo: esTiempoSecuencia(actividad) ? actividad.trim() : tiempo.trim()
      }
    }
    return { momentoRaw, proceso, actividad, tiempo }
  }

  if (esProcesoDesarrollo(momentoRaw, proceso) && !normalizarMomento(proceso)) {
    let actividadReal = proceso.trim()
    let tiempoReal = tiempo.trim()
    if (esTiempoSecuencia(actividad)) {
      tiempoReal = actividad.trim()
    } else if (actividad.trim()) {
      actividadReal = actividad.trim()
    }
    return {
      momentoRaw: 'DESARROLLO',
      proceso: momentoRaw.trim(),
      actividad: actividadReal,
      tiempo: tiempoReal
    }
  }

  if (esProcesoDesarrollo(proceso, actividad) && pareceTextoActividad(actividad)) {
    return {
      momentoRaw: 'DESARROLLO',
      proceso: proceso.trim(),
      actividad: actividad.trim(),
      tiempo: tiempo.trim()
    }
  }

  if (
    !normalizarMomento(momentoRaw) &&
    esEtiquetaSubprocesoInicio(momentoRaw) &&
    !esEtiquetaSubprocesoInicio(proceso)
  ) {
    return {
      momentoRaw: '',
      proceso: momentoRaw.trim(),
      actividad: proceso.trim(),
      tiempo: esTiempoSecuencia(actividad) ? actividad.trim() : tiempo.trim()
    }
  }

  return { momentoRaw, proceso, actividad, tiempo }
}

function normalizarProcesoSecuencia(
  momento: GrupoMomentoSecuencia['momento'],
  momentoRaw: string,
  procesoCol: string
): string {
  if (momento === 'INICIO') {
    return mapearProcesoInicioEstandar(momentoRaw, procesoCol)
  }
  if (momento === 'DESARROLLO') {
    return 'Gestión y acompañamiento del aprendizaje'
  }
  if (momento === 'CIERRE') {
    return 'Metacognición'
  }
  return procesoCol.trim() || '—'
}

function filaProcesoDesdeTabla(
  momentoRaw: string,
  procesoCol: string,
  actividad: string,
  tiempo: string
): { momento: GrupoMomentoSecuencia['momento']; fila: FilaProcesoSecuencia } | null {
  const momento = normalizarMomento(momentoRaw)
  if (!momento) return null
  return {
    momento,
    fila: {
      proceso: normalizarProcesoSecuencia(momento, momentoRaw, procesoCol),
      actividad: (actividad || '').trim(),
      tiempo: (tiempo || '').trim()
    }
  }
}

function normalizarMomento(celda: string): GrupoMomentoSecuencia['momento'] | null {
  const t = celda
    .replace(/^[\p{Extended_Pictographic}\uFE0F\s]+/u, '')
    .trim()
    .toUpperCase()
  if (t.includes('INICIO')) return 'INICIO'
  if (t.includes('DESARROLLO')) return 'DESARROLLO'
  if (t.includes('CIERRE')) return 'CIERRE'
  return null
}

function etiquetaMomento(m: GrupoMomentoSecuencia['momento']): string {
  if (m === 'INICIO') return 'INICIO'
  if (m === 'DESARROLLO') return 'DESARROLLO'
  return 'CIERRE'
}

function extraerSeccionesEtiquetadas(
  texto: string,
  etiquetas: readonly { label: string; re: RegExp }[]
): FilaProcesoSecuencia[] {
  const t = texto.trim()
  if (!t) return []

  const patron = new RegExp(
    `(?:^|[\\s;])[-•*]?\\s*(${etiquetas.map((e) => e.re.source).join('|')})(?:\\s*\\([^)]*\\))?\\s*:?\\s*`,
    'gi'
  )
  const matches: { index: number; label: string; len: number }[] = []
  let m: RegExpExecArray | null
  while ((m = patron.exec(t)) !== null) {
    const frag = m[1] ?? ''
    const def = etiquetas.find((e) => e.re.test(frag))
    if (def) matches.push({ index: m.index, label: def.label, len: m[0].length })
  }

  if (matches.length === 0) return []

  const filas: FilaProcesoSecuencia[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i].len
    const end = i + 1 < matches.length ? matches[i + 1].index : t.length
    const actividad = limpiarItemActividad(
      t.slice(start, end).trim().replace(/^[-•*]\s*/, '')
    )
    if (actividad && actividad !== '-' && !/^[-:.\s]+$/.test(actividad)) {
      filas.push({ proceso: matches[i].label, actividad })
    }
  }
  return filas
}

function expandirActividadesCompactas(
  momento: GrupoMomentoSecuencia['momento'],
  actividad: string,
  procesoCol: string
): FilaProcesoSecuencia[] {
  const t = actividad.trim()
  if (!t) return [{ proceso: procesoCol.trim() || '—', actividad: '' }]

  if (momento === 'INICIO') {
    const secciones = extraerSeccionesEtiquetadas(t, ETIQUETAS_INICIO)
    if (secciones.length > 0) return secciones
  }

  if (momento === 'DESARROLLO') {
    return [
      {
        proceso: 'Gestión y acompañamiento del aprendizaje',
        actividad: t
      }
    ]
  }

  if (momento === 'CIERRE') {
    return [{ proceso: 'Metacognición', actividad: t }]
  }

  return [{ proceso: procesoCol.trim() || '—', actividad: t }]
}

function agregarFilaHuerfanaSecuencia(
  grupos: GrupoMomentoSecuencia[],
  momentoRaw: string,
  proceso: string,
  actividad: string,
  tiempo: string
): void {
  const ultimo = grupos[grupos.length - 1]
  const momentoDestino = esProcesoDesarrollo(proceso, actividad)
    ? 'DESARROLLO'
    : esProcesoDesarrollo(momentoRaw, actividad)
      ? 'DESARROLLO'
      : /metacogn/i.test(proceso)
        ? 'CIERRE'
        : null

  const fila: FilaProcesoSecuencia = esEtiquetaSubprocesoInicio(momentoRaw)
    ? {
        proceso: momentoRaw.trim(),
        actividad: (proceso || actividad).trim(),
        tiempo: esTiempoSecuencia(actividad)
          ? actividad.trim()
          : esTiempoSecuencia(tiempo)
            ? tiempo.trim()
            : tiempo.trim()
      }
    : {
        proceso: (proceso || momentoRaw || '').trim(),
        actividad: actividad.trim(),
        tiempo: tiempo.trim()
      }

  if (momentoDestino && ultimo?.momento === 'INICIO') {
    const destino = grupos.find((g) => g.momento === momentoDestino)
    const filaNormalizada: FilaProcesoSecuencia = {
      proceso: normalizarProcesoSecuencia(momentoDestino, '', fila.proceso),
      actividad: fila.actividad,
      tiempo: fila.tiempo
    }
    if (destino) {
      destino.filas.push(filaNormalizada)
    } else {
      grupos.push({
        momento: momentoDestino,
        momentoEtiqueta: etiquetaMomento(momentoDestino),
        tiempo: '',
        tiempoPorFila: false,
        filas: [filaNormalizada]
      })
    }
    return
  }

  if (ultimo) {
    ultimo.filas.push(fila)
  }
}

function agruparFilasSecuencia(filas: string[][], expandido: boolean): GrupoMomentoSecuencia[] {
  const grupos: GrupoMomentoSecuencia[] = []

  for (let [momentoRaw, proceso, actividad, tiempo] of filas) {
    ;({ momentoRaw, proceso, actividad, tiempo } = repararFilaSecuencia(
      momentoRaw,
      proceso,
      actividad,
      tiempo
    ))

    const parsed = filaProcesoDesdeTabla(momentoRaw, proceso, actividad, tiempo)
    if (!parsed) {
      agregarFilaHuerfanaSecuencia(grupos, momentoRaw, proceso, actividad, tiempo)
      continue
    }

    const { momento, fila } = parsed
    const existente = grupos.find((g) => g.momento === momento)

    if (existente) {
      existente.filas.push(fila)
      if (tiempo.trim() && !expandido) existente.tiempo = tiempo.trim()
      continue
    }

    grupos.push({
      momento,
      momentoEtiqueta: etiquetaMomento(momento),
      tiempo: expandido ? '' : tiempo.trim(),
      tiempoPorFila: expandido && momento === 'INICIO',
      filas: [fila]
    })
  }

  for (const grupo of grupos) {
    if (grupo.momento === 'INICIO' && expandido) {
      grupo.tiempoPorFila = grupo.filas.length > 1
    }
  }

  return grupos
}

function normalizarGruposSecuencia(
  filas: string[][],
  propositoPrompt: string,
  tituloSesion: string
): GrupoMomentoSecuencia[] {
  const expandido = esFormatoSecuenciaExpandido(filas)
  const grupos = agruparFilasSecuencia(filas, expandido)
  const orden: GrupoMomentoSecuencia['momento'][] = ['INICIO', 'DESARROLLO', 'CIERRE']
  const resultado: GrupoMomentoSecuencia[] = []

  for (const momento of orden) {
    const grupo = grupos.find((g) => g.momento === momento)
    if (!grupo) continue

    let filasProceso: FilaProcesoSecuencia[] = []

    if (expandido && momento === 'INICIO' && grupo.filas.length >= 1) {
      const mapa = new Map<string, FilaProcesoSecuencia>()
      for (const f of grupo.filas) {
        const key = claveProcesoInicio(f.proceso)
        const prev = mapa.get(key)
        mapa.set(key, {
          proceso: key,
          actividad: prev ? `${prev.actividad}\n${f.actividad}` : f.actividad,
          tiempo: f.tiempo || prev?.tiempo
        })
      }
      filasProceso = ETIQUETAS_INICIO.map(({ label }) => {
        const found = mapa.get(label)
        if (label === 'Propósito y organización') {
          return {
            proceso: label,
            actividad: actividadPropositoDesdeMapa(
              new Map([...mapa.entries()].map(([k, v]) => [k, v.actividad])),
              propositoPrompt,
              tituloSesion
            ),
            tiempo: found?.tiempo
          }
        }
        return { proceso: label, actividad: found?.actividad ?? '', tiempo: found?.tiempo }
      })
    } else if (momento === 'DESARROLLO') {
      filasProceso = grupo.filas.map((f) => ({
        proceso: f.proceso,
        actividad: f.actividad,
        tiempo: f.tiempo
      }))
    } else if (grupo.filas.length === 1) {
      const unica = grupo.filas[0]
      filasProceso = expandirActividadesCompactas(momento, unica.actividad, unica.proceso).map(
        (f) => ({ ...f, tiempo: unica.tiempo })
      )
    } else {
      filasProceso = grupo.filas.map((f) => {
        if (
          f.actividad &&
          /^(motivaci|saberes|conflicto|problematiz|prop[oó]sito|metacogn|activaci|generaci|orientaci)/i.test(
            f.proceso
          )
        ) {
          return f
        }
        const expandidas = expandirActividadesCompactas(momento, f.actividad, f.proceso)
        return expandidas.length === 1
          ? { ...expandidas[0], tiempo: f.tiempo }
          : { proceso: f.proceso, actividad: f.actividad, tiempo: f.tiempo }
      })
    }

    if (!expandido && momento === 'INICIO') {
      const mapa = new Map<string, string>()
      for (const f of filasProceso) {
        const def = ETIQUETAS_INICIO.find(
          (e) => e.label === f.proceso || e.re.test(f.proceso)
        )
        const key = def?.label ?? f.proceso
        const prev = mapa.get(key)
        mapa.set(key, prev ? `${prev}\n${f.actividad}` : f.actividad)
      }
      filasProceso = ETIQUETAS_INICIO.map(({ label }) => {
        if (label === 'Propósito y organización') {
          return {
            proceso: label,
            actividad: actividadPropositoDesdeMapa(mapa, propositoPrompt, tituloSesion)
          }
        }
        return { proceso: label, actividad: mapa.get(label) ?? '' }
      })
    }

    if (momento === 'DESARROLLO') {
      const actividades: string[] = []
      for (const f of grupo.filas) {
        const act = f.actividad.trim()
        if (act && !esTiempoSecuencia(act) && !actividades.includes(act)) {
          actividades.push(act)
        }
      }
      filasProceso = [
        {
          proceso: 'Gestión y acompañamiento del aprendizaje',
          actividad: actividades.join('\n\n')
        }
      ]
    }

    if (momento === 'CIERRE') {
      const actividad = filasProceso
        .map((f) => f.actividad.trim())
        .filter(Boolean)
        .join('\n\n')
      filasProceso = [{ proceso: 'Metacognición', actividad }]
    }

    resultado.push({
      momento,
      momentoEtiqueta: etiquetaMomento(momento),
      tiempo: TIEMPOS_SECUENCIA_POR_MOMENTO[momento],
      tiempoPorFila: false,
      filas: filasProceso.filter((f) => f.proceso.trim() && f.actividad.trim())
    })
  }

  return resultado
}

function renderTextoPropositoOrganizacion(proposito: string, titulo: string): string {
  const tit = titulo.trim() || '***'
  const prop = proposito.trim() || '***'
  return [
    `El docente escribe en la pizarra el título de la sesión de aprendizaje: ${tit}`,
    `Comunica claramente el propósito de la sesión de aprendizaje: ${prop}`,
    `El/la docente comunica el objetivo: ${prop}`
  ].join('\n')
}

function convertirTablasTabsEnMarkdown(texto: string): string {
  return texto
    .split('\n')
    .map((linea) => {
      const t = linea.trim()
      if (!t.includes('\t')) return linea
      if (/^[🟢🟡🔵]/.test(t) || /^MOMENTOS/i.test(t)) return linea
      const celdas = t.split('\t').map((c) => c.trim()).filter(Boolean)
      if (celdas.length >= 2) return `| ${celdas.join(' | ')} |`
      return linea
    })
    .join('\n')
}

function parsearFase2(texto: string): string {
  const match = texto.match(/\n\s*FASE\s*2\b[\s:—–-]*/i)
  if (!match || match.index === undefined) return ''
  let slice = texto.slice(match.index).trim()
  const idxSol = slice.search(/\n\s*SOLUCIONARIO(?:\s*\([^)]*\))?/i)
  if (idxSol >= 0) slice = slice.slice(0, idxSol).trim()
  return convertirTablasTabsEnMarkdown(slice)
}

function parsearSolucionario(texto: string): string {
  const match = texto.match(/\n\s*SOLUCIONARIO(?:\s*\([^)]*\))?[\s:—–-]*/i)
  if (!match || match.index === undefined) {
    if (/^\s*SOLUCIONARIO(?:\s*\([^)]*\))?/i.test(texto.trim())) {
      return texto.trim()
    }
    return ''
  }
  return texto.slice(match.index).trim()
}

const RE_SEPARADOR_PREGUNTA_PROPOSITO = /\s*[-–—−]?\s*¿[^?\n]+?\?\s*:?\s*/gu

function partesDeProposito(texto: string): string[] {
  const t = texto.trim()
  if (!t) return []
  return t
    .split(RE_SEPARADOR_PREGUNTA_PROPOSITO)
    .map((s) => limpiarItemActividad(s.replace(/^[-•*]\s*/, '').trim()))
    .filter(Boolean)
}

function textoPropositoSinPreguntas(texto: string): string {
  const partes = partesDeProposito(texto)
  if (partes.length >= 2) return unirPartesProposito(partes)
  return partes[0] ?? ''
}

function unirPartesProposito(partes: string[]): string {
  const limpias = partes
    .map((p) => p.replace(/[.;]\s*$/, '').trim())
    .filter(Boolean)
  if (limpias.length === 0) return ''
  return `${limpias.join(', ')}.`
}

function renderPropositoContenido(texto: string): string {
  const t = texto.trim()
  if (!t) return celdaVacia()

  const matches = [...t.matchAll(/\s*[-–—−]?\s*(¿[^?\n]+?\?)\s*:?\s*/gu)]
  if (matches.length >= 2) {
    const items: string[] = []
    for (let i = 0; i < matches.length; i++) {
      const label = matches[i][1].trim()
      const contentStart = (matches[i].index ?? 0) + matches[i][0].length
      const contentEnd =
        i + 1 < matches.length ? (matches[i + 1].index ?? t.length) : t.length
      const content = limpiarItemActividad(t.slice(contentStart, contentEnd))
      if (content) {
        items.push(
          `<p class="refuerzo-doc-texto"><strong>${textoHtml(label)}</strong> ${textoHtml(content)}</p>`
        )
      }
    }
    if (items.length > 0) return items.join('')
  }

  const parrafo = textoPropositoSinPreguntas(t)
  if (parrafo) return `<p class="refuerzo-doc-texto">${textoHtml(parrafo)}</p>`
  return `<p class="refuerzo-doc-texto">${textoHtml(t)}</p>`
}

function formatearPropositoComoParrafo(texto: string): string {
  return renderPropositoContenido(texto)
}

function limpiarGuionInicial(texto: string): string {
  return quitarGuionListaInicial(texto)
}

const RE_ETIQUETA_DOS_PUNTOS =
  /[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,5}(?:\s*\([^)]*\))?(?:\s*\/\s*[\p{L}\p{N}]+(?:\s+[\p{L}\p{N}]+){0,5})?:\s+/gu

function quitarEtiquetasConDosPuntos(texto: string): string {
  return texto.replace(RE_ETIQUETA_DOS_PUNTOS, '').replace(/\s{2,}/g, ' ').trim()
}

function limpiarTextoCeldaActividad(texto: string): string {
  return quitarEtiquetasConDosPuntos(
    limpiarItemActividad(quitarGuionListaInicial(texto))
  )
}

function limpiarTextoCeldaDesarrollo(texto: string): string {
  return limpiarItemActividad(quitarGuionListaInicial(texto))
}

function lineasParrafoActividad(texto: string): string[] {
  return texto
    .split(/\n+|(?<=\S)\s+•\s+/)
    .map((linea) => limpiarTextoCeldaActividad(linea.trim()))
    .filter(Boolean)
}

function extraerPreguntasActividad(texto: string): string[] {
  const t = limpiarGuionInicial(texto)
  if (!t) return []

  const preguntas: string[] = []
  for (const linea of lineasParrafoActividad(t)) {
    const halladas = [...linea.matchAll(/¿[^?\n]+?\?/gu)].map((m) =>
      limpiarTextoCeldaActividad(m[0])
    )
    if (halladas.length >= 1) {
      preguntas.push(...halladas)
    } else if (/^\s*¿.+?\?\s*$/u.test(linea)) {
      preguntas.push(limpiarTextoCeldaActividad(linea))
    }
  }

  if (preguntas.length >= 1) return preguntas
  return lineasParrafoActividad(t)
}

function partesPorGuionDesarrollo(texto: string): string[] {
  const t = limpiarTextoCeldaDesarrollo(texto)
  if (!t) return []

  const porLinea = t
    .split(/\n\s*[-•*]\s+/)
    .map((p) => limpiarTextoCeldaDesarrollo(p))
    .filter(Boolean)
  if (porLinea.length >= 2) return porLinea

  const partes = t
    .split(/\s+[-–—−]\s+/)
    .map((p) => limpiarTextoCeldaDesarrollo(p))
    .filter(Boolean)
  return partes.length >= 1 ? partes : [t]
}

function splitActividadesDocenteEstudiante(texto: string): string[] {
  const t = limpiarTextoCeldaDesarrollo(texto)
  if (!t) return []

  const porOracion = t
    .split(
      /(?<=\.)\s+(?=(?:El|La|Los|Las)\s+(?:docente|estudiantes|docentes)\b)/i
    )
    .map((p) => limpiarTextoCeldaDesarrollo(p))
    .filter(Boolean)
  if (porOracion.length >= 2) return porOracion

  const porGuionLista = t
    .split(/\n\s*[-•*]\s+/)
    .map((p) => limpiarTextoCeldaDesarrollo(p))
    .filter(Boolean)
  if (porGuionLista.length >= 2) return porGuionLista

  return [t]
}

function lineasVinetaDesarrolloBloque(texto: string): string[] {
  const t = limpiarGuionInicial(texto)
  if (!t) return []

  const fragmentos = t.split(/\n+|(?<=\S)\s+•\s+/).map((l) => l.trim()).filter(Boolean)
  const items: string[] = []

  for (const frag of fragmentos) {
    for (const item of partesPorGuionDesarrollo(frag)) {
      if (item && !items.includes(item)) items.push(item)
    }
  }

  if (items.length >= 1) return items

  return splitActividadesDocenteEstudiante(t)
}

function lineasVinetaDesarrollo(texto: string): string[] {
  const bloques = texto
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean)
  if (bloques.length <= 1) {
    return lineasVinetaDesarrolloBloque(texto)
  }

  const items: string[] = []
  for (const bloque of bloques) {
    for (const item of lineasVinetaDesarrolloBloque(bloque)) {
      if (!items.includes(item)) items.push(item)
    }
  }
  return items.length >= 1 ? items : lineasVinetaDesarrolloBloque(texto)
}

type ModoFormatoActividadSecuencia = 'parrafo' | 'vinietas' | 'preguntas'

function modoFormatoActividadSecuencia(proceso: string): ModoFormatoActividadSecuencia {
  if (/saberes\s*previos?|activaci[oó]n\s*(?:de\s*)?conocimientos/i.test(proceso)) {
    return 'preguntas'
  }
  if (/gesti[oó]n\s*y\s*acompa[nñ]amiento|andamiaje/i.test(proceso)) return 'vinietas'
  return 'parrafo'
}

function esProcesoProposito(proceso: string): boolean {
  return /prop[oó]sito|orientaci[oó]n\s*(?:del\s*)?aprendizaje/i.test(proceso)
}

function renderCeldaActividadHtml(texto: string): string {
  return `<p class="refuerzo-doc-celda-texto">${textoHtml(texto)}</p>`
}

function renderParrafosActividad(items: string[]): string {
  return items.map((item) => renderCeldaActividadHtml(item)).join('')
}

function renderListaActividad(items: string[]): string {
  return `<ul class="refuerzo-doc-lista refuerzo-doc-lista-actividades">${items
    .map((item) => `<li>${textoHtml(item)}</li>`)
    .join('')}</ul>`
}

function formatearTextoActividad(
  texto: string,
  modo: ModoFormatoActividadSecuencia = 'parrafo'
): string {
  const t = limpiarGuionInicial(texto)
  if (!t) return ''

  if (modo === 'vinietas') {
    const items = lineasVinetaDesarrollo(t)
    if (items.length >= 2) return renderListaActividad(items)
    if (items.length === 1) return renderCeldaActividadHtml(items[0])
    return celdaVacia()
  }

  if (modo === 'preguntas') {
    const items = extraerPreguntasActividad(t)
    if (items.length >= 2) return renderParrafosActividad(items)
    if (items.length === 1) return renderCeldaActividadHtml(items[0])
    return renderCeldaActividadHtml(limpiarTextoCeldaActividad(t))
  }

  const lineas = lineasParrafoActividad(t)
  if (lineas.length >= 2) return renderParrafosActividad(lineas)
  return renderCeldaActividadHtml(limpiarTextoCeldaActividad(t))
}

function limpiarIntroActividad(intro: string): string {
  return quitarGuionListaInicial(intro)
    .replace(/^[:•*\s]+/g, '')
    .replace(/[-–—−•*:\s]+$/g, '')
    .trim()
}

function limpiarItemActividad(item: string): string {
  return item
    .replace(/\s+[-–—−]\s*$/g, '')
    .replace(RE_GUION_INICIAL, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizarTextoNumerado(texto: string): string {
  return texto
    .replace(/\s+-\s+(?=\d+[.)]\s)/g, ' ')
    .replace(/(?:^|\n)\s*-\s*(?=\d+[.)]\s)/gm, ' ')
    .replace(/(?:^|\n)\s*-\s*$/gm, '')
    .replace(/\s+-\s*-\s+/g, ' ')
    .trim()
}

function extraerItemsNumerados(
  texto: string
): { intro: string; items: string[] } | null {
  const textoNorm = normalizarTextoNumerado(texto.trim())
  const re = /(?:^|\n)\s*(\d+)[.)]\s+/g
  const matches = [...textoNorm.matchAll(re)]
  if (matches.length < 1) return null

  const firstIdx = matches[0].index ?? 0
  let intro = limpiarIntroActividad(textoNorm.slice(0, firstIdx))
  if (intro.endsWith(':')) intro = intro.slice(0, -1).trim()

  const items: string[] = []
  if (intro) items.push(intro)
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? textoNorm.length) : textoNorm.length
    const item = limpiarItemActividad(textoNorm.slice(start, end))
    if (item && item !== '-' && !/^[-:.\s]+$/.test(item)) items.push(item)
  }
  if (items.length === 0) return null
  return { intro, items }
}

function sanitizarFragmentoMetacognicion(texto: string): string {
  return limpiarTextoCeldaActividad(texto)
    .replace(/\s*fecha\b[\s.]*(?:en\s+proceso[\s□]*)?.*$/i, '')
    .replace(/\s*en\s+proceso[\s□]*.*$/i, '')
    .replace(/\([^)]*dibuja\s+aqu[ií][^)]*\)/gi, '')
    .replace(/□+/g, '')
    .replace(/\.{3,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function esRestoMetacognicionDescartable(resto: string): boolean {
  const r = resto.trim()
  if (!r) return true
  if (/^gesto\s*\([^)]*dibuja\s+aqu[ií][^)]*\)/i.test(r)) return true
  if (/^gesto\b[\s.(]/i.test(r) && /dibuja\s+aqu[ií]/i.test(r)) return true
  if (/dibuja\s+aqu[ií]/i.test(r)) return true
  if (/^fecha\b/i.test(r)) return true
  if (/en\s+proceso/i.test(r)) return true
  if (/^¿\s*por\s+qu[eé]\s*\?$/i.test(r)) return true
  return /^[\s.□\-–—]+(?:¿\s*por\s+qu[eé]\s*\?)?[\s.□]*$/i.test(r)
}

function esPreguntaMetacognicion(texto: string): boolean {
  const t = sanitizarFragmentoMetacognicion(texto)
  if (!t) return false
  if (/^fecha\b/i.test(t)) return false
  if (/en\s+proceso/i.test(t)) return false
  return /¿.+?\?/.test(t)
}

function esFragmentoPreguntaMetacognicionInvalido(pregunta: string): boolean {
  const t = pregunta.trim()
  if (t.length < 12) return true
  if (/^¿\s*por\s+qu[eé]\s*\?$/i.test(t)) return true
  if (/dibuja\s+aqu[ií]/i.test(t)) return true
  if (/\.{3,}/.test(t)) return true
  return false
}

function partirItemsNumeradosMetacognicion(texto: string): string[] {
  const t = texto.trim()
  if (!t) return []
  const re = /(?:^|\s)(\d+)[.)]\s+/g
  const matches = [...t.matchAll(re)]
  if (matches.length < 1) return [t]

  const items: string[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? t.length) : t.length
    const item = limpiarItemActividad(t.slice(start, end))
    if (item && item !== '-' && !/^[-:.\s]+$/.test(item)) items.push(item)
  }
  return items
}

function extraerPreguntaNumeradaMetacognicion(item: string): string | null {
  const limpio = limpiarTextoCeldaActividad(item)
  if (!limpio) return null

  const match = limpio.match(/¿[^?\n]+?\?/u)
  if (!match || match.index === undefined) return null

  let pregunta = match[0].trim()
  const resto = limpio.slice(match.index + match[0].length).trim()

  const colaPorQue = resto.match(/^y\s+(?:¿\s*)?por\s+qu[eé]\s*\?/i)
  if (colaPorQue) {
    pregunta = `${pregunta} ${colaPorQue[0]}`.replace(/\s+/g, ' ')
  }

  pregunta = sanitizarFragmentoMetacognicion(pregunta)
  if (esFragmentoPreguntaMetacognicionInvalido(pregunta)) return null
  return pregunta
}

function extraerPreguntasMetacognicion(texto: string): string[] {
  const t = texto.trim()
  if (!t) return []

  const vistos = new Set<string>()
  const resultado: string[] = []
  const agregarPregunta = (pregunta: string | null) => {
    if (!pregunta) return
    const key = pregunta.toLowerCase()
    if (vistos.has(key)) return
    vistos.add(key)
    resultado.push(pregunta)
  }

  for (const item of partirItemsNumeradosMetacognicion(t)) {
    agregarPregunta(extraerPreguntaNumeradaMetacognicion(item))
  }
  if (resultado.length >= 1) return resultado

  for (const linea of t.split(/\n+/)) {
    const l = linea.trim()
    if (!l) continue
    for (const item of partirItemsNumeradosMetacognicion(l)) {
      agregarPregunta(extraerPreguntaNumeradaMetacognicion(item))
    }
  }
  if (resultado.length >= 1) return resultado

  for (const m of t.matchAll(/¿[^?\n]+?\?/gu)) {
    const pregunta = sanitizarFragmentoMetacognicion(m[0].trim())
    if (!esFragmentoPreguntaMetacognicionInvalido(pregunta)) {
      agregarPregunta(pregunta)
    }
  }

  return resultado
}

function formatearMetacognicion(texto: string): string {
  const preguntas = extraerPreguntasMetacognicion(texto)
  if (preguntas.length === 0) return celdaVacia()
  return `<ol class="refuerzo-doc-lista-numerada">${preguntas
    .map((p) => `<li>${textoHtml(p)}</li>`)
    .join('')}</ol>`
}

function renderCeldaSecuencia(texto: string, proceso?: string): string {
  const t = texto.trim()
  if (!t) return celdaVacia()
  if (/metacogn/i.test(proceso ?? '')) {
    return formatearMetacognicion(t)
  }
  return formatearTextoActividad(t, modoFormatoActividadSecuencia(proceso ?? ''))
}

function renderTablaSecuencia(
  filas: string[][],
  propositoSesion: string,
  tituloSesion: string
): string {
  const grupos = normalizarGruposSecuencia(filas, propositoSesion, tituloSesion)
  if (grupos.length === 0) {
    return '<p class="refuerzo-doc-vacio">Sin secuencia didáctica en la respuesta.</p>'
  }

  let html =
    '<div class="refuerzo-doc-tabla-wrap"><table class="refuerzo-doc-tabla refuerzo-doc-tabla-secuencia">' +
    '<colgroup>' +
    '<col class="refuerzo-doc-secuencia-col-0">' +
    '<col class="refuerzo-doc-secuencia-col-1">' +
    '<col class="refuerzo-doc-secuencia-col-2">' +
    '<col class="refuerzo-doc-secuencia-mediacion-col">' +
    '<col class="refuerzo-doc-secuencia-col-3">' +
    '</colgroup>' +
    '<thead><tr>' +
    '<th>MOMENTOS</th>' +
    '<th>PROCESOS PEDAGÓGICOS</th>' +
    '<th colspan="2">ACTIVIDADES DE APRENDIZAJE</th>' +
    '<th>TIEMPO</th>' +
    '</tr></thead><tbody>'

  const totalFilas = grupos.reduce((acc, g) => acc + g.filas.length, 0)
  let mediacionRenderizada = false

  for (const grupo of grupos) {
    const n = grupo.filas.length
    if (n === 0) continue
    grupo.filas.forEach((fila, idx) => {
      html += '<tr>'
      if (idx === 0) {
        html += `<td class="refuerzo-doc-secuencia-col-0" rowspan="${n}"><span class="refuerzo-doc-momento">${textoHtml(grupo.momentoEtiqueta)}</span></td>`
      }
      html += `<td class="refuerzo-doc-secuencia-col-1 refuerzo-doc-proceso">${textoHtml(fila.proceso)}</td>`
      html += `<td class="refuerzo-doc-secuencia-col-2">${
        esProcesoProposito(fila.proceso)
          ? formatearPropositoComoParrafo(fila.actividad)
          : renderCeldaSecuencia(fila.actividad, fila.proceso)
      }</td>`
      if (idx === 0) {
        if (!mediacionRenderizada) {
          html += `<td class="refuerzo-doc-secuencia-mediacion" rowspan="${totalFilas}"><span class="refuerzo-doc-mediacion-vertical">MEDIACIÓN Y RETROALIMENTACIÓN</span></td>`
          mediacionRenderizada = true
        }
      }
      if (grupo.tiempoPorFila) {
        html += `<td class="refuerzo-doc-secuencia-col-3">${fila.tiempo ? renderCeldaSecuencia(fila.tiempo) : celdaVacia()}</td>`
      } else if (idx === 0) {
        html += `<td class="refuerzo-doc-secuencia-col-3" rowspan="${n}">${grupo.tiempo ? renderCeldaSecuencia(grupo.tiempo) : celdaVacia()}</td>`
      }
      html += '</tr>'
    })
  }

  html += '</tbody></table></div>'
  return html
}

const TITULO_FICHA_BASE_TEORICA = 'Base teorica'

function normalizarLineaFicha(texto: string): string {
  return texto.replace(/\*\*/g, '').trim()
}

function esLineaBaseTeorica(texto: string): boolean {
  return /^base\s+te[oó]rica\b/i.test(normalizarLineaFicha(texto))
}

function esPrefacioFichaOmitible(texto: string): boolean {
  const t = normalizarLineaFicha(texto)
  if (/^FASE\s*2/i.test(t)) return true
  if (/^instrucciones\s+generales/i.test(t)) return true
  if (/^nivel\s+de\s+complejidad/i.test(t)) return true
  return false
}

const SECCIONES_FICHA_REFUERZO: { re: RegExp; titulo: string }[] = [
  { re: /^actividades\b/i, titulo: 'Actividades' },
  { re: /^tarea\s+aut[eé]ntica\b/i, titulo: 'Tarea auténtica' },
  { re: /^autoevaluaci[oó]n\b/i, titulo: 'Autoevaluación' },
  { re: /^organizadores\s+gr[aá]ficos\b/i, titulo: 'Organizadores gráficos' },
  { re: /^referencias\b/i, titulo: 'Referencias' }
]

function esTituloSeccionFichaRefuerzo(texto: string): string | null {
  const tNorm = normalizarLineaFicha(texto).replace(/^[-•*]\s*/, '')
  for (const seccion of SECCIONES_FICHA_REFUERZO) {
    if (seccion.re.test(tNorm)) return seccion.titulo
  }
  return null
}

function tituloActividadDesdeLinea(texto: string): { titulo: string; resto: string } | null {
  const t = normalizarLineaFicha(texto)

  const numerado = t.match(/^(\d+)[.)]\s*actividad\s*(\d+)\b/i)
  if (numerado) {
    return { titulo: `Actividad ${numerado[2]}`, resto: '' }
  }

  const directo = t.match(/^actividad\s*(\d+)\b/i)
  if (!directo) return null
  const resto = t.replace(/^actividad\s*\d+\s*(?:[:.\-–—]\s*)?/i, '').trim()
  return { titulo: `Actividad ${directo[1]}`, resto }
}

function extraerSubtituloInterno(texto: string): string | null {
  const t = normalizarLineaFicha(texto)
  const match = t.match(/^subt[ií]tulo\s*:\s*(.+)$/i)
  if (!match) return null
  const valor = match[1].trim()
  return valor || null
}

/** Línea tipo «(Punto de partida) — MODELADO…»: solo la parte antes del guion. */
function extraerEtiquetaActividadAntesDeGuion(texto: string): string | null {
  const t = normalizarLineaFicha(texto).trim()
  if (!t) return null
  const idx = t.search(/\s+[-–—−]\s+/)
  if (idx < 0) return null
  const prefijo = t.slice(0, idx).trim()
  return prefijo || null
}

function agregarEtiquetaActividadSiAplica(texto: string, partes: string[]): boolean {
  const etiqueta = extraerEtiquetaActividadAntesDeGuion(texto)
  if (!etiqueta) return false
  agregarSubtituloInterno(etiqueta, partes)
  return true
}

/** Omite filas de instrucción tipo «Texto (expositivo-narrativo, 400–500 palabras):». */
function esLineaEtiquetaConParentesisOmitible(texto: string): boolean {
  const t = normalizarLineaFicha(texto)
  return /^texto\s*\([^)]+\)\s*:?\s*$/i.test(t)
}

function agregarSubtituloInterno(texto: string, partes: string[]) {
  partes.push(
    `<p class="refuerzo-doc-parrafo refuerzo-doc-subtitulo-interno"><strong>${textoHtml(texto)}</strong></p>`
  )
}

function usaTituloBordeFicha(titulo: string): boolean {
  return /^(actividades|autoevaluaci[oó]n)$/i.test(titulo.trim())
}

function renderTituloBordeFicha(titulo: string): string {
  return `<h4 class="refuerzo-doc-bloque-titulo refuerzo-doc-bloque-titulo-borde">${textoHtml(titulo)}</h4>`
}

function renderSubtituloFicha(titulo: string): string {
  return `<h4 class="refuerzo-doc-subtitulo">${textoHtml(titulo)}</h4>`
}

function renderBloquesFase2(texto: string): string {
  if (!texto.trim()) return ''
  const bloques = respuestaPromptABloques(texto)
  const partes: string[] = []
  let llegoBaseTeorica = false
  let seccionActual: 'base-teorica' | 'actividades' | 'otra' | null = null
  let cardAbierta = false

  const cerrarCard = () => {
    if (!cardAbierta) return
    partes.push('</div>')
    cardAbierta = false
  }

  const abrirCard = (claseExtra: string) => {
    cerrarCard()
    partes.push(`<div class="refuerzo-doc-card ${claseExtra}">`)
    cardAbierta = true
  }

  const agregarParrafo = (t: string) => {
    partes.push(`<p class="refuerzo-doc-parrafo">${textoHtml(t)}</p>`)
  }

  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      const t = bloque.texto.trim()
      const tNorm = normalizarLineaFicha(t)

      if (esLineaBaseTeorica(t)) {
        llegoBaseTeorica = true
        seccionActual = 'base-teorica'
        cerrarCard()
        partes.push(renderTituloBordeFicha(TITULO_FICHA_BASE_TEORICA))
        abrirCard('refuerzo-doc-base-teorica')
        continue
      }

      if (!llegoBaseTeorica) {
        if (esPrefacioFichaOmitible(t)) continue
        continue
      }

      const tituloSeccion = esTituloSeccionFichaRefuerzo(t)
      if (tituloSeccion) {
        cerrarCard()
        seccionActual = /^actividades$/i.test(tituloSeccion) ? 'actividades' : 'otra'
        if (usaTituloBordeFicha(tituloSeccion)) {
          partes.push(renderTituloBordeFicha(tituloSeccion))
        } else {
          partes.push(renderSubtituloFicha(tituloSeccion))
        }
        continue
      }

      const actividad = tituloActividadDesdeLinea(t)
      if (actividad) {
        seccionActual = 'actividades'
        cerrarCard()
        partes.push(renderSubtituloFicha(actividad.titulo))
        abrirCard('refuerzo-doc-actividad')
        if (actividad.resto) {
          if (!agregarEtiquetaActividadSiAplica(actividad.resto, partes)) {
            agregarParrafo(actividad.resto)
          }
        }
        continue
      }

      if (/^FASE\s*2/i.test(tNorm)) continue
      if (/^nivel\s+de\s+complejidad/i.test(tNorm)) continue

      const subtituloInterno = extraerSubtituloInterno(t)
      if (subtituloInterno) {
        agregarSubtituloInterno(subtituloInterno, partes)
        continue
      }

      if (esLineaEtiquetaConParentesisOmitible(t)) continue

      if (seccionActual === 'actividades' && cardAbierta) {
        if (agregarEtiquetaActividadSiAplica(t, partes)) continue
        agregarParrafo(t)
        continue
      }

      if (seccionActual === 'otra' || !cardAbierta) {
        agregarParrafo(t)
        continue
      }

      agregarParrafo(t)
    } else if (cardAbierta) {
      partes.push(renderTablaGenerica(bloque.filas))
    } else if (llegoBaseTeorica) {
      partes.push(renderTablaGenerica(bloque.filas))
    }
  }

  cerrarCard()
  return `<section class="refuerzo-doc-fase2">${partes.join('')}</section>`
}

function limpiarLineaSolucionario(texto: string): string {
  return normalizarLineaFicha(texto).replace(/^[-•*]\s*/, '').trim()
}

function esEncabezadoSolucionario(texto: string): boolean {
  return /^SOLUCIONARIO(?:\s*\([^)]*\))?/i.test(limpiarLineaSolucionario(texto))
}

function tituloActividadSolucionarioDesdeLinea(
  texto: string
): { titulo: string; resto: string } | null {
  const t = limpiarLineaSolucionario(texto)

  const numerado = t.match(/^(\d+)[.)]\s*actividad\s*(\d+)\b(?:\s*[:\-–—]\s*)?(.*)$/i)
  if (numerado) {
    return { titulo: `Actividad ${numerado[2]}`, resto: (numerado[3] ?? '').trim() }
  }

  const act = t.match(/^actividad\s*(\d+)\b(?:\s*[:\-–—]\s*)?(.*)$/i)
  if (act) {
    return { titulo: `Actividad ${act[1]}`, resto: (act[2] ?? '').trim() }
  }

  const reto = t.match(/^reto\s+opcional(?:\s*\([^)]*\))?\s*[:\-–—]\s*(.*)$/i)
  if (reto) {
    return { titulo: 'Reto opcional (AD)', resto: (reto[1] ?? '').trim() }
  }

  return null
}

function renderLineaSolucionarioEtiquetada(texto: string): string | null {
  const t = limpiarLineaSolucionario(texto)
  const m = t.match(/^([^:]+):\s*([\s\S]+)$/)
  if (!m) return null
  const etiqueta = m[1].trim()
  if (/^actividad\s*\d+/i.test(etiqueta)) return null
  if (/^reto\s+opcional/i.test(etiqueta)) return null
  if (/^SOLUCIONARIO/i.test(etiqueta)) return null
  return `<p class="refuerzo-doc-parrafo"><strong>${textoHtml(etiqueta)}:</strong> ${textoHtml(m[2].trim())}</p>`
}

function extraerNotaDocente(texto: string): string | null {
  let t = normalizarLineaFicha(texto).trim()
  t = t.replace(/^\(\s*/, '').replace(/\)\s*$/, '').trim()
  t = t.replace(/^[-•*]\s*/, '').trim()
  const m = t.match(/^nota\s+docente\s*:\s*(.+)$/i)
  return m?.[1]?.trim() ?? null
}

function renderNotaDocente(texto: string): string {
  return `<aside class="refuerzo-doc-nota-docente"><p class="refuerzo-doc-parrafo"><strong>Nota docente:</strong> ${textoHtml(texto)}</p></aside>`
}

function renderBloquesSolucionario(texto: string): string {
  if (!texto.trim()) return ''
  const bloques = respuestaPromptABloques(texto)
  const partes: string[] = []
  let cardAbierta = false

  const cerrarCard = () => {
    if (!cardAbierta) return
    partes.push('</div>')
    cardAbierta = false
  }

  const abrirCard = () => {
    cerrarCard()
    partes.push('<div class="refuerzo-doc-card refuerzo-doc-solucionario-actividad">')
    cardAbierta = true
  }

  const agregarParrafo = (t: string) => {
    partes.push(`<p class="refuerzo-doc-parrafo">${textoHtml(t)}</p>`)
  }

  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      const t = bloque.texto.trim()
      if (!t) continue

      if (esEncabezadoSolucionario(t)) continue

      const nota = extraerNotaDocente(t)
      if (nota) {
        cerrarCard()
        partes.push(renderNotaDocente(nota))
        continue
      }

      const actividad = tituloActividadSolucionarioDesdeLinea(t)
      if (actividad) {
        cerrarCard()
        partes.push(renderSubtituloFicha(actividad.titulo))
        abrirCard()
        if (actividad.resto) {
          agregarSubtituloInterno(actividad.resto, partes)
        }
        continue
      }

      const etiquetada = renderLineaSolucionarioEtiquetada(t)
      if (etiquetada) {
        if (!cardAbierta) abrirCard()
        partes.push(etiquetada)
        continue
      }

      if (!cardAbierta) abrirCard()
      agregarParrafo(limpiarLineaSolucionario(t))
    } else {
      if (!cardAbierta) abrirCard()
      partes.push(renderTablaGenerica(bloque.filas))
    }
  }

  cerrarCard()
  return `<section class="refuerzo-doc-solucionario-cuerpo">${partes.join('')}</section>`
}

/** Solucionario docente (después de la ficha de refuerzo). */
function renderSolucionarioRefuerzoDocumento(
  solucionario: string,
  tituloSesion: string
): string {
  if (!solucionario.trim()) return ''
  const contenido = renderBloquesSolucionario(solucionario)
  if (!contenido) return ''

  return `
    <div class="refuerzo-doc refuerzo-doc-solucionario" aria-label="Solucionario docente">
      <header class="refuerzo-doc-encabezado refuerzo-doc-encabezado-solucionario">
        <p class="refuerzo-doc-eyebrow">Solucionario (uso docente)</p>
        <h1 class="refuerzo-doc-titulo-principal">${textoHtml(tituloSesion)}</h1>
      </header>
      ${contenido}
    </div>`
}

/** Solo el cuerpo HTML del solucionario (tablas, actividades) — misma lógica que la vista. */
export function solucionarioCuerpoHtml(respuestaprompt: string): string {
  const texto = (respuestaprompt ?? '').trim()
  if (!texto) return ''
  const bloque = parsearSolucionario(texto) || texto
  return renderBloquesSolucionario(bloque)
}

/** HTML del solucionario a partir de texto plano (respuesta IA o BD). */
export function solucionarioRefuerzoDocumentoToHtml(data: {
  respuestaprompt: string
  tituloSesion?: string
  area?: string
  grado?: string
  docente?: string
  numeroSesion?: number
}): string {
  const texto = (data.respuestaprompt ?? '').trim()
  if (!texto) {
    return '<p class="refuerzo-doc-vacio">Sin contenido de solucionario.</p>'
  }
  const bloque = parsearSolucionario(texto) || texto
  return renderSolucionarioRefuerzoDocumento(
    bloque,
    (data.tituloSesion ?? '').trim() || 'Solucionario'
  )
}

/** Ficha de refuerzo (FASE 2) como documento aparte, después de las firmas de la sesión. */
function renderFichaRefuerzoDocumento(
  fase2: string,
  tituloSesion: string,
  meta: {
    numeroSesion?: number
    institucion: string
    area: string
    grado: string
    docente: string
  }
): string {
  if (!fase2.trim()) return ''
  const contenido = renderBloquesFase2(fase2)
  if (!contenido) return ''

  const { area, grado, docente, numeroSesion } = meta
  const etiquetaFicha = etiquetaFichaRefuerzoDocumento(numeroSesion)

  return `
    <div class="refuerzo-doc refuerzo-doc-ficha" aria-label="Ficha de Refuerzo">
      <header class="refuerzo-doc-encabezado refuerzo-doc-encabezado-ficha">
        <p class="refuerzo-doc-eyebrow">${textoHtml(etiquetaFicha)}</p>
        <h1 class="refuerzo-doc-titulo-principal">${textoHtml(tituloSesion)}</h1>
      </header>
      <section class="refuerzo-doc-bloque refuerzo-doc-bloque-ficha-meta">
        <table class="refuerzo-doc-meta">
          <tbody>
            <tr>
              <th>ÁREA</th>
              <td>${area ? renderMetaCelda(area) : celdaVacia()}</td>
              <th>GRADO Y SECCIÓN</th>
              <td>${grado ? renderMetaCelda(grado) : celdaVacia()}</td>
            </tr>
            <tr>
              <th>DOCENTE</th>
              <td>${renderMetaCelda(docente)}</td>
              <th>ALUMNO</th>
              <td>${celdaVacia()}</td>
            </tr>
          </tbody>
        </table>
      </section>
      ${contenido}
    </div>`
}

function renderTablaGenerica(filas: string[][]): string {
  if (filas.length === 0) return ''
  const numCols = Math.max(...filas.map((f) => f.length), 1)
  const [head, ...body] = filas
  const tieneEncabezado = filas.length > 1
  let html = '<div class="refuerzo-doc-tabla-wrap"><table class="refuerzo-doc-tabla"><thead><tr>'
  if (tieneEncabezado) {
    for (let i = 0; i < numCols; i++) {
      html += `<th>${escapeHtml(head[i] ?? '')}</th>`
    }
    html += '</tr></thead><tbody>'
    for (const fila of body) {
      html += '<tr>'
      for (let i = 0; i < numCols; i++) {
        html += `<td>${textoHtml(fila[i] ?? '')}</td>`
      }
      html += '</tr>'
    }
  } else {
    html += '</tr></thead><tbody><tr>'
    for (let i = 0; i < numCols; i++) {
      html += `<td>${textoHtml(head[i] ?? '')}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table></div>'
  return html
}

function renderEnlace(url: string, etiqueta?: string): string {
  const t = etiqueta ?? url
  return `<a class="refuerzo-doc-enlace" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${textoHtml(t)}</a>`
}

function renderListaConCheck(items: string[]): string {
  return `<ul class="refuerzo-doc-lista-check">${items
    .map((item) => `<li>${item}</li>`)
    .join('')}</ul>`
}

/** Secciones fijas IV–VI de la plantilla Word «SESIÓN DE REFUERZO». */
function renderSeccionesFinalesRefuerzo(): string {
  const recursos = renderListaConCheck([
    textoHtml('Fichas de refuerzo'),
    textoHtml('Pizarra, plumones, Papelógrafos'),
    textoHtml('Proyector, parlantes, Tableta, Laptop, Celular'),
    `IA: ${renderEnlace('https://chatgpt.com/')}`,
    `IA: ${renderEnlace('https://gemini.google.com/app?hl=es')}`,
    `IA: ${renderEnlace('https://copilot.microsoft.com/chats/X94hx1PGEoVkQn1JWJGfY')}`
  ])

  const bibliografia = renderListaConCheck([
    textoHtml(
      'Minedu (2016). Programa curricular de educación secundaria. Resolución Ministerial N.° 649-2016-Minedu.'
    ),
    textoHtml(
      'Minedu (2016). Currículo Nacional de la educación básica. Resolución Ministerial N.° 281-2016-Minedu y su modificatoria.'
    ),
    textoHtml(
      'Minedu (2019). Planificación, mediación y evaluación de los aprendizajes en la Educación Secundaria.'
    ),
    textoHtml('Minedu (2020). Resolución ministerial N° 094-2020-MINEDU')
  ])

  const anexos = `<ul class="refuerzo-doc-lista">${[
    'Ficha de refuerzo',
    'Instrumento de evaluación.'
  ]
    .map((item) => `<li>${textoHtml(item)}</li>`)
    .join('')}</ul>`

  return `
    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">IV. RECURSOS Y MATERIALES EDUCATIVOS</h2>
      <div class="refuerzo-doc-caja">${recursos}</div>
    </section>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">V. REFERENCIAS BIBLIOGRÁFICAS</h2>
      <div class="refuerzo-doc-tabla-wrap">
        <table class="refuerzo-doc-tabla refuerzo-doc-tabla-bibliografia">
          <tbody>
            <tr>
              <th>Bibliografía</th>
              <td>${bibliografia}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">VI. ANEXOS</h2>
      <div class="refuerzo-doc-caja">${anexos}</div>
    </section>`
}

function renderFirmasRefuerzo(): string {
  return `
    <section class="refuerzo-doc-bloque refuerzo-doc-bloque-final">
      <div class="refuerzo-doc-caja refuerzo-doc-firmas">
        <div class="refuerzo-doc-firma">
          <div class="refuerzo-doc-firma-linea" aria-hidden="true"></div>
          <p class="refuerzo-doc-firma-label">DIRECTOR</p>
        </div>
        <div class="refuerzo-doc-firma">
          <div class="refuerzo-doc-firma-linea" aria-hidden="true"></div>
          <p class="refuerzo-doc-firma-label">DOCENTE</p>
        </div>
      </div>
    </section>`
}

function renderPropositoHtml(texto: string): string {
  return renderPropositoContenido(texto)
}

function renderMetaCelda(valor: string): string {
  return valor.trim() ? `<div class="refuerzo-doc-meta-valor">${textoHtml(valor.trim())}</div>` : celdaVacia()
}

/** Etiqueta del documento (cabecera): incluye número de sesión. */
export function etiquetaTipoDocumentoSesionRefuerzo(data: SesionRefuerzoVistaData): string {
  const n = data.numeroSesion
  if (n != null && Number.isFinite(Number(n))) {
    return `SESIÓN DE REFUERZO ${Number(n)}`
  }
  return 'SESIÓN DE REFUERZO'
}

export function etiquetaFichaRefuerzoDocumento(numeroSesion?: number): string {
  const n = Number(numeroSesion)
  if (Number.isFinite(n) && n > 0) {
    return `Ficha de refuerzo N° ${n}`
  }
  return 'Ficha de refuerzo'
}

/** Título extraído de la respuesta de la IA (`Título: …`), no de la sesión en BD. */
export function tituloRefuerzoVisible(data: SesionRefuerzoVistaData): string {
  const texto = (data.respuestaprompt ?? '').trim()
  if (!texto) return 'Sesión de refuerzo'
  const { titulo } = resolverCamposRefuerzo(texto, data)
  return (
    titulo.trim() ||
    (data.numeroSesion ? `Sesión ${data.numeroSesion}` : 'Sesión de refuerzo')
  )
}

/** HTML con diseño basado en la plantilla Word «SESIÓN DE REFUERZO». */
export function sesionRefuerzoDocumentoToHtml(data: SesionRefuerzoVistaData): string {
  const texto = (data.respuestaprompt ?? '').trim()
  if (!texto) {
    return '<p class="refuerzo-doc-vacio">Sin contenido generado.</p>'
  }

  const campos = resolverCamposRefuerzo(texto, data)
  const secuencia = parsearSecuenciaDidactica(texto)
  const fase2 = parsearFase2(texto)
  const solucionario = parsearSolucionario(texto)

  const tituloVisible = tituloRefuerzoVisible(data)
  const etiquetaDocumento = etiquetaTipoDocumentoSesionRefuerzo(data)
  const area = (data.area ?? '').trim()
  const grado = (data.grado ?? '').trim()
  const ciclo = (data.ciclo ?? '').trim()
  const docente = (data.docente ?? 'EducaPlus').trim()
  const institucion = (data.institucion ?? '').trim()

  return `<div class="refuerzo-doc">
    <header class="refuerzo-doc-encabezado">
      <p class="refuerzo-doc-eyebrow">${textoHtml(etiquetaDocumento)}</p>
      <h1 class="refuerzo-doc-titulo-principal">${textoHtml(tituloVisible)}</h1>
    </header>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">DATOS INFORMATIVOS</h2>
      <table class="refuerzo-doc-meta">
        <tbody>
          <tr>
            <th>INSTITUCIÓN EDUCATIVA</th>
            <td colspan="3">${institucion ? renderMetaCelda(institucion) : celdaVacia()}</td>
          </tr>
          <tr>
            <th>ÁREA</th>
            <td>${area ? renderMetaCelda(area) : celdaVacia()}</td>
            <th>GRADO Y SECCIÓN</th>
            <td>${grado ? renderMetaCelda(grado) : celdaVacia()}</td>
          </tr>
          <tr>
            <th>DOCENTE</th>
            <td>${renderMetaCelda(docente)}</td>
            <th>CICLO</th>
            <td>${ciclo ? renderMetaCelda(ciclo) : celdaVacia()}</td>
          </tr>
          <tr>
            <th>FECHA</th>
            <td>${celdaVacia()}</td>
            <th>TIEMPO</th>
            <td>${renderMetaCelda('90 min')}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">PROPÓSITOS DE APRENDIZAJE Y EVALUACIÓN</h2>
      <table class="refuerzo-doc-tabla refuerzo-doc-tabla-propositos">
        <thead>
          <tr>
            <th>PROPÓSITO</th>
            <th>COMPETENCIA</th>
            <th>CAPACIDADES</th>
            <th>DESEMPEÑOS PRECISADOS</th>
            <th>CAMPO TEMÁTICO</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>${campos.proposito ? renderPropositoHtml(campos.proposito) : celdaVacia()}</td>
            <td>${renderCompetenciaSesion(campos.competencia)}</td>
            <td>${renderLista(campos.capacidades)}</td>
            <td>${renderLista(campos.desempenios)}</td>
            <td>${campos.campotematico ? renderMetaCelda(campos.campotematico) : celdaVacia()}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">EVALUACIÓN DE LOS APRENDIZAJES</h2>
      <table class="refuerzo-doc-meta refuerzo-doc-meta-eval">
        <tbody>
          <tr>
            <th>EVIDENCIA</th>
            <td colspan="3">${renderLista(campos.evidencia)}</td>
          </tr>
          <tr>
            <th>CRITERIO</th>
            <td colspan="3">${renderLista(campos.criterios)}</td>
          </tr>
          <tr>
            <th>INSTRUMENTO DE EVALUACIÓN</th>
            <td colspan="3">${renderMetaCelda('Lista de cotejo')}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="refuerzo-doc-bloque">
      <h2 class="refuerzo-doc-bloque-titulo">SECUENCIA DIDÁCTICA</h2>
      ${renderTablaSecuencia(secuencia, campos.proposito, tituloVisible)}
    </section>

    ${renderSeccionesFinalesRefuerzo()}
    ${renderFirmasRefuerzo()}
  </div>
  ${renderFichaRefuerzoDocumento(fase2, tituloVisible, {
    numeroSesion: data.numeroSesion,
    institucion,
    area,
    grado,
    docente
  })}
  ${renderSolucionarioRefuerzoDocumento(solucionario, tituloVisible)}`
}
