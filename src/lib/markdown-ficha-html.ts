function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(text: string): string {
  let t = escapeHtml(text)
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/\*(.+?)\*/g, '<em>$1</em>')
  return t
}

function parseTableCells(line: string): string[] {
  const parts = line.split('|').map((c) => c.trim())
  if (parts.length <= 1) return []
  if (parts[0] === '' && parts[parts.length - 1] === '') {
    return parts.slice(1, -1)
  }
  return parts
}

function esSeparadorTabla(line: string): boolean {
  if (!line.includes('|')) return false
  const celdas = parseTableCells(line)
  return celdas.length >= 2 && celdas.every((c) => /^[\s\-:]+$/.test(c))
}

function esFilaTabla(line: string): boolean {
  return line.includes('|') && parseTableCells(line).length >= 2
}

/** "FASE 1: …" / "FASE 3 — …" → solo el nombre de la fase. */
function nombreFaseDesdeLinea(line: string): string | null {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
  const m = t.match(/^FASE\s*\d+\s*[:：—–\-]\s*(.+)$/i)
  return m ? m[1].trim() : null
}

function esFaseFuenteConocimiento(nombreFase: string): boolean {
  const n = nombreFase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return n.includes('fuente de conocimiento')
}

function esFaseBaseTeorica(nombreFase: string): boolean {
  const n = nombreFase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return n.includes('base teorica') || n.includes('lectura de analisis')
}

function esFaseActividades(nombreFase: string): boolean {
  const n = nombreFase.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return n.includes('actividad')
}

/** "ACTIVIDADES (SECUENCIA...)" → "ACTIVIDADES" */
function tituloFaseVisible(nombreFase: string): string {
  if (esFaseActividades(nombreFase)) return 'ACTIVIDADES'
  return nombreFase
}

/** Normaliza nombre de proceso para comparar con los de la sesión/competencia. */
function normalizarNombreProceso(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^[-*•]\s+/, '')
    .replace(/[,:：]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function setNombresProcesoDidactico(nombres: string[] | undefined): Set<string> {
  const set = new Set<string>()
  for (const raw of nombres ?? []) {
    const n = normalizarNombreProceso(raw)
    if (n) set.add(n)
  }
  return set
}

/**
 * Encabezado de proceso didáctico:
 * - coincide con un proceso de la competencia (prompt dinámico), o
 * - fila índice con ◦ / competencia+etapas (formato compuesto de la IA).
 */
function esFilaIndiceProcesoDidactico(
  line: string,
  nombresProceso: Set<string>
): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/[,:：]\s*$/, '')
    .trim()
  if (!t || /^Actividad\s*\d+/i.test(t)) return false
  if (/^\d+[.)]\s/.test(t)) return false
  // Separadores típicos de la fila índice (competencia + etapas)
  if (/[◦○]/.test(t)) return true

  const n = normalizarNombreProceso(t)
  if (nombresProceso.has(n)) return true

  // Fila índice compuesta (competencia + varias etapas en una línea)
  const tieneComp =
    /\bse comunica\b/.test(n) ||
    /\blee diversos\b/.test(n) ||
    /\bescribe diversos\b/.test(n)
  const tieneEtapas =
    (n.includes('antes') && n.includes('durante')) ||
    (n.includes('planificacion') && n.includes('textualizacion'))
  return tieneComp && tieneEtapas
}

/** Limpia viñetas/◦ y deja el texto listo para título morado. */
function textoProcesoDidacticoVisible(line: string): string {
  return line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s*[◦○]\s*/g, ' · ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Banner como ACTIVIDADES: Análisis / Tarea / Cierre.
 * (Desarrollo vuelve a card con título morado, no banner.)
 */
function esEncabezadoSeccionActividades(
  line: string,
  nombresProceso: Set<string>
): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .trim()
  if (!t || t.length > 140) return false
  if (/^Actividad\s*\d+/i.test(t)) return false
  if (esFilaIndiceProcesoDidactico(line, nombresProceso)) return false
  if (esLineaEspacioRespuesta(t)) return false

  const n = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return (
    /^analisis de desempeno\b/.test(n) ||
    /^tarea autentica\b/.test(n) ||
    /^cierre(\s*[—–\-:]|\s*$)/.test(n)
  )
}

