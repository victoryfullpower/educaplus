import { respuestaPromptABloques, type BloqueRespuesta } from '@/lib/respuesta-prompt-word'

export type ExamenUnidadVistaData = {
  unidadAprendizajeId: number
  numunidad?: string
  tituloUnidad?: string
  area?: string
  grado?: string
  ciclo?: string
  producto?: string
  docente?: string
  respuestaprompt: string
}

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function textoHtml(s: string): string {
  return escapeHtml(s).replace(/\n/g, '<br/>')
}

function renderTabla(filas: string[][]): string {
  if (filas.length === 0) return ''
  const numCols = Math.max(...filas.map((f) => f.length), 1)
  const [head, ...body] = filas
  const tieneEncabezado = filas.length > 1
  let html =
    '<div class="refuerzo-doc-tabla-wrap"><table class="refuerzo-doc-tabla examen-doc-tabla"><thead><tr>'
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

function renderCeldaVacia(): string {
  return '<span class="examen-doc-meta-vacio" aria-hidden="true"></span>'
}

function renderCeldaLinea(claseLinea = ''): string {
  const claseExtra = claseLinea ? ` ${claseLinea}` : ''
  return `<span class="examen-doc-meta-linea${claseExtra}" aria-hidden="true"></span>`
}

function renderCeldaFecha(): string {
  return `
    <span class="examen-doc-meta-fecha" aria-hidden="true">
      ${renderCeldaLinea('examen-doc-meta-linea-fecha')}
      <span class="examen-doc-meta-fecha-sep">/</span>
      ${renderCeldaLinea('examen-doc-meta-linea-fecha')}
      <span class="examen-doc-meta-fecha-sep">/</span>
      ${renderCeldaLinea('examen-doc-meta-linea-fecha')}
    </span>`
}

function renderCeldaPuntaje(): string {
  return `
    <span class="examen-doc-meta-puntaje">
      ${renderCeldaLinea('examen-doc-meta-linea-corta')}
      <span class="examen-doc-meta-sufijo">/ 20</span>
    </span>`
}

function renderDatosLineasExamen(): string {
  return `
    <section class="refuerzo-doc-bloque examen-doc-bloque-meta">
      <table class="refuerzo-doc-meta examen-doc-meta-lineas">
        <colgroup>
          <col class="examen-doc-meta-col-label-izq" />
          <col class="examen-doc-meta-col-valor-izq" />
          <col class="examen-doc-meta-col-label-der" />
          <col class="examen-doc-meta-col-valor-der" />
        </colgroup>
        <tbody>
          <tr>
            <th>INSTITUCIÓN EDUCATIVA</th>
            <td>${renderCeldaVacia()}</td>
            <th>FECHA</th>
            <td>${renderCeldaFecha()}</td>
          </tr>
          <tr>
            <th>ÁREA</th>
            <td>${renderCeldaVacia()}</td>
            <th>GRADO Y SECCIÓN</th>
            <td>${renderCeldaVacia()}</td>
          </tr>
          <tr>
            <th>APELLIDOS Y NOMBRES<br/>DEL ESTUDIANTE</th>
            <td colspan="3">${renderCeldaVacia()}</td>
          </tr>
          <tr>
            <th>DOCENTE</th>
            <td colspan="3">${renderCeldaVacia()}</td>
          </tr>
          <tr>
            <th>PUNTAJE OBTENIDO</th>
            <td>${renderCeldaPuntaje()}</td>
            <th>NOTA</th>
            <td>${renderCeldaVacia()}</td>
          </tr>
        </tbody>
      </table>
    </section>`
}

function renderInstruccionesExamen(): string {
  return `
    <section class="refuerzo-doc-bloque examen-doc-instrucciones">
      <div class="refuerzo-doc-card examen-doc-instrucciones-card">
        <h3 class="examen-doc-instrucciones-titulo">INSTRUCCIONES GENERALES</h3>
        <ul class="examen-doc-instrucciones-lista">
          <li>Tienes 30 minutos para desarrollar la prueba. El puntaje total es de 20 puntos.</li>
          <li>Lee atentamente cada pregunta antes de responder.</li>
          <li>Usa lápiz o lapicero, sin enmendaduras ni borrones.</li>
          <li>Trabaja con tranquilidad y honestidad: el objetivo es reconocer lo que ya aprendiste.</li>
          <li>Distribuye tu tiempo: no te detengas demasiado en una sola pregunta.</li>
        </ul>
        <h3 class="examen-doc-instrucciones-titulo">INSTRUCCIONES ESPECÍFICAS POR BLOQUE</h3>
        <ul class="examen-doc-instrucciones-lista">
          <li>Las preguntas 1 a 4 (opción múltiple): marca con un aspa (X) la única alternativa correcta.</li>
          <li>Las preguntas 5 a 8 (desarrollos): redacta tu respuesta con claridad, usando los conceptos trabajados en la unidad.</li>
          <li>Las preguntas 9 y 10 (análisis crítico): fundamenta tu postura con argumentos propios; no solo describas información, se valorará tu capacidad de opinar con criterio.</li>
        </ul>
      </div>
    </section>`
}

function esInstruccionEstaticaExamen(texto: string): boolean {
  const t = texto.trim()
  if (/^INSTRUCCIONES\s+GENERALES/i.test(t)) return true
  if (/^INSTRUCCIONES\s+ESPEC[IÍ]FICAS/i.test(t)) return true
  if (/^Tienes\s+30\s+minutos/i.test(t)) return true
  if (/^Lee\s+atentamente\s+cada\s+pregunta/i.test(t)) return true
  if (/^Usa\s+l[aá]piz\s+o\s+lapicero/i.test(t)) return true
  if (/^Trabaja\s+con\s+tranquilidad/i.test(t)) return true
  if (/^Distribuye\s+tu\s+tiempo/i.test(t)) return true
  if (/^Las\s+preguntas\s+1\s+a\s+4/i.test(t)) return true
  if (/^Las\s+preguntas\s+5\s+a\s+8/i.test(t)) return true
  if (/^Las\s+preguntas\s+9\s+y\s+10/i.test(t)) return true
  return false
}

function esTituloExamenPrincipal(texto: string): boolean {
  const t = texto.trim()
  return (
    /^EXAMEN\s+FINAL\s+DE\s+UNIDAD/i.test(t) ||
    /^EXAMEN\s+ESCRITO\s+DE\s+FIN\s+DE\s+UNIDAD/i.test(t)
  )
}

function quitarMichi(texto: string): string {
  return texto.trim().replace(/^#{1,6}\s+/, '').trim()
}

function esLineaMichi(texto: string): boolean {
  return /^#{1,6}\s/.test(texto.trim())
}

function esFase2(texto: string): boolean {
  return /^FASE\s+2\b/i.test(quitarMichi(texto))
}

function esOpcionExamen(texto: string): boolean {
  return /^[a-d][.)]\s/i.test(texto.trim())
}

function esPreguntaNumerada(texto: string): boolean {
  const t = texto.trim()
  return /^Pregunta\s+\d+/i.test(t) || /^\d+[.)]\s/.test(t)
}

