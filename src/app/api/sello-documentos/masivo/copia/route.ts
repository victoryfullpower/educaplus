import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { sellarArchivo, type SelloMetadata } from '@/lib/documento-sello'
import { carpetaCodigoEnZip } from '@/lib/sello-codigo-correlativo'
import {
  codigoSelloYaRegistrado,
  MSG_CODIGO_SELLO_DUPLICADO,
  registrarSelloDocumento
} from '@/lib/sello-documento-registro'
import {
  guardarCopiaSelladaSesion,
  obtenerCopiaSelladaSesion,
  obtenerSesionMasivo
} from '@/lib/sello-masivo-sesion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function construirZipCopia(
  sessionId: string,
  codigo: string
): Promise<
  | { ok: true; copia: NonNullable<ReturnType<typeof obtenerCopiaSelladaSesion>> }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  const sesion = obtenerSesionMasivo(sessionId)
  if (!sesion) {
    return {
      ok: false,
      status: 410,
      body: { error: 'La sesión expiró. Vuelve a subir la carpeta.' }
    }
  }

  const copiaCache = obtenerCopiaSelladaSesion(sessionId, codigo)
  if (copiaCache) {
    return { ok: true, copia: copiaCache }
  }

  if (await codigoSelloYaRegistrado(codigo)) {
    return {
      ok: false,
      status: 409,
      body: { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true }
    }
  }

  const sello: SelloMetadata = { codigoeducaplus: codigo }
  const carpeta = carpetaCodigoEnZip(codigo)
  const zip = new JSZip()
  const errores: string[] = []
  let sellados = 0

  for (const { nombre, buffer } of sesion.archivos) {
    try {
      const sellado = await sellarArchivo(buffer, nombre, sello)
      zip.file(`${carpeta}/${nombre}`, sellado)
      sellados++
    } catch (e) {
      errores.push(
        `${nombre}: ${e instanceof Error ? e.message : 'Error al sellar'}`
      )
    }
  }

  let adjuntosIncluidos = 0
  for (const { nombre, buffer } of sesion.adjuntos) {
    zip.file(`${carpeta}/${nombre}`, buffer, { compression: 'STORE' })
    adjuntosIncluidos++
  }

  if (sellados === 0) {
    return {
      ok: false,
      status: 400,
      body: {
        error: `No se pudo sellar la copia ${codigo}`,
        detalles: errores
      }
    }
  }

  const registro = await registrarSelloDocumento(codigo, sellados)
  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  const copia = {
    zipBuffer,
    sellados,
    adjuntos: adjuntosIncluidos,
    registroId: registro.id,
    errores
  }

  guardarCopiaSelladaSesion(sessionId, codigo, copia)
  return { ok: true, copia }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim() ?? ''
    const codigo = request.nextUrl.searchParams.get('codigo')?.trim() ?? ''

    if (!sessionId || !codigo) {
      return NextResponse.json(
        { error: 'sessionId y codigo son obligatorios' },
        { status: 400 }
      )
    }

    let copia = obtenerCopiaSelladaSesion(sessionId, codigo)
    if (!copia) {
      const resultado = await construirZipCopia(sessionId, codigo)
      if (!resultado.ok) {
        return NextResponse.json(resultado.body, { status: resultado.status })
      }
      copia = resultado.copia
    }

    const codigoSlug = carpetaCodigoEnZip(codigo)
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="sellado_${codigoSlug}.zip"`,
      'X-Sellados-Count': String(copia.sellados),
      'X-Adjuntos-Count': String(copia.adjuntos),
      'Cache-Control': 'no-store'
    })

    return new NextResponse(new Uint8Array(copia.zipBuffer), { status: 200, headers })
  } catch (error) {
    console.error('sello-documentos/masivo/copia GET:', error)
    return NextResponse.json({ error: 'Error al descargar la copia' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: string
      codigoeducaplus?: string
    }

    const sessionId = String(body.sessionId ?? '').trim()
    const codigo = String(body.codigoeducaplus ?? '').trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'Sesión no válida' }, { status: 400 })
    }
    if (!codigo) {
      return NextResponse.json(
        { error: 'El código EducaPlus es obligatorio' },
        { status: 400 }
      )
    }

    const desdeCache = Boolean(obtenerCopiaSelladaSesion(sessionId, codigo))
    const resultado = await construirZipCopia(sessionId, codigo)

    if (!resultado.ok) {
      return NextResponse.json(resultado.body, { status: resultado.status })
    }

    const { copia } = resultado

    return NextResponse.json({
      ok: true,
      codigo,
      sellados: copia.sellados,
      adjuntos: copia.adjuntos,
      registroId: copia.registroId,
      errores: copia.errores,
      desdeCache
    })
  } catch (error) {
    console.error('sello-documentos/masivo/copia POST:', error)
    if (error instanceof Error && error.message === 'CODIGO_SELLO_DUPLICADO') {
      return NextResponse.json(
        { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Error al sellar la copia' }, { status: 500 })
  }
}
