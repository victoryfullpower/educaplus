import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Plantilla Word: RÚBRICA ANALITICA.docx con llaves: area, competencia, capacidad, standar, grado, titulosesion, evidencia, proposito, tabladinamica */
const TEMPLATE_NAME = 'RÚBRICA ANALITICA.docx'
const PROMPT_TEMPLATE_NAME = 'PROMPT_Rubrica.docx'
const TABLA_DINAMICA_PLACEHOLDER = 'TABLA_DINAMICA_RUBRICA_PLACEHOLDER'
const MODELO_OBLIGATORIO = 'gpt-5-mini'
const NUM_COLUMNAS_RUBRICA = 6
const SYSTEM_RUBRICA = `Responde ÚNICAMENTE con una tabla de texto donde cada línea es una fila y las columnas se separan con el carácter | (pipe).
Primera línea (encabezado): CRITERIOS|DESTACADO AD|ESPERADO A|EN PROCESO B|EN INICIO C|DESTACADO AD
Luego una línea por cada criterio con exactamente 6 columnas separadas por |:
1) Texto del criterio
2) Descripción nivel DESTACADO AD
3) Descripción nivel ESPERADO A
4) Descripción nivel EN PROCESO B
5) Descripción nivel EN INICIO C
6) Repetir el mismo texto del criterio (columna 1)
No incluyas explicaciones antes ni después de la tabla. Solo las líneas con |.`

