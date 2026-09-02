import { NextRequest, NextResponse } from 'next/server'
import { extensionSello, leerSelloArchivo } from '@/lib/documento-sello'
import {
  MAX_FILE_BYTES_SELLO,
  MAX_FILE_MB_SELLO
} from '@/lib/sello-documento-constants'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData()
    const archivo = form.get('archivo')

    if (!(archivo instanceof File)) {
      return NextResponse.json(
        { error: 'Sube un archivo .docx o .pdf' },
        { status: 400 }
      )
    }

    const nombre = archivo.name || 'documento'
    if (!extensionSello(nombre)) {
      return NextResponse.json(
        { error: 'Solo se admiten archivos .docx y .pdf' },
        { status: 400 }
      )
    }

    if (archivo.size > MAX_FILE_BYTES_SELLO) {
      return NextResponse.json(
        { error: `El archivo supera el límite de ${MAX_FILE_MB_SELLO} MB` },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await archivo.arrayBuffer())
    const lectura = await leerSelloArchivo(buffer, nombre)

    return NextResponse.json({
      archivo: nombre,
      formato: lectura.formato,
      tieneSello: lectura.encontrado,
      metadatos: lectura.metadatos
    })
  } catch (error) {
    console.error('sello-documentos/verify:', error)
    return NextResponse.json(
      { error: 'Error al verificar el documento' },
      { status: 500 }
    )
  }
}
