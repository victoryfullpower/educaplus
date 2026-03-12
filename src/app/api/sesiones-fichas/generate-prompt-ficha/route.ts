import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const TEMPLATE_NAME = 'PROMT_Ficha.docx'

/**
 * Genera el documento Word "Prompt Ficha" a partir del template PROMT_Ficha.docx
 * rellenando las llaves con los datos del registro de sesión guardado en BD.
 * Llaves del template: area, grado, titulosesion, proposito, competencia, capacidad,
 * evidencia, criterios, duracion, desarrollo, desarrolloantes, desarrollodurante, desarrollodespues.
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

    const desarrolloRaw = (sesion.desarrollo ?? '').trim()
    const desarrolloSinLlaves = desarrolloRaw
      ? desarrolloRaw.split('\n').map((linea) => {
          const t = linea.trim()
          if (/^\{.+?\}$/.test(t)) return t.replace(/^\{|\}$/g, '').trim()
          return linea
        }).join('\n')
      : ''
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
      desarrollo: desarrolloSinLlaves,
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
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: '{{', end: '}}' },
      nullGetter: () => ''
    })

    doc.render(data)

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })

    const fileName = `Prompt_Ficha_${area || 'documento'}_${Date.now()}.docx`
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '')

    return new NextResponse(Uint8Array.from(buffer as Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('Error al generar Prompt Ficha:', error)
    const msg = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al generar el documento de prompt ficha',
        details: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
