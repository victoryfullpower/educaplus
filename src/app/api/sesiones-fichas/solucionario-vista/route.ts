import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { extraerSolucionarioDeFicha } from '@/lib/ficha-contenido-estudiante'

export const dynamic = 'force-dynamic'

/** Lee el solucionario (tabla propia o embebido en la ficha). No genera con IA. */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const sesionId = parseInt(
      new URL(request.url).searchParams.get('sesionId') ?? '',
      10
    )
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
          error:
            'Aún no hay solucionario para esta sesión. Genera la sesión de aprendizaje primero.',
          code: 'SOLUCIONARIO_NO_GENERADO'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      sesionId,
      numeroSesion: sesion.numeroSesion,
      tituloSesion: (
        solucionario?.titulosesion ??
        sesion.fichaAprendizaje?.titulosesion ??
        sesion.titulo ??
        ''
      ).trim(),
      area: (
        solucionario?.area ??
        sesion.fichaAprendizaje?.area ??
        sesion.area ??
        u.area ??
        ''
      ).trim(),
      grado: (
        solucionario?.grado ??
        sesion.fichaAprendizaje?.grado ??
        sesion.grado ??
        u.grado ??
        ''
      ).trim(),
      respuestaprompt
    })
  } catch (error) {
    console.error('solucionario-vista GET:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar el solucionario' },
      { status: 500 }
    )
  }
}
