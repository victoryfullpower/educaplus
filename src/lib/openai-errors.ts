import { NextResponse } from 'next/server'

/** Código estable en JSON de API para el cliente. */
export const OPENAI_SIN_SALDO_CODE = 'OPENAI_SIN_SALDO'

export const MSG_OPENAI_SIN_SALDO =
  'No hay saldo disponible en la cuenta de OpenAI. La generación con inteligencia artificial está suspendida hasta que se recarguen créditos. Si eres docente, contacta al administrador de EducaPlus.'

type OpenAiErrorBody = {
  error?: {
    code?: string
    type?: string
    message?: string
  }
}

export function esCuerpoOpenAiSinSaldo(body: OpenAiErrorBody | null | undefined): boolean {
  if (!body?.error) return false
  const code = (body.error.code ?? '').toLowerCase()
  const type = (body.error.type ?? '').toLowerCase()
  const msg = (body.error.message ?? '').toLowerCase()
  if (code === 'credit_balance_exhausted') return true
  if (type === 'insufficient_quota') return true
  if (msg.includes('credit_balance_exhausted')) return true
  if (msg.includes('no credits remaining')) return true
  if (msg.includes('insufficient_quota')) return true
  if (msg.includes('exceeded your current quota')) return true
  return false
}

export function esMensajeOpenAiSinSaldo(text: string): boolean {
  const t = text.toLowerCase()
  if (!t) return false
  if (t.includes('credit_balance_exhausted')) return true
  if (t.includes('no credits remaining')) return true
  if (t.includes('insufficient_quota')) return true
  if (t.includes('exceeded your current quota')) return true
  return false
}

export function esErrorOpenAiSinSaldoDesdeUnknown(error: unknown): boolean {
  if (error == null) return false
  if (typeof error === 'string') return esMensajeOpenAiSinSaldo(error)
  if (error instanceof Error) {
    if (esMensajeOpenAiSinSaldo(error.message)) return true
    const ext = error as Error & {
      code?: string
      status?: number
      error?: OpenAiErrorBody['error']
    }
    if (ext.code === OPENAI_SIN_SALDO_CODE) return true
    if (ext.code && esMensajeOpenAiSinSaldo(ext.code)) return true
    if (ext.error && esCuerpoOpenAiSinSaldo({ error: ext.error })) return true
    if (ext.status === 429 && esMensajeOpenAiSinSaldo(ext.message)) return true
  }
  if (typeof error === 'object') {
    const o = error as Record<string, unknown>
    if (typeof o.code === 'string' && o.code === OPENAI_SIN_SALDO_CODE) return true
    if (typeof o.code === 'string' && esMensajeOpenAiSinSaldo(o.code)) return true
    if (typeof o.message === 'string' && esMensajeOpenAiSinSaldo(o.message)) return true
    if (o.status === 429) {
      const code = String(o.code ?? '')
      if (code === 'insufficient_quota' || code === 'credit_balance_exhausted') return true
      if (typeof o.message === 'string' && esMensajeOpenAiSinSaldo(o.message)) return true
    }
    if (o.error && typeof o.error === 'object') {
      return esCuerpoOpenAiSinSaldo({ error: o.error as OpenAiErrorBody['error'] })
    }
  }
  return false
}

export function payloadOpenAiSinSaldo() {
  return { error: MSG_OPENAI_SIN_SALDO, code: OPENAI_SIN_SALDO_CODE }
}

export const OPENAI_SIN_SALDO_HTTP_STATUS = 503

export function nextResponseOpenAiSinSaldo(): NextResponse {
  return NextResponse.json(payloadOpenAiSinSaldo(), {
    status: OPENAI_SIN_SALDO_HTTP_STATUS
  })
}

/** Si el error es saldo OpenAI agotado, devuelve la respuesta HTTP; si no, null. */
export function nextResponseSiErrorOpenAiSinSaldo(error: unknown): NextResponse | null {
  if (!esErrorOpenAiSinSaldoDesdeUnknown(error)) return null
  return nextResponseOpenAiSinSaldo()
}

export function errorOpenAiSinSaldo(): Error {
  const e = new Error(MSG_OPENAI_SIN_SALDO)
  ;(e as Error & { code: string }).code = OPENAI_SIN_SALDO_CODE
  return e
}

/** Tras fetch a OpenAI: lanza error reconocible si no hay saldo. */
export function lanzarSiOpenAiHttpError(
  status: number,
  body: OpenAiErrorBody | Record<string, unknown>
): void {
  if (esCuerpoOpenAiSinSaldo(body as OpenAiErrorBody)) {
    throw errorOpenAiSinSaldo()
  }
  if (status === 429 && esMensajeOpenAiSinSaldo(JSON.stringify(body))) {
    throw errorOpenAiSinSaldo()
  }
}

/** Tras fetch a OpenAI: lanza error de saldo o un Error genérico con el detalle. */
export async function assertOpenAiFetchOk(response: Response): Promise<void> {
  if (response.ok) return
  const body = (await response.clone().json().catch(() => ({}))) as OpenAiErrorBody
  lanzarSiOpenAiHttpError(response.status, body)
  const motivo = body?.error?.code || body?.error?.type || ''
  const detalle = body?.error?.message || response.statusText
  throw new Error(
    `OpenAI API error: ${response.status}${motivo ? ` ${motivo}` : ''} - ${detalle}`
  )
}

/** Errores del SDK oficial de OpenAI (APIError). */
export function propagarErrorOpenAiSdk(error: unknown): never {
  if (esErrorOpenAiSinSaldoDesdeUnknown(error)) {
    throw errorOpenAiSinSaldo()
  }
  const api = error as {
    status?: number
    code?: string
    error?: OpenAiErrorBody['error']
    message?: string
  }
  if (api?.error) {
    lanzarSiOpenAiHttpError(api.status ?? 429, { error: api.error })
  }
  if (api?.status === 429 && esMensajeOpenAiSinSaldo(api.message ?? '')) {
    throw errorOpenAiSinSaldo()
  }
  throw error
}

export function responderErrorApiCatch(
  error: unknown,
  defaultMessage = 'Error en el servidor'
): NextResponse {
  const openAi = nextResponseSiErrorOpenAiSinSaldo(error)
  if (openAi) return openAi

  const errorMessage =
    error instanceof Error ? error.message : defaultMessage
  const details =
    process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.stack
      : undefined

  return NextResponse.json(
    {
      error: errorMessage,
      ...(details ? { details } : {})
    },
    { status: 500 }
  )
}
