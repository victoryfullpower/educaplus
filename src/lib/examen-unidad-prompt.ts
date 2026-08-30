import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { escaparXMLWord } from '@/lib/respuesta-prompt-word'

export type SesionUnidadParaExamen = {
  titulo?: string
  campoTematico?: string
  competenciasSeleccionadas?: string[]
  desempeniosSeleccionados?: string[]
  evidencias?: string
}

export type DatosPromptExamenUnidad = {
  area: string
  grado: string
  ciclo: string
  numunidad: string
  titulounidad: string
  productounidad: string
  sesiones: SesionUnidadParaExamen[]
}

const PLACEHOLDER_TABLA_NOMBRE = 'tablasesiones'
const COLUMNAS_TABLA = 5
const ANCHO_TABLA = 9000

const ENCABEZADOS_TABLA = [
  'TITULO',
  'CAMPO TEMATICO',
  'COMPETENCIA',
  'DESEMPEÑO PRECISADO',
  'EVIDENCIAS DE APRENDIZAJE'
] as const

const LIMPIAR_BR = (s: string) =>
  (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()

function itemsDeLista(items?: string[]): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => LIMPIAR_BR(String(item ?? '')))
    .filter((item) => item.length > 0)
}

function parrafosCeldaXml(
  lineas: string[],
  opts?: { vinietas?: boolean; quitarVinietas?: boolean }
): string {
  if (lineas.length === 0) {
    return `<w:p><w:pPr><w:spacing w:after="100" w:before="100"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t> </w:t></w:r></w:p>`
  }
  return lineas
    .map((linea, idx) => {
      let texto = linea.trim()
      if (opts?.quitarVinietas) {
        texto = texto.replace(/^[•\-*]\s*/, '').trim()
      } else if (opts?.vinietas && texto && !/^[•\-*]/.test(texto)) {
        texto = `• ${texto}`
      }
      const esc = escaparXMLWord(texto || ' ')
      return `<w:p><w:pPr><w:spacing w:after="${idx < lineas.length - 1 ? 50 : 100}" w:before="${idx === 0 ? 100 : 50}"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${esc}</w:t></w:r></w:p>`
    })
    .join('')
}

function celdaTextoPlanoXml(texto: string): string {
  const lineas = LIMPIAR_BR(texto)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return parrafosCeldaXml(lineas.length > 0 ? lineas : [texto.trim() || ' '])
}

/** Tabla Word de sesiones (5 columnas) para insertar en {{tablasesiones}}. */
export function buildTablaSesionesExamenWordXml(
  sesiones: SesionUnidadParaExamen[]
): string {
  const filas = sesiones.filter(
    (s) =>
      !!s.titulo?.trim() ||
      !!s.campoTematico?.trim() ||
      itemsDeLista(s.competenciasSeleccionadas).length > 0 ||
      itemsDeLista(s.desempeniosSeleccionados).length > 0 ||
      !!s.evidencias?.trim()
  )

  const anchoCol = Math.floor(ANCHO_TABLA / COLUMNAS_TABLA)
  let xml = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${ANCHO_TABLA}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid>`
  for (let i = 0; i < COLUMNAS_TABLA; i++) {
    xml += `<w:gridCol w:w="${anchoCol}"/>`
  }
  xml += `</w:tblGrid>`

  xml += `<w:tr><w:trPr><w:trHeight w:val="300" w:rule="atLeast"/></w:trPr>`
  for (const header of ENCABEZADOS_TABLA) {
    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/><w:vAlign w:val="center"/></w:tcPr>`
    xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80" w:before="80"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escaparXMLWord(header)}</w:t></w:r></w:p></w:tc>`
  }
  xml += `</w:tr>`

  filas.forEach((sesion, index) => {
    const numero = index + 1
    const competencias = itemsDeLista(sesion.competenciasSeleccionadas)
    const desempenios = itemsDeLista(sesion.desempeniosSeleccionados)

    xml += `<w:tr><w:trPr><w:trHeight w:val="400" w:rule="atLeast"/></w:trPr>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>`
    xml += `<w:p><w:pPr><w:spacing w:after="40" w:before="80"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escaparXMLWord(`Sesión ${numero}`)}</w:t></w:r></w:p>`
    xml += `<w:p><w:pPr><w:spacing w:after="80" w:before="0"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t>${escaparXMLWord(LIMPIAR_BR(sesion.titulo ?? ''))}</w:t></w:r></w:p></w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${celdaTextoPlanoXml(sesion.campoTematico ?? '')}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${parrafosCeldaXml(competencias, { vinietas: true })}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${parrafosCeldaXml(desempenios, { quitarVinietas: true })}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${anchoCol}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${celdaTextoPlanoXml(sesion.evidencias ?? '')}</w:tc>`

    xml += `</w:tr>`
  })

  xml += `</w:tbl>`
  return xml
}

