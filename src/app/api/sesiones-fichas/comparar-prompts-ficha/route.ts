import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import mammoth from 'mammoth'
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
export const maxDuration = 300

const MODELO_GPT = 'gpt-5-mini'
const PROMPTS_DIR = path.join(process.cwd(), 'prompts', 'fichaaprendizaje')
const SYSTEM_PROMPT =
  'Eres un especialista en planificación curricular del Perú. Sigue exactamente las instrucciones del usuario y responde solo con la ficha solicitada.'

/** Construye un Word plano con la respuesta de GPT tal cual viene (párrafos + tablas). */
function construirWordCrudo(tableText: string): Promise<Buffer> {
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
  return Packer.toBuffer(doc) as Promise<Buffer>
}

/** Rellena las variables {{...}} y los marcadores [Colocar ...] del prompt con los datos de la sesión. */
function rellenarPrompt(texto: string, d: Record<string, string>): string {
  let out = texto
  const llaves: Record<string, string> = {
    area: d.area,
    grado: d.grado,
    titulosesion: d.titulosesion,
    proposito: d.proposito,
    'campo tematico': d.campotematico,
    campotematico: d.campotematico,
    competencia: d.competencia,
    procesosdidacticos: d.procesosdidacticos,
    evidencia: d.evidencia,
    criterios: d.criterios,
    duracion: d.duracion
  }
  for (const [clave, valor] of Object.entries(llaves)) {
    const re = new RegExp(`\\{\\{\\s*${clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\}\\}`, 'gi')
    out = out.replace(re, valor || '')
  }
  const corchetes: Array<[RegExp, string]> = [
    [/\[\s*Colocar\s+área\s*\]/gi, d.area],
    [/\[\s*Colocar\s+grado\s*\]/gi, d.grado],
    [/\[\s*Colocar\s+t[ií]tulo\s*\]/gi, d.titulosesion],
    [/\[\s*Colocar\s+prop[oó]sito\s*\]/gi, d.proposito],
    [/\[\s*campo\s+tematico\s*\]/gi, d.campotematico],
    [/\[\s*Colocar\s+competencia[^\]]*\]/gi, d.competencia],
    [/\[\s*procesosdidacticos\s*\]/gi, d.procesosdidacticos],
    [/\[\s*Colocar\s+evidencia[^\]]*\]/gi, d.evidencia],
    [/\[\s*Colocar\s+Criterios\s*\]/gi, d.criterios],
    [/\[\s*Tiempo\s+real\s+de\s+la\s+sesi[oó]n\s*\]/gi, d.duracion]
  ]
  for (const [re, valor] of corchetes) {
    out = out.replace(re, valor || '')
  }
  return out
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
    const sinPrefijoProposito = (s: string) => (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()

    const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
      ? (sesion.competenciasSeleccionadas as string[])
      : []
    const competencia = competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : ''

    const area = (sesion.area ?? u.area ?? '').trim()
    const grado = (sesion.grado ?? u.grado ?? '').trim()
    const duracionRaw = (sesion.duracion ?? u.duracion ?? '').trim()

    // Procesos didácticos por área (igual que en la generación de sesión)
    let procesosdidacticos = ''
    const areaIdNum = sesion.areaId ? parseInt(String(sesion.areaId), 10) : 0
    if (areaIdNum > 0) {
      try {
        const procesos = await prisma.procesoDidactico.findMany({
          where: { idarea: areaIdNum },
          orderBy: { idproceso: 'asc' }
        })
        const byCompetencia = new Map<string, string[]>()
        for (const p of procesos) {
          const comps = Array.isArray(p.competenciaProceso)
            ? (p.competenciaProceso as string[])
            : typeof p.competenciaProceso === 'string'
              ? [p.competenciaProceso]
              : []
          const desc = (p.descripcion || '').trim()
          for (const c of comps) {
            const comp = (typeof c === 'string' ? c : String(c)).trim()
            if (!comp) continue
            if (!byCompetencia.has(comp)) byCompetencia.set(comp, [])
            const list = byCompetencia.get(comp)!
            if (!list.includes(desc)) list.push(desc)
          }
        }
        const lineas: string[] = []
        for (const [comp, descripciones] of byCompetencia) {
          lineas.push(`• ${comp}`)
          for (const dDesc of descripciones) lineas.push(`  ◦ ${dDesc}`)
        }
        procesosdidacticos = lineas.join('\n')
      } catch (e) {
        console.error('[comparar-prompts-ficha] Error al cargar procesos didácticos:', e)
      }
    }

    const datos: Record<string, string> = {
      area,
      grado,
      titulosesion: (sesion.titulo ?? '').trim(),
      proposito: sinPrefijoProposito(sesion.proposito ?? ''),
      campotematico: limpiarBr(sesion.campoTematico ?? ''),
      competencia,
      procesosdidacticos,
      evidencia: limpiarBr(sesion.evidencias ?? ''),
      criterios: limpiarBr(sesion.criterios ?? ''),
      duracion: duracionRaw ? `${duracionRaw} minutos` : ''
    }

    if (!fs.existsSync(PROMPTS_DIR)) {
      return NextResponse.json(
        { error: `No se encontró la carpeta de prompts: ${PROMPTS_DIR}` },
        { status: 404 }
      )
    }
    const archivos = fs
      .readdirSync(PROMPTS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.docx') && !f.startsWith('~$'))
      .sort((a, b) => {
        const na = parseInt((a.match(/opci[oó]n\s*(\d+)/i) || [])[1] || '99', 10)
        const nb = parseInt((b.match(/opci[oó]n\s*(\d+)/i) || [])[1] || '99', 10)
        return na - nb
      })
    if (archivos.length === 0) {
      return NextResponse.json(
        { error: 'No hay prompts .docx en la carpeta de prompts de ficha' },
        { status: 404 }
      )
    }

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const areaSlug = (area || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

    const resultados = await Promise.all(
      archivos.map(async (archivo) => {
        const numOpcion = (archivo.match(/opci[oó]n\s*(\d+)/i) || [])[1] || ''
        const ruta = path.join(PROMPTS_DIR, archivo)
        const wordBuffer = fs.readFileSync(ruta)
        const extract = await mammoth.extractRawText({ buffer: wordBuffer })
        const promptText = rellenarPrompt((extract.value || '').trim(), datos)

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
        if (!gptResponse) gptResponse = '(La IA no devolvió respuesta para este prompt)'

        const buffer = await construirWordCrudo(gptResponse)
        const fileNameDocx = `FICHA_GPT_OPCION_${numOpcion || '0'}_${areaSlug}_S${sesion.numeroSesion}.docx`
        return {
          opcion: numOpcion || archivo,
          archivo,
          fileNameDocx,
          docxBase64: Buffer.from(buffer).toString('base64')
        }
      })
    )

    return NextResponse.json({ resultados })
  } catch (error) {
    console.error('Error en comparar-prompts-ficha:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar la comparación de prompts de ficha',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
