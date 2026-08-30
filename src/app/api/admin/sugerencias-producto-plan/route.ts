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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idareaParam = searchParams.get('idarea')
    const where =
      idareaParam && !Number.isNaN(parseInt(idareaParam, 10))
        ? { idarea: parseInt(idareaParam, 10) }
        : {}

    const sugerencias = await prisma.sugerenciaProductoPlan.findMany({
      where,
      include: { area: { select: { id: true, descripcion: true } } },
      orderBy: [{ idarea: 'asc' }, { id: 'asc' }]
    })
    return NextResponse.json({ sugerencias })
  } catch (error) {
    console.error('Error al obtener sugerencias producto:', error)
    return NextResponse.json({ error: 'Error al obtener sugerencias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idarea } = await request.json()
    if (!descripcion || !String(descripcion).trim()) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }
    const areaId = parseInt(String(idarea), 10)
    if (!idarea || Number.isNaN(areaId)) {
      return NextResponse.json({ error: 'Área es requerida' }, { status: 400 })
    }

    const area = await prisma.area.findUnique({ where: { id: areaId } })
    if (!area) {
      return NextResponse.json({ error: 'Área no encontrada' }, { status: 404 })
    }

    const sugerencia = await prisma.sugerenciaProductoPlan.create({
      data: {
        descripcion: String(descripcion).trim(),
        idarea: areaId
      },
      include: { area: { select: { id: true, descripcion: true } } }
    })
    return NextResponse.json({ message: 'Sugerencia creada exitosamente', sugerencia })
  } catch (error) {
    console.error('Error al crear sugerencia producto:', error)
    return NextResponse.json({ error: 'Error al crear sugerencia' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, idarea } = await request.json()
    if (!id || !descripcion || !String(descripcion).trim()) {
      return NextResponse.json({ error: 'ID y descripción son requeridos' }, { status: 400 })
    }
    const areaId = parseInt(String(idarea), 10)
    if (!idarea || Number.isNaN(areaId)) {
      return NextResponse.json({ error: 'Área es requerida' }, { status: 400 })
    }

    const sugerencia = await prisma.sugerenciaProductoPlan.update({
      where: { id: parseInt(String(id), 10) },
      data: {
        descripcion: String(descripcion).trim(),
        idarea: areaId
      },
      include: { area: { select: { id: true, descripcion: true } } }
    })
    return NextResponse.json({ message: 'Sugerencia actualizada exitosamente', sugerencia })
  } catch (error) {
    console.error('Error al actualizar sugerencia producto:', error)
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

    await prisma.sugerenciaProductoPlan.delete({ where: { id: parseInt(id, 10) } })
    return NextResponse.json({ message: 'Sugerencia eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar sugerencia' }, { status: 500 })
  }
}
