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

const TEMPLATE_NAME = 'PROMT_Ficha.docx'

/** Solo se acepta gpt-5-mini para respuesta del prompt ficha */
const MODELO_OBLIGATORIO = 'gpt-5-mini'

/**
 * Respuesta prompt FICHA DE APRENDIZAJE (no sesión).
 * Genera el Word del prompt con PROMT_Ficha.docx rellenado con datos de la sesión guardada,
 * extrae el texto, lo envía a la IA con instrucciones propias de ficha (Antes/Durante/Después expresión oral),
 * y devuelve la respuesta en Word como texto ordenado (párrafos) y opcional imagen de vista previa.
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
    const withImage = !!body.includePreviewImage
    const systemContent = typeof body.systemContent === 'string' && body.systemContent.trim()
      ? body.systemContent.trim()
      : 'Responde de forma clara y estructurada.'

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
    const capacidad = capacidadesArr
      .filter((c: string) => c && String(c).trim())
      .map((c: string) => `- ${limpiarBr(c)}`)
      .join('\n')

    const area = (sesion.area ?? u.area ?? '').trim()
    const grado = (sesion.grado ?? u.grado ?? '').trim()
    const duracionRaw = (sesion.duracion ?? u.duracion ?? '').trim()
    const duracion = duracionRaw ? `${duracionRaw} minutos` : ''

    const data = {
      area,
      grado,
      titulosesion: (sesion.titulo ?? '').trim(),
      proposito: sinPrefijoProposito(sesion.proposito ?? ''),
      competencia,
      capacidad,
      evidencia: limpiarBr(sesion.evidencias ?? ''),
      criterios: limpiarBr(sesion.criterios ?? ''),
      duracion,
      desarrolloantes: (sesion.desarrolloantes ?? '').trim(),
      desarrollodurante: (sesion.desarrollodurante ?? '').trim(),
      desarrollodespues: (sesion.desarrollodespues ?? '').trim()
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

    type BloqueParrafo = { tipo: 'parrafo'; texto: string }
    type BloqueTabla = { tipo: 'tabla'; filas: string[][] }
    type Bloque = BloqueParrafo | BloqueTabla

    const esLineaSeparadorTabla = (linea: string) => {
      if (!linea.includes('|')) return false
      const celdas = parsearFilasTabla(linea)
      return celdas.length >= 2 && celdas.every((c: string) => /^[\s\-:]*$/.test(c))
    }
    const parsearFilasTabla = (linea: string): string[] => {
      const partes = linea.split('|').map((c: string) => c.trim())
      if (partes.length <= 1) return []
      const sinExtremos = partes[0] === '' && partes[partes.length - 1] === '' ? partes.slice(1, -1) : partes
      return sinExtremos.filter(() => true)
    }
    const esFilaTabla = (linea: string): boolean => {
      if (!linea.includes('|')) return false
      const celdas = parsearFilasTabla(linea)
      return celdas.length >= 2
    }

    const bloques: Bloque[] = []
    let filasAcum: string[][] = []

    const flushTabla = () => {
      if (filasAcum.length > 0) {
        bloques.push({ tipo: 'tabla', filas: filasAcum })
        filasAcum = []
      }
    }

    for (const linea of lineas) {
      if (esLineaSeparadorTabla(linea)) continue
      if (esFilaTabla(linea)) {
        const celdas = parsearFilasTabla(linea)
        filasAcum.push(celdas)
      } else {
        flushTabla()
        bloques.push({ tipo: 'parrafo', texto: linea })
      }
    }
    flushTabla()

    const fontSize = 24
    const fontSizeTabla = 20

    const crearCelda = (texto: string, header: boolean, pctWidth: number) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: texto || ' ',
                size: fontSizeTabla,
                color: '000000',
                bold: header
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 60, before: 40 }
          })
        ],
        width: { size: pctWidth, type: WidthType.PERCENTAGE }
      })

    const children: (Paragraph | Table)[] = []
    for (const bloque of bloques) {
      if (bloque.tipo === 'parrafo') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: bloque.texto || ' ',
                size: fontSize,
                color: '000000'
              })
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 120, before: 0 }
          })
        )
      } else {
        const numCols = Math.max(1, ...bloque.filas.map((f: string[]) => f.length))
        bloque.filas.forEach((f: string[]) => {
          while (f.length < numCols) f.push('')
        })
        const anchoCol = Math.floor(100 / numCols)
        const filasTabla = bloque.filas.map((fila: string[], idx: number) =>
          new TableRow({
            children: fila.map((celda: string) => crearCelda(celda, idx === 0, anchoCol))
          })
        )
        children.push(
          new Table({
            rows: filasTabla,
            width: { size: 100, type: WidthType.PERCENTAGE },
            columnWidths: Array(numCols).fill(Math.floor(9600 / numCols)),
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
        )
      }
    }

    const gptOutputDocument = new Document({
      sections: [{
        properties: {},
        children
      }]
    })

    const buffer = await Packer.toBuffer(gptOutputDocument)
    const ts = Date.now()
    const baseName = `Respuesta_Prompt_Ficha_${(area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
    const fileNameDocx = `${baseName}.docx`

    if (withImage) {
      const lineHeight = 18
      const fontSizeImg = 12
      const pad = 24
      const maxW = 600
      const totalH = lineas.length * lineHeight + pad * 2
      const escapeXml = (s: string) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
      let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxW + pad * 2}" height="${totalH}" viewBox="0 0 ${maxW + pad * 2} ${totalH}">
  <style>text { font-family: Arial, sans-serif; font-size: ${fontSizeImg}px; fill: #000; }</style>
  <g transform="translate(${pad},${pad})">
`
      lineas.forEach((linea: string, i: number) => {
        const y = i * lineHeight + fontSizeImg
        const text = escapeXml(linea || ' ').slice(0, 200)
        svg += `    <text x="0" y="${y}">${text}</text>\n`
      })
      svg += `  </g>\n</svg>`
      const docxBase64 = Buffer.from(buffer).toString('base64')
      const imageBase64 = Buffer.from(svg, 'utf-8').toString('base64')
      const fileNameImage = `${baseName}_vista_previa.svg`
      return NextResponse.json({
        docxBase64,
        imageBase64,
        fileNameDocx,
        fileNameImage,
        mimeImage: 'image/svg+xml',
        tableText: gptResponse
      })
    }

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileNameDocx}"`
      }
    })
  } catch (error) {
    console.error('Error en respuesta-prompt-ficha:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error al generar la respuesta del prompt', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    )
  }
}
