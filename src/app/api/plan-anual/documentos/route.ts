import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { resumenSesionesUnidad, sesionVisibleEnModal } from '@/lib/plan-estado-documentos'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const planId = new URL(request.url).searchParams.get('id')
    if (!planId) {
      return NextResponse.json({ error: 'ID del plan requerido' }, { status: 400 })
    }

    const plan = await prisma.planAnual.findFirst({
      where: { id: parseInt(planId, 10), idusuario: userId }
    })

    if (!plan) {
      return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
    }

    const unidadesDb = await prisma.unidadAprendizaje.findMany({
      where: {
        idusuario: userId,
        OR: [
          { idplananual: plan.id },
          {
            anio: plan.anio,
            areaId: plan.areaId,
            gradoId: plan.gradoId
          }
        ]
      },
      orderBy: { fechaHora: 'desc' },
      include: {
        listaSesiones: {
          orderBy: { numeroSesion: 'asc' },
          include: {
            fichaAprendizaje: {
              select: { id: true, titulosesion: true, titulodesesion: true, createdAt: true }
            },
            rubrica: {
              select: { id: true, titulosesion: true, createdAt: true }
            },
            listaCotejo: {
              select: { id: true, titulosesion: true, createdAt: true }
            },
            solucionario: {
              select: { id: true, titulosesion: true, createdAt: true }
            }
          }
        }
      }
    })

    const unidadesPlan: Array<{
      numero: number
      tituloUnidad?: string
      producto?: string
      problemaPotencialidad?: string
    }> = []

    const arr = Array.isArray(plan.unidades) ? plan.unidades : []
    for (let i = 1; i <= 8; i++) {
      const u = arr[i] as {
        tituloUnidad?: string
        producto?: string
        problemaPotencialidad?: string
        situacionSignificativa?: string
      } | undefined
      if (
        u?.problemaPotencialidad?.trim() ||
        u?.producto?.trim() ||
        u?.situacionSignificativa?.trim() ||
        u?.tituloUnidad?.trim()
      ) {
        unidadesPlan.push({
          numero: i,
          tituloUnidad: u.tituloUnidad,
          producto: u.producto,
          problemaPotencialidad: u.problemaPotencialidad
        })
      }
    }

    const unidadesRaw = unidadesDb.map((u) => {
      const sesionesGeneradas = u.listaSesiones
        .filter(sesionVisibleEnModal)
        .map((s) => ({
          numeroSesion: s.numeroSesion,
          titulo: s.titulo
        }))
        .sort((a, b) => a.numeroSesion - b.numeroSesion)
      const resumenSesiones = resumenSesionesUnidad({
        sesiones: u.sesiones,
        listaSesiones: u.listaSesiones
      })
      return {
        id: u.id,
        unidad: u.unidad,
        tituloUnidad: u.tituloUnidad,
        area: u.area,
        grado: u.grado,
        fechaHora: u.fechaHora,
        sesionesGeneradas,
        resumenSesiones
      }
    })

    const unidades = [...unidadesRaw].sort((a, b) => {
      const na = parseInt(String(a.unidad ?? ''), 10)
      const nb = parseInt(String(b.unidad ?? ''), 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return String(a.unidad ?? '').localeCompare(String(b.unidad ?? ''), 'es', {
        numeric: true,
        sensitivity: 'base'
      })
    })

    const sesiones: Array<{
      id: number
      numeroSesion: number
      titulo: string | null
      unidadAprendizajeId: number
      unidadNumero: string | null
      tituloUnidad: string | null
      fechaHora: Date
      tieneFicha: boolean
      tieneSolucionario: boolean
      tieneRubrica: boolean
      tieneListaCotejo: boolean
    }> = []

    const fichas: Array<{
      id: number
      sesionId: number
      numeroSesion: number
      titulo: string | null
      unidadNumero: string | null
      fechaHora: Date
    }> = []

    const rubricas: Array<{
      id: number
      sesionId: number
      numeroSesion: number
      titulo: string | null
      unidadNumero: string | null
      fechaHora: Date
    }> = []

    const listasCotejo: Array<{
      id: number
      sesionId: number
      numeroSesion: number
      titulo: string | null
      unidadNumero: string | null
      fechaHora: Date
    }> = []

    const solucionarios: Array<{
      id: number
      sesionId: number
      numeroSesion: number
      titulo: string | null
      unidadNumero: string | null
      fechaHora: Date
    }> = []

    for (const u of unidadesDb) {
      for (const s of u.listaSesiones) {
        if (sesionVisibleEnModal(s)) {
          sesiones.push({
            id: s.id,
            numeroSesion: s.numeroSesion,
            titulo: s.titulo,
            unidadAprendizajeId: u.id,
            unidadNumero: u.unidad,
            tituloUnidad: u.tituloUnidad,
            fechaHora: s.updatedAt,
            tieneFicha: !!s.fichaAprendizaje,
            tieneSolucionario: !!s.solucionario,
            tieneRubrica: !!s.rubrica,
            tieneListaCotejo: !!s.listaCotejo
          })
        }
        if (s.fichaAprendizaje) {
          fichas.push({
            id: s.fichaAprendizaje.id,
            sesionId: s.id,
            numeroSesion: s.numeroSesion,
            titulo:
              s.fichaAprendizaje.titulosesion ||
              s.fichaAprendizaje.titulodesesion ||
              s.titulo,
            unidadNumero: u.unidad,
            fechaHora: s.fichaAprendizaje.createdAt
          })
        }
        if (s.rubrica) {
          rubricas.push({
            id: s.rubrica.id,
            sesionId: s.id,
            numeroSesion: s.numeroSesion,
            titulo: s.rubrica.titulosesion || s.titulo,
            unidadNumero: u.unidad,
            fechaHora: s.rubrica.createdAt
          })
        }
        if (s.listaCotejo) {
          listasCotejo.push({
            id: s.listaCotejo.id,
            sesionId: s.id,
            numeroSesion: s.numeroSesion,
            titulo: s.listaCotejo.titulosesion || s.titulo,
            unidadNumero: u.unidad,
            fechaHora: s.listaCotejo.createdAt
          })
        }
        if (s.solucionario) {
          solucionarios.push({
            id: s.solucionario.id,
            sesionId: s.id,
            numeroSesion: s.numeroSesion,
            titulo: s.solucionario.titulosesion || s.titulo,
            unidadNumero: u.unidad,
            fechaHora: s.solucionario.createdAt
          })
        }
      }
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        area: plan.area,
        grado: plan.grado,
        anio: plan.anio
      },
      unidadesPlan,
      unidades,
      sesiones,
      fichas,
      rubricas,
      listasCotejo,
      solucionarios
    })
  } catch (error) {
    console.error('Error al obtener documentos del plan:', error)
    return NextResponse.json(
      { error: 'Error al obtener documentos del plan' },
      { status: 500 }
    )
  }
}
