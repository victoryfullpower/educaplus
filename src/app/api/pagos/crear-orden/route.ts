import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  precioPlan,
  type CantidadGrados,
  type PlanVigencia,
  type SesionesPorUnidad
} from '@/lib/planes-comerciales'
import {
  esPlanSuscripcionId,
  normalizarParesAreaGrado,
  obtenerConfigPlan,
  precioPlanSuscripcion
} from '@/lib/planes-suscripcion'

export const dynamic = 'force-dynamic'

function esPlanVigencia(v: string): v is PlanVigencia {
  return v === 'mensual' || v === 'anual'
}

function esSesiones(v: number): v is SesionesPorUnidad {
  return v === 5 || v === 10
}

function esCantidadGrados(v: string): v is CantidadGrados {
  return v === '1' || v === '2' || v === '3' || v === '4' || v === '5'
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = (await request.json()) as {
      planCodigo?: string
      grados?: unknown
      vigencia?: string
      sesionesPorUnidad?: number
      cantidadGrados?: string
    }

    const db = prisma as any

    if (body.planCodigo && esPlanSuscripcionId(body.planCodigo)) {
      const planCodigo = body.planCodigo
      const pares = normalizarParesAreaGrado(body.grados)
      const cfg = await obtenerConfigPlan(planCodigo)
      const monto = await precioPlanSuscripcion(planCodigo)

      const orden = await db.ordenCompra.create({
        data: {
          idusuario: userId,
          planCodigo,
          vigencia: cfg.vigencia,
          sesionesPorUnidad: cfg.sesionesPorUnidad,
          cantidadGrados: pares.length,
          monto,
          moneda: 'PEN',
          estado: 'pendiente',
          metadata: { fuente: 'planes/comprar', ...(pares.length ? { grados: pares } : {}) }
        }
      })

      const culqiConfigured = Boolean(
        process.env.CULQI_SECRET_KEY && process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
      )

      return NextResponse.json({
        ok: true,
        ordenId: orden.id,
        planCodigo,
        monto: orden.monto,
        moneda: orden.moneda,
        culqiConfigured,
        message: culqiConfigured
          ? 'Orden creada. Lista para iniciar checkout de Culqi.'
          : 'Orden creada. Puedes activar el plan en modo desarrollo sin Culqi.'
      })
    }

    const vigencia = String(body.vigencia ?? '')
    const sesiones = Number(body.sesionesPorUnidad)
    const grados = String(body.cantidadGrados ?? '')

    if (!esPlanVigencia(vigencia) || !esSesiones(sesiones) || !esCantidadGrados(grados)) {
      return NextResponse.json({ error: 'Parámetros del plan inválidos' }, { status: 400 })
    }

    const monto = precioPlan(vigencia, sesiones, grados)
    const orden = await db.ordenCompra.create({
      data: {
        idusuario: userId,
        vigencia,
        sesionesPorUnidad: sesiones,
        cantidadGrados: parseInt(grados, 10),
        monto,
        moneda: 'PEN',
        estado: 'pendiente',
        metadata: { fuente: 'planes/comprar-legacy' }
      }
    })

    const culqiConfigured = Boolean(
      process.env.CULQI_SECRET_KEY && process.env.NEXT_PUBLIC_CULQI_PUBLIC_KEY
    )

    return NextResponse.json({
      ok: true,
      ordenId: orden.id,
      monto: orden.monto,
      moneda: orden.moneda,
      culqiConfigured,
      message: culqiConfigured
        ? 'Orden creada. Lista para iniciar checkout de Culqi.'
        : 'Orden creada en estado pendiente.'
    })
  } catch (error) {
    console.error('pagos/crear-orden:', error)
    return NextResponse.json(
      { error: 'No se pudo crear la orden de compra' },
      { status: 500 }
    )
  }
}
