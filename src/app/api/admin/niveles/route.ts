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
    const niveles = await prisma.nivel.findMany({ orderBy: { id: 'asc' } })
    return NextResponse.json({ niveles })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener niveles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion } = await request.json()
    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }

    const nivel = await prisma.nivel.create({ data: { descripcion } })
    return NextResponse.json({ message: 'Nivel creado exitosamente', nivel })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear nivel' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion } = await request.json()
    if (!id || !descripcion) {
      return NextResponse.json({ error: 'ID y descripción son requeridos' }, { status: 400 })
    }

    const nivel = await prisma.nivel.update({
      where: { id: parseInt(id) },
      data: { descripcion }
    })
    return NextResponse.json({ message: 'Nivel actualizado exitosamente', nivel })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar nivel' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.nivel.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Nivel eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar nivel' }, { status: 500 })
  }
}

