import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET: Comprueba si existe una sesión guardada con contenido de IA (motivacion, saberes, etc.)
 * para la unidad y número de sesión indicados. Devuelve ese contenido para poder generar
 * el documento sin volver a llamar a la IA.
 * Query: areaId, gradoId, unidad, numeroSesion
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const areaId = searchParams.get('areaId')
    const gradoId = searchParams.get('gradoId')
    const unidad = searchParams.get('unidad')
    const numeroSesionStr = searchParams.get('numeroSesion')
    const numeroSesion = numeroSesionStr ? parseInt(numeroSesionStr, 10) : 1

    if (!areaId || !gradoId || !unidad) {
      return NextResponse.json(
        { error: 'Faltan areaId, gradoId o unidad' },
        { status: 400 }
      )
    }

    const anio = new Date().getFullYear()
    const unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
      where: {
        idusuario: userId,
        anio,
        areaId: String(areaId),
        gradoId: String(gradoId),
        unidad: String(unidad)
      },
      include: {
        listaSesiones: {
          where: { numeroSesion },
          take: 1
        }
      }
    })

    if (!unidadAprendizaje || unidadAprendizaje.listaSesiones.length === 0) {
      return NextResponse.json({ existe: false })
    }

    const sesion = unidadAprendizaje.listaSesiones[0]
    const tieneContenido =
      sesion.motivacion != null ||
      sesion.saberes != null ||
      sesion.problematizacion != null ||
      sesion.proposito != null ||
      sesion.standar != null ||
      sesion.desarrollo != null ||
      sesion.desarrolloantes != null ||
      sesion.desarrollodurante != null ||
      sesion.desarrollodespues != null ||
      sesion.metacognicion != null

    if (!tieneContenido) {
      return NextResponse.json({ existe: false })
    }

    return NextResponse.json({
      existe: true,
      contenido: {
        motivacion: sesion.motivacion ?? '',
        saberes: sesion.saberes ?? '',
        problematizacion: sesion.problematizacion ?? '',
        proposito: sesion.proposito ?? '',
        standar: sesion.standar ?? '',
        desarrollo: sesion.desarrollo ?? '',
        desarrolloantes: sesion.desarrolloantes ?? '',
        desarrollodurante: sesion.desarrollodurante ?? '',
        desarrollodespues: sesion.desarrollodespues ?? '',
        metacognicion: sesion.metacognicion ?? ''
      }
    })
  } catch (error) {
    console.error('Error al obtener contenido de sesión:', error)
    return NextResponse.json(
      { error: 'Error al obtener contenido de sesión' },
      { status: 500 }
    )
  }
}