/** Reemplaza el párrafo que contiene {{tablasesiones}} (aunque Word parta la llave en varios runs). */
function insertarTablaEnPlaceholder(
  zip: PizZip,
  tablaXml: string
): void {
  const documentFile = zip.files['word/document.xml']
  if (!documentFile) {
    throw new Error('word/document.xml no encontrado en la plantilla del prompt')
  }

  let xml = documentFile.asText()
  const nameIdx = xml.indexOf(PLACEHOLDER_TABLA_NOMBRE)
  if (nameIdx === -1) {
    throw new Error(
      `La plantilla no contiene la llave {{${PLACEHOLDER_TABLA_NOMBRE}}}. Agrégala en el Word del prompt.`
    )
  }

  let paraStart = -1
  for (let i = nameIdx; i >= 0; i--) {
    if (xml.substring(i, i + 4) === '<w:p') {
      const ch = xml.charAt(i + 4)
      if (ch === ' ' || ch === '>') {
        paraStart = i
        break
      }
    }
  }

  const paraEnd = xml.indexOf('</w:p>', nameIdx)
  if (paraStart === -1 || paraEnd === -1 || paraEnd <= paraStart) {
    throw new Error(
      `No se pudo ubicar el párrafo de {{${PLACEHOLDER_TABLA_NOMBRE}}} en la plantilla.`
    )
  }

  xml = xml.substring(0, paraStart) + tablaXml + xml.substring(paraEnd + 6)
  zip.file('word/document.xml', xml)
}

export function buildPromptDataExamenDocx(
  datos: DatosPromptExamenUnidad
): Record<string, string> {
  return {
    area: datos.area,
    grado: datos.grado,
    ciclo: datos.ciclo,
    numunidad: datos.numunidad,
    titulounidad: datos.titulounidad,
    productounidad: datos.productounidad
  }
}

/**
 * Rellena el .docx del prompt: solo reemplaza llaves {{…}} con Docxtemplater
 * e inserta la tabla de sesiones en {{tablasesiones}} sin borrar el resto.
 */
export async function renderPromptExamenDocx(
  datos: DatosPromptExamenUnidad,
  templateFileName = 'PROMPT PARA ELABORACIÓN DE EXAMENES.docx'
): Promise<{ buffer: Buffer; promptText: string }> {
  const templatePath = path.join(process.cwd(), 'templates', templateFileName)
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Plantilla de prompt no encontrada: ${templateFileName}`)
  }

  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)

  const tablaXml = buildTablaSesionesExamenWordXml(datos.sesiones)
  insertarTablaEnPlaceholder(zip, tablaXml)

  const docXml = zip.files['word/document.xml']?.asText() ?? ''
  if (docXml.includes(PLACEHOLDER_TABLA_NOMBRE)) {
    throw new Error('No se pudo insertar la tabla en {{tablasesiones}}.')
  }

  const promptDoc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  })

  promptDoc.render(buildPromptDataExamenDocx(datos))

  const buffer = promptDoc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  }) as Buffer

  const extract = await mammoth.extractRawText({ buffer })
  const promptText = (extract.value || '').trim()
  if (!promptText) {
    throw new Error('No se pudo extraer el texto del prompt dinámico de exámenes')
  }

  return { buffer, promptText }
}

export function sesionesDesdeJsonUnidad(raw: unknown): SesionUnidadParaExamen[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const s = item as Record<string, unknown>
    return {
      titulo: typeof s.titulo === 'string' ? s.titulo : undefined,
      campoTematico:
        typeof s.campoTematico === 'string' ? s.campoTematico : undefined,
      competenciasSeleccionadas: Array.isArray(s.competenciasSeleccionadas)
        ? (s.competenciasSeleccionadas as string[])
        : undefined,
      desempeniosSeleccionados: Array.isArray(s.desempeniosSeleccionados)
        ? (s.desempeniosSeleccionados as string[])
        : undefined,
      evidencias: typeof s.evidencias === 'string' ? s.evidencias : undefined
    }
  })
}

export function sesionesValidasParaExamen(sesiones: SesionUnidadParaExamen[]): boolean {
  return sesiones.some(
    (s) =>
      !!s.titulo?.trim() ||
      !!s.campoTematico?.trim() ||
      (Array.isArray(s.competenciasSeleccionadas) &&
        s.competenciasSeleccionadas.length > 0)
  )
}
