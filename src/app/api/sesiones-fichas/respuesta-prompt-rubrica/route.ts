import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import mammoth from 'mammoth'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'

export const dynamic = 'force-dynamic'

const TEMPLATE_NAME = 'PROMPT_Rubrica.docx'

/** Modelo obligatorio para respuesta del prompt rúbrica */
const MODELO_OBLIGATORIO = 'gpt-5-mini'

/**
 * Respuesta prompt RÚBRICA.
 * Genera el Word del prompt con PROMPT_Rubrica.docx rellenado con datos de la sesión,
 * extrae el texto, lo envía a la IA (gpt-5-mini) y devuelve la respuesta en Word.
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const sesionId = body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    const systemContent = typeof body.systemContent === 'string' && body.systemContent.trim()
      ? body.systemContent.trim()
      : `Responde ÚNICAMENTE con una tabla de texto donde cada línea es una fila y las columnas se separan con el carácter | (pipe).
Primera línea (encabezado): CRITERIOS|DESTACADO AD|ESPERADO A|EN PROCESO B|EN INICIO C|DESTACADO AD
Luego una línea por cada criterio con exactamente 6 columnas separadas por |:
1) Texto del criterio
2) Descripción nivel DESTACADO AD
3) Descripción nivel ESPERADO A
4) Descripción nivel EN PROCESO B
5) Descripción nivel EN INICIO C
6) Repetir el mismo texto del criterio (columna 1)
No incluyas explicaciones antes ni después de la tabla. Solo las líneas con |.`

    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json(
        { error: 'sesionId es requerido' },
        { status: 400 }
      )
    }

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true }
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

    const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
      ? sesion.competenciasSeleccionadas as string[]
      : []
    const competencia = competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''

    const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
      ? sesion.capacidadesSeleccionadas as string[]
      : []
    const capacidades = capacidadesArr
      .filter((c: string) => c && String(c).trim())
      .map((c: string) => `- ${limpiarBr(c)}`)
      .join('\n')

    const area = (sesion.area ?? u.area ?? '').trim()
    const grado = (sesion.grado ?? u.grado ?? '').trim()

    const data = {
      area,
      grado,
      titulo: (sesion.titulo ?? '').trim(),
      competencia,
      capacidades,
      evidencia: limpiarBr(sesion.evidencias ?? ''),
      proposito: sinPrefijoProposito(sesion.proposito ?? ''),
      standar: (sesion.standar ?? '').trim(),
      criterios: limpiarBr(sesion.criterios ?? '')
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}` },
        { status: 404 }
      )
    }

    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    const templateDoc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })
    templateDoc.render(data)
    const docxBuffer = templateDoc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    const extractResult = await mammoth.extractRawText({ buffer: docxBuffer as Buffer })
    const promptText = (extractResult.value || '').trim()
    if (!promptText) {
      return NextResponse.json(
        { error: 'No se pudo extraer texto del prompt generado' },
        { status: 500 }
      )
    }

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const requestConfig = {
      model: MODELO_OBLIGATORIO,
      messages: [
        { role: 'system' as const, content: systemContent },
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
      return NextResponse.json(
        { error: 'La IA no generó ninguna respuesta. Prueba de nuevo en un momento.' },
        { status: 500 }
      )
    }

    const textoLimpio = gptResponse.replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n')
    const lineas = textoLimpio.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0)
    if (lineas.length === 0) lineas.push('(Sin contenido)')

    const NUM_COLUMNAS_RUBRICA = 6
    const fontSize = 22
    const sepPipe = lineas.some((l: string) => l.includes('|'))
    const celdasPorFila: string[][] = sepPipe
      ? lineas.map((l: string) => l.split('|').map((c: string) => c.trim()))
      : lineas.map((l: string) => [l])

    celdasPorFila.forEach((f: string[]) => {
      while (f.length < NUM_COLUMNAS_RUBRICA) f.push('')
      if (f.length > NUM_COLUMNAS_RUBRICA) f.splice(NUM_COLUMNAS_RUBRICA)
    })

    const usarTabla = sepPipe && celdasPorFila.length > 0 && celdasPorFila[0].length >= 2

    const crearCelda = (texto: string, header = false) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: texto || ' ',
                size: fontSize,
                color: '000000',
                bold: header
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 80, before: 60 }
          })
        ],
        width: { size: Math.floor(100 / NUM_COLUMNAS_RUBRICA), type: WidthType.PERCENTAGE }
      })

    const filasTabla: TableRow[] = celdasPorFila.map((fila: string[], idx: number) =>
      new TableRow({
        children: fila.map((celda: string) => crearCelda(celda, idx === 0))
      })
    )

    const tablaRespuesta = new Table({
      rows: filasTabla,
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: Array(NUM_COLUMNAS_RUBRICA).fill(Math.floor(9600 / NUM_COLUMNAS_RUBRICA)),
      margins: { top: 80, bottom: 80, left: 80, right: 80 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: '333333' }
      }
    })

    const gptOutputDocument = new Document({
      sections: [{
        properties: {},
        children: usarTabla ? [tablaRespuesta] : lineas.map((linea: string) =>
          new Paragraph({
            children: [
              new TextRun({
                text: linea || ' ',
                size: fontSize,
                color: '000000'
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 120, before: 0 }
          })
        )
      }]
    })

    const buffer = await Packer.toBuffer(gptOutputDocument)
    const ts = Date.now()
    const baseName = `Respuesta_Prompt_Rubrica_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`
      }
    })
  } catch (error) {
    console.error('Error en respuesta-prompt-rubrica:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar la respuesta del prompt rúbrica', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
