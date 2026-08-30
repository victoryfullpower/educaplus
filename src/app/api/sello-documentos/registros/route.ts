import { NextRequest, NextResponse } from 'next/server'
import {
  codigoSelloYaRegistrado,
  listarRegistrosSelloDocumento,
  MSG_CODIGO_SELLO_DUPLICADO,
  registrarSelloDocumento
} from '@/lib/sello-documento-registro'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      codigoeducaplus?: string
      cantidadArchivos?: number
    }
    const codigo = String(body.codigoeducaplus ?? '').trim()
    const cantidad = Number(body.cantidadArchivos)

    if (!codigo) {
      return NextResponse.json(
        { error: 'El código EducaPlus es obligatorio' },
        { status: 400 }
      )
    }
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      return NextResponse.json(
        { error: 'cantidadArchivos debe ser al menos 1' },
        { status: 400 }
      )
    }

    const registro = await registrarSelloDocumento(codigo, cantidad)

    return NextResponse.json({
      id: registro.id,
      codigoeducaplus: registro.codigoeducaplus,
      cantidadArchivos: registro.cantidadArchivos,
      fecha: registro.createdAt.toISOString()
    })
  } catch (error) {
    console.error('sello-documentos/registros POST:', error)
    if (error instanceof Error && error.message === 'CODIGO_SELLO_DUPLICADO') {
      return NextResponse.json(
        { error: MSG_CODIGO_SELLO_DUPLICADO, codigoDuplicado: true },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: 'No se pudo guardar el registro del código' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const verificarCodigo = searchParams.get('verificarCodigo')
    if (verificarCodigo !== null) {
      const existe = await codigoSelloYaRegistrado(verificarCodigo)
      return NextResponse.json({ existe })
    }

    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const codigo = searchParams.get('codigo') ?? undefined
    const fechaDesde = searchParams.get('fechaDesde') ?? undefined
    const fechaHasta = searchParams.get('fechaHasta') ?? undefined

    const data = await listarRegistrosSelloDocumento({
      page: Number.isNaN(page) ? 1 : page,
      codigo,
      fechaDesde: fechaDesde || undefined,
      fechaHasta: fechaHasta || undefined
    })

    return NextResponse.json({
      ...data,
      items: data.items.map((r) => ({
        id: r.id,
        codigoeducaplus: r.codigoeducaplus,
        cantidadArchivos: r.cantidadArchivos,
        fecha: r.createdAt.toISOString()
      }))
    })
  } catch (error) {
    console.error('sello-documentos/registros:', error)
    return NextResponse.json(
      { error: 'Error al obtener el registro de sellos' },
      { status: 500 }
    )
  }
}
