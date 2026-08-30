/** Constantes y helpers de prueba gratuita (sin dependencias; seguro en cliente y servidor). */

export const MAX_UNIDAD_INDEX_TRIAL_PLAN = 1
export const UNIDAD_NUMERO_TRIAL = 1

export const MAX_SESION_NUMERO_TRIAL = 1
export const SESION_NUMERO_TRIAL = 1

export const MSG_TRIAL_SOLO_UNIDAD_1 =
  'En la prueba gratuita solo puedes usar la UNIDAD 1. Activa un plan para las demás unidades.'

export const MSG_TRIAL_SOLO_SESION_1 =
  'En la prueba gratuita solo puedes generar la SESIÓN 1. Activa un plan para las demás sesiones.'

export const MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN =
  'En modo prueba gratuita solo puedes generar la rúbrica analítica. Las fichas de aprendizaje y las listas de cotejo requieren activar un plan.'

export function parseNumeroUnidad(unidad: unknown): number | null {
  const n = parseInt(String(unidad ?? '').trim(), 10)
  return Number.isFinite(n) && n >= 1 ? n : null
}

export function unidadPermitidaEnTrial(unidad: unknown): boolean {
  const n = parseNumeroUnidad(unidad)
  return n === UNIDAD_NUMERO_TRIAL
}

export function sesionPermitidaEnTrial(numeroSesion: unknown): boolean {
  const n = parseInt(String(numeroSesion ?? '').trim(), 10)
  return Number.isFinite(n) && n === SESION_NUMERO_TRIAL
}
