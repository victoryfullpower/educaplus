import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  consumirCreditoRegeneracion,
  tieneSuscripcionActivaPara,
  validarRegeneracionIA
} from '@/lib/acceso-usuario'
import {
  CODE_PDF_TRIAL_NO_DISPONIBLE,
  MSG_PDF_TRIAL_NO_DISPONIBLE,
  prepararEntregaDocumento
} from '@/lib/entrega-documento-trial'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

/** Prompt IA */
const PROMPT_TEMPLATE = 'Prompt_Rubrica.docx'
/** Documento descargable */
const TEMPLATE_NAME = 'RÚBRICA ANALITICA.docx'
const TABLA_DINAMICA_PLACEHOLDER = 'TABLA_DINAMICA_RUBRICA_PLACEHOLDER'
const NUM_COLUMNAS_RUBRICA = 6
const MODELO_GPT = 'gpt-5-mini'

const SYSTEM_PROMPT_RUBRICA = `Responde ÚNICAMENTE con una tabla de texto donde cada línea es una fila y las columnas se separan con el carácter | (pipe).
Primera línea (encabezado): CRITERIOS|DESTACADO AD|ESPERADO A|EN PROCESO B|EN INICIO C|DESTACADO AD
Luego una línea por cada criterio con exactamente 6 columnas separadas por |:
1) Texto del criterio
2) Descripción nivel DESTACADO AD
3) Descripción nivel ESPERADO A
4) Descripción nivel EN PROCESO B
5) Descripción nivel EN INICIO C
6) Repetir el mismo texto del criterio (columna 1)
No incluyas explicaciones antes ni después de la tabla. Solo las líneas con |.`

function limpiarBr(s: string): string {
  return (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
}

function sinPrefijoProposito(s: string): string {
  return (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()
}

function parsearTablaDinamica(texto: string): string[][] {
  if (!texto.trim()) return []
  const lineas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const sepPipe = lineas.some((l) => l.includes('|'))
  const celdas: string[][] = sepPipe
    ? lineas.map((l) => l.split('|').map((c) => c.trim()))
    : lineas.map((l) => [l])
  celdas.forEach((f) => {
    while (f.length < NUM_COLUMNAS_RUBRICA) f.push('')
    if (f.length > NUM_COLUMNAS_RUBRICA) f.splice(NUM_COLUMNAS_RUBRICA)
  })
  return celdas
}

function datosPromptDesdeSesion(sesion: {
  titulo: string | null
  area: string | null
  grado: string | null
  proposito: string | null
  evidencias: string | null
  standar: string | null
  criterios: string | null
  competenciasSeleccionadas: unknown
  capacidadesSeleccionadas: unknown
  unidadAprendizaje: { area: string | null; grado: string | null }
}): Record<string, string> {
  const u = sesion.unidadAprendizaje
  const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
    ? (sesion.competenciasSeleccionadas as string[])
    : []
  const competencia =
    competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''
  const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
    ? (sesion.capacidadesSeleccionadas as string[])
    : []
  const capacidades = capacidadesArr
    .filter((c) => c && String(c).trim())
    .map((c) => `- ${limpiarBr(c)}`)
    .join('\n')

  return {
    area: (sesion.area ?? u.area ?? '').trim(),
    grado: (sesion.grado ?? u.grado ?? '').trim(),
    titulo: (sesion.titulo ?? '').trim(),
    competencia,
    capacidades,
    evidencia: limpiarBr(sesion.evidencias ?? ''),
    proposito: sinPrefijoProposito(sesion.proposito ?? ''),
    standar: (sesion.standar ?? '').trim(),
    criterios: limpiarBr(sesion.criterios ?? '')
  }
}

async function generarTablaConGpt(promptText: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no está configurada')
  }
  const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const requestConfig = {
    model: MODELO_GPT,
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT_RUBRICA },
      { role: 'user' as const, content: promptText }
    ],
    top_p: 1,
    max_completion_tokens: 16384
  }
  let completion = await openaiClient.chat.completions.create(requestConfig)
  let gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
  if (!gptResponse) {
    completion = await openaiClient.chat.completions.create(requestConfig)
    gptResponse = (completion.choices?.[0]?.message?.content || '').trim()
  }
  if (!gptResponse) {
    throw new Error('La IA no generó ninguna respuesta para la rúbrica')
  }
  return gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()
}