/** Títulos cortos para banners de sección. */
function tituloSeccionActividadesVisible(titulo: string): string {
  const n = titulo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (/^analisis\b/.test(n)) return 'ANÁLISIS'
  if (/^tarea autentica\b/.test(n)) return 'TAREA AUTÉNTICA'
  return titulo
}

/** "Desarrollo (Herramientas…)" / "Organizador gráfico…" → card con título morado. */
function esEncabezadoDesarrolloActividades(line: string): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .trim()
  if (!t || t.length > 140) return false
  const n = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return (
    /^desarrollo\s*\(/.test(n) ||
    /^desarrollo\b.*herramientas/.test(n) ||
    /^organizador grafico\b/.test(n)
  )
}

/** "Actividad 1 — Antes del discurso" (línea completa en negrita). */
function esTituloActividad(line: string): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
  return /^Actividad\s*\d+\b/i.test(t)
}

/** Línea de respuesta para escribir (solo puntos/guiones). */
function esLineaEspacioRespuesta(line: string): boolean {
  const t = line.trim().replace(/^[-*•]\s+/, '')
  if (t.length < 4) return false
  return /^[.\u2026_\-–—\s]+$/.test(t) && /[.\u2026_]/.test(t)
}

/**
 * Texto con puntos al final en la misma línea → texto limpio + N líneas de respuesta.
 * Ej: "2) Analiza… Base Teórica. ........................"
 */
function separarTextoYLineasFinales(line: string): { texto: string; lineas: number } {
  const t = line.trim()
  if (!t || esLineaEspacioRespuesta(t)) return { texto: t, lineas: 0 }

  const m = t.match(/^(.*?)((?:\s*[.\u2026_]{4,}\s*)+)$/)
  if (!m?.[1]?.trim()) return { texto: t, lineas: 0 }

  const texto = m[1].trim()
  const grupos = m[2].match(/[.\u2026_]{4,}/g)
  return { texto, lineas: Math.max(1, grupos?.length ?? 1) }
}

/**
 * "Hipótesis 1: ....." / "a) ........" → etiqueta + línea a todo el ancho.
 * Devuelve null si no aplica.
 */
function partirEtiquetaYLineaRespuesta(
  line: string
): { etiqueta: string; restoEsLinea: boolean } | null {
  const t = line.trim().replace(/^[-*•]\s+/, '')
  const m = t.match(
    /^((?:[^.\u2026_]{1,80}[:：])|(?:\d+[.)])|(?:[a-zA-ZñÑ][.)]))\s*([.\u2026_\-–—\s]{4,})$/
  )
  if (!m) return null
  const etiqueta = m[1].trim()
  const puntos = m[2].trim()
  if (!esLineaEspacioRespuesta(puntos)) return null
  return { etiqueta, restoEsLinea: true }
}

/** "Subtítulo 1 — texto" / "Subtítulo técnico 2: texto" → texto del subtítulo. */
function textoSubtituloTeoricoDesdeLinea(line: string): string | null {
  const t = line
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
  const solo = t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (/^subtitulo(\s+tecnico)?(\s*\d+)?$/.test(solo)) return ''
  const conSep = t.match(
    /^Subt[ií]tulo(?:\s+t[eé]cnico)?(?:\s*\d+)?\s*[:：—–\-]\s*(.+)$/i
  )
  if (conSep?.[1]?.trim()) {
    return conSep[1].replace(/^[\s—–\-]+/, '').trim()
  }
  const sinSep = t.match(/^Subt[ií]tulo(?:\s+t[eé]cnico)?\s+\d+\s+(.+)$/i)
  if (sinSep?.[1]?.trim()) {
    return sinSep[1].replace(/^[\s—–\-]+/, '').trim()
  }
  return null
}

/** "Glosario (para el estudiante):" */
function esEncabezadoGlosario(line: string): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^[-*•]\s+/, '')
    .trim()
  return /^Glosario\b/i.test(t)
}

/** "Parafraseo: definición" → negrita en el término si aún no tiene **. */
function formatoTerminoGlosario(item: string): string {
  if (/\*\*.+\*\*/.test(item)) return item
  const m = item.match(/^([^:：]{1,80})[:：]\s*(.+)$/)
  if (!m) return item
  return `**${m[1].trim()}:** ${m[2].trim()}`
}

