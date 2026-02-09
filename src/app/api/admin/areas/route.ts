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
    const areas = await prisma.area.findMany({ orderBy: { id: 'asc' } })
    return NextResponse.json({ areas })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener áreas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, sesionx2 } = await request.json()
    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }

    const area = await prisma.area.create({ 
      data: { 
        descripcion,
        sesionx2: sesionx2 !== undefined ? Boolean(sesionx2) : false
      } 
    })
    return NextResponse.json({ message: 'Área creada exitosamente', area })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear área' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, sesionx2 } = await request.json()
    if (!id || !descripcion) {
      return NextResponse.json({ error: 'ID y descripción son requeridos' }, { status: 400 })
    }

    const updateData: any = { descripcion }
    if (sesionx2 !== undefined) {
      updateData.sesionx2 = Boolean(sesionx2)
    }

    const area = await prisma.area.update({
      where: { id: parseInt(id) },
      data: updateData
    })
    return NextResponse.json({ message: 'Área actualizada exitosamente', area })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar área' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.area.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Área eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar área' }, { status: 500 })
  }
}

