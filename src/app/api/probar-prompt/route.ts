import { NextRequest, NextResponse } from 'next/server'
import { Document, Packer, Paragraph, TextRun } from 'docx'
import { getUserId } from '@/lib/auth'
import {
  construirWordDesdeRespuestaGpt,
  normalizarTextoRespuestaGpt
} from '@/lib/respuesta-prompt-word'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MODELOS_PERMITIDOS = ['gpt-4o-mini', 'gpt-5-mini'] as const
type ModeloPermitido = (typeof MODELOS_PERMITIDOS)[number]
const MODELO_DEFAULT: ModeloPermitido = 'gpt-4o-mini'
const MAX_PROMPT_CHARS = 120_000

function esModeloPermitido(v: unknown): v is ModeloPermitido {
  return typeof v === 'string' && (MODELOS_PERMITIDOS as readonly string[]).includes(v)
}

function slugArchivoModelo(modelo: ModeloPermitido): string {
  return modelo.replace(/[^a-z0-9]+/gi, '_').toUpperCase()
}

/** Word con la respuesta tal cual: cada línea un párrafo, sin parseo de tablas. */
async function construirWordTextoCrudo(texto: string): Promise<Buffer> {
  const lineas = String(texto ?? '').replace(/\r\n/g, '\n').split('\n')
  const children = lineas.map(
    (linea) =>
      new Paragraph({
        children: [new TextRun({ text: linea, size: 20 })]
      })
  )
  const doc = new Document({ sections: [{ properties: {}, children }] })
  return (await Packer.toBuffer(doc)) as Buffer
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Debes iniciar sesión' }, { status: 401 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY no está configurada' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : ''
    const modelo: ModeloPermitido = esModeloPermitido(body?.modelo)
      ? body.modelo
      : MODELO_DEFAULT

    if (!prompt) {
      return NextResponse.json({ error: 'El prompt es requerido' }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_CHARS) {
      return NextResponse.json(
        { error: `El prompt es demasiado largo (máx. ${MAX_PROMPT_CHARS} caracteres)` },
        { status: 400 }
      )
    }

    const requestBody: Record<string, unknown> = {
      model: modelo,
      messages: [
        {
          role: 'system',
          content:
            'Si tu respuesta incluye información tabular, usa SIEMPRE tablas markdown con pipes (|). Ejemplo:\n| Columna 1 | Columna 2 |\n| --- | --- |\n| valor | valor |\nNo uses HTML ni bloques de código alrededor de las tablas.'
        },
        { role: 'user', content: prompt }
      ]
    }

    // gpt-5-mini usa max_completion_tokens; gpt-4o-mini usa max_tokens + temperature
    if (modelo === 'gpt-5-mini') {
      requestBody.top_p = 1
      requestBody.max_completion_tokens = 16384
    } else {
      requestBody.temperature = 0.7
      requestBody.max_tokens = 16384
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.json().catch(() => ({} as { error?: { message?: string; code?: string } }))
      const detalle =
        errorData?.error?.message ||
        `${openaiResponse.status} ${openaiResponse.statusText}`
      const code = errorData?.error?.code ? ` (${errorData.error.code})` : ''
      return NextResponse.json(
        { error: `OpenAI${code}: ${detalle}` },
        { status: openaiResponse.status === 429 ? 429 : 502 }
      )
    }

    const data = await openaiResponse.json()
    const respuestaCruda = data.choices?.[0]?.message?.content?.trim() || ''
    const respuesta = normalizarTextoRespuestaGpt(respuestaCruda)

    if (!respuesta) {
      return NextResponse.json(
        { error: 'OpenAI no devolvió contenido' },
        { status: 502 }
      )
    }

    // gpt-4o-mini: Word con la respuesta cruda tal cual; gpt-5-mini: con tablas formateadas
    const wordBuffer =
      modelo === 'gpt-4o-mini'
        ? await construirWordTextoCrudo(respuestaCruda)
        : await construirWordDesdeRespuestaGpt(respuesta)
    const fileName = `RESPUESTA_${slugArchivoModelo(modelo)}_${Date.now()}.docx`

    return NextResponse.json({
      modelo,
      respuesta,
      usage: data.usage ?? null,
      word: {
        docxBase64: Buffer.from(wordBuffer).toString('base64'),
        fileName
      }
    })
  } catch (error) {
    console.error('[probar-prompt]', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al enviar el prompt',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
