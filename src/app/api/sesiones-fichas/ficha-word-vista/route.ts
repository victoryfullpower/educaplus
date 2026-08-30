import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  parsearSaberesSesion,
  type FichaVistaData
} from '@/lib/ficha-vista-html'
import { listarDescripcionesProcesosDidacticos } from '@/lib/procesos-didacticos-sesion'
import {
  construirDocxDesdeFichaVista,
  nombreArchivoDocxSeguro
} from '@/lib/ficha-vista-docx'

export const dynamic = 'force-dynamic'

/** Word de la ficha = mismos datos que la vista previa (vía librería `docx`). */
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
      include: { fichaAprendizaje: true, unidadAprendizaje: true }
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
          error: 'Aún no hay ficha generada para esta sesión.',
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
    const procesosDidacticos = await listarDescripcionesProcesosDidacticos(
      sesion.areaId ?? u.areaId,
      competencia
    )

    const data: FichaVistaData = {
      numeroSesion: sesion.numeroSesion,
      tituloSesion: (ficha.titulosesion ?? sesion.titulo ?? '').trim(),
      tituloDesesion: (
        ficha.titulodesesion ??
        ficha.titulosesion ??
        sesion.titulo ??
        ''
      ).trim(),
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
      respuestaprompt: (ficha.respuestaprompt ?? '').trim()
    }

    const buffer = await construirDocxDesdeFichaVista(data)
    const fileName = nombreArchivoDocxSeguro(
      `Ficha_Aprendizaje_S${sesion.numeroSesion}`
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
    console.error('ficha-word-vista:', error)
    const msg = error instanceof Error ? error.message : 'Error al generar el Word de la ficha'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
