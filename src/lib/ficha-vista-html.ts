import { markdownFichaToHtml } from '@/lib/markdown-ficha-html'
import {
  contenidoFichaSinSolucionario,
  extraerSolucionarioDeFicha
} from '@/lib/ficha-contenido-estudiante'

export type FichaVistaData = {
  numeroSesion?: number
  tituloSesion?: string
  tituloDesesion?: string
  area?: string
  grado?: string
  docente?: string
  proposito?: string
  competencia?: string
  capacidad?: string
  evidencia?: string
  criterios?: string
  saber1?: string
  saber2?: string
  saber3?: string
  /** Preguntas de saberes previos traídas de la sesión (preferidas sobre saber1/2/3). */
  saberes?: string[]
  /**
   * Procesos didácticos de la competencia (mismo origen que `{{procesosdidacticos}}`).
   * Se usan para marcar en negrita los títulos de proceso en ACTIVIDADES.
   */
  procesosDidacticos?: string[]
  respuestaprompt: string
}

export function tituloFichaVisible(data: FichaVistaData): string {
  return (data.tituloDesesion || data.tituloSesion || '').trim()
}

export function etiquetaFichaDocumento(numeroSesion?: number): string {
  const n = Number(numeroSesion)
  if (Number.isFinite(n) && n > 0) {
    return `Ficha de aprendizaje N° ${n}`
  }
  return 'Ficha de aprendizaje'
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
  return '<span class="ficha-doc-vacio">—</span>'
}

function limpiarMarcadorLista(s: string): string {
  return s.replace(/^[-•*]\s*/, '').trim()
}

/** Parte el texto de saberes de la sesión en preguntas individuales (máx. 3). */
export function parsearSaberesSesion(raw: string | null | undefined): string[] {
  const texto = String(raw ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/Pregunta\s*\d*\s*:\s*/gi, '')
    .trim()
  if (!texto) return []

  const porLineas = texto
    .split(/\n+/)
    .map((l) => limpiarMarcadorLista(l))
    .filter((l) => l.length > 0)

  if (porLineas.length >= 2) {
    return porLineas.slice(0, 3)
  }

  // Una sola línea larga: intentar separar por signos de interrogación.
  const porPreguntas = texto
    .split(/(?<=\?)\s+/)
    .map((l) => limpiarMarcadorLista(l))
    .filter((l) => l.length > 0)
  if (porPreguntas.length >= 2) {
    return porPreguntas.slice(0, 3)
  }

  return porLineas.length > 0 ? porLineas.slice(0, 3) : []
}

function lineasRespuestaSaberes(): string {
  return Array.from({ length: 2 }, () =>
    '<div class="ficha-doc-linea-respuesta" aria-hidden="true"></div>'
  ).join('')
}

