export type CodigoCorrelativo = {
  prefijo: string
  correlativo: number
  ancho: number
  sufijo: string
}

export const MSG_FORMATO_CODIGO_CORRELATIVO =
  'El código debe incluir un correlativo numérico, por ejemplo E26-65COM-U4'

/** Parsea códigos tipo E26-65COM-U4 (el número central es el correlativo). */
export function parsearCodigoCorrelativo(codigo: string): CodigoCorrelativo | null {
  const trimmed = codigo.trim()
  const m = trimmed.match(/^(.+-)(\d+)(.+)$/)
  if (!m) return null

  const [, prefijo, numStr, sufijo] = m
  if (!prefijo || !numStr || !sufijo) return null

  const correlativo = parseInt(numStr, 10)
  if (!Number.isFinite(correlativo)) return null

  return { prefijo, correlativo, ancho: numStr.length, sufijo }
}

export function generarCodigoCorrelativo(
  parsed: CodigoCorrelativo,
  offset: number
): string {
  const n = parsed.correlativo + offset
  const numStr =
    String(n).length > parsed.ancho
      ? String(n)
      : String(n).padStart(parsed.ancho, '0')
  return `${parsed.prefijo}${numStr}${parsed.sufijo}`
}

export function generarSerieCodigos(codigoBase: string, cantidad: number): string[] {
  if (cantidad < 1) {
    throw new Error('CANTIDAD_INVALIDA')
  }
  const parsed = parsearCodigoCorrelativo(codigoBase)
  if (!parsed) {
    throw new Error('FORMATO_CODIGO_INVALIDO')
  }
  return Array.from({ length: cantidad }, (_, i) =>
    generarCodigoCorrelativo(parsed, i)
  )
}

export function carpetaCodigoEnZip(codigo: string): string {
  return codigo.replace(/[^\w.-]+/g, '_')
}
