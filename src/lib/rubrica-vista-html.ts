export type RubricaVistaData = {
  area?: string
  grado?: string
  tituloSesion?: string
  competencia?: string
  evidencia?: string
  capacidad?: string
  proposito?: string
  standar?: string
  tabladinamica: string
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

function esFilaEncabezado(celdas: string[]): boolean {
  const primera = (celdas[0] || '').toLowerCase()
  return primera.includes('criterio')
}

function normalizarEncabezados(celdas: string[]): string[] {
  const mapa: Record<string, string> = {
    criterios: 'CRITERIOS',
    'logro destacado (ad)': 'DESTACADO AD',
    'destacado ad': 'DESTACADO AD',
    'logro esperado (a)': 'ESPERADO A',
    'esperado a': 'ESPERADO A',
    'logro en proceso (b)': 'EN PROCESO B',
    'en proceso b': 'EN PROCESO B',
    'logro en inicio (c)': 'EN INICIO C',
    'en inicio c': 'EN INICIO C'
  }
  return celdas.slice(0, 5).map((c) => {
    const key = c.toLowerCase().trim()
    return mapa[key] ?? c.toUpperCase()
  })
}

function parsearFilasCriterios(tabladinamica: string): string[][] {
  const lineas = tabladinamica
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const filas: string[][] = []
  for (const linea of lineas) {
    if (!linea.includes('|') || esSeparadorTabla(linea)) continue
    const celdas = parseTableCells(linea)
    if (celdas.length < 2) continue
    if (filas.length === 0 && esFilaEncabezado(celdas)) {
      filas.push(normalizarEncabezados(celdas))
      continue
    }
    const fila =
      celdas.length >= 6 && celdas[0] === celdas[5]
        ? celdas.slice(0, 5)
        : celdas.length > 5
          ? celdas.slice(0, 5)
          : celdas
    while (fila.length < 5) fila.push('')
    if (!esFilaEncabezado(fila)) filas.push(fila)
  }

  if (filas.length === 0) return []
  if (!esFilaEncabezado(filas[0])) {
    filas.unshift([
      'CRITERIOS',
      'DESTACADO AD',
      'ESPERADO A',
      'EN PROCESO B',
      'EN INICIO C'
    ])
  }
  return filas
}

function renderCapacidades(capacidad: string): string {
  const t = capacidad.trim()
  if (!t) return '<span class="rubrica-doc-vacio">—</span>'
  const items = t
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean)
  if (items.length <= 1 && !t.includes('\n')) {
    return `<p class="rubrica-doc-texto">${textoHtml(t)}</p>`
  }
  return `<ul class="rubrica-doc-lista">${items.map((i) => `<li>${textoHtml(i)}</li>`).join('')}</ul>`
}

function renderMetaFila(etiqueta: string, valor: string): string {
  const contenido = valor.trim()
    ? `<div class="rubrica-doc-meta-valor">${textoHtml(valor.trim())}</div>`
    : '<div class="rubrica-doc-meta-valor rubrica-doc-vacio">—</div>'
  return `<tr>
    <th class="rubrica-doc-meta-label">${escapeHtml(etiqueta)}</th>
    <td class="rubrica-doc-meta-celda" colspan="3">${contenido}</td>
  </tr>`
}

function renderTablaCriterios(filas: string[][]): string {
  if (filas.length === 0) {
    return '<p class="rubrica-doc-vacio">Sin criterios de evaluación.</p>'
  }
  const [head, ...body] = filas
  let html = '<div class="rubrica-doc-tabla-wrap"><table class="rubrica-doc-tabla"><thead><tr>'
  for (const cel of head) {
    html += `<th>${escapeHtml(cel)}</th>`
  }
  html += '</tr></thead><tbody>'
  for (const fila of body) {
    html += '<tr>'
    fila.forEach((cel, idx) => {
      const clase = idx === 0 ? 'rubrica-doc-criterio' : 'rubrica-doc-nivel'
      html += `<td class="${clase}">${textoHtml(cel)}</td>`
    })
    html += '</tr>'
  }
  html += '</tbody></table></div>'
  return html
}

