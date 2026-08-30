import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import OpenAI from 'openai'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  consumirCreditoRegeneracion,
  tieneSuscripcionActivaPara,
  validarRegeneracionIA
} from '@/lib/acceso-usuario'
import { MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN } from '@/lib/acceso-trial'
import {
  bloquesRespuestaAWordXml,
  construirWordDesdeRespuestaGpt,
  insertarXmlEnPlaceholder,
  respuestaPromptABloques
} from '@/lib/respuesta-prompt-word'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

const TEMPLATE_NAME = 'SOLUCIONARIO DE FICHA.docx'
const RESPUESTAPROMPT_PLACEHOLDER = 'RESPUESTAPROMPT_SOLUCIONARIO_PLACEHOLDER'
const MODELO_GPT = 'gpt-5-mini'

/**
 * Genera el Word del solucionario de ficha desde BD (creado al generar la sesión).
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
      include: { unidadAprendizaje: true, solucionario: true, fichaAprendizaje: true }
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
    if (!tieneSuscripcion) {
      return NextResponse.json(
        {
          error: MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
          code: 'TRIAL_FICHA_COTEJO_PLAN'
        },
        { status: 403 }
      )
    }

    let suscripcionRegenId: number | null = null
    if (forceRegenerate) {
      const regen = await validarRegeneracionIA(userId, u.areaId, u.gradoId)
      if (!regen.ok) {
        return NextResponse.json({ error: regen.error, code: regen.code }, { status: 403 })
      }
      suscripcionRegenId = regen.suscripcionId
    }

    const solGuardado =
      !forceRegenerate && sesion.solucionario?.respuestaprompt?.trim()
        ? sesion.solucionario
        : null

    let area: string
    let grado: string
    let tituloSesion: string
    let respuestaprompt: string
    const ficha = sesion.fichaAprendizaje

    if (solGuardado) {
      area = (solGuardado.area ?? sesion.area ?? u.area ?? '').trim()
      grado = (solGuardado.grado ?? sesion.grado ?? u.grado ?? '').trim()
      tituloSesion = (solGuardado.titulosesion ?? sesion.titulo ?? '').trim()
      respuestaprompt = solGuardado.respuestaprompt!.trim()
    } else {
      area = (sesion.area ?? u.area ?? '').trim()
      grado = (sesion.grado ?? u.grado ?? '').trim()
      tituloSesion = (sesion.titulo ?? '').trim()

      if (!process.env.OPENAI_API_KEY) {
        return NextResponse.json(
          {
            error: 'OPENAI_API_KEY no está configurada. El solucionario requiere GPT.',
            code: 'OPENAI_API_KEY_MISSING'
          },
          { status: 503 }
        )
      }

      const fichaTexto = (ficha?.respuestaprompt ?? '').trim()
      const promptText = `Genera el solucionario docente para la ficha de aprendizaje de esta sesión.

Área: ${area}
Grado: ${grado}
Sesión: ${tituloSesion}

Saberes de la sesión:
${(sesion.saberes ?? '').replace(/<br\s*\/?>/gi, '\n')}

${fichaTexto ? `Contenido de la ficha del estudiante:\n${fichaTexto}` : 'Aún no hay ficha guardada; usa los saberes y el propósito de la sesión como referencia.'}

Propósito: ${(sesion.proposito ?? '').replace(/<br\s*\/?>/gi, '\n')}
Criterios: ${(sesion.criterios ?? '').replace(/<br\s*\/?>/gi, '\n')}`

      try {
        const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const requestConfig = {
          model: MODELO_GPT,
          messages: [
            {
              role: 'system' as const,
              content:
                'Genera el solucionario docente completo. Incluye respuestas modelo y criterios de corrección. Sin saludos.'
            },
            { role: 'user' as const, content: promptText }
          ],
          top_p: 1,
          max_completion_tokens: 16384
        }
        let completion = await openaiClient.chat.completions.create(requestConfig)
        let texto = (completion.choices?.[0]?.message?.content || '').trim()
        if (!texto) {
          completion = await openaiClient.chat.completions.create(requestConfig)
          texto = (completion.choices?.[0]?.message?.content || '').trim()
        }
        if (!texto) throw new Error('GPT no generó ninguna respuesta')
        respuestaprompt = texto
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<BR\s*\/?>/gi, '\n')
          .trim()
      } catch (err) {
        console.error('[solucionario] Error al generar con GPT:', err)
        const mensaje =
          err instanceof Error ? err.message : 'No se pudo generar el solucionario con GPT'
        return NextResponse.json(
          { error: mensaje, code: 'GPT_SOLUCIONARIO_ERROR' },
          { status: 503 }
        )
      }

      if (!respuestaprompt) {
        return NextResponse.json(
          { error: 'GPT no devolvió contenido para el solucionario.', code: 'GPT_SOLUCIONARIO_VACIO' },
          { status: 503 }
        )
      }

      try {
        await prisma.solucionario.upsert({
          where: { idsesion: sesionId },
          create: {
            idsesion: sesionId,
            area,
            grado,
            titulosesion: tituloSesion,
            respuestaprompt
          },
          update: {
            area,
            grado,
            titulosesion: tituloSesion,
            respuestaprompt
          }
        })
      } catch (err) {
        console.error('Error al guardar Solucionario:', err)
      }
    }

    const bloques = respuestaPromptABloques(respuestaprompt)
    const respuestapromptXML = bloquesRespuestaAWordXml(bloques)

    const data = {
      grado,
      titulodesesion: `Solucionario — ${tituloSesion}`,
      proposito: ficha?.proposito ?? sesion.proposito ?? '',
      competencia: ficha?.competencia ?? '',
      capacidad: ficha?.capacidad ?? '',
      evidencia: ficha?.evidencia ?? sesion.evidencias ?? '',
      criterios: ficha?.criterios ?? sesion.criterios ?? '',
      saber1: ficha?.saber1 ?? '',
      saber2: ficha?.saber2 ?? '',
      saber3: ficha?.saber3 ?? '',
      respuestaprompt: respuestapromptXML ? RESPUESTAPROMPT_PLACEHOLDER : respuestaprompt
    }

    const templatePath = path.join(process.cwd(), 'templates', TEMPLATE_NAME)
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json(
        { error: `Plantilla no encontrada: ${TEMPLATE_NAME}`, code: 'TEMPLATE_MISSING' },
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

    if (respuestapromptXML) {
      insertarXmlEnPlaceholder(
        doc.getZip(),
        RESPUESTAPROMPT_PLACEHOLDER,
        respuestapromptXML,
        '{{respuestaprompt}}'
      )
    }

    const buffer = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    if (suscripcionRegenId != null) {
      await consumirCreditoRegeneracion(suscripcionRegenId)
    }

    const areaSlug = (area || 'documento').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_áéíóúñÁÉÍÓÚÑ]/g, '')
    const fileName = `Solucionario_${areaSlug}_S${sesion.numeroSesion}.docx`
    const ts = Date.now()

    if (body.formato === 'json') {
      const respuestaBuffer = respuestaprompt
        ? await construirWordDesdeRespuestaGpt(respuestaprompt)
        : Buffer.alloc(0)
      return NextResponse.json({
        from: solGuardado ? 'saved' : 'ia',
        documento: {
          fileName,
          docxBase64: Buffer.from(buffer as Buffer).toString('base64')
        },
        respuesta: respuestaprompt
          ? {
              fileName: `RESPUESTA_IA_SOLUCIONARIO_${areaSlug}_S${sesion.numeroSesion}_${ts}.docx`,
              docxBase64: Buffer.from(respuestaBuffer).toString('base64')
            }
          : undefined
      })
    }

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Solucionario-From': solGuardado ? 'saved' : 'ia'
      }
    })
  } catch (error) {
    console.error('Error en generate-document-solucionario:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el solucionario',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
