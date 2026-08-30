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
    const sugerencias = await prisma.sugerenciaProblemaPlan.findMany({
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ sugerencias })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener sugerencias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion } = await request.json()
    if (!descripcion || !String(descripcion).trim()) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }

    const sugerencia = await prisma.sugerenciaProblemaPlan.create({
      data: { descripcion: String(descripcion).trim() }
    })
    return NextResponse.json({ message: 'Sugerencia creada exitosamente', sugerencia })
  } catch (error) {
    return NextResponse.json({ error: 'Error al crear sugerencia' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion } = await request.json()
    if (!id || !descripcion || !String(descripcion).trim()) {
      return NextResponse.json({ error: 'ID y descripción son requeridos' }, { status: 400 })
    }

    const sugerencia = await prisma.sugerenciaProblemaPlan.update({
      where: { id: parseInt(id) },
      data: { descripcion: String(descripcion).trim() }
    })
    return NextResponse.json({ message: 'Sugerencia actualizada exitosamente', sugerencia })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar sugerencia' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.sugerenciaProblemaPlan.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Sugerencia eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar sugerencia' }, { status: 500 })
  }
}