/** Línea que solo dice "Título principal" (etiqueta a omitir). */
function esEtiquetaTituloPrincipal(line: string): boolean {
  const t = line
    .trim()
    .replace(/\u00a0/g, ' ')
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/^\d+[\.)]\s*/, '')
    .replace(/[:：]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
  const n = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return n === 'titulo principal'
}

/** "Título principal: El verdadero título" → el título real. */
function tituloTrasPrefijoPrincipal(line: string): string | null {
  const sinMd = line.trim().replace(/^#+\s*/, '').replace(/^\*\*(.+)\*\*$/, '$1')
  const m = sinMd.match(/^T[ií]tulo\s+principal\s*[:：]\s*(.+)$/i)
  return m ? m[1].trim() : null
}

/** "BLOQUE 1: Fundamentos..." */
function tituloBloqueDesdeLinea(line: string): string | null {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
  return /^BLOQUE\s*\d+\s*:/i.test(t) ? t : null
}

function esSubtituloBloque(line: string): boolean {
  const t = line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
  return /^PONEMOS EN PR[AÁ]CTICA\b/i.test(t)
}

function renderTabla(filas: string[][]): string {
  if (filas.length === 0) return ''
  const numCols = Math.max(...filas.map((f) => f.length))
  const normalizadas = filas.map((f) => {
    const row = [...f]
    while (row.length < numCols) row.push('')
    return row
  })
  const [head, ...body] = normalizadas
  let html =
    '<div class="ficha-md-table-wrap"><table class="ficha-md-table"><thead><tr>'
  for (const cel of head) {
    html += `<th>${inlineMarkdown(cel)}</th>`
  }
  html += '</tr></thead><tbody>'
  for (const fila of body) {
    html += '<tr>'
    for (const cel of fila) {
      html += `<td>${inlineMarkdown(cel)}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table></div>'
  return html
}

/** Convierte markdown típico de ficha a HTML legible. */
export function markdownFichaToHtml(
  markdown: string,
  opciones?: {
    contenidoLibre?: boolean
    /** Procesos de la competencia (mismo origen que `{{procesosdidacticos}}`). */
    procesosDidacticos?: string[]
  }
): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  let listaItems: string[] = []
  let faseCardAbierta = false
  let bloqueCardAbierta = false
  let subtituloCardAbierta = false
  let procesoCardAbierta = false
  let usaCardsPorBloque = false
  let usaCardsPorSubtitulo = false
  let enFaseActividades = false
  let proximoEsTituloTeorico = false
  const contenidoLibre = Boolean(opciones?.contenidoLibre)
  const nombresProceso = setNombresProcesoDidactico(opciones?.procesosDidacticos)

  const renderTituloTeorico = (texto: string) => {
    const limpio = texto.replace(/^\*\*(.+)\*\*$/, '$1').trim()
    out.push(
      `<p class="ficha-doc-titulo-teorico"><strong>${inlineMarkdown(limpio)}</strong></p>`
    )
    proximoEsTituloTeorico = false
  }

  const renderSubtituloTeorico = (texto: string) => {
    const limpio = texto.replace(/^\*\*(.+)\*\*$/, '$1').trim()
    out.push(
      `<p class="ficha-doc-subtitulo-teorico"><strong>${inlineMarkdown(limpio)}</strong></p>`
    )
  }

  const renderProcesoDidactico = (texto: string) => {
    out.push(
      `<p class="ficha-doc-proceso-didactico"><strong>${inlineMarkdown(texto)}</strong></p>`
    )
  }

  const renderLineaRespuesta = () => {
    out.push('<div class="ficha-doc-linea-respuesta" aria-hidden="true"></div>')
  }

  const renderLineaRespuestaConEtiqueta = (etiqueta: string) => {
    // Etiqueta arriba + línea a todo el ancho debajo (para escribir a mano)
    out.push(
      `<div class="ficha-doc-linea-bloque"><p class="ficha-doc-linea-etiqueta">${inlineMarkdown(
        etiqueta
      )}</p><div class="ficha-doc-linea-respuesta" aria-hidden="true"></div></div>`
    )
  }

  const cerrarBloqueCard = () => {
    if (!bloqueCardAbierta) return
    out.push('</div>')
    bloqueCardAbierta = false
  }

  const cerrarSubtituloCard = () => {
    if (!subtituloCardAbierta) return
    out.push('</div>')
    subtituloCardAbierta = false
  }

  const cerrarProcesoCard = () => {
    if (!procesoCardAbierta) return
    out.push('</div>')
    procesoCardAbierta = false
  }

  const cerrarFaseCard = () => {
    cerrarSubtituloCard()
    cerrarProcesoCard()
    if (!faseCardAbierta) return
    out.push('</div>')
    faseCardAbierta = false
  }

  const abrirBloqueCard = (titulo: string) => {
    cerrarBloqueCard()
    out.push('<div class="ficha-doc-card ficha-doc-bloque-contenido">')
    out.push(`<p class="ficha-doc-bloque-label">${inlineMarkdown(titulo)}</p>`)
    bloqueCardAbierta = true
  }

  const abrirSubtituloCard = (titulo: string) => {
    cerrarSubtituloCard()
    out.push('<div class="ficha-doc-card ficha-doc-subtitulo-card">')
    renderSubtituloTeorico(titulo)
    subtituloCardAbierta = true
  }

  const abrirProcesoCard = (titulo: string) => {
    cerrarProcesoCard()
    out.push('<div class="ficha-doc-card ficha-doc-proceso-card">')
    renderProcesoDidactico(titulo)
    procesoCardAbierta = true
  }

  const abrirFaseCard = () => {
    cerrarFaseCard()
    out.push('<div class="ficha-doc-card ficha-doc-fase-contenido">')
    faseCardAbierta = true
  }

  const asegurarProcesoCard = () => {
    if (!enFaseActividades || procesoCardAbierta) return
    out.push('<div class="ficha-doc-card ficha-doc-proceso-card">')
    procesoCardAbierta = true
  }

  const puedeAgregarContenidoFase = (fn: () => void) => {
    if (usaCardsPorBloque) {
      if (bloqueCardAbierta) fn()
      return
    }
    if (usaCardsPorSubtitulo) {
      if (proximoEsTituloTeorico || subtituloCardAbierta) fn()
      return
    }
    if (enFaseActividades) {
      asegurarProcesoCard()
      if (procesoCardAbierta) fn()
      return
    }
    if (contenidoLibre && !faseCardAbierta) abrirFaseCard()
    if (faseCardAbierta) fn()
  }

  const flushLista = () => {
    if (listaItems.length === 0) return
    const render = () => {
      out.push('<ul class="ficha-md-list">')
      for (const item of listaItems) {
        out.push(`<li>${inlineMarkdown(item)}</li>`)
      }
      out.push('</ul>')
      listaItems = []
    }
    if (usaCardsPorBloque) {
      if (bloqueCardAbierta) render()
      else listaItems = []
      return
    }
    if (usaCardsPorSubtitulo) {
      if (subtituloCardAbierta) render()
      else listaItems = []
      return
    }
    if (enFaseActividades) {
      if (procesoCardAbierta) render()
      else listaItems = []
      return
    }
    if (contenidoLibre && !faseCardAbierta) abrirFaseCard()
    if (faseCardAbierta) render()
    else listaItems = []
  }

  if (contenidoLibre) abrirFaseCard()

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trimEnd()
    const trimmed = line.trim()

    if (trimmed === '') {
      flushLista()
      i++
      continue
    }

    const nombreFase = nombreFaseDesdeLinea(trimmed)
    if (nombreFase) {
      if (/^solucionario\b/i.test(nombreFase.normalize('NFD').replace(/\u0300-\u036f/g, ''))) {
        flushLista()
        cerrarBloqueCard()
        cerrarFaseCard()
        break
      }
      flushLista()
      cerrarBloqueCard()
      cerrarFaseCard()
      usaCardsPorBloque = esFaseFuenteConocimiento(nombreFase)
      usaCardsPorSubtitulo = esFaseBaseTeorica(nombreFase)
      enFaseActividades = esFaseActividades(nombreFase)
      out.push(
        `<h3 class="ficha-doc-seccion-titulo">${inlineMarkdown(tituloFaseVisible(nombreFase))}</h3>`
      )
      if (usaCardsPorSubtitulo) {
        proximoEsTituloTeorico = true
      } else if (enFaseActividades) {
        // Un card por proceso didáctico (no un card único de fase)
      } else if (!usaCardsPorBloque) {
        abrirFaseCard()
      }
      i++
      continue
    }

    // En ACTIVIDADES: cada proceso didáctico abre su propio card
    if (enFaseActividades && esFilaIndiceProcesoDidactico(trimmed, nombresProceso)) {
      flushLista()
      const textoProceso = textoProcesoDidacticoVisible(trimmed)
      if (textoProceso) abrirProcesoCard(textoProceso)
      i++
      continue
    }

    // Desarrollo / Organizador → card con título morado (como estaba)
    if (enFaseActividades && esEncabezadoDesarrolloActividades(trimmed)) {
      flushLista()
      const titulo = textoProcesoDidacticoVisible(trimmed)
      if (titulo) abrirProcesoCard(titulo)
      i++
      continue
    }

    // Análisis / Tarea / Cierre → banner como ACTIVIDADES + card de contenido
    if (
      enFaseActividades &&
      esEncabezadoSeccionActividades(trimmed, nombresProceso)
    ) {
      flushLista()
      cerrarProcesoCard()
      const tituloSeccion = tituloSeccionActividadesVisible(
        textoProcesoDidacticoVisible(trimmed)
      )
      if (tituloSeccion) {
        out.push(
          `<h3 class="ficha-doc-seccion-titulo">${inlineMarkdown(tituloSeccion)}</h3>`
        )
        out.push('<div class="ficha-doc-card ficha-doc-proceso-card">')
        procesoCardAbierta = true
      }
      i++
      continue
    }

    // "Actividad 1 — …" → toda la línea en negrita (dentro del card del proceso)
    if (enFaseActividades && esTituloActividad(trimmed)) {
      flushLista()
      const textoAct = trimmed.replace(/^\*\*(.+)\*\*$/, '$1').replace(/^#+\s*/, '').trim()
      puedeAgregarContenidoFase(() => {
        out.push(
          `<p class="ficha-doc-actividad-titulo"><strong>${inlineMarkdown(textoAct)}</strong></p>`
        )
      })
      i++
      continue
    }

    // Marcador de subtítulo técnico (viene de prepararCuerpoFichaAnalisis)
    const mSubTeorico = trimmed.match(/^\[\[SUBTITULO_TEORICO\]\]\s*(.+)$/i)
    if (mSubTeorico?.[1]?.trim()) {
      flushLista()
      if (usaCardsPorSubtitulo) {
        abrirSubtituloCard(mSubTeorico[1].trim())
      } else {
        puedeAgregarContenidoFase(() => renderSubtituloTeorico(mSubTeorico[1].trim()))
      }
      i++
      continue
    }

    // Fallback: "Subtítulo 1 — …" / "Subtítulo técnico 2: …" sin marcador
    if (usaCardsPorSubtitulo) {
      const textoSubRaw = textoSubtituloTeoricoDesdeLinea(trimmed)
      if (textoSubRaw !== null) {
        flushLista()
        if (textoSubRaw === '') {
          // Solo la etiqueta: el título real está en la siguiente línea
          let j = i + 1
          while (j < lines.length && !lines[j].trim()) j++
          if (j < lines.length) {
            const next = lines[j].trim().replace(/^\*\*(.+)\*\*$/, '$1')
            abrirSubtituloCard(next)
            i = j + 1
          } else {
            i++
          }
          continue
        }
        abrirSubtituloCard(textoSubRaw)
        i++
        continue
      }
    }

    // "Título principal: Xxx" en la misma línea → solo Xxx en negrita
    const tituloConPrefijo = tituloTrasPrefijoPrincipal(trimmed)
    if (tituloConPrefijo) {
      flushLista()
      puedeAgregarContenidoFase(() => renderTituloTeorico(tituloConPrefijo))
      i++
      continue
    }

    // Solo la etiqueta "Título principal" → omitir; la línea siguiente será el título
    if (esEtiquetaTituloPrincipal(trimmed)) {
      flushLista()
      proximoEsTituloTeorico = true
      i++
      continue
    }

    const tituloBloque = tituloBloqueDesdeLinea(trimmed)
    if (tituloBloque) {
      flushLista()
      if (usaCardsPorBloque) {
        abrirBloqueCard(tituloBloque)
      } else if (faseCardAbierta) {
        out.push(`<p class="ficha-doc-bloque-label">${inlineMarkdown(tituloBloque)}</p>`)
      } else {
        out.push(`<h4 class="ficha-md-h4">${inlineMarkdown(tituloBloque)}</h4>`)
      }
      i++
      continue
    }

    if (bloqueCardAbierta && esSubtituloBloque(trimmed)) {
      flushLista()
      out.push(`<p class="ficha-doc-bloque-subtitulo">${inlineMarkdown(trimmed)}</p>`)
      i++
      continue
    }

    if (esFilaTabla(trimmed)) {
      flushLista()
      const filasTabla: string[][] = []
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t) break
        if (!esFilaTabla(t)) break
        if (esSeparadorTabla(t)) {
          i++
          continue
        }
        filasTabla.push(parseTableCells(t))
        i++
      }
      if (filasTabla.length > 0) {
        puedeAgregarContenidoFase(() => out.push(renderTabla(filasTabla)))
      }
      continue
    }

    if (/^---+$/.test(trimmed) || trimmed === '---') {
      flushLista()
      puedeAgregarContenidoFase(() => out.push('<hr class="ficha-md-hr" />'))
      i++
      continue
    }

    if (trimmed.startsWith('#### ')) {
      flushLista()
      const txt = trimmed.slice(5)
      if (esEtiquetaTituloPrincipal(txt)) {
        proximoEsTituloTeorico = true
        i++
        continue
      }
      puedeAgregarContenidoFase(() => {
        if (proximoEsTituloTeorico) renderTituloTeorico(txt)
        else out.push(`<h4 class="ficha-md-h4">${inlineMarkdown(txt)}</h4>`)
      })
      i++
      continue
    }
    if (trimmed.startsWith('### ')) {
      flushLista()
      const txt = trimmed.slice(4)
      if (esEtiquetaTituloPrincipal(txt)) {
        proximoEsTituloTeorico = true
        i++
        continue
      }
      puedeAgregarContenidoFase(() => {
        if (proximoEsTituloTeorico) renderTituloTeorico(txt)
        else out.push(`<h3 class="ficha-md-h3">${inlineMarkdown(txt)}</h3>`)
      })
      i++
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushLista()
      const txt = trimmed.slice(3)
      if (esEtiquetaTituloPrincipal(txt)) {
        proximoEsTituloTeorico = true
        i++
        continue
      }
      puedeAgregarContenidoFase(() => {
        if (proximoEsTituloTeorico) renderTituloTeorico(txt)
        else out.push(`<h2 class="ficha-md-h2">${inlineMarkdown(txt)}</h2>`)
      })
      i++
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushLista()
      const txt = trimmed.slice(2)
      if (esEtiquetaTituloPrincipal(txt)) {
        proximoEsTituloTeorico = true
        i++
        continue
      }
      puedeAgregarContenidoFase(() => {
        if (proximoEsTituloTeorico) renderTituloTeorico(txt)
        else out.push(`<h1 class="ficha-md-h1">${inlineMarkdown(txt)}</h1>`)
      })
      i++
      continue
    }

    // Glosario → viñeta padre con definiciones anidadas
    if (esEncabezadoGlosario(trimmed)) {
      flushLista()
      const tituloGlosario = trimmed
        .replace(/^[-*•]\s+/, '')
        .replace(/^\*\*(.+)\*\*$/, '$1')
        .trim()
      const itemsGlosario: string[] = []
      i++
      while (i < lines.length) {
        const t = lines[i].trim()
        if (!t) {
          i++
          break
        }
        if (nombreFaseDesdeLinea(t)) break
        if (/^\[\[SUBTITULO_TEORICO\]\]/i.test(t)) break
        if (textoSubtituloTeoricoDesdeLinea(t) !== null) break
        if (esEncabezadoGlosario(t)) break
        if (/^[-*•]\s+/.test(t)) {
          itemsGlosario.push(t.replace(/^[-*•]\s+/, ''))
          i++
          continue
        }
        break
      }
      puedeAgregarContenidoFase(() => {
        const tituloLimpio = tituloGlosario.replace(/\*\*/g, '').trim()
        let html = `<ul class="ficha-md-list ficha-md-glosario"><li>${inlineMarkdown(
          `**${tituloLimpio}**`
        )}`
        if (itemsGlosario.length > 0) {
          html += '<ul class="ficha-md-list ficha-md-list-anidada">'
          for (const item of itemsGlosario) {
            html += `<li>${inlineMarkdown(formatoTerminoGlosario(item))}</li>`
          }
          html += '</ul>'
        }
        html += '</li></ul>'
        out.push(html)
      })
      continue
    }

    if (/^[-*•]\s+/.test(trimmed)) {
      const contenidoLista = trimmed.replace(/^[-*•]\s+/, '')
      if (esLineaEspacioRespuesta(contenidoLista)) {
        flushLista()
        puedeAgregarContenidoFase(() => renderLineaRespuesta())
        i++
        continue
      }
      const partidaLista = partirEtiquetaYLineaRespuesta(contenidoLista)
      if (partidaLista) {
        flushLista()
        puedeAgregarContenidoFase(() =>
          renderLineaRespuestaConEtiqueta(partidaLista.etiqueta)
        )
        i++
        continue
      }
      if (usaCardsPorBloque && !bloqueCardAbierta) {
        i++
        continue
      }
      if (usaCardsPorSubtitulo && !subtituloCardAbierta) {
        i++
        continue
      }
      if (enFaseActividades) {
        asegurarProcesoCard()
        if (!procesoCardAbierta) {
          i++
          continue
        }
        listaItems.push(contenidoLista)
        i++
        continue
      }
      if (!usaCardsPorBloque && !usaCardsPorSubtitulo && !faseCardAbierta) {
        i++
        continue
      }
      listaItems.push(contenidoLista)
      i++
      continue
    }

    // Líneas de respuesta (........) a todo el ancho
    if (esLineaEspacioRespuesta(trimmed)) {
      flushLista()
      puedeAgregarContenidoFase(() => renderLineaRespuesta())
      i++
      continue
    }
    const partida = partirEtiquetaYLineaRespuesta(trimmed)
    if (partida) {
      flushLista()
      puedeAgregarContenidoFase(() =>
        renderLineaRespuestaConEtiqueta(partida.etiqueta)
      )
      i++
      continue
    }

    flushLista()
    const sep = separarTextoYLineasFinales(trimmed)
    puedeAgregarContenidoFase(() => {
      if (proximoEsTituloTeorico) {
        renderTituloTeorico(sep.texto || trimmed)
        return
      }
      out.push(`<p class="ficha-md-p">${inlineMarkdown(sep.texto || trimmed)}</p>`)
      for (let k = 0; k < sep.lineas; k++) renderLineaRespuesta()
    })
    i++
    // Líneas de puntos que siguen en filas siguientes → también a todo el ancho
    while (i < lines.length && esLineaEspacioRespuesta(lines[i])) {
      puedeAgregarContenidoFase(() => renderLineaRespuesta())
      i++
    }
    continue
  }

  flushLista()
  cerrarBloqueCard()
  cerrarFaseCard()
  return out.join('\n')
}

/** Convierte tabladinamica (pipe) o markdown de rúbrica a HTML. */
export function rubricaContenidoToHtml(texto: string): string {
  const t = texto.trim()
  if (!t) return ''

  const lineas = t.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean)
  const filasTabla: string[][] = []
  for (const linea of lineas) {
    if (!linea.includes('|')) continue
    if (esSeparadorTabla(linea)) continue
    const celdas = parseTableCells(linea)
    if (celdas.length >= 2) filasTabla.push(celdas)
  }

  if (filasTabla.length >= 1) {
    const filasVista = filasTabla.map((fila) => {
      if (fila.length >= 6 && fila[0] === fila[5]) return fila.slice(0, 5)
      if (fila.length > 5) return fila.slice(0, 5)
      return fila
    })
    return renderTabla(filasVista)
  }

  return markdownFichaToHtml(t)
}
