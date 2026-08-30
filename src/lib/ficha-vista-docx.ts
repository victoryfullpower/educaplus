/**
 * Word de ficha / solucionario con el mismo diseño visual de la vista HTML
 * (morado EducaPlus: #4c1d95, cards, banners, tablas índigo).
 * Usa `docx` (archivos que Word abre bien). Sin solucionario en la ficha.
 */
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  AlignmentType,
  VerticalAlign
} from 'docx'
import type { FichaVistaData } from '@/lib/ficha-vista-html'
import {
  etiquetaFichaDocumento,
  prepararCuerpoFichaAnalisis,
  tituloFichaVisible
} from '@/lib/ficha-vista-html'
import { markdownFichaToHtml } from '@/lib/markdown-ficha-html'
import { solucionarioCuerpoHtml } from '@/lib/sesion-refuerzo-vista-html'

/** Colores = home.module.css plantilla ficha */
const C = {
  morado: '4C1D95',
  moradoTexto: '312E81',
  indigoClaro: 'EEF2FF',
  bordeIndigo: 'C7D2FE',
  bordeGris: 'E2E8F0',
  bordeCelda: 'CBD5E1',
  fondoCard: 'F8FAFC',
  texto: '1E293B',
  textoSuave: '334155',
  blanco: 'FFFFFF',
  linea: '64748B'
}

const ANCHO = 9360
const FONT = 'Calibri'

type DocChild = Paragraph | Table

const borde = (color: string, size = 8) => ({
  style: BorderStyle.SINGLE,
  size,
  color
})
const bordes = (color: string, size = 8) => ({
  top: borde(color, size),
  bottom: borde(color, size),
  left: borde(color, size),
  right: borde(color, size)
})

function run(
  texto: string,
  opts?: {
    bold?: boolean
    size?: number
    color?: string
    italics?: boolean
  }
): TextRun {
  return new TextRun({
    text: String(texto ?? '').replace(/\u0000/g, '') || '',
    bold: opts?.bold,
    italics: opts?.italics,
    size: opts?.size ?? 20,
    font: FONT,
    color: opts?.color ?? C.texto
  })
}

function p(
  children: TextRun[] | string,
  opts?: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType]
    after?: number
    before?: number
  }
): Paragraph {
  const kids =
    typeof children === 'string'
      ? [run(children || ' ')]
      : children.length > 0
        ? children
        : [run(' ')]
  return new Paragraph({
    alignment: opts?.align,
    spacing: { after: opts?.after ?? 120, before: opts?.before ?? 0 },
    children: kids
  })
}

function decodeHtml(s: string): string {
  return String(s ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, '')
    .replace(/\u0000/g, '')
    .trim()
}

function runsDesdeHtmlInline(
  html: string,
  base?: { size?: number; color?: string; bold?: boolean }
): TextRun[] {
  const raw = String(html ?? '')
  if (!raw.trim()) return [run(' ', base)]
  const parts: TextRun[] = []
  const re = /<(strong|b|em|i)>([\s\S]*?)<\/\1>|([^<]+)/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (m[1]) {
      const tag = m[1].toLowerCase()
      const texto = decodeHtml(m[2])
      if (!texto) continue
      parts.push(
        run(texto, {
          ...base,
          bold: base?.bold || tag === 'strong' || tag === 'b',
          italics: tag === 'em' || tag === 'i'
        })
      )
    } else if (m[3]) {
      const texto = decodeHtml(m[3])
      if (texto) parts.push(run(texto, base))
    }
  }
  return parts.length > 0 ? parts : [run(decodeHtml(raw) || ' ', base)]
}

function celda(
  contenido: Paragraph[],
  opts: {
    width: number
    fill?: string
    borders?: ReturnType<typeof bordes>
    alignV?: typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM
    leftAccent?: boolean
  }
): TableCell {
  const borders = opts.borders ?? bordes(C.bordeCelda)
  return new TableCell({
    borders: opts.leftAccent
      ? {
          ...borders,
          left: borde(C.morado, 24)
        }
      : borders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: opts.fill
      ? { type: ShadingType.CLEAR, fill: opts.fill, color: 'auto' }
      : undefined,
    verticalAlign: opts.alignV ?? VerticalAlign.TOP,
    children: contenido.length > 0 ? contenido : [p(' ')]
  })
}

