import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Devuelve el payload para POST /api/sesiones-fichas/generate-document sin regenerar con IA. */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const sesionId = parseInt(new URL(request.url).searchParams.get('id') || '', 10)
    if (Number.isNaN(sesionId)) {
      return NextResponse.json({ error: 'id de sesión requerido' }, { status: 400 })
    }

    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true }
    })

    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }

    const u = sesion.unidadAprendizaje

    return NextResponse.json({
      formData: {
        institucion: u.institucion ?? '',
        area: u.area ?? '',
        grado: u.grado ?? '',
        gradoId: u.gradoId ?? '',
        areaId: u.areaId ?? '',
        unidad: u.unidad ?? '',
        ciclo: u.ciclo ?? '',
        director: u.director ?? '',
        docente: u.docente ?? '',
        fecha: sesion.fecha ?? '',
        duracion: sesion.duracion ?? u.duracion ?? '',
        tituloSesion: sesion.titulo ?? '',
        continuarUnidad: true
      },
      sesionData: {
        numeroSesion: String(sesion.numeroSesion),
        titulo: sesion.titulo ?? '',
        competenciasSeleccionadas: sesion.competenciasSeleccionadas ?? [],
        capacidadesSeleccionadas: sesion.capacidadesSeleccionadas ?? [],
        desempeniosSeleccionados: sesion.desempeniosSeleccionados ?? [],
        campoTematico: sesion.campoTematico ?? '',
        evidencias: sesion.evidencias ?? '',
        criterios: sesion.criterios ?? ''
      },
      unidadData: {
        areaId: u.areaId,
        gradoId: u.gradoId,
        unidad: u.unidad
      },
      contenidoDesdeBD: {
        motivacion: sesion.motivacion ?? '',
        saberes: sesion.saberes ?? '',
        problematizacion: sesion.problematizacion ?? '',
        proposito: sesion.proposito ?? '',
        standar: sesion.standar ?? '',
        desarrollo: sesion.desarrollo ?? '',
        desarrolloantes: sesion.desarrolloantes ?? '',
        desarrollodurante: sesion.desarrollodurante ?? '',
        desarrollodespues: sesion.desarrollodespues ?? ''
      }
    })
  } catch (error) {
    console.error('sesion-para-descarga:', error)
    return NextResponse.json({ error: 'Error al preparar descarga' }, { status: 500 })
  }
}
