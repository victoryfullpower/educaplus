import {
  assertPuedeCrearDocumento,
  evaluarCuotaDocumento,
  type CuotaDocumentoPlan
} from '@/lib/limites-plan-catalogo'

export type CuotaPlanAnual = CuotaDocumentoPlan

export async function evaluarCuotaPlanAnual(userId: number): Promise<CuotaPlanAnual> {
  return evaluarCuotaDocumento(userId, 'plan_anual')
}

export async function evaluarCuotaUnidad(userId: number): Promise<CuotaPlanAnual> {
  return evaluarCuotaDocumento(userId, 'unidad')
}

export async function assertPuedeCrearPlanAnual(
  userId: number
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  return assertPuedeCrearDocumento(userId, 'plan_anual')
}

export async function assertPuedeCrearUnidad(
  userId: number
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  return assertPuedeCrearDocumento(userId, 'unidad')
}

export type CuotaSesion = CuotaDocumentoPlan

export async function evaluarCuotaSesion(userId: number): Promise<CuotaSesion> {
  return evaluarCuotaDocumento(userId, 'sesion')
}

export async function assertPuedeCrearSesion(
  userId: number
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  return assertPuedeCrearDocumento(userId, 'sesion')
}
