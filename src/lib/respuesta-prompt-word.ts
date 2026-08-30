import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType
} from 'docx'

export type BloqueParrafo = { tipo: 'parrafo'; texto: string }
export type BloqueTabla = { tipo: 'tabla'; filas: string[][] }
export type BloqueRespuesta = BloqueParrafo | BloqueTabla

/** Quita fences ``` y normaliza saltos para que gpt-4o-mini y gpt-5-mini se parseen igual. */
export function normalizarTextoRespuestaGpt(texto: string): string {
  let t = String(texto ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .trim()

  if (/^```/.test(t)) {
    t = t.replace(/^```[^\n]*\n?/, '').replace(/\n?```\s*$/, '').trim()
  }

  // Bloques ```markdown ... ``` en medio (gpt-5-mini suele envolver tablas así)
  t = t.replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')

  return t.trim()
}

export function parsearFilasTabla(linea: string): string[] {
  const raw = String(linea ?? '').trim()
  if (!raw) return []

  if (raw.includes('|')) {
    const partes = raw.split('|').map((c) => c.trim())
    if (partes.length <= 1) return []
    const sinExtremos =
      partes[0] === '' && partes[partes.length - 1] === '' ? partes.slice(1, -1) : partes
    return sinExtremos
  }

  // gpt-5-mini a veces entrega columnas separadas por tab
  if (raw.includes('\t')) {
    const partes = raw.split('\t').map((c) => c.trim())
    return partes.length >= 2 ? partes : []
  }

  return []
}

function esLineaSeparadorTabla(linea: string): boolean {
  if (!linea.includes('|') && !linea.includes('\t')) return false
  const celdas = parsearFilasTabla(linea)
  return celdas.length >= 2 && celdas.every((c) => /^[\s\-:]*$/.test(c))
}

function esFilaTabla(linea: string): boolean {
  return parsearFilasTabla(linea).length >= 2
}

export function respuestaPromptABloques(respuestaprompt: string): BloqueRespuesta[] {
  const texto = normalizarTextoRespuestaGpt(respuestaprompt)
  const lineas = texto
    ? texto
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    : []
  if (lineas.length === 0 && respuestaprompt) lineas.push('(Sin contenido)')

  const bloques: BloqueRespuesta[] = []
  let filasAcum: string[][] = []
  const flushTabla = () => {
    if (filasAcum.length > 0) {
      bloques.push({ tipo: 'tabla', filas: [...filasAcum] })
      filasAcum = []
    }
  }
  for (const linea of lineas) {
    if (esLineaSeparadorTabla(linea)) continue
    if (esFilaTabla(linea)) {
      filasAcum.push(parsearFilasTabla(linea))
    } else {
      flushTabla()
      bloques.push({ tipo: 'parrafo', texto: linea })
    }
  }
  flushTabla()
  return bloques
}

const BORDE_TABLA = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: '333333'
}

/** Word plano con la respuesta cruda de GPT (párrafos + tablas). */
export async function construirWordDesdeRespuestaGpt(tableText: string): Promise<Buffer> {
  const bloques = respuestaPromptABloques(tableText)
  const children: (Paragraph | Table)[] = []

  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: bloque.texto, size: 20 })],
          spacing: { after: 120 }
        })
      )
    } else {
      const numCols = Math.max(...bloque.filas.map((f) => f.length), 1)
      const filas = bloque.filas.map(
        (fila, filaIdx) =>
          new TableRow({
            children: Array.from({ length: numCols }, (_, i) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: fila[i] ?? '',
                        size: 18,
                        bold: filaIdx === 0
                      })
                    ]
                  })
                ],
                width: { size: Math.floor(100 / numCols), type: WidthType.PERCENTAGE },
                borders: {
                  top: BORDE_TABLA,
                  bottom: BORDE_TABLA,
                  left: BORDE_TABLA,
                  right: BORDE_TABLA
                },
                shading:
                  filaIdx === 0
                    ? { type: ShadingType.CLEAR, fill: 'E8E8E8', color: 'auto' }
                    : undefined
              })
            )
          })
      )
      children.push(
        new Table({
          rows: filas,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      )
      children.push(new Paragraph({ children: [], spacing: { after: 120 } }))
    }
  }

  if (children.length === 0) {
    children.push(
      new Paragraph({ children: [new TextRun({ text: tableText, size: 20 })] })
    )
  }

  const doc = new Document({ sections: [{ properties: {}, children }] })
  return (await Packer.toBuffer(doc)) as Buffer
}

export function escaparXMLWord(s: string): string {
  if (!s) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function bloquesRespuestaAWordXml(
  bloques: BloqueRespuesta[],
  opts?: { szParrafo?: string; szTabla?: string }
): string {
  const szParrafo = opts?.szParrafo ?? '20'
  const szTabla = opts?.szTabla ?? '18'
  let xml = ''
  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      const t = escaparXMLWord(bloque.texto)
      xml += `<w:p><w:pPr><w:rPr><w:sz w:val="${szParrafo}"/><w:szCs w:val="${szParrafo}"/></w:rPr><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:sz w:val="${szParrafo}"/><w:szCs w:val="${szParrafo}"/></w:rPr><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`
    } else {
      const numCols = Math.max(...bloque.filas.map((f) => f.length), 1)
      const colW = Math.floor(9000 / numCols)
      let tbl = `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid>${Array(numCols)
        .fill(`<w:gridCol w:w="${colW}"/>`)
        .join('')}</w:tblGrid>`
      for (const fila of bloque.filas) {
        tbl += '<w:tr>'
        for (let i = 0; i < numCols; i++) {
          const celda = escaparXMLWord(fila[i] ?? '')
          tbl += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="${szTabla}"/><w:szCs w:val="${szTabla}"/></w:rPr><w:t xml:space="preserve">${celda}</w:t></w:r></w:p></w:tc>`
        }
        tbl += '</w:tr>'
      }
      tbl += '</w:tbl>'
      xml += tbl
    }
  }
  return xml
}

export function insertarXmlEnPlaceholder(
  zip: { files: Record<string, { asText: () => string }>; file: (name: string, content: string) => void },
  placeholder: string,
  xmlContent: string,
  altPlaceholder?: string
): void {
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) return
  let xml = documentFile.asText()
  let idx = xml.indexOf(placeholder)
  if (idx === -1 && altPlaceholder) idx = xml.indexOf(altPlaceholder)
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
  if (paraStart !== -1 && paraEnd !== -1 && paraEnd > paraStart) {
    xml = xml.substring(0, paraStart) + xmlContent + xml.substring(paraEnd + 6)
    zip.file('word/document.xml', xml)
  }
}
