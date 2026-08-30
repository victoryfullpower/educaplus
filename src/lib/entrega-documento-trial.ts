import { convertirDocxAPdfBuffer } from '@/lib/docx-a-pdf'
import { protegerPdfBuffer } from '@/lib/pdf-proteccion'

export const MSG_PDF_TRIAL_NO_DISPONIBLE =
  'No se pudo generar el PDF protegido para modo prueba. En el servidor instala LibreOffice; en Windows con Word también funciona.'
export const CODE_PDF_TRIAL_NO_DISPONIBLE = 'PDF_TRIAL_NO_DISPONIBLE'

const CONTENT_TYPE_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const CONTENT_TYPE_PDF = 'application/pdf'

/** Modo prueba: docx → PDF → rasterizado con permisos restrictivos. */
export async function docxTrialComoPdfProtegido(docxBuffer: Buffer): Promise<Buffer> {
  const pdf = await convertirDocxAPdfBuffer(docxBuffer)
  return protegerPdfBuffer(pdf)
}

/** @deprecated Usar docxTrialComoPdfProtegido */
export const entregarPlanAnualComoPdfProtegido = docxTrialComoPdfProtegido

export function nombreArchivoPdfDesdeDocx(nombreDocx: string): string {
  const base = nombreDocx.replace(/\.docx$/i, '').trim() || 'documento'
  return `${base}.pdf`
}

export type EntregaDocumentoPreparada = {
  buffer: Buffer
  fileName: string
  contentType: string
  extraHeaders: Record<string, string>
}

/** Devuelve docx o PDF protegido según modo prueba (sin suscripción). */
export async function prepararEntregaDocumento(
  docxBuffer: Buffer,
  fileNameDocx: string,
  modoPrueba: boolean
): Promise<EntregaDocumentoPreparada> {
  if (!modoPrueba) {
    return {
      buffer: docxBuffer,
      fileName: fileNameDocx,
      contentType: CONTENT_TYPE_DOCX,
      extraHeaders: {}
    }
  }

  const buffer = await docxTrialComoPdfProtegido(docxBuffer)
  return {
    buffer,
    fileName: nombreArchivoPdfDesdeDocx(fileNameDocx),
    contentType: CONTENT_TYPE_PDF,
    extraHeaders: { 'X-Documento-Modo-Prueba': 'pdf-protegido' }
  }
}