/**
 * Genera el documento Word de Rúbrica Analítica rellenando la plantilla
 * con los datos de la sesión seleccionada.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const sesionId = body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    const forceRegenerate = !!body.forceRegenerate

    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json(
        { error: 'sesionId es requerido' },
        { status: 400 }
      )
    }

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true, rubrica: true }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje
    const limpiarBr = (s: string) => (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
    const sinPrefijoProposito = (s: string) => (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()

    let area: string
    let grado: string
    let competencia: string
    let capacidad: string
    let standar: string
    let titulosesion: string
    let evidencia: string
    let proposito: string
    let tabladinamicaRaw = ''

    const rubricaGuardada = !forceRegenerate ? sesion.rubrica : null
    if (rubricaGuardada) {
      area = (rubricaGuardada.area ?? '').trim()
      grado = (rubricaGuardada.grado ?? '').trim()
      competencia = (rubricaGuardada.competencia ?? '').trim()
      capacidad = (rubricaGuardada.capacidad ?? '').trim()
      standar = (rubricaGuardada.standar ?? '').trim()
      titulosesion = (rubricaGuardada.titulosesion ?? '').trim()
      evidencia = (rubricaGuardada.evidencia ?? '').trim()
      proposito = (rubricaGuardada.proposito ?? '').trim()
      tabladinamicaRaw = (rubricaGuardada.tabladinamica ?? '').trim()
    } else {
      const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
        ? sesion.competenciasSeleccionadas as string[]
        : []
      competencia = competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''
      const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
        ? sesion.capacidadesSeleccionadas as string[]
        : []
      capacidad = capacidadesArr
        .filter((c: string) => c && String(c).trim())
        .map((c: string) => `- ${limpiarBr(c)}`)
        .join('\n')
      area = (sesion.area ?? u.area ?? '').trim()
      grado = (sesion.grado ?? u.grado ?? '').trim()
      standar = (sesion.standar ?? '').trim()
      titulosesion = (sesion.titulo ?? '').trim()
      evidencia = limpiarBr(sesion.evidencias ?? '')
      proposito = sinPrefijoProposito(sesion.proposito ?? '')

      const dataPrompt = {
        area,
        grado,
        titulo: titulosesion,
        competencia,
        capacidades: capacidad,
        evidencia,
        proposito,
        standar,
        criterios: limpiarBr(sesion.criterios ?? '')
      }

      if (process.env.OPENAI_API_KEY) {
        const promptTemplatePath = path.join(process.cwd(), 'templates', PROMPT_TEMPLATE_NAME)
        if (fs.existsSync(promptTemplatePath)) {
          const contentPrompt = fs.readFileSync(promptTemplatePath, 'binary')
          const zipPrompt = new PizZip(contentPrompt)
          const templateDoc = new Docxtemplater(zipPrompt, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: { start: '{{', end: '}}' },
            nullGetter: () => ''
          })
          templateDoc.render(dataPrompt)
          const docxBufferPrompt = templateDoc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
          const extractResult = await mammoth.extractRawText({ buffer: docxBufferPrompt as Buffer })
          const promptText = (extractResult.value || '').trim()
          if (promptText) {
            const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
            try {
              let completion = await openaiClient.chat.completions.create({
                model: MODELO_OBLIGATORIO,
                messages: [
                  { role: 'system' as const, content: SYSTEM_RUBRICA },
                  { role: 'user' as const, content: promptText }
                ],
                top_p: 1,
                max_completion_tokens: 16384
              })
              let gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
              if (!gptResponse) {
                completion = await openaiClient.chat.completions.create({
                  model: MODELO_OBLIGATORIO,
                  messages: [
                    { role: 'system' as const, content: SYSTEM_RUBRICA },
                    { role: 'user' as const, content: promptText }
                  ],
                  top_p: 1,
                  max_completion_tokens: 16384
                })
                gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
              }
              if (gptResponse) {
                tabladinamicaRaw = gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
              }
            } catch (err) {
              console.error('Error al obtener respuesta IA para tabla rúbrica:', err)
            }
          }
        }
      }
    }

    const parsearTablaDinamica = (texto: string): string[][] => {
      if (!texto.trim()) return []
      const lineas = texto.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
      const sepPipe = lineas.some((l: string) => l.includes('|'))
      let celdas: string[][] = sepPipe
        ? lineas.map((l: string) => l.split('|').map((c: string) => c.trim()))
        : lineas.map((l: string) => [l])
      celdas.forEach((f: string[]) => {
        while (f.length < NUM_COLUMNAS_RUBRICA) f.push('')
        if (f.length > NUM_COLUMNAS_RUBRICA) f.splice(NUM_COLUMNAS_RUBRICA)
      })
      return celdas
    }

    const celdasPorFila = parsearTablaDinamica(tabladinamicaRaw)

    // Construir XML de la tabla dinámica (6 columnas): ancho 100%, fuente Arial Nova Condensed Light 9 pt
    const escaparXML = (s: string) => {
      if (!s) return ''
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }
    const FONT_RUBRICA = 'Arial Nova Condensed Light'
    const szVal = '18'
    const TBL_W_PCT = '5000'
    const COL_W_PCT = '833'
    const rPrFont = `<w:rFonts w:ascii="${FONT_RUBRICA}" w:hAnsi="${FONT_RUBRICA}" w:cs="${FONT_RUBRICA}"/>`
    const crearFilaTabla = (fila: string[], isHeader: boolean) => {
      const cells = fila.map((celda, i) => {
        const esPrimera = i === 0
        const fill = isHeader ? 'C1F0C7' : 'FFFFFF'
        const bordas = esPrimera
          ? `<w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="8" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders>`
          : `<w:tcBorders><w:top w:val="double" w:sz="4" w:color="00B050"/><w:left w:val="double" w:sz="4" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:color="00B050"/><w:right w:val="double" w:sz="4" w:color="00B050"/></w:tcBorders>`
        const bold = isHeader ? '<w:b/>' : ''
        const text = escaparXML(celda || ' ')
        return `<w:tc><w:tcPr><w:tcW w:w="${COL_W_PCT}" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>${bordas}<w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:after="0"/><w:rPr>${rPrFont}<w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/>${bold}</w:rPr></w:pPr><w:r><w:rPr>${rPrFont}<w:sz w:val="${szVal}"/><w:szCs w:val="${szVal}"/>${bold}</w:rPr><w:t xml:space="preserve">${text}</w:t></w:r></w:p></w:tc>`
      })
      return `<w:tr><w:trPr><w:trHeight w:val="340"/></w:trPr>${cells.join('')}</w:tr>`
    }
    let tablaDinamicaXML = ''
    if (celdasPorFila.length > 0 && celdasPorFila[0].length >= 2) {
      const gridCols = Array(NUM_COLUMNAS_RUBRICA).fill(`<w:gridCol w:w="${COL_W_PCT}" w:type="pct"/>`).join('')
      tablaDinamicaXML = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W_PCT}" w:type="pct"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>`
      celdasPorFila.forEach((fila, idx) => {
        tablaDinamicaXML += crearFilaTabla(fila, idx === 0)
      })
      tablaDinamicaXML += '</w:tbl>'
    }

    const data = {
      area,
      competencia,
      capacidad,
      standar,
      grado,
      titulosesion,
      evidencia,
      proposito,
      tabladinamica: TABLA_DINAMICA_PLACEHOLDER
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}. Colócala en la carpeta templates.` },
        { status: 404 }
      )
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })
    doc.render(data)

    // Reemplazar el párrafo que contiene {{tabladinamica}} por la tabla dinámica XML
    if (tablaDinamicaXML) {
      try {
        const zipForTabla = doc.getZip()
        const documentFile = zipForTabla.files['word/document.xml']
        if (documentFile) {
          let xmlContent = documentFile.asText()
          let idx = xmlContent.indexOf(TABLA_DINAMICA_PLACEHOLDER)
          if (idx === -1) idx = xmlContent.indexOf('{{tabladinamica}}')
          if (idx !== -1) {
            let paraStart = -1
            for (let i = idx; i >= 0; i--) {
              if (xmlContent.substring(i, i + 4) === '<w:p') {
                const ch = xmlContent.charAt(i + 4)
                if (ch === ' ' || ch === '>') { paraStart = i; break }
              }
            }
            const paraEnd = xmlContent.indexOf('</w:p>', idx)
            if (paraStart !== -1 && paraEnd !== -1 && paraEnd > paraStart) {
              xmlContent = xmlContent.substring(0, paraStart) + tablaDinamicaXML + xmlContent.substring(paraEnd + 6)
              zipForTabla.file('word/document.xml', xmlContent)
            }
          }
        }
      } catch (err) {
        console.error('Error al insertar tabla dinámica en documento rúbrica:', err)
      }
    }

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    if (!rubricaGuardada && tabladinamicaRaw) {
      try {
        await prisma.rubrica.upsert({
          where: { idsesion: sesionId },
          create: {
            idsesion: sesionId,
            area,
            competencia,
            capacidad,
            standar,
            grado,
            titulosesion,
            evidencia,
            proposito,
            tabladinamica: tabladinamicaRaw
          },
          update: {
            area,
            competencia,
            capacidad,
            standar,
            grado,
            titulosesion,
            evidencia,
            proposito,
            tabladinamica: tabladinamicaRaw
          }
        })
      } catch (err) {
        console.error('Error al guardar Rubrica:', err)
      }
    }

    const ts = Date.now()
    const baseName = `Rubrica_Analitica_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`,
        'X-Rubrica-From': rubricaGuardada ? 'saved' : 'ia'
      }
    })
  } catch (error) {
    console.error('Error en generate-document-rubrica:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar el documento de rúbrica', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
