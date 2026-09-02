import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import {
  extensionSello,
  normalizarSello,
  sellarArchivo,
  type SelloMetadata
} from '@/lib/documento-sello'
import {
  codigoSelloYaRegistrado,
  MSG_CODIGO_SELLO_DUPLICADO,
  registrarSelloDocumento
} from '@/lib/sello-documento-registro'
import {
  MAX_ARCHIVOS_LOTE_SELLO,
  MAX_FILE_BYTES_SELLO,
  MAX_FILE_MB_SELLO
} from '@/lib/sello-documento-constants'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILES = MAX_ARCHIVOS_LOTE_SELLO

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

    if (await codigoSelloYaRegistrado(sello.codigoeducaplus)) {
      return NextResponse.json(
        { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true },
        { status: 409 }
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
      if (archivo.size > MAX_FILE_BYTES_SELLO) {
        errores.push(`${nombre}: supera ${MAX_FILE_MB_SELLO} MB`)
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

    const registro = await registrarSelloDocumento(
      sello.codigoeducaplus,
      sellados
    )

    const codigo = sello.codigoeducaplus.replace(/[^\w-]+/g, '_')
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documentos_sellados_${codigo}.zip"`,
      'X-Sellados-Count': String(sellados),
      'X-Errores-Count': String(errores.length),
      'X-Registro-Sello-Id': String(registro.id),
      'X-Codigo-EducaPlus': encodeURIComponent(sello.codigoeducaplus)
    })
    if (errores.length > 0) {
      headers.set('X-Sello-Errores', encodeURIComponent(errores.join(';;')))
    }

    return new NextResponse(new Uint8Array(zipBuffer), { status: 200, headers })
  } catch (error) {
    console.error('sello-documentos/batch:', error)
    if (error instanceof Error && error.message === 'CODIGO_SELLO_DUPLICADO') {
      return NextResponse.json(
        { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true },
        { status: 409 }
      )
    }
    const msg =
      error instanceof Error ? error.message : 'Error al procesar los documentos'
    const esBd =
      msg.includes('registro_sello') ||
      msg.includes('RegistroSello') ||
      msg.includes('does not exist') ||
      msg.includes('P20')
    return NextResponse.json(
      {
        error: esBd
          ? 'No se pudo guardar el código en la base de datos. Ejecuta prisma db push o la migración de registro_sello_documento.'
          : 'Error al procesar los documentos',
        detalle: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