function bannerSeccion(titulo: string): Table {
  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: [ANCHO],
    rows: [
      new TableRow({
        children: [
          celda(
            [
              p([run(titulo.toUpperCase(), { bold: true, size: 22, color: C.blanco })], {
                align: AlignmentType.CENTER,
                after: 40,
                before: 40
              })
            ],
            {
              width: ANCHO,
              fill: C.morado,
              borders: bordes(C.morado),
              alignV: VerticalAlign.CENTER
            }
          )
        ]
      })
    ]
  })
}

function lineaRespuesta(): Paragraph {
  return p(
    [run('_______________________________________________', { color: C.linea, size: 18 })],
    { after: 80 }
  )
}

function listaComoParrafos(htmlLista: string): Paragraph[] {
  const items = [...htmlLista.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) =>
    decodeHtml(m[1])
  )
  if (items.length === 0) {
    const t = decodeHtml(htmlLista)
    return t ? [p([run(t, { size: 18 })])] : [p('—')]
  }
  return items.map((item) => p([run(`• ${item}`, { size: 18 })], { after: 60 }))
}

function celdaTextoOLista(html: string, width: number, esHeader = false): TableCell {
  const tieneLista = /<ul|<ol/i.test(html)
  const kids = tieneLista
    ? listaComoParrafos(html)
    : [
        p(
          runsDesdeHtmlInline(html, {
            size: 16,
            color: esHeader ? C.morado : C.texto,
            bold: esHeader
          }),
          {
            align: esHeader ? AlignmentType.CENTER : AlignmentType.BOTH,
            after: 40
          }
        )
      ]
  return celda(kids, {
    width,
    fill: esHeader ? C.indigoClaro : C.blanco,
    borders: bordes(esHeader ? C.bordeIndigo : C.bordeCelda),
    alignV: esHeader ? VerticalAlign.CENTER : VerticalAlign.TOP
  })
}

/** Convierte un `<table>...</table>` HTML a Table de docx (conserva filas/columnas). */
function htmlTablaADocxSimple(tableHtml: string): Table | null {
  const inner = tableHtml.replace(/^<table[^>]*>/i, '').replace(/<\/table>$/i, '')
  const filas = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]
  if (filas.length === 0) return null

  const parsed = filas.map((fr) => {
    const celdas = [...fr[1].matchAll(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi)]
    return celdas.map((c) => ({
      th: c[1].toLowerCase() === 'th',
      html: c[2]
    }))
  })
  const cols = Math.max(...parsed.map((r) => r.length), 1)
  const colW = Math.floor(ANCHO / cols)
  const primeraEsHeader = parsed[0]?.some((c) => c.th) ?? false

  return new Table({
    width: { size: ANCHO, type: WidthType.DXA },
    columnWidths: Array(cols).fill(colW),
    rows: parsed.map(
      (row, rowIdx) =>
        new TableRow({
          children: Array.from({ length: cols }, (_, i) => {
            const cell = row[i]
            const esHeader = Boolean(cell?.th) || (primeraEsHeader && rowIdx === 0)
            return celdaTextoOLista(cell?.html ?? '—', colW, esHeader)
          })
        })
    )
  })
}

/**
 * Convierte HTML de ficha/solucionario a elementos Word.
 * Extrae tablas primero (placeholders) para que no se pierdan dentro de cards/divs.
 */