function esLineaPuntosRespuesta(texto: string): boolean {
  const t = texto.trim()
  if (!t) return true
  const sinViñeta = t.replace(/^[-*•]\s*/, '').trim()
  const compacto = sinViñeta.replace(/\s/g, '')
  if (!compacto) return true
  return /^[.\u2026_\-·…–—]+$/.test(compacto)
}

function esFase2Solucionario(texto: string): boolean {
  return /^FASE\s+2\b/i.test(quitarMichi(texto))
}

function esSubtituloSolucionario(texto: string): boolean {
  const t = texto.trim()
  return /^SOLUCIONARIO/i.test(t)
}

function renderEspacioRespuesta(): string {
  return '<div class="examen-doc-respuesta-espacio" aria-hidden="true"></div>'
}

function renderBloques(bloques: BloqueRespuesta[]): string {
  const partes: string[] = []
  let antesDeFase2 = true
  let enSolucionario = false
  let seccionSolucionarioAbierta = false
  let cajaPreguntaAbierta = false
  let cajaTieneOpciones = false

  const cerrarCajaPregunta = () => {
    if (!cajaPreguntaAbierta) return
    if (!cajaTieneOpciones) {
      partes.push(renderEspacioRespuesta())
    }
    partes.push('</div>')
    cajaPreguntaAbierta = false
    cajaTieneOpciones = false
  }

  const abrirSeccionSolucionario = () => {
    if (seccionSolucionarioAbierta) return
    cerrarCajaPregunta()
    partes.push('<div class="examen-doc-separador-solucionario" role="separator"></div>')
    partes.push('<section class="refuerzo-doc-bloque examen-doc-solucionario">')
    seccionSolucionarioAbierta = true
    enSolucionario = true
    antesDeFase2 = false
  }

  const cerrarSeccionSolucionario = () => {
    if (!seccionSolucionarioAbierta) return
    partes.push('</section>')
    seccionSolucionarioAbierta = false
  }

  const abrirCajaPregunta = () => {
    cerrarCajaPregunta()
    partes.push('<div class="examen-doc-pregunta-caja">')
    cajaPreguntaAbierta = true
    cajaTieneOpciones = false
  }

  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      const t = bloque.texto.trim()
      if (!t) continue

      if (antesDeFase2) {
        if (esFase2(t)) {
          antesDeFase2 = false
        } else if (esLineaMichi(t)) {
          continue
        }
      }

      const texto = quitarMichi(t)
      if (!texto) continue
      if (esLineaPuntosRespuesta(texto)) continue

      if (esTituloExamenPrincipal(texto)) {
        continue
      } else if (esInstruccionEstaticaExamen(texto)) {
        continue
      } else if (esFase2Solucionario(texto)) {
        abrirSeccionSolucionario()
        partes.push(`
          <header class="examen-doc-solucionario-encabezado">
            <h2 class="examen-doc-titulo-principal">${textoHtml(texto)}</h2>
          </header>`)
      } else if (enSolucionario && esSubtituloSolucionario(texto)) {
        cerrarCajaPregunta()
        partes.push(
          `<h3 class="examen-doc-solucionario-subtitulo">${textoHtml(texto)}</h3>`
        )
      } else if (!enSolucionario && esPreguntaNumerada(texto)) {
        abrirCajaPregunta()
        partes.push(
          `<p class="examen-doc-pregunta-caja-titulo"><strong>${textoHtml(texto)}</strong></p>`
        )
      } else if (cajaPreguntaAbierta && esOpcionExamen(texto)) {
        cajaTieneOpciones = true
        partes.push(`<p class="examen-doc-opcion">${textoHtml(texto)}</p>`)
      } else if (cajaPreguntaAbierta && !/^FASE\s+\d/i.test(texto) && !/^BLOQUE\s+[ABC]/i.test(texto)) {
        partes.push(`<p class="examen-doc-caja-cuerpo">${textoHtml(texto)}</p>`)
      } else {
        cerrarCajaPregunta()
        if (enSolucionario) {
          if (/^FASE\s+\d/i.test(texto) || /^BLOQUE\s+[ABC]/i.test(texto)) {
            partes.push(
              `<h3 class="examen-doc-solucionario-subtitulo">${textoHtml(texto)}</h3>`
            )
          } else {
            partes.push(
              `<p class="refuerzo-doc-parrafo examen-doc-solucionario-parrafo">${textoHtml(texto)}</p>`
            )
          }
        } else if (/^FASE\s+\d/i.test(texto) || /^BLOQUE\s+[ABC]/i.test(texto)) {
          partes.push(
            `<h3 class="refuerzo-doc-bloque-titulo refuerzo-doc-bloque-titulo-borde">${textoHtml(texto)}</h3>`
          )
        } else {
          partes.push(`<p class="refuerzo-doc-parrafo">${textoHtml(texto)}</p>`)
        }
      }
    } else {
      cerrarCajaPregunta()
      partes.push(renderTabla(bloque.filas))
    }
  }

  cerrarCajaPregunta()
  cerrarSeccionSolucionario()
  return partes.join('')
}

