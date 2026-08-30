import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirWordDesdeRespuestaGpt } from '@/lib/respuesta-prompt-word'
import {
  renderPromptExamenDocx,
  sesionesDesdeJsonUnidad,
  sesionesValidasParaExamen,
  type DatosPromptExamenUnidad
} from '@/lib/examen-unidad-prompt'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const MODELO_GPT = 'gpt-4o-mini'
const SYSTEM_PROMPT =
  'Eres un especialista en evaluación educativa del MINEDU (Perú). Sigue exactamente las instrucciones del usuario.'

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
    const unidadAprendizajeId =
      body.unidadAprendizajeId != null
        ? parseInt(String(body.unidadAprendizajeId), 10)
        : null
    if (unidadAprendizajeId == null || Number.isNaN(unidadAprendizajeId)) {
      return NextResponse.json(
        { error: 'unidadAprendizajeId es requerido' },
        { status: 400 }
      )
    }

    const unidad = await prisma.unidadAprendizaje.findFirst({
      where: { id: unidadAprendizajeId, idusuario: userId }
    })
    if (!unidad) {
      return NextResponse.json(
        { error: 'Unidad no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const sesiones = sesionesDesdeJsonUnidad(unidad.sesiones)
    if (!sesionesValidasParaExamen(sesiones)) {
      return NextResponse.json(
        {
          error:
            'La unidad no tiene sesiones planificadas. Genera primero la unidad de aprendizaje con sus sesiones.',
          code: 'SIN_SESIONES_UNIDAD'
        },
        { status: 422 }
      )
    }

    const datosPrompt: DatosPromptExamenUnidad = {
      area: (unidad.area ?? '').trim(),
      grado: (unidad.grado ?? '').trim(),
      ciclo: (unidad.ciclo ?? '').trim(),
      numunidad: String(unidad.unidad ?? '').trim(),
      titulounidad: (unidad.tituloUnidad ?? '').trim(),
      productounidad: (unidad.producto ?? '').trim(),
      sesiones
    }

    const { buffer: promptBuffer, promptText } =
      await renderPromptExamenDocx(datosPrompt)

    const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const requestConfig = {
      model: MODELO_GPT,
      messages: [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        { role: 'user' as const, content: promptText }
      ],
      temperature: 0.7,
      max_tokens: 16384
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

    const respuestaBuffer = await construirWordDesdeRespuestaGpt(gptResponse)
    const areaSlug = (datosPrompt.area || 'documento')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
    const unidadSlug = datosPrompt.numunidad || 'U'
    const stamp = Date.now()

    return NextResponse.json({
      vista: {
        unidadAprendizajeId,
        numunidad: datosPrompt.numunidad,
        tituloUnidad: datosPrompt.titulounidad,
        area: datosPrompt.area,
        grado: datosPrompt.grado,
        ciclo: datosPrompt.ciclo,
        producto: datosPrompt.productounidad,
        docente: (unidad.docente ?? 'EducaPlus').trim(),
        respuestaprompt: gptResponse
      },
      respuesta: {
        fileName: `RESPUESTA_IA_EXAMEN_${areaSlug}_U${unidadSlug}_${stamp}.docx`,
        docxBase64: Buffer.from(respuestaBuffer).toString('base64')
      },
      prompt: {
        fileName: `PROMPT_EXAMEN_UNIDAD_${areaSlug}_U${unidadSlug}_${stamp}.docx`,
        docxBase64: Buffer.from(promptBuffer).toString('base64')
      }
    })
  } catch (error) {
    console.error('Error en generate-examen:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el examen de la unidad',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
