import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  construirDocxDesdeSolucionarioVista,
  nombreArchivoDocxSeguro
} from '@/lib/ficha-vista-docx'
import { extraerSolucionarioDeFicha } from '@/lib/ficha-contenido-estudiante'

export const dynamic = 'force-dynamic'

/** Word del solucionario = mismos datos que la vista previa (vía librería `docx`). */
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const sesionId = parseInt(String(body.sesionId ?? ''), 10)
    if (isNaN(sesionId)) {
      return NextResponse.json({ error: 'sesionId es requerido' }, { status: 400 })
    }

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: {
        solucionario: true,
        fichaAprendizaje: true,
        unidadAprendizaje: true
      }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje
    const solucionario = sesion.solucionario
    const desdeTabla = (solucionario?.respuestaprompt ?? '').trim()
    const desdeFicha = extraerSolucionarioDeFicha(
      sesion.fichaAprendizaje?.respuestaprompt ?? ''
    ).trim()
    const respuestaprompt = desdeTabla || desdeFicha

    if (!respuestaprompt) {
      return NextResponse.json(
        {
          error: 'Aún no hay solucionario para esta sesión.',
          code: 'SOLUCIONARIO_NO_GENERADO'
        },
        { status: 404 }
      )
    }

    const tituloSesion = (
      solucionario?.titulosesion ??
      sesion.fichaAprendizaje?.titulosesion ??
      sesion.titulo ??
      ''
    ).trim()
    const area = (
      solucionario?.area ??
      sesion.fichaAprendizaje?.area ??
      sesion.area ??
      u.area ??
      ''
    ).trim()
    const grado = (
      solucionario?.grado ??
      sesion.fichaAprendizaje?.grado ??
      sesion.grado ??
      u.grado ??
      ''
    ).trim()

    const buffer = await construirDocxDesdeSolucionarioVista({
      tituloSesion,
      area,
      grado,
      respuestaprompt
    })
    const fileName = nombreArchivoDocxSeguro(
      `Solucionario_S${sesion.numeroSesion}`
    )

    return new NextResponse(Uint8Array.from(buffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    })
  } catch (error) {
    console.error('solucionario-word-vista:', error)
    const msg =
      error instanceof Error ? error.message : 'Error al generar el Word del solucionario'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