function renderListaEstudiantes(numCriterios: number): string {
  const n = Math.min(Math.max(numCriterios, 1), 6)
  const niveles = ['AD', 'A', 'B', 'C']

  let filaSuperior =
    '<th rowspan="2" class="rubrica-doc-lista-num">N°</th>' +
    '<th rowspan="2" class="rubrica-doc-lista-nombre">APELLIDOS Y NOMBRES</th>'
  for (let c = 1; c <= n; c++) {
    filaSuperior += `<th colspan="4" class="rubrica-doc-lista-criterio">CRITERIO ${c}</th>`
  }
  filaSuperior += '<th rowspan="2" class="rubrica-doc-lista-total">TOTAL</th>'

  let filaNiveles = ''
  for (let c = 0; c < n; c++) {
    for (const nv of niveles) {
      filaNiveles += `<th class="rubrica-doc-lista-nivel">${nv}</th>`
    }
  }

  let filas = ''
  for (let i = 1; i <= 15; i++) {
    filas += `<tr><td class="rubrica-doc-lista-num">${i}</td><td class="rubrica-doc-lista-nombre"></td>`
    for (let c = 0; c < n; c++) {
      for (let k = 0; k < 4; k++) filas += '<td></td>'
    }
    filas += '<td></td></tr>'
  }

  return `<div class="rubrica-doc-seccion-lista">
    <p class="rubrica-doc-lista-titulo">LISTA DE ESTUDIANTES</p>
    <p class="rubrica-doc-lista-sub">NIVELES DE LOGRO</p>
    <div class="rubrica-doc-tabla-wrap">
      <table class="rubrica-doc-lista">
        <thead>
          <tr>${filaSuperior}</tr>
          <tr>${filaNiveles}</tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </div>`
}

/** HTML con diseño similar a la plantilla Word RÚBRICA ANALÍTICA. */
export function rubricaDocumentoToHtml(data: RubricaVistaData): string {
  const filas = parsearFilasCriterios(data.tabladinamica)
  const numCriterios = Math.max(filas.length - 1, 0)

  const capacidadHtml = data.capacidad
    ? renderCapacidades(data.capacidad)
    : '<span class="rubrica-doc-vacio">—</span>'

  return `<div class="rubrica-doc">
    <header class="rubrica-doc-encabezado">
      <h1 class="rubrica-doc-titulo">RÚBRICA ANALÍTICA</h1>
      <p class="rubrica-doc-subtitulo">INSTRUMENTO DE EVALUACIÓN</p>
    </header>
    <table class="rubrica-doc-meta">
      <tbody>
        <tr>
          <th class="rubrica-doc-meta-label">ÁREA</th>
          <td class="rubrica-doc-meta-celda">${data.area?.trim() ? textoHtml(data.area.trim()) : '<span class="rubrica-doc-vacio">—</span>'}</td>
          <th class="rubrica-doc-meta-label">GRADO Y SECCIÓN</th>
          <td class="rubrica-doc-meta-celda">${data.grado?.trim() ? textoHtml(data.grado.trim()) : '<span class="rubrica-doc-vacio">—</span>'}</td>
        </tr>
        ${renderMetaFila('TÍTULO', data.tituloSesion ?? '')}
        ${renderMetaFila('COMPETENCIA', data.competencia ?? '')}
        ${renderMetaFila('EVIDENCIA', data.evidencia ?? '')}
        <tr>
          <th class="rubrica-doc-meta-label">CAPACIDADES</th>
          <td class="rubrica-doc-meta-celda" colspan="3">${capacidadHtml}</td>
        </tr>
        ${renderMetaFila('PROPÓSITO', data.proposito ?? '')}
        ${renderMetaFila('ESTÁNDAR', data.standar ?? '')}
      </tbody>
    </table>
    ${renderTablaCriterios(filas)}
    ${renderListaEstudiantes(numCriterios)}
  </div>`
}
