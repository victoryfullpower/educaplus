/**
 * Convierte el HTML de la vista previa (ficha / solucionario) a un .docx válido.
 * Se limpia el HTML porque html-to-docx falla con atributos/aria/clases complejas.
 */
import HTMLtoDOCX from 'html-to-docx'
import PizZip from 'pizzip'

const ESTILOS_VISTA = `
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 16pt; margin: 0 0 10pt; color: #1b5e20; }
  h2, h3, h4 { font-size: 12pt; margin: 12pt 0 6pt; color: #1b5e20; }
  p { margin: 0 0 6pt; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th, td { border: 1px solid #2e7d4f; padding: 6pt 8pt; vertical-align: top; text-align: left; }
  th { background: #c8e6c9; font-weight: bold; font-size: 9pt; }
  ul, ol { margin: 4pt 0 8pt 18pt; }
  li { margin-bottom: 3pt; }
  hr { border: none; border-top: 1px solid #a5d6a7; margin: 12pt 0; }
  strong { font-weight: bold; }
`

/** Solo tags que Word/html-to-docx maneja bien. */
const TAGS_PERMITIDOS = new Set([
  'html',
  'head',
  'body',
  'meta',
  'title',
  'style',
  'h1',
  'h2',
  'h3',
  'h4',
  'p',
  'div',
  'span',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'article',
  'section',
  'header',
  'aside'
])

function limpiarHtmlParaDocx(html: string): string {
  let t = String(html ?? '')

  // Líneas de respuesta vacías / decorativas → párrafo vacío usable
  t = t.replace(
    /<div[^>]*class="[^"]*ficha-doc-linea-respuesta[^"]*"[^>]*>\s*<\/div>/gi,
    '<p>________________________________</p>'
  )

  // Quitar scripts/styles embebidos del cuerpo (usamos el nuestro)
  t = t.replace(/<script[\s\S]*?<\/script>/gi, '')
  t = t.replace(/<style[\s\S]*?<\/style>/gi, '')

  // colgroup no aporta y a veces rompe
  t = t.replace(/<colgroup[\s\S]*?<\/colgroup>/gi, '')
  t = t.replace(/<\/?col\b[^>]*>/gi, '')

  // Quitar comentarios
  t = t.replace(/<!--[\s\S]*?-->/g, '')

  // Convertir divs de bloque frecuentes a p/h
  t = t.replace(
    /<(div|p)[^>]*class="[^"]*ficha-doc-etiqueta[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<p><strong>$2</strong></p>'
  )
  t = t.replace(
    /<(div|p|h1)[^>]*class="[^"]*ficha-doc-titulo-sesion[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<h1>$2</h1>'
  )
  t = t.replace(
    /<(div|p)[^>]*class="[^"]*ficha-doc-proposito-label[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<h3>$2</h3>'
  )
  t = t.replace(
    /<(div|h3|p)[^>]*class="[^"]*ficha-doc-seccion-titulo[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<h3>$2</h3>'
  )
  t = t.replace(
    /<(p|div)[^>]*class="[^"]*refuerzo-doc-eyebrow[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<p><strong>$2</strong></p>'
  )
  t = t.replace(
    /<(h1|div)[^>]*class="[^"]*refuerzo-doc-titulo-principal[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    '<h1>$2</h1>'
  )

  // Quitar atributos (class, aria, style, id, role…) de todos los tags
  t = t.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tag: string, attrs?: string) => {
    const name = tag.toLowerCase()
    const closing = full.startsWith('</')
    if (!TAGS_PERMITIDOS.has(name)) {
      return ''
    }
    if (closing) return `</${name}>`
    if (name === 'br' || name === 'hr' || name === 'meta') return `<${name}/>`
    // Conservar colspan/rowspan en celdas
    let extra = ''
    if (attrs && (name === 'td' || name === 'th')) {
      const colspan = attrs.match(/\scolspan\s*=\s*["']?(\d+)/i)
      const rowspan = attrs.match(/\srowspan\s*=\s*["']?(\d+)/i)
      if (colspan) extra += ` colspan="${colspan[1]}"`
      if (rowspan) extra += ` rowspan="${rowspan[1]}"`
    }
    return `<${name}${extra}>`
  })

  // Colapsar divs vacíos
  t = t.replace(/<div>\s*<\/div>/gi, '')
  t = t.replace(/<p>\s*<\/p>/gi, '<p> </p>')
  t = t.replace(/\n{3,}/g, '\n\n')

  return t.trim()
}

function envolverHtmlDocumento(cuerpo: string, titulo: string): string {
  const tituloSeguro = titulo.replace(/[<>&]/g, '')
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>${tituloSeguro}</title>
  <style>${ESTILOS_VISTA}</style>
</head>
<body>
${limpiarHtmlParaDocx(cuerpo)}
</body>
</html>`
}

function aBuffer(out: unknown): Buffer {
  if (Buffer.isBuffer(out)) return out
  if (out instanceof ArrayBuffer) return Buffer.from(out)
  if (out instanceof Uint8Array) return Buffer.from(out)
  if (typeof out === 'string') return Buffer.from(out, 'binary')
  throw new Error('html-to-docx devolvió un tipo no soportado')
}

function assertDocxValido(buf: Buffer) {
  if (!buf || buf.length < 100) {
    throw new Error('El Word generado está vacío')
  }
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) {
    throw new Error('El archivo generado no es un .docx válido')
  }
  // Validar que abre como zip OOXML
  const zip = new PizZip(buf)
  if (!zip.file('word/document.xml') && !zip.file('[Content_Types].xml')) {
    throw new Error('El .docx no tiene estructura Word válida')
  }
}

export async function htmlVistaADocx(
  htmlCuerpo: string,
  tituloDocumento: string
): Promise<Buffer> {
  const html = envolverHtmlDocumento(htmlCuerpo, tituloDocumento)
  const out = await HTMLtoDOCX(html, null, {
    title: tituloDocumento.replace(/[^\w\s.-]/g, '').slice(0, 80) || 'Documento',
    margins: { top: 720, right: 720, bottom: 720, left: 720 },
    table: { row: { cantSplit: true } },
    footer: false,
    pageNumber: false
  })
  const buf = aBuffer(out)
  assertDocxValido(buf)
  return buf
}

/** Nombre de archivo ASCII seguro para Windows/Word. */
export function nombreArchivoDocxSeguro(base: string, ext = 'docx'): string {
  const limpio = String(base || 'documento')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80)
  return `${limpio || 'documento'}.${ext.replace(/^\./, '')}`
}
