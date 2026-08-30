import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { esPdfPorNombre, protegerPdfBuffer } from '@/lib/pdf-proteccion'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const MAX_FILES = 20
const MAX_FILE_BYTES = 25 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const archivos = form.getAll('archivos').filter((f): f is File => f instanceof File)

    if (archivos.length === 0) {
      return NextResponse.json(
        { error: 'Sube al menos un archivo PDF' },
        { status: 400 }
      )
    }
    if (archivos.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} PDF por lote` },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    const errores: string[] = []
    const salidas: { nombre: string; buffer: Buffer }[] = []

    for (const archivo of archivos) {
      const nombre = archivo.name || 'documento.pdf'
      if (!esPdfPorNombre(nombre)) {
        errores.push(`${nombre}: solo archivos .pdf`)
        continue
      }
      if (archivo.size > MAX_FILE_BYTES) {
        errores.push(`${nombre}: supera 25 MB`)
        continue
      }

      try {
        const buf = Buffer.from(await archivo.arrayBuffer())
        const protegido = await protegerPdfBuffer(buf)
        const base = nombre.replace(/\.pdf$/i, '') || 'documento'
        salidas.push({ nombre: `${base}_protegido.pdf`, buffer: protegido })
      } catch (e) {
        errores.push(
          `${nombre}: ${e instanceof Error ? e.message : 'Error al proteger'}`
        )
      }
    }

    const protegidos = salidas.length
    if (protegidos === 0) {
      return NextResponse.json(
        {
          error: 'No se pudo proteger ningún PDF',
          detalles: errores
        },
        { status: 400 }
      )
    }

    if (protegidos === 1) {
      const headers = new Headers({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${salidas[0].nombre}"`,
        'X-Protegidos-Count': '1',
        'X-Errores-Count': String(errores.length)
      })
      if (errores.length > 0) {
        headers.set('X-Proteger-Errores', encodeURIComponent(errores.join(';;')))
      }
      return new NextResponse(new Uint8Array(salidas[0].buffer), {
        status: 200,
        headers
      })
    }

    for (const s of salidas) {
      zip.file(s.nombre, s.buffer)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="pdfs_protegidos.zip"',
      'X-Protegidos-Count': String(protegidos),
      'X-Errores-Count': String(errores.length)
    })
    if (errores.length > 0) {
      headers.set('X-Proteger-Errores', encodeURIComponent(errores.join(';;')))
    }

    return new NextResponse(new Uint8Array(zipBuffer), { status: 200, headers })
  } catch (error) {
    console.error('sello-documentos/proteger-pdf:', error)
    return NextResponse.json(
      { error: 'Error al procesar los PDF' },
      { status: 500 }
    )
  }
}
