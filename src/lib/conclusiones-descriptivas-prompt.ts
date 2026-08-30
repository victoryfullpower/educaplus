import fs from 'fs'
import path from 'path'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { escaparXMLWord } from '@/lib/respuesta-prompt-word'
import {
  sesionesDesdeJsonUnidad,
  type SesionUnidadParaExamen
} from '@/lib/examen-unidad-prompt'

export type DatosPromptConclusiones = {
  area: string
  grado: string
  ciclo: string
  numunidad1: string
  numunidad2: string
  competencias: string
  sesionesUnidad1: SesionUnidadParaExamen[]
  sesionesUnidad2: SesionUnidadParaExamen[]
}

const COLUMNAS_TABLA = 5
const ANCHO_TABLA = 9000
const ANCHOS_COL = [900, 2100, 2000, 2000, 2000]

const ENCABEZADOS_TABLA = [
  '',
  'TITULO',
  'CAMPO TEMATICO',
  'COMPETENCIA',
  'DESEMPEÑO PRECISADO'
] as const

const LIMPIAR_BR = (s: string) =>
  (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()

function itemsDeLista(items?: string[]): string[] {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => LIMPIAR_BR(String(item ?? '')))
    .filter((item) => item.length > 0)
}

/**
 * Regla de emparejamiento de unidades (siempre pares):
 * u1→(1,2), u2→(1,2), u3→(3,4), u4→(3,4), u5→(5,6) … hasta 8.
 */
export function calcularParUnidades(n: number): {
  numunidad1: number
  numunidad2: number
} {
  const seguro = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  const par = Math.ceil(seguro / 2)
  return { numunidad1: par * 2 - 1, numunidad2: par * 2 }
}

function parrafosCeldaXml(
  lineas: string[],
  opts?: { vinietas?: boolean; quitarVinietas?: boolean; negrita?: boolean }
): string {
  if (lineas.length === 0) {
    return `<w:p><w:pPr><w:spacing w:after="80" w:before="80"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t> </w:t></w:r></w:p>`
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
      const rpr = opts?.negrita ? '<w:sz w:val="18"/><w:b/>' : '<w:sz w:val="18"/>'
      return `<w:p><w:pPr><w:spacing w:after="${idx < lineas.length - 1 ? 40 : 80}" w:before="${idx === 0 ? 80 : 40}"/></w:pPr><w:r><w:rPr>${rpr}</w:rPr><w:t xml:space="preserve">${esc}</w:t></w:r></w:p>`
    })
    .join('')
}

function celdaTextoPlanoXml(texto: string): string {
  const lineas = LIMPIAR_BR(texto)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return parrafosCeldaXml(lineas.length > 0 ? lineas : [' '])
}

/** Tabla Word (5 columnas) con las sesiones desarrolladas de una unidad. */
function buildTablaSesionesConclusionesXml(
  sesiones: SesionUnidadParaExamen[]
): string {
  const filas = sesiones.filter(
    (s) =>
      !!s.titulo?.trim() ||
      !!s.campoTematico?.trim() ||
      itemsDeLista(s.competenciasSeleccionadas).length > 0 ||
      itemsDeLista(s.desempeniosSeleccionados).length > 0
  )

  let xml = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${ANCHO_TABLA}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="auto"/><w:left w:val="single" w:sz="4" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:color="auto"/><w:right w:val="single" w:sz="4" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:color="auto"/></w:tblBorders></w:tblPr><w:tblGrid>`
  for (let i = 0; i < COLUMNAS_TABLA; i++) {
    xml += `<w:gridCol w:w="${ANCHOS_COL[i]}"/>`
  }
  xml += `</w:tblGrid>`

  xml += `<w:tr><w:trPr><w:trHeight w:val="300" w:rule="atLeast"/></w:trPr>`
  ENCABEZADOS_TABLA.forEach((header, i) => {
    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[i]}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="D9E2F3"/><w:vAlign w:val="center"/></w:tcPr>`
    xml += `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="60" w:before="60"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escaparXMLWord(header)}</w:t></w:r></w:p></w:tc>`
  })
  xml += `</w:tr>`

  if (filas.length === 0) {
    xml += `<w:tr><w:tc><w:tcPr><w:tcW w:w="${ANCHO_TABLA}" w:type="dxa"/><w:gridSpan w:val="${COLUMNAS_TABLA}"/></w:tcPr><w:p><w:pPr><w:spacing w:after="80" w:before="80"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:i/></w:rPr><w:t>Sin sesiones registradas para esta unidad.</w:t></w:r></w:p></w:tc></w:tr>`
  }

  filas.forEach((sesion, index) => {
    const numero = index + 1
    const competencias = itemsDeLista(sesion.competenciasSeleccionadas)
    const desempenios = itemsDeLista(sesion.desempeniosSeleccionados)

    xml += `<w:tr><w:trPr><w:trHeight w:val="400" w:rule="atLeast"/></w:trPr>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[0]}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>`
    xml += `<w:p><w:pPr><w:spacing w:after="80" w:before="80"/></w:pPr><w:r><w:rPr><w:sz w:val="18"/><w:b/></w:rPr><w:t>${escaparXMLWord(`Sesión ${numero}`)}</w:t></w:r></w:p></w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[1]}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${celdaTextoPlanoXml(LIMPIAR_BR(sesion.titulo ?? ''))}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[2]}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${celdaTextoPlanoXml(sesion.campoTematico ?? '')}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[3]}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${parrafosCeldaXml(competencias, { vinietas: true })}</w:tc>`

    xml += `<w:tc><w:tcPr><w:tcW w:w="${ANCHOS_COL[4]}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${parrafosCeldaXml(desempenios, { quitarVinietas: true })}</w:tc>`

    xml += `</w:tr>`
  })

  xml += `</w:tbl>`
  return xml
}

