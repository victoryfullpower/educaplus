import type { PlanSuscripcionId } from '@/lib/planes-catalogo'
import {
  obtenerConfigPlanDesdeDb,
  precioPlanDesdeDb
} from '@/lib/planes-catalogo-db'

export type ParAreaGrado = {
  areaId: string
  gradoId: string
  nivelId?: string | null
}

export type PlanSuscripcionConfig = {
  id: PlanSuscripcionId
  vigencia: 'mensual' | 'anual'
  sesionesPorUnidad: 5 | 10
  cantidadGradosLegacy: number
  maxParesAreaGrado: number
  /** Créditos de regeneración con IA al activar el plan (no consumen trial previo). */
  creditosRegeneracion: number
}

/** Respaldo si la migración de catálogo aún no se aplicó en la BD. */
export const PLAN_SUSCRIPCION_CONFIG: Record<PlanSuscripcionId, PlanSuscripcionConfig> = {
  basico: {
    id: 'basico',
    vigencia: 'mensual',
    sesionesPorUnidad: 5,
    cantidadGradosLegacy: 1,
    maxParesAreaGrado: 1,
    creditosRegeneracion: 150
  },
  premium: {
    id: 'premium',
    vigencia: 'mensual',
    sesionesPorUnidad: 10,
    cantidadGradosLegacy: 5,
    maxParesAreaGrado: 5,
    creditosRegeneracion: 320
  },
  anual: {
    id: 'anual',
    vigencia: 'anual',
    sesionesPorUnidad: 10,
    cantidadGradosLegacy: 5,
    maxParesAreaGrado: 5,
    creditosRegeneracion: 2500
  }
}

const FALLBACK_PRECIOS: Record<PlanSuscripcionId, number> = {
  basico: 39.9,
  premium: 74.9,
  anual: 449.9
}

export function esPlanSuscripcionId(v: string): v is PlanSuscripcionId {
  return v === 'basico' || v === 'premium' || v === 'anual'
}

export async function obtenerConfigPlan(id: PlanSuscripcionId): Promise<PlanSuscripcionConfig> {
  const fromDb = await obtenerConfigPlanDesdeDb(id)
  return fromDb ?? PLAN_SUSCRIPCION_CONFIG[id]
}

export async function precioPlanSuscripcion(id: PlanSuscripcionId): Promise<number> {
  const fromDb = await precioPlanDesdeDb(id)
  return fromDb ?? FALLBACK_PRECIOS[id]
}

export function normalizarParesAreaGrado(raw: unknown): ParAreaGrado[] {
  if (!Array.isArray(raw)) return []
  const out: ParAreaGrado[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const areaId = String(o.areaId ?? '').trim()
    const gradoId = String(o.gradoId ?? '').trim()
    if (!areaId || !gradoId) continue
    const key = `${areaId}:${gradoId}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      areaId,
      gradoId,
      nivelId: o.nivelId != null ? String(o.nivelId) : null
    })
  }
  return out
}

export async function validarParesParaPlan(
  planCodigo: PlanSuscripcionId,
  pares: ParAreaGrado[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = await obtenerConfigPlan(planCodigo)
  if (pares.length === 0) {
    return { ok: false, error: 'Selecciona al menos un área y grado para tu plan.' }
  }
  if (pares.length > cfg.maxParesAreaGrado) {
    return {
      ok: false,
      error: `Este plan permite hasta ${cfg.maxParesAreaGrado} combinación(es) área/grado.`
    }
  }
  return { ok: true }
}

export function calcularFechaFinSuscripcion(
  inicio: Date,
  vigencia: 'mensual' | 'anual'
): Date {
  const fin = new Date(inicio)
  if (vigencia === 'anual') fin.setFullYear(fin.getFullYear() + 1)
  else fin.setMonth(fin.getMonth() + 1)
  return fin
}

export function creditosRegeneracionRestantes(suscripcion: {
  creditosRegeneracionTotal: number
  creditosRegeneracionUsados: number
}): number {
  return Math.max(
    0,
    suscripcion.creditosRegeneracionTotal - suscripcion.creditosRegeneracionUsados
  )
}
