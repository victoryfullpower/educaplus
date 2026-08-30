import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { construirWordDesdeRespuestaGpt } from '@/lib/respuesta-prompt-word'
import {
  calcularParUnidades,
  renderPromptConclusionesDocx,
  sesionesDesdeJsonUnidad,
  type DatosPromptConclusiones
} from '@/lib/conclusiones-descriptivas-prompt'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const MODELO_GPT = 'gpt-4o-mini'
const SYSTEM_PROMPT =
  'Eres un especialista en evaluación de los aprendizajes y planificación curricular del MINEDU (Perú). Sigue exactamente las instrucciones del usuario.'

type CompetenciaConEstandar = {
  numero: number
  competencia: string
  estandar: string
}

/**
 * Devuelve las competencias oficiales (no transversales) del área y grado para
 * el nivel Secundaria, con su estándar (unido desde la BD) por competencia.
 */
async function obtenerCompetenciasArea(
  areaId: string | null | undefined,
  gradoId: string | null | undefined
): Promise<{ texto: string; estandares: CompetenciaConEstandar[] }> {
  const idarea = parseInt(String(areaId ?? ''), 10)
  const idgrado = parseInt(String(gradoId ?? ''), 10)
  if (Number.isNaN(idarea) || Number.isNaN(idgrado)) {
    return { texto: '', estandares: [] }
  }

  const nivelSecundaria = await prisma.nivel.findFirst({
    where: { descripcion: { contains: 'Secundaria', mode: 'insensitive' } }
  })

  const whereBase = { idarea, idgrado, transversal: false }
  const include = { estandares: { orderBy: { ordenamiento: 'asc' as const } } }
  let competencias = await prisma.competencia.findMany({
    where: nivelSecundaria
      ? { ...whereBase, idnivel: nivelSecundaria.id }
      : whereBase,
    orderBy: { numeroCompetencia: 'asc' },
    include
  })

  // Fallback: si con el filtro de nivel no hay resultados, buscar sin nivel.
  if (competencias.length === 0) {
    competencias = await prisma.competencia.findMany({
      where: whereBase,
      orderBy: { numeroCompetencia: 'asc' },
      include
    })
  }

  const estandares: CompetenciaConEstandar[] = competencias.map((c, i) => ({
    numero: c.numeroCompetencia || i + 1,
    competencia: c.descripcion.trim(),
    estandar: (c.estandares ?? [])
      .map((e) => e.descripcion.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  }))

  const texto = estandares
    .map((c) => `${c.numero}. ${c.competencia}`)
    .join('\n')

  return { texto, estandares }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      )
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

    const numeroUnidad = parseInt(String(unidad.unidad ?? '1'), 10) || 1
    const { numunidad1, numunidad2 } = calcularParUnidades(numeroUnidad)

    // Buscar las dos unidades del par (mismo plan anual o mismo año/área/grado).
    const hermanas = await prisma.unidadAprendizaje.findMany({
      where: {
        idusuario: userId,
        unidad: { in: [String(numunidad1), String(numunidad2)] },
        ...(unidad.idplananual != null
          ? { idplananual: unidad.idplananual }
          : {
              anio: unidad.anio,
              areaId: unidad.areaId,
              gradoId: unidad.gradoId
            })
      }
    })

    const unidad1 = hermanas.find((u) => u.unidad === String(numunidad1))
    const unidad2 = hermanas.find((u) => u.unidad === String(numunidad2))

    const sesionesUnidad1 = unidad1
      ? sesionesDesdeJsonUnidad(unidad1.sesiones)
      : sesionesDesdeJsonUnidad(unidad.sesiones)
    const sesionesUnidad2 = unidad2
      ? sesionesDesdeJsonUnidad(unidad2.sesiones)
      : []

    const referencia = unidad1 ?? unidad

    const { texto: competenciasTexto, estandares } = await obtenerCompetenciasArea(
      referencia.areaId ?? unidad.areaId,
      referencia.gradoId ?? unidad.gradoId
    )

    const datosPrompt: DatosPromptConclusiones = {
      area: (referencia.area ?? unidad.area ?? '').trim(),
      grado: (referencia.grado ?? unidad.grado ?? '').trim(),
      ciclo: (referencia.ciclo ?? unidad.ciclo ?? '').trim(),
      numunidad1: String(numunidad1),
      numunidad2: String(numunidad2),
      competencias: competenciasTexto,
      sesionesUnidad1,
      sesionesUnidad2
    }

    const { buffer: promptBuffer, promptText } =
      await renderPromptConclusionesDocx(datosPrompt)

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
      gptResponse = gptResponse
        .replace(/^```[\w]*\n?/, '')
        .replace(/\n?```\s*$/, '')
        .trim()
    }

    const respuestaBuffer = await construirWordDesdeRespuestaGpt(gptResponse)
    const areaSlug = (datosPrompt.area || 'documento')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
    const stamp = Date.now()

    return NextResponse.json({
      numunidad1: datosPrompt.numunidad1,
      numunidad2: datosPrompt.numunidad2,
      vista: {
        unidadAprendizajeId,
        numunidad1: datosPrompt.numunidad1,
        numunidad2: datosPrompt.numunidad2,
        area: datosPrompt.area,
        grado: datosPrompt.grado,
        ciclo: datosPrompt.ciclo,
        estandares: estandares.map((e) => ({
          competencia: e.competencia,
          estandar: e.estandar
        })),
        respuestaprompt: gptResponse
      },
      respuesta: {
        fileName: `CONCLUSIONES_DESCRIPTIVAS_${areaSlug}_U${numunidad1}-${numunidad2}_${stamp}.docx`,
        docxBase64: Buffer.from(respuestaBuffer).toString('base64')
      },
      prompt: {
        fileName: `PROMPT_CONCLUSIONES_${areaSlug}_U${numunidad1}-${numunidad2}_${stamp}.docx`,
        docxBase64: Buffer.from(promptBuffer).toString('base64')
      }
    })
  } catch (error) {
    console.error('Error en generate-conclusiones:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar las conclusiones descriptivas',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
