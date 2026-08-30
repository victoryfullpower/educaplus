import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  activarSuscripcionDesdeOrden,
  marcarOrdenPagada
} from '@/lib/activar-suscripcion'

export const dynamic = 'force-dynamic'

/**
 * Webhook base para Culqi.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as any
    const eventType = String(payload?.event_type ?? '')
    const obj = payload?.data?.object ?? {}

    const ordenId = Number(obj?.metadata?.ordenId)
    const chargeId = String(obj?.id ?? '')
    const amountRaw = Number(obj?.amount ?? 0)
    const currency = String(obj?.currency_code ?? 'PEN')
    const outcomeType = String(obj?.outcome?.type ?? '')
    const method = String(obj?.source?.type ?? '')

    if (!ordenId || !chargeId) {
      return NextResponse.json({ error: 'Payload incompleto' }, { status: 400 })
    }

    const db = prisma as any
    const orden = await db.ordenCompra.findUnique({ where: { id: ordenId } })
    if (!orden) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const monto = amountRaw > 0 ? amountRaw / 100 : Number(orden.monto)
    const esPagoExitoso =
      eventType.toLowerCase().includes('charge') &&
      (outcomeType.toLowerCase().includes('exitosa') ||
        outcomeType.toLowerCase().includes('successful') ||
        outcomeType.toLowerCase().includes('approved'))

    await prisma.$transaction(async (txBase) => {
      const tx = txBase as any
      const existePago = await tx.pagoCulqi.findUnique({
        where: { culqiId: chargeId },
        select: { id: true }
      })
      if (!existePago) {
        await tx.pagoCulqi.create({
          data: {
            idorden: orden.id,
            culqiId: chargeId,
            estado: esPagoExitoso ? 'captured' : 'failed',
            metodo: method || null,
            monto,
            moneda: currency || 'PEN',
            respuestaRaw: payload
          }
        })
      }

      if (!esPagoExitoso) {
        await tx.ordenCompra.update({
          where: { id: orden.id },
          data: { estado: 'fallida', culqiChargeId: chargeId }
        })
        return
      }

      await tx.ordenCompra.update({
        where: { id: orden.id },
        data: { estado: 'pagada', culqiChargeId: chargeId }
      })

      await activarSuscripcionDesdeOrden(orden)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('pagos/webhook/culqi:', error)
    return NextResponse.json(
      { error: 'Error procesando webhook de Culqi' },
      { status: 500 }
    )
  }
}
