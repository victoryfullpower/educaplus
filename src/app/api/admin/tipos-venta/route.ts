import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

async function checkAdmin(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return { error: 'No autenticado', status: 401 }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { rol: true } })
  if (user?.rol !== 'Administrador') return { error: 'No autorizado', status: 403 }
  return { error: null }
}

export async function GET() {
  try {
    const tiposVenta = await prisma.tipoVenta.findMany({
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ tiposVenta })
  } catch (error) {
    console.error('[GET /api/admin/tipos-venta]', error)
    return NextResponse.json({ error: 'Error al obtener tipos de venta' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, estado = 'activo' } = await request.json()
    if (!descripcion || String(descripcion).trim() === '') {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }
    if (estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const tipoVenta = await prisma.tipoVenta.create({
      data: { descripcion: String(descripcion).trim(), estado }
    })
    return NextResponse.json({ message: 'Tipo de venta creado exitosamente', tipoVenta })
  } catch (error) {
    console.error('Error al crear tipo de venta:', error)
    return NextResponse.json({ error: 'Error al crear tipo de venta' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, estado } = await request.json()
    if (!id || !descripcion || String(descripcion).trim() === '') {
      return NextResponse.json({ error: 'ID y descripción son requeridos' }, { status: 400 })
    }
    if (estado && estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const tipoVenta = await prisma.tipoVenta.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        descripcion: String(descripcion).trim(),
        ...(estado ? { estado } : {})
      }
    })
    return NextResponse.json({ message: 'Tipo de venta actualizado exitosamente', tipoVenta })
  } catch (error) {
    console.error('Error al actualizar tipo de venta:', error)
    return NextResponse.json({ error: 'Error al actualizar tipo de venta' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.tipoVenta.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Tipo de venta eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar tipo de venta:', error)
    return NextResponse.json({ error: 'Error al eliminar tipo de venta' }, { status: 500 })
  }
}
