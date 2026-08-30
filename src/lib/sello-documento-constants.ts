export const MSG_CODIGO_SELLO_DUPLICADO =
  'Este código EducaPlus ya está registrado. Usa otro código para sellar nuevos documentos.'

/** Máximo de archivos .docx / .pdf por lote en /api/sello-documentos/batch */
export const MAX_ARCHIVOS_LOTE_SELLO = 350

/** Máximo de copias correlativas en sellado masivo */
export const MAX_COPIAS_MASIVO_SELLO = 50

/** Videos y multimedia que se empaquetan en el ZIP final sin subir al servidor */
export const EXTENSIONES_ADJUNTO_SELLO = [
  '.mp4',
  '.mov',
  '.avi',
  '.mkv',
  '.webm',
  '.m4v'
] as const

export function esDocumentoSellable(nombre: string): boolean {
  const lower = nombre.toLowerCase()
  return lower.endsWith('.docx') || lower.endsWith('.pdf')
}

export function esAdjuntoSello(nombre: string): boolean {
  const lower = nombre.toLowerCase()
  return EXTENSIONES_ADJUNTO_SELLO.some((ext) => lower.endsWith(ext))
}
