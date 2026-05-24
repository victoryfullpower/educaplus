import PizZip from 'pizzip'
import { PDFDocument } from 'pdf-lib'

export type SelloMetadata = {
  codigoeducaplus: string
}

export type LecturaSello = {
  encontrado: boolean
  metadatos: Partial<SelloMetadata>
  formato: 'docx' | 'pdf' | 'desconocido'
}

const CUSTOM_CT =
  'application/vnd.openxmlformats-officedocument.custom-properties+xml'
const CUSTOM_RELS =
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties'
const PDF_SUBJECT_PREFIX = 'educaplus:codigo='

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function normalizarSello(input: Partial<SelloMetadata>): SelloMetadata {
  return {
    codigoeducaplus: String(input.codigoeducaplus ?? '').trim()
  }
}

function buildCustomXml(codigo: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="2" name="codigoeducaplus"><vt:lpwstr>${escapeXml(codigo)}</vt:lpwstr></property></Properties>`
}

function ensureCustomPropsInDocx(zip: PizZip, codigo: string): void {
  zip.file('docProps/custom.xml', buildCustomXml(codigo))

  const ctPath = '[Content_Types].xml'
  let ct = zip.file(ctPath)?.asText() ?? ''
  if (ct && !ct.includes('/docProps/custom.xml')) {
    ct = ct.replace(
      '</Types>',
      `<Override PartName="/docProps/custom.xml" ContentType="${CUSTOM_CT}"/></Types>`
    )
    zip.file(ctPath, ct)
  }

  const relsPath = '_rels/.rels'
  let rels = zip.file(relsPath)?.asText() ?? ''
  if (rels && !rels.includes('custom-properties')) {
    const ids = [...rels.matchAll(/Id="rId(\d+)"/g)].map((m) =>
      parseInt(m[1], 10)
    )
    const nextId = (ids.length ? Math.max(...ids) : 0) + 1
    rels = rels.replace(
      '</Relationships>',
      `<Relationship Id="rId${nextId}" Type="${CUSTOM_RELS}" Target="docProps/custom.xml"/></Relationships>`
    )
    zip.file(relsPath, rels)
  }
}

function parseCustomXml(xml: string): Partial<SelloMetadata> {
  const m = xml.match(
    /name="codigoeducaplus"[^>]*>\s*<vt:lpwstr>([^<]*)<\/vt:lpwstr>/i
  )
  if (!m) return {}
  return { codigoeducaplus: m[1] }
}

function parsePdfSubject(subject: string | undefined): Partial<SelloMetadata> {
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

function tieneCodigo(m: Partial<SelloMetadata>): boolean {
  return Boolean(m.codigoeducaplus?.trim())
}

export function extensionSello(nombre: string): 'docx' | 'pdf' | null {
  const lower = nombre.toLowerCase()
  if (lower.endsWith('.docx')) return 'docx'
  if (lower.endsWith('.pdf')) return 'pdf'
  return null
}

export function sellarDocx(buffer: Buffer, sello: SelloMetadata): Buffer {
  const data = normalizarSello(sello)
  if (!data.codigoeducaplus) {
    throw new Error('El código EducaPlus es obligatorio')
  }
  const zip = new PizZip(buffer)
  ensureCustomPropsInDocx(zip, data.codigoeducaplus)
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

export async function sellarPdf(
  buffer: Buffer,
  sello: SelloMetadata
): Promise<Buffer> {
  const data = normalizarSello(sello)
  if (!data.codigoeducaplus) {
    throw new Error('El código EducaPlus es obligatorio')
  }
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true })
  pdfDoc.setSubject(PDF_SUBJECT_PREFIX + encodeURIComponent(data.codigoeducaplus))
  pdfDoc.setCreator('EducaPlus')
  pdfDoc.setProducer('EducaPlus Sello Documentos')
  pdfDoc.setKeywords([`codigoeducaplus:${data.codigoeducaplus}`])
  return Buffer.from(await pdfDoc.save())
}

export function leerSelloDocx(buffer: Buffer): LecturaSello {
  try {
    const zip = new PizZip(buffer)
    const xml = zip.file('docProps/custom.xml')?.asText()
    if (!xml) {
      return { encontrado: false, metadatos: {}, formato: 'docx' }
    }
    const metadatos = parseCustomXml(xml)
    return {
      encontrado: tieneCodigo(metadatos),
      metadatos,
      formato: 'docx'
    }
  } catch {
    return { encontrado: false, metadatos: {}, formato: 'docx' }
  }
}

export async function leerSelloPdf(buffer: Buffer): Promise<LecturaSello> {
  try {
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

    return {
      encontrado: tieneCodigo(metadatos),
      metadatos,
      formato: 'pdf'
    }
  } catch {
    return { encontrado: false, metadatos: {}, formato: 'pdf' }
  }
}

export async function sellarArchivo(
  buffer: Buffer,
  nombre: string,
  sello: SelloMetadata
): Promise<Buffer> {
  const ext = extensionSello(nombre)
  if (ext === 'docx') return sellarDocx(buffer, sello)
  if (ext === 'pdf') return sellarPdf(buffer, sello)
  throw new Error(`Formato no soportado: ${nombre}`)
}

export async function leerSelloArchivo(
  buffer: Buffer,
  nombre: string
): Promise<LecturaSello> {
  const ext = extensionSello(nombre)
  if (ext === 'docx') return leerSelloDocx(buffer)
  if (ext === 'pdf') return await leerSelloPdf(buffer)
  return { encontrado: false, metadatos: {}, formato: 'desconocido' }
}
