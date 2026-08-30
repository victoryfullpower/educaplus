import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parsearSaberesSesion } from '@/lib/ficha-vista-html'
import { listarDescripcionesProcesosDidacticos } from '@/lib/procesos-didacticos-sesion'

export const dynamic = 'force-dynamic'

/** Lee la ficha guardada en BD (respuestaprompt). No genera con IA. */
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

    const ficha = sesion.fichaAprendizaje
    if (!ficha) {
      return NextResponse.json(
        {
          error: 'Aún no hay ficha generada para esta sesión. Usa «Generar ficha» primero.',
          code: 'FICHA_NO_GENERADA'
        },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje
    const saberesDesdeSesion = parsearSaberesSesion(sesion.saberes)
    const saber1 = saberesDesdeSesion[0] || (ficha.saber1 ?? '').trim()
    const saber2 = saberesDesdeSesion[1] || (ficha.saber2 ?? '').trim()
    const saber3 = saberesDesdeSesion[2] || (ficha.saber3 ?? '').trim()
    const saberes =
      saberesDesdeSesion.length > 0
        ? saberesDesdeSesion
        : [saber1, saber2, saber3].filter(Boolean)

    const competenciasArr = Array.isArray(sesion.competenciasSeleccionadas)
      ? (sesion.competenciasSeleccionadas as string[])
      : []
    const competencia =
      (ficha.competencia ?? '').trim() ||
      (competenciasArr.length > 0 ? String(competenciasArr[0]).trim() : '')
    const areaId = sesion.areaId ?? u.areaId
    const procesosDidacticos = await listarDescripcionesProcesosDidacticos(
      areaId,
      competencia
    )

    return NextResponse.json({
      sesionId,
      numeroSesion: sesion.numeroSesion,
      tituloSesion: (ficha.titulosesion ?? sesion.titulo ?? '').trim(),
      tituloDesesion: (ficha.titulodesesion ?? ficha.titulosesion ?? sesion.titulo ?? '').trim(),
      area: (ficha.area ?? sesion.area ?? u.area ?? '').trim(),
      grado: (ficha.grado ?? sesion.grado ?? u.grado ?? '').trim(),
      docente: (u.docente ?? '').trim(),
      proposito: (ficha.proposito ?? '').trim(),
      competencia,
      capacidad: (ficha.capacidad ?? '').trim(),
      evidencia: (ficha.evidencia ?? '').trim(),
      criterios: (ficha.criterios ?? '').trim(),
      saber1,
      saber2,
      saber3,
      saberes,
      procesosDidacticos,
      respuestaprompt: ficha.respuestaprompt ?? ''
    })
  } catch (error) {
    console.error('ficha-vista GET:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar la ficha' },
      { status: 500 }
    )
  }
}
