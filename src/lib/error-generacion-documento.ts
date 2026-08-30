export const MSG_TRIAL_AGOTADO =
  'Tu prueba gratuita ya no tiene cupo para este tipo de documento. Activa un plan para continuar.'

export const MSG_REGEN_REQUIERE_PLAN =
  'La regeneración con IA requiere un plan activo. Activa un plan para continuar.'

export const MSG_CREDITOS_REGEN_AGOTADOS =
  'No te quedan créditos de regeneración con IA en tu plan. Activa o renueva tu plan.'

export const MSG_TRIAL_UNA_UNIDAD_PLAN =
  'En la prueba gratuita solo puedes configurar la UNIDAD 1 del plan anual. Activa un plan para usar más unidades.'

import {
  MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
  MSG_TRIAL_SOLO_SESION_1,
  MSG_TRIAL_SOLO_UNIDAD_1
} from '@/lib/acceso-trial'

export {
  MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN,
  MSG_TRIAL_SOLO_SESION_1,
  MSG_TRIAL_SOLO_UNIDAD_1
}

export const RUTA_PLANES_PAGO = '/planes'
export const TRIAL_AGOTADO_CODES = [
  'TRIAL_AGOTADO_PLAN',
  'TRIAL_AGOTADO_UNIDAD',
  'TRIAL_AGOTADO_SESION',
  'TRIAL_UNA_UNIDAD_PLAN',
  'TRIAL_UNA_SESION',
  'TRIAL_FICHA_COTEJO_PLAN',
  'REGEN_REQUIERE_PLAN',
  'CREDITOS_REGEN_AGOTADOS'
] as const

export type TrialAgotadoCode = (typeof TRIAL_AGOTADO_CODES)[number]

export function esTrialAgotadoPayload(data: {
  code?: string
  error?: string
}): boolean {
  if (data.code && TRIAL_AGOTADO_CODES.includes(data.code as TrialAgotadoCode)) {
    return true
  }
  const msg = (data.error ?? '').toLowerCase()
  return msg.includes('prueba gratuita') && msg.includes('cupo')
}

export class ErrorGeneracionDocumento extends Error {
  readonly code?: string
  readonly trialAgotado: boolean

  constructor(
    message: string,
    opts?: { code?: string; trialAgotado?: boolean }
  ) {
    super(message)
    this.name = 'ErrorGeneracionDocumento'
    this.code = opts?.code
    this.trialAgotado = opts?.trialAgotado ?? false
  }
}

export async function errorDesdeResponse(
  response: Response,
  mensajePorDefecto = 'Error al generar el documento'
): Promise<ErrorGeneracionDocumento> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string
    code?: string
  }
  const trialAgotado = esTrialAgotadoPayload(data)
  return new ErrorGeneracionDocumento(
    data.error || `${mensajePorDefecto} (${response.status})`,
    { code: data.code, trialAgotado }
  )
}

export function esErrorTrialUnaUnidadPlan(error: unknown): boolean {
  if (error instanceof ErrorGeneracionDocumento) {
    return error.code === 'TRIAL_UNA_UNIDAD_PLAN'
  }
  if (error instanceof Error) {
    return error.message.includes(MSG_TRIAL_UNA_UNIDAD_PLAN)
  }
  return false
}

export function esErrorTrialUnaSesion(error: unknown): boolean {
  if (error instanceof ErrorGeneracionDocumento) {
    return error.code === 'TRIAL_UNA_SESION'
  }
  if (error instanceof Error) {
    return error.message.includes(MSG_TRIAL_SOLO_SESION_1)
  }
  return false
}

export function esErrorTrialFichaCotejo(error: unknown): boolean {
  if (error instanceof ErrorGeneracionDocumento) {
    return error.code === 'TRIAL_FICHA_COTEJO_PLAN'
  }
  if (error instanceof Error) {
    return error.message.includes(MSG_TRIAL_FICHA_COTEJO_REQUIERE_PLAN)
  }
  return false
}

export function esErrorRegenCredito(error: unknown): boolean {
  if (error instanceof ErrorGeneracionDocumento) {
    return (
      error.code === 'REGEN_REQUIERE_PLAN' || error.code === 'CREDITOS_REGEN_AGOTADOS'
    )
  }
  if (error instanceof Error) {
    return (
      error.message.includes(MSG_REGEN_REQUIERE_PLAN) ||
      error.message.includes(MSG_CREDITOS_REGEN_AGOTADOS)
    )
  }
  return false
}

export function esErrorTrialAgotado(error: unknown): boolean {
  if (esErrorTrialUnaUnidadPlan(error)) return false
  if (esErrorTrialUnaSesion(error)) return false
  if (esErrorTrialFichaCotejo(error)) return false
  if (esErrorRegenCredito(error)) return false
  if (error instanceof ErrorGeneracionDocumento) return error.trialAgotado
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes(MSG_TRIAL_AGOTADO.toLowerCase().slice(0, 20)) ||
      (msg.includes('prueba gratuita') && msg.includes('cupo'))
    )
  }
  return false
}

export function mensajeTrialAgotado(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return MSG_TRIAL_AGOTADO
}
