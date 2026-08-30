import { prisma } from '@/lib/prisma'
import { creditosRegeneracionRestantes } from '@/lib/planes-suscripcion'
import {
  MSG_CREDITOS_REGEN_AGOTADOS,
  MSG_REGEN_REQUIERE_PLAN
} from '@/lib/error-generacion-documento'

export type TipoGeneracionTrial = 'plan' | 'unidad' | 'sesion'

function nowUtc(): Date {
  return new Date()
}

const suscripcionSelect = {
  id: true,
  planCodigo: true,
  creditosRegeneracionTotal: true,
  creditosRegeneracionUsados: true,
  fechaFin: true
}

function whereSuscripcionActiva(userId: number) {
  return {
    idusuario: userId,
    estado: 'activa',
    fechaInicio: { lte: nowUtc() },
    fechaFin: { gte: nowUtc() }
  }
}

export async function obtenerSuscripcionActivaPara(
  userId: number,
  areaId?: string | null,
  gradoId?: string | null
) {
  const db = prisma as any

  const global = await db.suscripcionUsuario.findFirst({
    where: {
      ...whereSuscripcionActiva(userId),
      grados: { none: {} }
    },
    select: suscripcionSelect
  })
  if (global) return global

  if (!areaId || !gradoId) return null

  return db.suscripcionUsuario.findFirst({
    where: {
      ...whereSuscripcionActiva(userId),
      grados: {
        some: {
          areaId: String(areaId),
          gradoId: String(gradoId)
        }
      }
    },
    select: suscripcionSelect
  })
}

export async function tieneSuscripcionActivaPara(
  userId: number,
  areaId?: string | null,
  gradoId?: string | null
): Promise<boolean> {
  const activa = await obtenerSuscripcionActivaPara(userId, areaId, gradoId)
  return Boolean(activa)
}

export type ResultadoValidacionRegen =
  | { ok: true; suscripcionId: number }
  | { ok: false; error: string; code: string }

/** Regeneración con IA: requiere plan activo y créditos (no aplica al trial). */
export async function validarRegeneracionIA(
  userId: number,
  areaId?: string | null,
  gradoId?: string | null
): Promise<ResultadoValidacionRegen> {
  const sub = await obtenerSuscripcionActivaPara(userId, areaId, gradoId)
  if (!sub) {
    return {
      ok: false,
      error: MSG_REGEN_REQUIERE_PLAN,
      code: 'REGEN_REQUIERE_PLAN'
    }
  }
  if (creditosRegeneracionRestantes(sub) <= 0) {
    return {
      ok: false,
      error: MSG_CREDITOS_REGEN_AGOTADOS,
      code: 'CREDITOS_REGEN_AGOTADOS'
    }
  }
  return { ok: true, suscripcionId: sub.id }
}

export async function consumirCreditoRegeneracion(suscripcionId: number): Promise<void> {
  const db = prisma as any
  await db.suscripcionUsuario.update({
    where: { id: suscripcionId },
    data: { creditosRegeneracionUsados: { increment: 1 } }
  })
}

export async function puedeGenerarConTrial(
  userId: number,
  tipo: TipoGeneracionTrial
): Promise<boolean> {
  const db = prisma as any
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      trialPlanUsado: true,
      trialUnidadUsada: true,
      trialSesionUsada: true
    }
  })
  if (!user) return false
  if (tipo === 'plan') return !user.trialPlanUsado
  if (tipo === 'unidad') return !user.trialUnidadUsada
  return !user.trialSesionUsada
}

export async function puedeGenerarDocumento(
  userId: number,
  tipo: TipoGeneracionTrial,
  areaId?: string | null,
  gradoId?: string | null
): Promise<boolean> {
  if (await tieneSuscripcionActivaPara(userId, areaId, gradoId)) return true
  return puedeGenerarConTrial(userId, tipo)
}

export async function marcarTrialConsumido(
  userId: number,
  tipo: TipoGeneracionTrial
): Promise<void> {
  const db = prisma as any
  if (tipo === 'plan') {
    await db.user.update({
      where: { id: userId },
      data: { trialPlanUsado: true }
    })
    return
  }
  if (tipo === 'unidad') {
    await db.user.update({
      where: { id: userId },
      data: { trialUnidadUsada: true }
    })
    return
  }
  await db.user.update({
    where: { id: userId },
    data: { trialSesionUsada: true }
  })
}

export { MSG_TRIAL_AGOTADO } from '@/lib/error-generacion-documento'