function cuerpoHtmlADocx(html: string): DocChild[] {
  const tablas: Table[] = []
  let t = String(html ?? '')

  // 1) Extraer TODAS las tablas a placeholders (crítico para solucionario)
  t = t.replace(
    /<div[^>]*class="[^"]*tabla-wrap[^"]*"[^>]*>\s*(<table[\s\S]*?<\/table>)\s*<\/div>/gi,
    '$1'
  )
  t = t.replace(/<table[\s\S]*?<\/table>/gi, (match) => {
    const docxTable = htmlTablaADocxSimple(match)
    if (!docxTable) return ''
    const idx = tablas.length
    tablas.push(docxTable)
    return `\n[[TABLA_${idx}]]\n`
  })

  t = t.replace(
    /<div[^>]*class="[^"]*ficha-doc-linea-respuesta[^"]*"[^>]*>\s*<\/div>/gi,
    '\n[[LINEA]]\n'
  )

  t = t.replace(
    /<div[^>]*class="[^"]*ficha-doc-linea-bloque[^"]*"[^>]*>[\s\S]*?<p[^>]*class="[^"]*ficha-doc-linea-etiqueta[^"]*"[^>]*>([\s\S]*?)<\/p>[\s\S]*?<\/div>/gi,
    (_m, etiq) => `\n[[ETIQ]]${decodeHtml(etiq)}[[/ETIQ]]\n[[LINEA]]\n`
  )

  // Cards: aplanar para no perder tablas/párrafos internos
  t = t.replace(
    /<div[^>]*class="[^"]*(?:ficha-doc-proceso-card|ficha-doc-subtitulo-card|ficha-doc-fase-contenido|ficha-doc-bloque-contenido|refuerzo-doc-card|refuerzo-doc-solucionario-actividad)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    (_m, inner) => `\n${inner}\n`
  )

  t = t.replace(/<\/?(?:section|aside|article|header)[^>]*>/gi, '\n')

  const out: DocChild[] = []

  // Tokenizar por placeholders y tags de bloque (una sola pasada; tablas ya resueltas)
  const re =
    /\[\[TABLA_(\d+)\]\]|\[\[LINEA\]\]|\[\[ETIQ\]\]([\s\S]*?)\[\[\/ETIQ\]\]|<h([1-4])[^>]*>([\s\S]*?)<\/h\3>|<p([^>]*)>([\s\S]*?)<\/p>|<(ul|ol)([^>]*)>([\s\S]*?)<\/\7>/gi

  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(t)) !== null) {
    const before = t.slice(last, m.index).trim()
    if (before) {
      const texto = decodeHtml(before)
      if (texto && texto.length > 1) {
        out.push(p([run(texto, { size: 20 })], { after: 80 }))
      }
    }
    last = m.index + m[0].length

    if (m[1] != null && m[0].startsWith('[[TABLA_')) {
      const idx = Number(m[1])
      if (tablas[idx]) {
        out.push(tablas[idx])
        out.push(p(' ', { after: 120 }))
      }
      continue
    }

    if (m[0] === '[[LINEA]]') {
      out.push(lineaRespuesta())
      continue
    }

    if (m[2] != null && m[0].startsWith('[[ETIQ]]')) {
      out.push(p(runsDesdeHtmlInline(m[2], { size: 18, color: C.textoSuave }), { after: 40 }))
      continue
    }

    if (m[3] != null) {
      // heading
      const nivel = Number(m[3])
      const contenido = m[4] ?? ''
      const textoPlano = decodeHtml(contenido)
      if (/ficha-doc-seccion-titulo/i.test(m[0]) || /^(SOLUCIONARIO|SABERES PREVIOS|ACTIVIDADES)$/i.test(textoPlano)) {
        out.push(bannerSeccion(textoPlano))
        out.push(p(' ', { after: 120 }))
      } else {
        out.push(
          p(
            runsDesdeHtmlInline(contenido, {
              bold: true,
              size: nivel <= 3 ? 22 : 20,
              color: C.morado
            }),
            { after: 100, before: 100 }
          )
        )
      }
      continue
    }

    if (m[6] != null && m[0].startsWith('<p')) {
      const attrs = m[5] ?? ''
      const contenido = m[6] ?? ''
      const txt = decodeHtml(contenido)
      if (!txt || txt === '—') continue

      if (/ficha-doc-proceso-didactico/i.test(attrs)) {
        out.push(
          p(runsDesdeHtmlInline(contenido, { bold: true, size: 22, color: C.morado }), {
            after: 100,
            before: 80
          })
        )
      } else if (/ficha-doc-actividad-titulo|refuerzo-doc-subtitulo|refuerzo-doc-bloque-titulo/i.test(attrs)) {
        out.push(
          p(runsDesdeHtmlInline(contenido, { bold: true, size: 20, color: '1E1B4B' }), {
            after: 80,
            before: 100
          })
        )
      } else if (/ficha-doc-titulo-teorico/i.test(attrs)) {
        out.push(
          p(runsDesdeHtmlInline(contenido, { bold: true, size: 22, color: C.moradoTexto }), {
            after: 100,
            align: AlignmentType.CENTER
          })
        )
      } else if (/ficha-doc-subtitulo-teorico|refuerzo-doc-subtitulo-interno/i.test(attrs)) {
        out.push(
          p(runsDesdeHtmlInline(contenido, { bold: true, size: 20, color: C.morado }), {
            after: 80
          })
        )
      } else {
        out.push(p(runsDesdeHtmlInline(contenido, { size: 20 }), { after: 100 }))
      }
      continue
    }

    if (m[7] != null) {
      out.push(...listaComoParrafos(m[0]))
      continue
    }
  }

  const tail = t.slice(last).trim()
  if (tail) {
    const texto = decodeHtml(tail)
    if (texto && texto.length > 1) {
      out.push(p([run(texto, { size: 20 })], { after: 80 }))
    }
  }

  return out
}

