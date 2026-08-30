import type PizZip from 'pizzip'

export type CompetenciaMatrizUnidad = {
  competenciaNumero: string
  competenciaDescripcion: string
  capacidades: Array<{
    capacidadDescripcion: string
    desempenios: string[]
  }>
}

export const MATRIZ_UNIDAD_PLACEHOLDER = 'MATRIZ_UNIDAD_PLACEHOLDER'

/** Lista simple de competencias para {{competenciasdelabd}}. */
export function generarCompetenciasBdTexto(
  competencias: Array<{ descripcion: string }>
): string {
  if (!competencias.length) return '• No se encontraron competencias'
  return competencias.map((c) => `• ${c.descripcion.trim()}`).join('\n')
}

const COL1 = 4200
const COL2 = 4200
const COL3 = 6469
const BORDE_VERDE =
  '<w:top w:val="single" w:sz="4" w:color="00B050"/><w:left w:val="single" w:sz="4" w:color="00B050"/><w:bottom w:val="single" w:sz="4" w:color="00B050"/><w:right w:val="single" w:sz="4" w:color="00B050"/>'
const BORDE_CELDA = `<w:tcBorders>${BORDE_VERDE}</w:tcBorders>`

function escaparXML(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parrafoTexto(texto: string, opts?: { bold?: boolean; center?: boolean }): string {
  const t = escaparXML(texto)
  const jc = opts?.center ? '<w:jc w:val="center"/>' : ''
  const bold = opts?.bold ? '<w:b/>' : ''
  return `<w:p><w:pPr><w:spacing w:after="40" w:before="0"/>${jc}<w:rPr>${bold}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:pPr><w:r><w:rPr>${bold}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
}

function celda(
  ancho: number,
  contenido: string,
  opts?: { fill?: string; vAlign?: string; vMerge?: 'restart' | 'continue' }
): string {
  const fill = opts?.fill ?? 'FFFFFF'
  const vAlign = opts?.vAlign ?? 'top'
  const vMerge =
    opts?.vMerge === 'restart'
      ? '<w:vMerge w:val="restart"/>'
      : opts?.vMerge === 'continue'
        ? '<w:vMerge/>'
        : ''
  return `<w:tc><w:tcPr><w:tcW w:w="${ancho}" w:type="dxa"/>${vMerge}<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>${BORDE_CELDA}<w:vAlign w:val="${vAlign}"/></w:tcPr>${contenido}</w:tc>`
}

function celdaDesempenios(desempenios: string[]): string {
  if (!desempenios.length) {
    return celda(COL3, parrafoTexto('—'))
  }
  const parrafos = desempenios
    .map((d, i) => parrafoTexto(`${i + 1}. ${d.trim()}`))
    .join('')
  return celda(COL3, parrafos)
}

/** Texto plano para GPT (generate-prompt / generate-document unidad). */
export function generarMatrizTexto(competencias: CompetenciaMatrizUnidad[]): string {
  if (!competencias.length) {
    return 'No se encontraron competencias para mostrar en la matriz.'
  }

  let matrizTexto = ''
  competencias.forEach((competencia, compIdx) => {
    if (compIdx > 0) matrizTexto += '\n\n'
    matrizTexto += `${competencia.competenciaNumero}: ${competencia.competenciaDescripcion}\n`
    matrizTexto += 'COMPETENCIA | CAPACIDADES | DESEMPEÑOS PRECISADOS\n'
    matrizTexto += '--- | --- | ---\n'
    competencia.capacidades.forEach((capacidad, capIdx) => {
      const desempeniosTexto = capacidad.desempenios
        .map((des, idx) => `${idx + 1}. ${des}`)
        .join('; ')
      const competenciaTexto = capIdx === 0 ? competencia.competenciaDescripcion : ''
      matrizTexto += `${competenciaTexto} | ${capacidad.capacidadDescripcion} | ${desempeniosTexto}\n`
    })
  })
  return matrizTexto
}

/** Una tabla Word por competencia (3 columnas, celdas combinadas en competencia). */
export function generarMatrizTablasWordXml(competencias: CompetenciaMatrizUnidad[]): string {
  if (!competencias.length) {
    return parrafoTexto('No se encontraron competencias para mostrar en la matriz.')
  }

  const tablas: string[] = []

  for (const comp of competencias) {
    let tabla =
      '<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="14869" w:type="dxa"/><w:jc w:val="center"/><w:tblBorders>' +
      BORDE_VERDE +
      '</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>' +
      `<w:tblGrid><w:gridCol w:w="${COL1}"/><w:gridCol w:w="${COL2}"/><w:gridCol w:w="${COL3}"/></w:tblGrid>`

    // Título de la competencia (fila que abarca 3 columnas)
    tabla += '<w:tr><w:trPr><w:trHeight w:val="360" w:rule="atLeast"/></w:trPr>'
    tabla += `<w:tc><w:tcPr><w:gridSpan w:val="3"/><w:tcW w:w="${COL1 + COL2 + COL3}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="E8F5E9"/>${BORDE_CELDA}<w:vAlign w:val="center"/></w:tcPr>`
    tabla += parrafoTexto(`${comp.competenciaNumero}: ${comp.competenciaDescripcion}`, { bold: true })
    tabla += '</w:tc></w:tr>'

    // Encabezados de columnas
    tabla += '<w:tr><w:trPr><w:trHeight w:val="320" w:rule="atLeast"/></w:trPr>'
    tabla += celda(COL1, parrafoTexto('COMPETENCIA', { bold: true, center: true }), {
      fill: 'C1F0C7',
      vAlign: 'center'
    })
    tabla += celda(COL2, parrafoTexto('CAPACIDADES', { bold: true, center: true }), {
      fill: 'C1F0C7',
      vAlign: 'center'
    })
    tabla += celda(COL3, parrafoTexto('DESEMPEÑOS PRECISADOS', { bold: true, center: true }), {
      fill: 'C1F0C7',
      vAlign: 'center'
    })
    tabla += '</w:tr>'

    const numFilas = Math.max(comp.capacidades.length, 1)
    comp.capacidades.forEach((cap, capIdx) => {
      tabla += '<w:tr><w:trPr><w:trHeight w:val="280" w:rule="atLeast"/></w:trPr>'
      if (capIdx === 0) {
        tabla += celda(COL1, parrafoTexto(comp.competenciaDescripcion), {
          vMerge: numFilas > 1 ? 'restart' : undefined
        })
      } else {
        tabla += celda(COL1, '<w:p/>', { vMerge: 'continue' })
      }
      tabla += celda(COL2, parrafoTexto(cap.capacidadDescripcion))
      tabla += celdaDesempenios(cap.desempenios)
      tabla += '</w:tr>'
    })

    if (comp.capacidades.length === 0) {
      tabla += '<w:tr><w:trPr><w:trHeight w:val="280"/></w:trPr>'
      tabla += celda(COL1, parrafoTexto(comp.competenciaDescripcion))
      tabla += celda(COL2, parrafoTexto('—'))
      tabla += celda(COL3, parrafoTexto('—'))
      tabla += '</w:tr>'
    }

    tabla += '</w:tbl>'
    tablas.push(tabla)
    tablas.push('<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>')
  }

  return tablas.join('')
}

