import { NextRequest, NextResponse } from 'next/server'
import { extensionSello } from '@/lib/documento-sello'
import {
  esAdjuntoSello,
  MAX_ARCHIVOS_LOTE_SELLO,
  MAX_FILE_BYTES_SELLO,
  MAX_FILE_MB_SELLO
} from '@/lib/sello-documento-constants'
import {
  agregarASesionMasivo,
  crearSesionMasivo,
  eliminarSesionMasivo,
  obtenerSesionMasivo
} from '@/lib/sello-masivo-sesion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILES = MAX_ARCHIVOS_LOTE_SELLO
const MAX_ADJUNTO_BYTES = 150 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const sessionIdExistente = String(form.get('sessionId') ?? '').trim()
    const archivos = form.getAll('archivos').filter((f): f is File => f instanceof File)
    const adjuntos = form.getAll('adjuntos').filter((f): f is File => f instanceof File)

    if (archivos.length === 0 && adjuntos.length === 0) {
      return NextResponse.json(
        { error: 'Sube al menos un archivo .docx, .pdf o video' },
        { status: 400 }
      )
    }
    if (archivos.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} archivos por carpeta` },
        { status: 400 }
      )
    }

    const cargados: { nombre: string; buffer: Buffer }[] = []
    const videos: { nombre: string; buffer: Buffer }[] = []
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

    for (const archivo of adjuntos) {
      const nombre = archivo.name || 'video'
      if (!esAdjuntoSello(nombre)) {
        errores.push(`${nombre}: solo videos admitidos como adjunto`)
        continue
      }
      if (archivo.size > MAX_ADJUNTO_BYTES) {
        errores.push(`${nombre}: supera 150 MB`)
        continue
      }
      videos.push({
        nombre,
        buffer: Buffer.from(await archivo.arrayBuffer())
      })
    }

    if (cargados.length === 0 && videos.length === 0) {
      return NextResponse.json(
        {
          error: 'No se pudo cargar ningún documento',
          detalles: errores
        },
        { status: 400 }
      )
    }

    let sessionId = sessionIdExistente
    let sesion = sessionId ? obtenerSesionMasivo(sessionId) : null

    if (sessionId && !sesion) {
      return NextResponse.json(
        { error: 'La sesión expiró. Vuelve a subir la carpeta.' },
        { status: 410 }
      )
    }

    if (!sesion) {
      sessionId = crearSesionMasivo(cargados, videos)
      sesion = obtenerSesionMasivo(sessionId)
    } else {
      sesion = agregarASesionMasivo(sessionId, cargados, videos)
    }

    if (!sesion || !sessionId) {
      return NextResponse.json(
        { error: 'No se pudo guardar el lote en la sesión' },
        { status: 500 }
      )
    }

    if (sesion.archivos.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Máximo ${MAX_FILES} archivos por carpeta` },
        { status: 400 }
      )
    }

    return NextResponse.json({
      sessionId,
      archivosCount: sesion.archivos.length,
      adjuntosCount: sesion.adjuntos.length,
      omitidos: errores.length,
      detalles: errores.length ? errores : undefined
    })
  } catch (error) {
    console.error('sello-documentos/masivo/sesion POST:', error)
    const msg =
      error instanceof Error ? error.message : 'Error al preparar la sesión de sellado masivo'
    const cuerpoBloqueado = msg.includes('disturbed') || msg.includes('locked')
    return NextResponse.json(
      {
        error: cuerpoBloqueado
          ? 'No se pudo leer la carpeta subida (error del servidor al procesar la petición). Reinicia el servidor de desarrollo e intenta de nuevo; si persiste, reduce archivos por lote.'
          : 'Error al preparar la sesión de sellado masivo',
        detalle: process.env.NODE_ENV === 'development' ? msg : undefined
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 })
  }
  eliminarSesionMasivo(sessionId)
  return NextResponse.json({ ok: true })
}
