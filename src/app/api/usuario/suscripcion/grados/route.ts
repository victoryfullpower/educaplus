import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { completarGradosSuscripcion } from '@/lib/activar-suscripcion'
import { normalizarParesAreaGrado, validarParesParaPlan } from '@/lib/planes-suscripcion'
import type { PlanSuscripcionId } from '@/lib/planes-catalogo'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as {
      suscripcionId?: number
      grados?: unknown
    }
    const suscripcionId = Number(body.suscripcionId)
    if (!suscripcionId || Number.isNaN(suscripcionId)) {
      return NextResponse.json({ error: 'suscripcionId es requerido' }, { status: 400 })
    }

    const db = prisma as any
    const sus = await db.suscripcionUsuario.findFirst({
      where: { id: suscripcionId, idusuario: userId },
      select: { id: true, planCodigo: true, estado: true }
    })
    if (!sus) {
      return NextResponse.json({ error: 'Suscripción no encontrada' }, { status: 404 })
    }

    const pares = normalizarParesAreaGrado(body.grados)
    if (sus.planCodigo) {
      const validacion = await validarParesParaPlan(sus.planCodigo as PlanSuscripcionId, pares)
      if (!validacion.ok) {
        return NextResponse.json({ error: validacion.error }, { status: 400 })
      }
    }

    await completarGradosSuscripcion(userId, suscripcionId, pares)

    return NextResponse.json({ ok: true, estado: 'activa' })
  } catch (error) {
    console.error('usuario/suscripcion/grados:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'No se pudieron guardar los grados'
      },
      { status: 500 }
    )
  }
}
