import { prisma } from '@/lib/prisma'
import {
  calcularFechaFinSuscripcion,
  normalizarParesAreaGrado,
  obtenerConfigPlan,
  type ParAreaGrado,
  type PlanSuscripcionConfig
} from '@/lib/planes-suscripcion'
import type { PlanSuscripcionId } from '@/lib/planes-catalogo'

type OrdenLike = {
  id: number
  idusuario: number
  planCodigo?: string | null
  vigencia: string
  sesionesPorUnidad: number
  cantidadGrados: number
  metadata?: unknown
}

function paresDesdeMetadata(metadata: unknown): ParAreaGrado[] {
  if (!metadata || typeof metadata !== 'object') return []
  const m = metadata as Record<string, unknown>
  return normalizarParesAreaGrado(m.grados)
}

export async function activarSuscripcionDesdeOrden(
  orden: OrdenLike,
  opts?: { paresExtra?: ParAreaGrado[] }
): Promise<{ suscripcionId: number; estado: string }> {
  const db = prisma as any
  const existente = await db.suscripcionUsuario.findFirst({
    where: { idorden: orden.id },
    select: { id: true }
  })
  if (existente) {
    return { suscripcionId: existente.id, estado: 'activa' }
  }

  const planCodigo = orden.planCodigo as PlanSuscripcionId | null | undefined
  const cfg: PlanSuscripcionConfig | null = planCodigo
    ? await obtenerConfigPlan(planCodigo)
    : null

  const paresMeta = paresDesdeMetadata(orden.metadata)
  const pares = opts?.paresExtra?.length ? opts.paresExtra : paresMeta

  const inicio = new Date()
  const vigencia =
    (cfg?.vigencia ?? orden.vigencia) === 'anual' ? 'anual' : 'mensual'
  const fin = calcularFechaFinSuscripcion(inicio, vigencia)

  const estado = 'activa'

  const suscripcion = await db.suscripcionUsuario.create({
    data: {
      idusuario: orden.idusuario,
      idorden: orden.id,
      planCodigo: planCodigo ?? null,
      vigencia,
      sesionesPorUnidad: cfg?.sesionesPorUnidad ?? orden.sesionesPorUnidad,
      cantidadGrados: pares.length > 0 ? pares.length : 0,
      creditosRegeneracionTotal: cfg?.creditosRegeneracion ?? 0,
      creditosRegeneracionUsados: 0,
      fechaInicio: inicio,
      fechaFin: fin,
      estado,
      grados:
        pares.length > 0
          ? {
              create: pares.map((p) => ({
                areaId: p.areaId,
                gradoId: p.gradoId,
                nivelId: p.nivelId ?? null
              }))
            }
          : undefined
    }
  })

  return { suscripcionId: suscripcion.id, estado }
}

export async function completarGradosSuscripcion(
  userId: number,
  suscripcionId: number,
  pares: ParAreaGrado[]
): Promise<void> {
  const db = prisma as any
  const sus = await db.suscripcionUsuario.findFirst({
    where: { id: suscripcionId, idusuario: userId },
    include: { grados: true }
  })
  if (!sus) throw new Error('Suscripción no encontrada')
  if (sus.estado !== 'pendiente_grados' && sus.grados.length > 0) {
    throw new Error('Esta suscripción ya tiene grados configurados')
  }

  const planCodigo = sus.planCodigo as PlanSuscripcionId | null
  if (planCodigo) {
    const cfg = await obtenerConfigPlan(planCodigo)
    if (pares.length === 0 || pares.length > cfg.maxParesAreaGrado) {
      throw new Error(`Debes elegir entre 1 y ${cfg.maxParesAreaGrado} área(s)/grado(s).`)
    }
  }

  await db.$transaction(async (txBase: unknown) => {
    const tx = txBase as any
    await tx.suscripcionGrado.deleteMany({ where: { idsuscripcion: suscripcionId } })
    for (const p of pares) {
      await tx.suscripcionGrado.create({
        data: {
          idsuscripcion: suscripcionId,
          areaId: p.areaId,
          gradoId: p.gradoId,
          nivelId: p.nivelId ?? null
        }
      })
    }
    await tx.suscripcionUsuario.update({
      where: { id: suscripcionId },
      data: { estado: 'activa', cantidadGrados: pares.length }
    })
  })
}

export async function marcarOrdenPagada(ordenId: number, chargeId?: string): Promise<void> {
  const db = prisma as any
  await db.ordenCompra.update({
    where: { id: ordenId },
    data: {
      estado: 'pagada',
      ...(chargeId ? { culqiChargeId: chargeId } : {})
    }
  })
}
