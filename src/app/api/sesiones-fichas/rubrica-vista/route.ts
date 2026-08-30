import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Lee la rúbrica guardada en BD (tabladinamica). No genera con IA. */
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
        rubrica: true,
        unidadAprendizaje: true
      }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json(
        { error: 'Sesión no encontrada o sin permisos' },
        { status: 404 }
      )
    }

    const rubrica = sesion.rubrica
    if (!rubrica?.tabladinamica?.trim()) {
      return NextResponse.json(
        {
          error:
            'Aún no hay rúbrica para esta sesión. Genera la sesión de aprendizaje primero.',
          code: 'RUBRICA_NO_GENERADA'
        },
        { status: 404 }
      )
    }

    const u = sesion.unidadAprendizaje

    return NextResponse.json({
      sesionId,
      numeroSesion: sesion.numeroSesion,
      tituloSesion: (rubrica.titulosesion ?? sesion.titulo ?? '').trim(),
      area: (rubrica.area ?? sesion.area ?? u.area ?? '').trim(),
      grado: (rubrica.grado ?? sesion.grado ?? u.grado ?? '').trim(),
      competencia: (rubrica.competencia ?? '').trim(),
      capacidad: (rubrica.capacidad ?? '').trim(),
      evidencia: (rubrica.evidencia ?? '').trim(),
      proposito: (rubrica.proposito ?? '').trim(),
      standar: (rubrica.standar ?? '').trim(),
      tabladinamica: rubrica.tabladinamica.trim()
    })
  } catch (error) {
    console.error('rubrica-vista GET:', error)
    return NextResponse.json(
      { error: 'No se pudo cargar la rúbrica' },
      { status: 500 }
    )
  }
}