function prepararCuerpoMarkdown(data: FichaVistaData): string {
  const promptRaw = (data.respuestaprompt ?? '').trim()
  if (!promptRaw) return ''
  // Misma preparación que la vista HTML (ya excluye solucionario).
  return markdownFichaToHtml(prepararCuerpoFichaAnalisis(promptRaw), {
    procesosDidacticos: data.procesosDidacticos ?? []
  })
}

export async function construirDocxDesdeFichaVista(data: FichaVistaData): Promise<Buffer> {
  const titulo = (tituloFichaVisible(data) || 'Ficha de aprendizaje').toUpperCase()
  const etiqueta = etiquetaFichaDocumento(data.numeroSesion).toUpperCase()
  const docente = (data.docente || 'EducaPlus').trim() || '—'
  const area = (data.area ?? '').trim() || '—'
  const grado = (data.grado ?? '').trim() || '—'
  const proposito = (data.proposito ?? '').trim() || '—'
  const competencia = (data.competencia ?? '').trim() || '—'
  const capacidadHtml = (data.capacidad ?? '').trim()
  const evidencia = (data.evidencia ?? '').trim() || '—'
  const criterios = (data.criterios ?? '').trim() || '—'

  const saberesLista =
    Array.isArray(data.saberes) && data.saberes.length > 0
      ? data.saberes.map((s) => s.trim()).filter(Boolean).slice(0, 3)
      : [data.saber1, data.saber2, data.saber3]
          .map((s) => (s ?? '').trim())
          .filter(Boolean)
          .slice(0, 3)

  const wLabel = Math.floor(ANCHO * 0.18)
  const wValor = Math.floor(ANCHO * 0.32)

  const children: DocChild[] = [
    p([run(etiqueta, { bold: true, size: 20, color: C.morado })], {
      align: AlignmentType.CENTER,
      after: 160,
      before: 80
    }),
    new Table({
      width: { size: ANCHO, type: WidthType.DXA },
      columnWidths: [ANCHO],
      rows: [
        new TableRow({
          children: [
            celda(
              [
                p([run(titulo, { bold: true, size: 26, color: C.moradoTexto })], {
                  align: AlignmentType.CENTER,
                  after: 60,
                  before: 60
                })
              ],
              {
                width: ANCHO,
                fill: C.fondoCard,
                borders: {
                  top: borde(C.morado, 24),
                  bottom: borde(C.morado, 24),
                  left: borde(C.morado, 24),
                  right: borde(C.morado, 24)
                }
              }
            )
          ]
        })
      ]
    }),
    p(' ', { after: 160 }),
    new Table({
      width: { size: ANCHO, type: WidthType.DXA },
      columnWidths: [wLabel, wValor, wLabel, wValor],
      rows: [
        new TableRow({
          children: [
            celda(
              [p([run('DOCENTE', { bold: true, size: 18, color: C.morado })], { after: 40 })],
              { width: wLabel, fill: C.indigoClaro, borders: bordes(C.bordeIndigo) }
            ),
            celda([p([run(docente, { size: 18 })], { after: 40 })], {
              width: wValor,
              fill: C.blanco,
              borders: bordes(C.bordeGris)
            }),
            celda(
              [p([run('ESTUDIANTE', { bold: true, size: 18, color: C.morado })], { after: 40 })],
              { width: wLabel, fill: C.indigoClaro, borders: bordes(C.bordeIndigo) }
            ),
            celda([p([run('—', { size: 18, color: '94A3B8' })], { after: 40 })], {
              width: wValor,
              fill: C.blanco,
              borders: bordes(C.bordeGris)
            })
          ]
        }),
        new TableRow({
          children: [
            celda(
              [p([run('ÁREA', { bold: true, size: 18, color: C.morado })], { after: 40 })],
              { width: wLabel, fill: C.indigoClaro, borders: bordes(C.bordeIndigo) }
            ),
            celda([p([run(area, { size: 18 })], { after: 40 })], {
              width: wValor,
              fill: C.blanco,
              borders: bordes(C.bordeGris)
            }),
            celda(
              [
                p([run('GRADO / SECCIÓN', { bold: true, size: 18, color: C.morado })], {
                  after: 40
                })
              ],
              { width: wLabel, fill: C.indigoClaro, borders: bordes(C.bordeIndigo) }
            ),
            celda([p([run(grado, { size: 18 })], { after: 40 })], {
              width: wValor,
              fill: C.blanco,
              borders: bordes(C.bordeGris)
            })
          ]
        })
      ]
    }),
    p(' ', { after: 160 }),
    new Table({
      width: { size: ANCHO, type: WidthType.DXA },
      columnWidths: [ANCHO],
      rows: [
        new TableRow({
          children: [
            celda(
              [
                p([run('PROPÓSITO DE LA SESIÓN', { bold: true, size: 16, color: C.morado })], {
                  after: 80
                }),
                p([run(proposito, { size: 20, color: C.textoSuave })], {
                  align: AlignmentType.BOTH,
                  after: 40
                })
              ],
              {
                width: ANCHO,
                fill: C.fondoCard,
                borders: bordes(C.bordeGris),
                leftAccent: true
              }
            )
          ]
        })
      ]
    }),
    p(' ', { after: 160 })
  ]

  const wComp = Math.floor(ANCHO * 0.2)
  const wCap = Math.floor(ANCHO * 0.3)
  const wEvi = Math.floor(ANCHO * 0.2)
  const wCri = ANCHO - wComp - wCap - wEvi

  const capacidadParrafos = (() => {
    const lineas = capacidadHtml
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
    if (lineas.length <= 1) {
      return [p([run(capacidadHtml || '—', { size: 18 })], { after: 40 })]
    }
    return lineas.map((l) => p([run(`• ${l}`, { size: 18 })], { after: 40 }))
  })()

  const criteriosParrafos = (() => {
    const lineas = criterios
      .split(/\n+/)
      .map((l) => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
    if (lineas.length <= 1) {
      return [p([run(criterios, { size: 18 })], { after: 40 })]
    }
    return lineas.map((l) => p([run(`• ${l}`, { size: 18 })], { after: 40 }))
  })()

  children.push(
    new Table({
      width: { size: ANCHO, type: WidthType.DXA },
      columnWidths: [wComp, wCap, wEvi, wCri],
      rows: [
        new TableRow({
          children: [
            celda(
              [
                p([run('COMPETENCIA', { bold: true, size: 16, color: C.morado })], {
                  align: AlignmentType.CENTER,
                  after: 40
                })
              ],
              {
                width: wComp,
                fill: C.indigoClaro,
                borders: bordes(C.bordeIndigo),
                alignV: VerticalAlign.CENTER
              }
            ),
            celda(
              [
                p([run('CAPACIDADES', { bold: true, size: 16, color: C.morado })], {
                  align: AlignmentType.CENTER,
                  after: 40
                })
              ],
              {
                width: wCap,
                fill: C.indigoClaro,
                borders: bordes(C.bordeIndigo),
                alignV: VerticalAlign.CENTER
              }
            ),
            celda(
              [
                p([run('EVIDENCIA', { bold: true, size: 16, color: C.morado })], {
                  align: AlignmentType.CENTER,
                  after: 40
                })
              ],
              {
                width: wEvi,
                fill: C.indigoClaro,
                borders: bordes(C.bordeIndigo),
                alignV: VerticalAlign.CENTER
              }
            ),
            celda(
              [
                p([run('CRITERIOS', { bold: true, size: 16, color: C.morado })], {
                  align: AlignmentType.CENTER,
                  after: 40
                })
              ],
              {
                width: wCri,
                fill: C.indigoClaro,
                borders: bordes(C.bordeIndigo),
                alignV: VerticalAlign.CENTER
              }
            )
          ]
        }),
        new TableRow({
          children: [
            celda(
              [p([run(competencia, { size: 18 })], { align: AlignmentType.BOTH, after: 40 })],
              { width: wComp, fill: C.blanco, borders: bordes(C.bordeCelda) }
            ),
            celda(capacidadParrafos, {
              width: wCap,
              fill: C.blanco,
              borders: bordes(C.bordeCelda)
            }),
            celda(
              [p([run(evidencia, { size: 18 })], { align: AlignmentType.BOTH, after: 40 })],
              { width: wEvi, fill: C.blanco, borders: bordes(C.bordeCelda) }
            ),
            celda(criteriosParrafos, {
              width: wCri,
              fill: C.blanco,
              borders: bordes(C.bordeCelda)
            })
          ]
        })
      ]
    })
  )

  children.push(p(' ', { after: 200 }))

  if (saberesLista.length > 0) {
    children.push(bannerSeccion('SABERES PREVIOS'))
    children.push(p(' ', { after: 120 }))
    for (const s of saberesLista) {
      children.push(
        new Table({
          width: { size: ANCHO, type: WidthType.DXA },
          columnWidths: [ANCHO],
          rows: [
            new TableRow({
              children: [
                celda(
                  [
                    p([run(s, { size: 20 })], { align: AlignmentType.BOTH, after: 100 }),
                    lineaRespuesta(),
                    lineaRespuesta()
                  ],
                  {
                    width: ANCHO,
                    fill: C.blanco,
                    borders: bordes(C.bordeGris),
                    leftAccent: true
                  }
                )
              ]
            })
          ]
        })
      )
      children.push(p(' ', { after: 100 }))
    }
  }

  const cuerpoHtml = prepararCuerpoMarkdown(data)
  if (cuerpoHtml.trim()) {
    children.push(...cuerpoHtmlADocx(cuerpoHtml))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  })

  return (await Packer.toBuffer(doc)) as Buffer
}