const ANCLA_TABLA_SESIONES = 'SECUENCIA DE SESIONES'
const TBL_CIERRE = '</w:tbl>'

/** Devuelve el rango [inicio, fin) de la 1ª tabla que aparece tras `desde`. */
function ubicarTablaTras(xml: string, desde: number): { inicio: number; fin: number } {
  const inicio = xml.indexOf('<w:tbl>', desde)
  const cierre = inicio === -1 ? -1 : xml.indexOf(TBL_CIERRE, inicio)
  if (inicio === -1 || cierre === -1) {
    throw new Error('No se pudo ubicar una tabla de sesiones en la plantilla.')
  }
  return { inicio, fin: cierre + TBL_CIERRE.length }
}

/**
 * Sustituye las dos tablas de sesiones (Word parte las llaves en varios runs,
 * por eso se anclan a los encabezados "SECUENCIA DE SESIONES…").
 */
function reemplazarTablasSesiones(
  xml: string,
  tabla1Xml: string,
  tabla2Xml: string
): string {
  const ancla1 = xml.indexOf(ANCLA_TABLA_SESIONES)
  if (ancla1 === -1) {
    throw new Error(
      'La plantilla de conclusiones no contiene la sección "SECUENCIA DE SESIONES".'
    )
  }
  const ancla2 = xml.indexOf(ANCLA_TABLA_SESIONES, ancla1 + ANCLA_TABLA_SESIONES.length)
  if (ancla2 === -1) {
    throw new Error(
      'La plantilla de conclusiones no contiene la segunda tabla de sesiones.'
    )
  }

  const t1 = ubicarTablaTras(xml, ancla1)
  const t2 = ubicarTablaTras(xml, ancla2)

  // Reemplazar primero la tabla posterior para no invalidar los índices previos.
  let resultado = xml.substring(0, t2.inicio) + tabla2Xml + xml.substring(t2.fin)
  resultado = resultado.substring(0, t1.inicio) + tabla1Xml + resultado.substring(t1.fin)
  return resultado
}

/**
 * Rellena el .docx del prompt de conclusiones descriptivas:
 * - Sustituye las 2 tablas de sesiones por las sesiones reales de cada unidad.
 * - Reemplaza las llaves simples ({{area}}, {{grado}}, {{ciclo}}, {{numunidad1}},
 *   {{numunidad2}}, {{unidades}}) con Docxtemplater.
 */
export async function renderPromptConclusionesDocx(
  datos: DatosPromptConclusiones,
  templateFileName = 'PROMPT_CONCLUSIONES_DESCRIPTIVAS.docx'
): Promise<{ buffer: Buffer; promptText: string }> {
  const templatePath = path.join(process.cwd(), 'templates', templateFileName)
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Plantilla de prompt no encontrada: ${templateFileName}`)
  }

  const content = fs.readFileSync(templatePath, 'binary')
  const zip = new PizZip(content)

  let xml = zip.files['word/document.xml']?.asText() ?? ''
  if (!xml) {
    throw new Error('word/document.xml no encontrado en la plantilla de conclusiones')
  }

  const tabla1 = buildTablaSesionesConclusionesXml(datos.sesionesUnidad1)
  const tabla2 = buildTablaSesionesConclusionesXml(datos.sesionesUnidad2)

  xml = reemplazarTablasSesiones(xml, tabla1, tabla2)

  zip.file('word/document.xml', xml)

  const promptDoc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
    nullGetter: () => ''
  })

  promptDoc.render({
    area: datos.area,
    grado: datos.grado,
    ciclo: datos.ciclo,
    numunidad1: datos.numunidad1,
    numunidad2: datos.numunidad2,
    competencias: datos.competencias,
    unidades: `${datos.numunidad1} y ${datos.numunidad2}`
  })

  const buffer = promptDoc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE'
  }) as Buffer

  const extract = await mammoth.extractRawText({ buffer })
  const promptText = (extract.value || '').trim()
  if (!promptText) {
    throw new Error('No se pudo extraer el texto del prompt de conclusiones descriptivas')
  }

  return { buffer, promptText }
}

export { sesionesDesdeJsonUnidad }
