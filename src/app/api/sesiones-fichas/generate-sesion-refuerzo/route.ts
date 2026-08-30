import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import mammoth from 'mammoth'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType
} from 'docx'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { respuestaPromptABloques } from '@/lib/respuesta-prompt-word'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const PROMPT_TEMPLATE = path.join(
  'sesionficharefuerzo',
  'PROMPT_SESIÓN_REFUERZO.docx'
)
const MODELO_GPT = 'gpt-5-mini'
const SYSTEM_PROMPT =
  'Eres un especialista en planificación curricular del Perú. Sigue exactamente las instrucciones del usuario.'

/** Word plano con la respuesta de GPT tal cual viene (párrafos + tablas). */
async function construirWordCrudo(tableText: string): Promise<Buffer> {
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
        (fila) =>
          new TableRow({
            children: Array.from(
              { length: numCols },
              (_, i) =>
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new TextRun({ text: fila[i] ?? '', size: 18 })]
                    })
                  ],
                  width: { size: Math.floor(100 / numCols), type: WidthType.PERCENTAGE }
                })
            )
          })
      )
      children.push(new Table({ rows: filas, width: { size: 100, type: WidthType.PERCENTAGE } }))
      children.push(new Paragraph({ children: [], spacing: { after: 120 } }))
    }
  }
  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: tableText, size: 20 })] }))
  }
  const doc = new Document({ sections: [{ properties: {}, children }] })
  return (await Packer.toBuffer(doc)) as Buffer
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY no está configurada' }, { status: 500 })
    }

    const body = await request.json()
    const sesionId = body.sesionId != null ? parseInt(String(body.sesionId), 10) : null
    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json({ error: 'sesionId es requerido' }, { status: 400 })
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
    const limpiarBr = (s: string) =>
      (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()

    const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
      ? (sesion.competenciasSeleccionadas as string[])
      : []
    const competencias = competenciasArr
      .filter((c) => c && String(c).trim())
      .map((c) => `- ${limpiarBr(c)}`)
      .join('\n')

    const capacidadesArr = Array.isArray(sesion.capacidadesSeleccionadas)
      ? (sesion.capacidadesSeleccionadas as string[])
      : []
    const capacidades = capacidadesArr
      .filter((c) => c && String(c).trim())
      .map((c) => `- ${limpiarBr(c)}`)
      .join('\n')

    const desempeniosArr = Array.isArray(sesion.desempeniosSeleccionados)
      ? (sesion.desempeniosSeleccionados as string[])
      : []
    const desempenio = desempeniosArr
      .filter((d) => d && String(d).trim())
      .map((d, i) => `${i + 1}. ${limpiarBr(d).replace(/^\s*\d+[.)]\s*/, '')}`)
      .join('\n')

    const promptData = {
      area: (sesion.area ?? u.area ?? '').trim(),
      grado: (sesion.grado ?? u.grado ?? '').trim(),
      numsesion: String(sesion.numeroSesion ?? ''),
      titulosesion: limpiarBr(sesion.titulo ?? ''),
      competencia: competencias,
      capacidades,
      desempenios: desempenio,
      criterios: limpiarBr(sesion.criterios ?? ''),
      campotematico: limpiarBr(sesion.campoTematico ?? ''),
      evidencia: limpiarBr(sesion.evidencias ?? '')
    }

    const promptPath = path.join(process.cwd(), 'templates', PROMPT_TEMPLATE)
    if (!fs.existsSync(promptPath)) {
      return NextResponse.json(
        { error: `Plantilla de prompt no encontrada: ${PROMPT_TEMPLATE}` },
        { status: 404 }
      )
    }
    const content = fs.readFileSync(promptPath, 'binary')
    const zip = new PizZip(content)
    const promptDoc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })
    promptDoc.render(promptData)
    const promptBuffer = promptDoc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })
    const extract = await mammoth.extractRawText({ buffer: promptBuffer as Buffer })
    const promptText = (extract.value || '').trim()
    if (!promptText) {
      return NextResponse.json({ error: 'No se pudo extraer el texto del prompt' }, { status: 500 })
    }

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const requestConfig = {
      model: MODELO_GPT,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
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
    if (/^```/.test(gptResponse)) {
      gptResponse = gptResponse.replace(/^```[\w]*\n?/, '').replace(/\n?```\s*$/, '').trim()
    }

    const buffer = await construirWordCrudo(gptResponse)
    const areaSlug = (promptData.area || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

    return NextResponse.json({
      vista: {
        sesionId,
        numeroSesion: sesion.numeroSesion,
        tituloSesion: limpiarBr(sesion.titulo ?? ''),
        area: promptData.area,
        grado: promptData.grado,
        ciclo: (sesion.ciclo ?? u.ciclo ?? '').trim(),
        docente: (sesion.docente ?? u.docente ?? '').trim(),
        institucion: (sesion.institucion ?? u.institucion ?? '').trim(),
        campoTematico: promptData.campotematico,
        proposito: limpiarBr(sesion.proposito ?? ''),
        competencia: competencias,
        competenciasSeleccionadas: competenciasArr,
        capacidades,
        desempenios: desempenio,
        criterios: promptData.criterios,
        evidencia: promptData.evidencia,
        respuestaprompt: gptResponse
      },
      respuesta: {
        fileName: `SESION_REFUERZO_${areaSlug}_S${sesion.numeroSesion}.docx`,
        docxBase64: Buffer.from(buffer).toString('base64')
      },
      prompt: {
        fileName: `PROMPT_SESION_REFUERZO_${areaSlug}_S${sesion.numeroSesion}.docx`,
        docxBase64: Buffer.from(promptBuffer as Buffer).toString('base64')
      }
    })
  } catch (error) {
    console.error('Error en generate-sesion-refuerzo:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar la sesión de refuerzo',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