export async function construirDocxDesdeSolucionarioVista(opts: {
  tituloSesion: string
  area?: string
  grado?: string
  respuestaprompt: string
}): Promise<Buffer> {
  const titulo = (opts.tituloSesion || 'Solucionario').trim()
  const area = (opts.area || '').trim()
  const grado = (opts.grado || '').trim()
  const texto = (opts.respuestaprompt || '').trim()

  const children: DocChild[] = [
    p([run('SOLUCIONARIO (USO DOCENTE)', { bold: true, size: 18, color: C.morado })], {
      align: AlignmentType.CENTER,
      after: 80
    }),
    new Table({
      width: { size: ANCHO, type: WidthType.DXA },
      columnWidths: [ANCHO],
      rows: [
        new TableRow({
          children: [
            celda(
              [
                p([run(titulo.toUpperCase(), { bold: true, size: 24, color: C.moradoTexto })], {
                  align: AlignmentType.CENTER,
                  after: 40,
                  before: 40
                })
              ],
              {
                width: ANCHO,
                fill: C.fondoCard,
                borders: {
                  top: borde(C.morado, 24),
                  bottom: borde(C.morado, 24),
                  left: borde(C.morado, 24),
                  right: borde(C.morado, 24)
                }
              }
            )
          ]
        })
      ]
    }),
    p(' ', { after: 120 })
  ]

  if (area || grado) {
    children.push(
      p([run([area, grado].filter(Boolean).join(' · '), { size: 18, color: C.textoSuave })], {
        align: AlignmentType.CENTER,
        after: 200
      })
    )
  }

  if (!texto) {
    children.push(p('(Sin contenido de solucionario)'))
  } else {
    // Mismo HTML que la vista previa (incluye <table> reales)
    const html = solucionarioCuerpoHtml(texto)
    children.push(bannerSeccion('SOLUCIONARIO'))
    children.push(p(' ', { after: 120 }))
    children.push(...cuerpoHtmlADocx(html))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  })

  return (await Packer.toBuffer(doc)) as Buffer
}

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