/** Quita encabezados redundantes del cuerpo (ya van en la barra de sección). */
export function prepararCuerpoFichaAnalisis(markdown: string): string {
  const omitir = [
    /^FICHA DE APRENDIZAJE PARA EL ESTUDIANTE$/i,
    /^\(Elabora a partir de la información de la sesión\)$/i,
    /^SABERES PREVIOS$/i
  ]

  const limpiaEncabezado = (line: string) =>
    line
      .trim()
      .replace(/\u00a0/g, ' ')
      .replace(/^\*\*(.+)\*\*$/, '$1')
      .replace(/^#+\s*/, '')
      .replace(/^[-*•]\s+/, '')
      .replace(/^\d+[\.)]\s*/, '')
      .replace(/[:：]\s*$/, '')
      .replace(/\s+/g, ' ')
      .trim()

  const esSoloTituloPrincipal = (line: string) => {
    const n = limpiaEncabezado(line)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    return n === 'titulo principal'
  }

  const esSoloSubtituloTeorico = (line: string) => {
    const n = limpiaEncabezado(line)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    // "Subtítulo", "Subtítulo 1", "Subtítulo técnico", "Subtítulo técnico 2"
    return /^subtitulo(\s+tecnico)?(\s*\d+)?$/.test(n)
  }

  /** Extrae el texto de "Subtítulo [técnico] N — resto" / "Subtítulo 1: resto". */
  const textoTrasEtiquetaSubtitulo = (line: string): string | null => {
    const t = limpiaEncabezado(line)
    const conSep = t.match(
      /^Subt[ií]tulo(?:\s+t[eé]cnico)?(?:\s*\d+)?\s*[:：—–\-]\s*(.+)$/i
    )
    if (conSep?.[1]?.trim()) {
      return conSep[1].replace(/^[\s—–\-]+/, '').trim()
    }
    const sinSep = t.match(
      /^Subt[ií]tulo(?:\s+t[eé]cnico)?\s+\d+\s+(.+)$/i
    )
    if (sinSep?.[1]?.trim()) {
      return sinSep[1].replace(/^[\s—–\-]+/, '').trim()
    }
    return null
  }

  const lineas = contenidoFichaSinSolucionario(markdown).split('\n')
  const out: string[] = []

  for (let i = 0; i < lineas.length; i++) {
    const line = lineas[i]
    const t = limpiaEncabezado(line)
    if (omitir.some((re) => re.test(t))) continue

    // "Título principal" solo → omitir y poner la siguiente línea en negrita
    if (esSoloTituloPrincipal(line)) {
      let j = i + 1
      while (j < lineas.length && !lineas[j].trim()) j++
      if (j < lineas.length) {
        const next = limpiaEncabezado(lineas[j])
        if (next) out.push(`**${next}**`)
        i = j
      }
      continue
    }

    // "Título principal: texto real"
    const mTitulo = limpiaEncabezado(line).match(
      /^T[ií]tulo\s+principal\s*[:：]\s*(.+)$/i
    )
    if (mTitulo?.[1]?.trim()) {
      out.push(`**${mTitulo[1].trim()}**`)
      continue
    }

    // "Subtítulo 1" / "Subtítulo técnico 1" solo → siguiente línea
    if (esSoloSubtituloTeorico(line)) {
      let j = i + 1
      while (j < lineas.length && !lineas[j].trim()) j++
      if (j < lineas.length) {
        const next = limpiaEncabezado(lineas[j])
        if (next) out.push(`[[SUBTITULO_TEORICO]] ${next}`)
        i = j
      }
      continue
    }

    // "Subtítulo 1 — resto" / "Subtítulo técnico 1: resto"
    const textoSub = textoTrasEtiquetaSubtitulo(line)
    if (textoSub) {
      out.push(`[[SUBTITULO_TEORICO]] ${textoSub}`)
      continue
    }

    out.push(line)
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function renderCapacidades(capacidad: string): string {
  const t = capacidad.trim()
  if (!t) return celdaVacia()
  const items = t
    .split(/\n+/)
    .map((l) => limpiarMarcadorLista(l))
    .filter(Boolean)
  if (items.length <= 1 && !t.includes('\n')) {
    return textoHtml(limpiarMarcadorLista(t))
  }
  return `<ul class="ficha-doc-lista">${items.map((i) => `<li>${textoHtml(i)}</li>`).join('')}</ul>`
}

function renderSaberes(data: FichaVistaData): string {
  const desdeSesion = Array.isArray(data.saberes)
    ? data.saberes.map((s) => limpiarMarcadorLista(s)).filter(Boolean)
    : []
  const saberes =
    desdeSesion.length > 0
      ? desdeSesion.slice(0, 3)
      : [data.saber1, data.saber2, data.saber3]
          .map((s) => limpiarMarcadorLista(s ?? ''))
          .filter(Boolean)

  if (saberes.length === 0) return ''

  return `<hr class="ficha-doc-separador" />
  <section class="ficha-doc-saberes">
    <h3 class="ficha-doc-seccion-titulo">SABERES PREVIOS</h3>
    <ul class="ficha-doc-lista-saberes">${saberes
      .map(
        (s) =>
          `<li class="ficha-doc-saber-item">
            <p class="ficha-doc-saber-pregunta">${textoHtml(s)}</p>
            <div class="ficha-doc-saber-lineas">${lineasRespuestaSaberes()}</div>
          </li>`
      )
      .join('')}</ul>
  </section>`
}

/** Propósito, competencias, saberes, análisis y solucionario (si viene en la respuesta). */
export function fichaDocumentoRestoHtml(data: FichaVistaData): string {
  const proposito = (data.proposito ?? '').trim()
  const competencia = (data.competencia ?? '').trim()
  const evidencia = (data.evidencia ?? '').trim()
  const criterios = (data.criterios ?? '').trim()
  const promptRaw = data.respuestaprompt.trim()
  const procesosDidacticos = data.procesosDidacticos ?? []
  const cuerpoHtml = promptRaw
    ? markdownFichaToHtml(prepararCuerpoFichaAnalisis(promptRaw), {
        procesosDidacticos
      })
    : '<p class="ficha-doc-vacio">Sin contenido de análisis.</p>'

  // En HTML de vista previa sí se muestra el solucionario (solo docente).
  // El Word de la ficha lo excluye; se descarga aparte.
  const solucionarioMd = promptRaw ? extraerSolucionarioDeFicha(promptRaw) : ''
  const solucionarioHtml = solucionarioMd
    ? `<hr class="ficha-doc-separador" />
    <section class="ficha-doc-solucionario" id="ficha-vista-solucionario">
      <h3 class="ficha-doc-seccion-titulo">SOLUCIONARIO</h3>
      <div class="ficha-doc-analisis-cuerpo ficha-doc-markdown">${markdownFichaToHtml(
        solucionarioMd,
        { contenidoLibre: true, procesosDidacticos }
      )}</div>
    </section>`
    : ''

  return `<div class="ficha-doc-resto">
      <div class="ficha-doc-card ficha-doc-proposito">
        <p class="ficha-doc-proposito-label">PROPÓSITO DE LA SESIÓN</p>
        <div class="ficha-doc-proposito-texto">${proposito ? textoHtml(proposito) : celdaVacia()}</div>
      </div>
      <div class="ficha-doc-tabla-wrap">
        <table class="ficha-doc-competencias">
          <colgroup>
            <col class="ficha-doc-col-competencia" />
            <col class="ficha-doc-col-capacidades" />
            <col class="ficha-doc-col-evidencia" />
            <col class="ficha-doc-col-criterios" />
          </colgroup>
          <thead>
            <tr>
              <th>COMPETENCIA</th>
              <th>CAPACIDADES</th>
              <th>EVIDENCIA</th>
              <th>CRITERIOS</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${competencia ? textoHtml(competencia) : celdaVacia()}</td>
              <td>${renderCapacidades(data.capacidad ?? '')}</td>
              <td>${evidencia ? textoHtml(evidencia) : celdaVacia()}</td>
              <td>${criterios ? textoHtml(criterios) : celdaVacia()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    ${renderSaberes(data) || '<hr class="ficha-doc-separador" />'}
    <section class="ficha-doc-analisis">
      <div class="ficha-doc-analisis-cuerpo ficha-doc-markdown">${cuerpoHtml}</div>
    </section>
    ${solucionarioHtml}
  </div>`
}

/** HTML completo de la ficha (igual que la vista previa del modal). */
export function fichaDocumentoCompletoHtml(data: FichaVistaData): string {
  const tituloDoc = tituloFichaVisible(data) || '—'
  const docente = (data.docente || 'EducaPlus').trim()
  const area = (data.area ?? '').trim()
  const grado = (data.grado ?? '').trim()

  return `<article class="ficha-doc">
  <header class="ficha-doc-encabezado">
    <div class="ficha-doc-titulo-wrap">
      <p class="ficha-doc-etiqueta">${escapeHtml(etiquetaFichaDocumento(data.numeroSesion))}</p>
      <div class="ficha-doc-titulo-card">
        <h1 class="ficha-doc-titulo-sesion">${escapeHtml(tituloDoc)}</h1>
      </div>
    </div>
    <div class="ficha-doc-tabla-wrap">
      <table class="ficha-doc-info">
        <tbody>
          <tr>
            <th>DOCENTE</th>
            <td>${escapeHtml(docente || '—')}</td>
            <th>ESTUDIANTE</th>
            <td>—</td>
          </tr>
          <tr>
            <th>ÁREA</th>
            <td>${escapeHtml(area || '—')}</td>
            <th>GRADO / SECCIÓN</th>
            <td>${escapeHtml(grado || '—')}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </header>
  ${fichaDocumentoRestoHtml(data)}
</article>`
}

