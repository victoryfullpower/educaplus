import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  evaluarCuotaPlanAnual,
  evaluarCuotaSesion,
  evaluarCuotaUnidad
} from '@/lib/limites-plan-anual'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const db = prisma as any
    const [user, suscripcionActiva, suscripcionPendienteGrados] = await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          trialPlanUsado: true,
          trialUnidadUsada: true,
          trialSesionUsada: true
        }
      }),
      db.suscripcionUsuario.findFirst({
        where: {
          idusuario: userId,
          estado: 'activa',
          fechaInicio: { lte: new Date() },
          fechaFin: { gte: new Date() }
        },
        select: {
          id: true,
          vigencia: true,
          planCodigo: true,
          sesionesPorUnidad: true,
          cantidadGrados: true,
          creditosRegeneracionTotal: true,
          creditosRegeneracionUsados: true,
          fechaInicio: true,
          fechaFin: true,
          estado: true,
          grados: {
            select: { areaId: true, gradoId: true, nivelId: true }
          }
        }
      }),
      db.suscripcionUsuario.findFirst({
        where: {
          idusuario: userId,
          estado: 'pendiente_grados',
          fechaFin: { gte: new Date() }
        },
        select: {
          id: true,
          planCodigo: true,
          estado: true
        }
      })
    ])

    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const creditosRegeneracion =
      suscripcionActiva && suscripcionActiva.estado === 'activa'
        ? {
            total: suscripcionActiva.creditosRegeneracionTotal,
            usados: suscripcionActiva.creditosRegeneracionUsados,
            restantes: Math.max(
              0,
              suscripcionActiva.creditosRegeneracionTotal -
                suscripcionActiva.creditosRegeneracionUsados
            )
          }
        : null

    const cuotaPlanAnual = await evaluarCuotaPlanAnual(userId)
    const cuotaUnidad = await evaluarCuotaUnidad(userId)
    const cuotaSesion = await evaluarCuotaSesion(userId)

    return NextResponse.json({
      authenticated: true,
      trial: {
        plan: { usado: user.trialPlanUsado, total: 1, restante: user.trialPlanUsado ? 0 : 1 },
        unidad: { usado: user.trialUnidadUsada, total: 1, restante: user.trialUnidadUsada ? 0 : 1 },
        sesion: { usado: user.trialSesionUsada, total: 1, restante: user.trialSesionUsada ? 0 : 1 }
      },
      suscripcionActiva:
        suscripcionActiva?.estado === 'activa' ? suscripcionActiva : null,
      suscripcionPendienteGrados,
      creditosRegeneracion,
      cuotaPlanAnual,
      cuotaUnidad,
      cuotaSesion
    })
  } catch (error) {
    console.error('usuario/acceso:', error)
    return NextResponse.json(
      { error: 'No se pudo obtener el estado de acceso' },
      { status: 500 }
    )
  }
}
