import JSZip from 'jszip'
import { PDFDocument } from 'pdf-lib'

const PDF_SUBJECT_PREFIX = 'educaplus:codigo='

export type VerifySelloCliente = {
  archivo: string
  formato: 'docx' | 'pdf' | 'desconocido'
  tieneSello: boolean
  metadatos: Record<string, string>
}

function parseCustomXml(xml: string): Record<string, string> {
  const m = xml.match(
    /name="codigoeducaplus"[^>]*>\s*<vt:lpwstr>([^<]*)<\/vt:lpwstr>/i
  )
  if (!m) return {}
  return { codigoeducaplus: m[1] }
}

function parsePdfSubject(subject: string | undefined): Record<string, string> {
  if (!subject?.startsWith(PDF_SUBJECT_PREFIX)) return {}
  try {
    return {
      codigoeducaplus: decodeURIComponent(
        subject.slice(PDF_SUBJECT_PREFIX.length)
      )
    }
  } catch {
    return { codigoeducaplus: subject.slice(PDF_SUBJECT_PREFIX.length) }
  }
}

function extensionSello(nombre: string): 'docx' | 'pdf' | null {
  const lower = nombre.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.pdf')) return 'pdf'
  return null
}

async function verificarSelloDocx(
  file: File,
  nombre: string
): Promise<VerifySelloCliente> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer())
    const customXml = await zip.file('docProps/custom.xml')?.async('string')
    if (!customXml) {
      return { archivo: nombre, formato: 'docx', tieneSello: false, metadatos: {} }
    }
    const metadatos = parseCustomXml(customXml)
    const codigo = metadatos.codigoeducaplus?.trim()
    return {
      archivo: nombre,
      formato: 'docx',
      tieneSello: Boolean(codigo),
      metadatos: codigo ? metadatos : {}
    }
  } catch {
    return { archivo: nombre, formato: 'docx', tieneSello: false, metadatos: {} }
  }
}

async function verificarSelloPdf(
  file: File,
  nombre: string
): Promise<VerifySelloCliente> {
  try {
    const buffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
    let metadatos = parsePdfSubject(pdfDoc.getSubject())

    if (!metadatos.codigoeducaplus) {
      const raw = pdfDoc.getKeywords()
      const keywords = Array.isArray(raw) ? raw : raw ? [raw] : []
      const kw = keywords.find((k: string) => k.startsWith('codigoeducaplus:'))
      if (kw) {
        metadatos = { codigoeducaplus: kw.slice('codigoeducaplus:'.length) }
      }
    }

    const codigo = metadatos.codigoeducaplus?.trim()
    return {
      archivo: nombre,
      formato: 'pdf',
      tieneSello: Boolean(codigo),
      metadatos: codigo ? metadatos : {}
    }
  } catch {
    return { archivo: nombre, formato: 'pdf', tieneSello: false, metadatos: {} }
  }
}

/** Verifica el sello en el navegador sin subir el archivo al servidor. */
export async function verificarSelloEnArchivo(
  file: File
): Promise<VerifySelloCliente> {
  const nombre = file.name || 'documento'
  const ext = extensionSello(nombre)
  if (ext === 'docx') return verificarSelloDocx(file, nombre)
  if (ext === 'pdf') return verificarSelloPdf(file, nombre)
  throw new Error('Solo se admiten archivos .docx y .pdf')
}