export function tituloExamenVisible(data: ExamenUnidadVistaData): string {
  const u = data.numunidad ? `Unidad ${data.numunidad}` : 'Unidad'
  const titulo = (data.tituloUnidad ?? '').trim()
  return titulo ? `${u}: ${titulo}` : `Examen de fin de ${u}`
}

export function examenUnidadDocumentoToHtml(data: ExamenUnidadVistaData): string {
  const texto = (data.respuestaprompt ?? '').trim()
  if (!texto) {
    return '<p class="refuerzo-doc-vacio">Sin contenido del examen.</p>'
  }

  const bloques = respuestaPromptABloques(texto)
  const cuerpo = renderBloques(bloques)

  return `
    <div class="refuerzo-doc examen-doc" aria-label="Examen final de unidad">
      <header class="refuerzo-doc-encabezado examen-doc-encabezado">
        <h1 class="examen-doc-titulo-principal">EXAMEN FINAL DE UNIDAD</h1>
      </header>
      ${renderDatosLineasExamen()}
      ${renderInstruccionesExamen()}
      <section class="refuerzo-doc-bloque examen-doc-cuerpo">
        ${cuerpo || `<p class="refuerzo-doc-parrafo">${textoHtml(texto)}</p>`}
      </section>
    </div>`
}
