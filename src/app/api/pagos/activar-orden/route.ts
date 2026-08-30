import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  activarSuscripcionDesdeOrden,
  marcarOrdenPagada
} from '@/lib/activar-suscripcion'

export const dynamic = 'force-dynamic'

/**
 * Activa suscripción sin Culqi (desarrollo o cuando Culqi no está configurado).
 * POST { ordenId: number }
 */
export async function POST(request: NextRequest) {
  try {
    const culqiConfigured = Boolean(
      process.env.CULQI_SECRET_KEY && process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    )
    if (culqiConfigured && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Usa el checkout de Culqi para activar el plan en producción.' },
        { status: 403 }
      )
    }

    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as { ordenId?: number }
    const ordenId = Number(body.ordenId)
    if (!ordenId || Number.isNaN(ordenId)) {
      return NextResponse.json({ error: 'ordenId es requerido' }, { status: 400 })
    }

    const db = prisma as any
    const orden = await db.ordenCompra.findFirst({
      where: { id: ordenId, idusuario: userId }
    })

    if (!orden) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }
    if (orden.estado === 'pagada') {
      const sus = await db.suscripcionUsuario.findFirst({
        where: { idorden: orden.id },
        select: { id: true, estado: true }
      })
      return NextResponse.json({
        ok: true,
        yaActiva: true,
        suscripcionId: sus?.id,
        estado: sus?.estado
      })
    }
    if (orden.estado !== 'pendiente') {
      return NextResponse.json({ error: 'La orden no está pendiente de pago' }, { status: 400 })
    }

    await marcarOrdenPagada(orden.id, `dev-${Date.now()}`)
    const { suscripcionId, estado } = await activarSuscripcionDesdeOrden(orden)

    return NextResponse.json({
      ok: true,
      suscripcionId,
      estado,
      message:
        estado === 'pendiente_grados'
          ? 'Plan pagado. Completa la selección de área y grado.'
          : 'Plan activado correctamente.'
    })
  } catch (error) {
    console.error('pagos/activar-orden:', error)
    return NextResponse.json(
      { error: 'No se pudo activar la suscripción' },
      { status: 500 }
    )
  }
}
