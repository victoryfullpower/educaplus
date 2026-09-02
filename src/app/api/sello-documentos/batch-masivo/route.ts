import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import {
  extensionSello,
  sellarArchivo,
  type SelloMetadata
} from '@/lib/documento-sello'
import {
  carpetaCodigoEnZip,
  generarSerieCodigos,
  MSG_FORMATO_CODIGO_CORRELATIVO
} from '@/lib/sello-codigo-correlativo'
import {
  codigosSelloYaRegistrados,
  MSG_CODIGO_SELLO_DUPLICADO,
  registrarSelloDocumento
} from '@/lib/sello-documento-registro'
import {
  MAX_ARCHIVOS_LOTE_SELLO,
  MAX_COPIAS_MASIVO_SELLO,
  MAX_FILE_BYTES_SELLO,
  MAX_FILE_MB_SELLO
} from '@/lib/sello-documento-constants'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILES = MAX_ARCHIVOS_LOTE_SELLO

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const codigoBase = String(form.get('codigoeducaplus') ?? '').trim()
    const cantidadCopias = parseInt(String(form.get('cantidadCopias') ?? ''), 10)

    if (!codigoBase) {
      return NextResponse.json(
        { error: 'El código EducaPlus inicial es obligatorio' },
        { status: 400 }
      )
    }

    if (!Number.isFinite(cantidadCopias) || cantidadCopias < 1) {
      return NextResponse.json(
        { error: 'Indica cuántas copias correlativas necesitas (mínimo 1)' },
        { status: 400 }
      )
    }

    if (cantidadCopias > MAX_COPIAS_MASIVO_SELLO) {
      return NextResponse.json(
        { error: `Máximo ${MAX_COPIAS_MASIVO_SELLO} copias por operación masiva` },
        { status: 400 }
      )
    }

    let codigos: string[]
    try {
      codigos = generarSerieCodigos(codigoBase, cantidadCopias)
    } catch {
      return NextResponse.json(
        { error: MSG_FORMATO_CODIGO_CORRELATIVO },
        { status: 400 }
      )
    }

    const duplicados = await codigosSelloYaRegistrados(codigos)
    if (duplicados.length > 0) {
      return NextResponse.json(
        {
          error: MSG_CODIGO_SELLO_DUPLICADO,
          codigoDuplicado: true,
          codigosDuplicados: duplicados
        },
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
        { error: `Máximo ${MAX_FILES} archivos por carpeta` },
        { status: 400 }
      )
    }

    type ArchivoCargado = { nombre: string; buffer: Buffer }
    const cargados: ArchivoCargado[] = []
    const errores: string[] = []

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
      cargados.push({
        nombre,
        buffer: Buffer.from(await archivo.arrayBuffer())
      })
    }

    if (cargados.length === 0) {
      return NextResponse.json(
        {
          error: 'No se pudo procesar ningún documento',
          detalles: errores
        },
        { status: 400 }
      )
    }

    const zip = new JSZip()
    let selladosTotal = 0
    const registrosIds: number[] = []

    for (const codigo of codigos) {
      const sello: SelloMetadata = { codigoeducaplus: codigo }
      const carpeta = carpetaCodigoEnZip(codigo)
      let selladosCopia = 0

      for (const { nombre, buffer } of cargados) {
        try {
          const sellado = await sellarArchivo(buffer, nombre, sello)
          zip.file(`${carpeta}/${nombre}`, sellado)
          selladosCopia++
          selladosTotal++
        } catch (e) {
          errores.push(
            `${codigo}/${nombre}: ${e instanceof Error ? e.message : 'Error al sellar'}`
          )
        }
      }

      if (selladosCopia === 0) {
        return NextResponse.json(
          {
            error: `No se pudo sellar la copia ${codigo}`,
            detalles: errores
          },
          { status: 400 }
        )
      }

      const registro = await registrarSelloDocumento(codigo, selladosCopia)
      registrosIds.push(registro.id)
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const codigoSlug = carpetaCodigoEnZip(codigoBase)
    const ultimoCodigo = codigos[codigos.length - 1]
    const ultimoSlug = carpetaCodigoEnZip(ultimoCodigo)

    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sellado_masivo_${codigoSlug}_a_${ultimoSlug}.zip"`,
      'X-Copias-Count': String(codigos.length),
      'X-Sellados-Count': String(selladosTotal),
      'X-Errores-Count': String(errores.length),
      'X-Codigos-Generados': encodeURIComponent(codigos.join(';;')),
      'X-Registros-Sello-Ids': registrosIds.join(',')
    })
    if (errores.length > 0) {
      headers.set('X-Sello-Errores', encodeURIComponent(errores.join(';;')))
    }

    return new NextResponse(new Uint8Array(zipBuffer), { status: 200, headers })
  } catch (error) {
    console.error('sello-documentos/batch-masivo:', error)
    if (error instanceof Error && error.message === 'CODIGO_SELLO_DUPLICADO') {
      return NextResponse.json(
        { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true },
        { status: 409 }
      )
    }
    const msg =
      error instanceof Error ? error.message : 'Error al procesar el sellado masivo'
    return NextResponse.json(
      {
        error: 'Error al procesar el sellado masivo',
        detalle: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}