function construirTablaXml(celdasPorFila: string[][]): string {
  if (celdasPorFila.length === 0 || celdasPorFila[0].length < 2) return ''

  const escaparXML = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

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

  const gridCols = Array(NUM_COLUMNAS_RUBRICA)
    .fill(`<w:gridCol w:w="${COL_W_PCT}" w:type="pct"/>`)
    .join('')
  let xml = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="${TBL_W_PCT}" w:type="pct"/><w:tblBorders><w:top w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:left w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:bottom w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:right w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideH w:val="double" w:sz="4" w:space="0" w:color="00B050"/><w:insideV w:val="double" w:sz="4" w:space="0" w:color="00B050"/></w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${gridCols}</w:tblGrid>`
  celdasPorFila.forEach((fila, idx) => {
    xml += crearFilaTabla(fila, idx === 0)
  })
  xml += '</w:tbl>'
  return xml
}

/**
 * Genera rúbrica (Prompt_Rubrica → GPT → guarda BD) y descarga RÚBRICA ANALITICA.docx.
 * Si ya existe y forceRegenerate=false, solo descarga desde BD.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const sesionId = body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    const forceRegenerate = !!body.forceRegenerate

    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json({ error: 'sesionId es requerido' }, { status: 400 })
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
    const tieneSuscripcion = await tieneSuscripcionActivaPara(
      userId,
      u.areaId,
      u.gradoId
    )

    let area: string
    let grado: string
    let competencia: string
    let capacidad: string
    let standar: string
    let titulosesion: string
    let evidencia: string
    let proposito: string
    let tabladinamicaRaw = ''
    let origen: 'saved' | 'generated' = 'saved'

    const rubricaGuardada = sesion.rubrica
    const debeGenerar =
      forceRegenerate || !rubricaGuardada?.tabladinamica?.trim()

    if (debeGenerar) {
      if (forceRegenerate && rubricaGuardada) {
        const regen = await validarRegeneracionIA(userId, u.areaId, u.gradoId)
        if (!regen.ok) {
          return NextResponse.json(
            { error: regen.error, code: regen.code },
            { status: 403 }
          )
        }
        await consumirCreditoRegeneracion(regen.suscripcionId)
      }

      const promptData = datosPromptDesdeSesion(sesion)
      const promptPath = path.join(process.cwd(), 'templates', PROMPT_TEMPLATE)
      if (!fs.existsSync(promptPath)) {
        return NextResponse.json(
          { error: `Plantilla de prompt no encontrada: ${PROMPT_TEMPLATE}` },
          { status: 404 }
        )
      }

      const promptContent = fs.readFileSync(promptPath, 'binary')
      const promptZip = new PizZip(promptContent)
      const promptDoc = new Docxtemplater(promptZip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{{', end: '}}' },
        nullGetter: () => ''
      })
      promptDoc.render(promptData)
      const promptBuffer = promptDoc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      }) as Buffer

      const extractResult = await mammoth.extractRawText({ buffer: promptBuffer })
      const promptText = (extractResult.value || '').trim()
      if (!promptText) {
        return NextResponse.json(
          { error: 'No se pudo extraer el texto del prompt de rúbrica' },
          { status: 500 }
        )
      }

      tabladinamicaRaw = await generarTablaConGpt(promptText)
      area = promptData.area
      grado = promptData.grado
      competencia = promptData.competencia
      capacidad = promptData.capacidades
      standar = promptData.standar
      titulosesion = promptData.titulo
      evidencia = promptData.evidencia
      proposito = promptData.proposito
      origen = 'generated'

      const rubricaFields = {
        area,
        grado,
        competencia,
        capacidad,
        standar,
        titulosesion,
        evidencia,
        proposito,
        tabladinamica: tabladinamicaRaw
      }

      await prisma.rubrica.upsert({
        where: { idsesion: sesionId },
        create: { idsesion: sesionId, ...rubricaFields },
        update: rubricaFields
      })
    } else {
      area = (rubricaGuardada!.area ?? '').trim()
      grado = (rubricaGuardada!.grado ?? '').trim()
      competencia = (rubricaGuardada!.competencia ?? '').trim()
      capacidad = (rubricaGuardada!.capacidad ?? '').trim()
      standar = (rubricaGuardada!.standar ?? '').trim()
      titulosesion = (rubricaGuardada!.titulosesion ?? '').trim()
      evidencia = (rubricaGuardada!.evidencia ?? '').trim()
      proposito = (rubricaGuardada!.proposito ?? '').trim()
      tabladinamicaRaw = (rubricaGuardada!.tabladinamica ?? '').trim()
    }

    const celdasPorFila = parsearTablaDinamica(tabladinamicaRaw)
    const tablaDinamicaXML = construirTablaXml(celdasPorFila)

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
        {
          error: `Plantilla no encontrada: ${TEMPLATE_NAME}. Colócala en la carpeta templates.`
        },
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
                if (ch === ' ' || ch === '>') {
                  paraStart = i
                  break
                }
              }
            }
            const paraEnd = xmlContent.indexOf('</w:p>', idx)
            if (paraStart !== -1 && paraEnd !== -1 && paraEnd > paraStart) {
              xmlContent =
                xmlContent.substring(0, paraStart) +
                tablaDinamicaXML +
                xmlContent.substring(paraEnd + 6)
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

    const ts = Date.now()
    const baseName =
      `Rubrica_Analitica_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(
        /[^a-zA-Z0-9_.-]/g,
        ''
      )
    const fileNameDocx = `${baseName}.docx`

    let entrega
    try {
      entrega = await prepararEntregaDocumento(
        buffer as Buffer,
        fileNameDocx,
        !tieneSuscripcion
      )
    } catch (pdfError) {
      console.error('Error al generar PDF protegido (modo prueba, rúbrica):', pdfError)
      return NextResponse.json(
        { error: MSG_PDF_TRIAL_NO_DISPONIBLE, code: CODE_PDF_TRIAL_NO_DISPONIBLE },
        { status: 503 }
      )
    }

    return new NextResponse(Uint8Array.from(entrega.buffer), {
      status: 200,
      headers: {
        'Content-Type': entrega.contentType,
        'Content-Disposition': `attachment; filename="${entrega.fileName}"`,
        'X-Rubrica-From': origen,
        ...entrega.extraHeaders
      }
    })
  } catch (error) {
    console.error('Error en generate-document-rubrica:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el documento de rúbrica',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