/** Sustituye {{matriz}} por tablas Word sin borrar otros marcadores del párrafo. */
export function insertarMatrizEnDocumentoWord(zip: PizZip, tablaXml: string): void {
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) {
    throw new Error('word/document.xml no encontrado en la plantilla del prompt')
  }

  let xml = documentFile.asText()
  const idx = xml.indexOf(MATRIZ_UNIDAD_PLACEHOLDER)
  // La plantilla puede no incluir {{matriz}}; en ese caso no se inserta tabla.
  if (idx === -1) return

  let paraStart = -1
  for (let i = idx; i >= 0; i--) {
    if (xml.substring(i, i + 4) === '<w:p') {
      const ch = xml.charAt(i + 4)
      if (ch === ' ' || ch === '>') {
        paraStart = i
        break
      }
    }
  }

  const paraEnd = xml.indexOf('</w:p>', idx)
  if (paraStart === -1 || paraEnd === -1 || paraEnd <= paraStart) {
    throw new Error('No se pudo ubicar el párrafo de {{matriz}} en la plantilla.')
  }

  const paragraphEndExclusive = paraEnd + 6
  const paragraphXml = xml.substring(paraStart, paragraphEndExclusive)
  const paragraphWithoutPlaceholder = paragraphXml.replace(
    MATRIZ_UNIDAD_PLACEHOLDER,
    ''
  )

  // Conserva, por ejemplo, {{competenciasdelabd}} cuando Word dejó ambos
  // marcadores dentro del mismo <w:p> mediante un salto de línea manual.
  xml =
    xml.substring(0, paraStart) +
    paragraphWithoutPlaceholder +
    tablaXml +
    xml.substring(paragraphEndExclusive)
  zip.file('word/document.xml', xml)
}
