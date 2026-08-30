import { NextRequest, NextResponse } from 'next/server'
import { extensionSello } from '@/lib/documento-sello'
import {
  esAdjuntoSello,
  MAX_ARCHIVOS_LOTE_SELLO
} from '@/lib/sello-documento-constants'
import {
  crearSesionMasivo,
  eliminarSesionMasivo
} from '@/lib/sello-masivo-sesion'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_FILES = MAX_ARCHIVOS_LOTE_SELLO
const MAX_FILE_BYTES = 40 * 1024 * 1024
const MAX_ADJUNTO_BYTES = 150 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const archivos = form.getAll('archivos').filter((f): f is File => f instanceof File)
    const adjuntos = form.getAll('adjuntos').filter((f): f is File => f instanceof File)

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

    const cargados: { nombre: string; buffer: Buffer }[] = []
    const videos: { nombre: string; buffer: Buffer }[] = []
    const errores: string[] = []

    for (const archivo of archivos) {
      const nombre = archivo.name || 'documento'
      if (!extensionSello(nombre)) {
        errores.push(`${nombre}: solo .docx o .pdf`)
        continue
      }
      if (archivo.size > MAX_FILE_BYTES) {
        errores.push(`${nombre}: supera 40 MB`)
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

    if (cargados.length === 0) {
      return NextResponse.json(
        {
          error: 'No se pudo cargar ningún documento',
          detalles: errores
        },
        { status: 400 }
      )
    }

    const sessionId = crearSesionMasivo(cargados, videos)

    return NextResponse.json({
      sessionId,
      archivosCount: cargados.length,
      adjuntosCount: videos.length,
      omitidos: errores.length
    })
  } catch (error) {
    console.error('sello-documentos/masivo/sesion POST:', error)
    return NextResponse.json(
      { error: 'Error al preparar la sesión de sellado masivo' },
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
