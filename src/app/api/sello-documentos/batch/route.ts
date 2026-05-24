import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import {
  extensionSello,
  normalizarSello,
  sellarArchivo,
  type SelloMetadata
} from '@/lib/documento-sello'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MAX_FILES = 40
const MAX_FILE_BYTES = 20 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const sello: SelloMetadata = normalizarSello({
      codigoeducaplus: String(form.get('codigoeducaplus') ?? '')
    })

    if (!sello.codigoeducaplus) {
      return NextResponse.json(
        { error: 'El código EducaPlus es obligatorio' },
        { status: 400 }
      )
    }

    const archivos = form.getAll('archivos').filter((f): f is File => f instanceof File)
    if (archivos.length === 0) {
      return NextResponse.json(
        { error: 'Sube al menos un archivo .docx o .pdf' },
        { status: 400 }
      )
    }
    if (archivos.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} archivos por lote` },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const errores: string[] = []
    let sellados = 0

    for (const archivo of archivos) {
      const nombre = archivo.name || 'documento'
      if (!extensionSello(nombre)) {
        errores.push(`${nombre}: solo .docx o .pdf`)
        continue
      }
      if (archivo.size > MAX_FILE_BYTES) {
        errores.push(`${nombre}: supera 20 MB`)
        continue
      }

      try {
        const buf = Buffer.from(await archivo.arrayBuffer())
        const sellado = await sellarArchivo(buf, nombre, sello)
        zip.file(nombre, sellado)
        sellados++
      } catch (e) {
        errores.push(
          `${nombre}: ${e instanceof Error ? e.message : 'Error al sellar'}`
        )
      }
    }

    if (sellados === 0) {
      return NextResponse.json(
        {
          error: 'No se pudo sellar ningún archivo',
          detalles: errores
        },
        { status: 400 }
      )
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const codigo = sello.codigoeducaplus.replace(/[^\w-]+/g, '_')
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documentos_sellados_${codigo}.zip"`,
      'X-Sellados-Count': String(sellados),
      'X-Errores-Count': String(errores.length)
    })
    if (errores.length > 0) {
      headers.set('X-Sello-Errores', encodeURIComponent(errores.join(';;')))
    }

    return new NextResponse(new Uint8Array(zipBuffer), { status: 200, headers })
  } catch (error) {
    console.error('sello-documentos/batch:', error)
    return NextResponse.json(
      { error: 'Error al procesar los documentos' },
      { status: 500 }
    )
  }
}
