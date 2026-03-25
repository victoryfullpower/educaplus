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

function parseAreaIds(areaIds: unknown): number[] | null {
  if (Array.isArray(areaIds)) {
    const parsed = areaIds
      .map((v) => Number(v))
      .filter((v) => Number.isInteger(v) && v > 0)
    return parsed.length > 0 ? parsed : null
  }

  if (typeof areaIds === 'string') {
    const parsed = areaIds
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v > 0)
    return parsed.length > 0 ? parsed : null
  }

  return null
}

export async function GET() {
  try {
    const areasComerciales = await prisma.areaComercial.findMany({
      orderBy: { idareacomercial: 'asc' }
    })
    return NextResponse.json({ areasComerciales })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener áreas comerciales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, areaIds, estado = 'activo' } = await request.json()
    if (!descripcion) {
      return NextResponse.json({ error: 'Descripción es requerida' }, { status: 400 })
    }
    if (estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const parsedAreaIds = parseAreaIds(areaIds)
    if (!parsedAreaIds) {
      return NextResponse.json(
        { error: 'areaIds debe tener IDs válidos. Ejemplo: "1,2,3,4"' },
        { status: 400 }
      )
    }

    const areaComercial = await prisma.areaComercial.create({
      data: { descripcion, areaIds: parsedAreaIds, estado }
    })
    return NextResponse.json({ message: 'Área comercial creada exitosamente', areaComercial })
  } catch (error: any) {
    return NextResponse.json({ error: 'Error al crear área comercial' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idareacomercial, descripcion, areaIds, estado } = await request.json()
    if (!idareacomercial || !descripcion) {
      return NextResponse.json(
        { error: 'ID de área comercial y descripción son requeridos' },
        { status: 400 }
      )
    }
    if (estado && estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const updateData: {
      descripcion: string
      estado?: string
      areaIds?: number[]
    } = { descripcion }

    if (areaIds !== undefined) {
      const parsedAreaIds = parseAreaIds(areaIds)
      if (!parsedAreaIds) {
        return NextResponse.json(
          { error: 'areaIds debe tener IDs válidos. Ejemplo: "1,2,3,4"' },
          { status: 400 }
        )
      }
      updateData.areaIds = parsedAreaIds
    }

    if (estado) {
      updateData.estado = estado
    }

    const areaComercial = await prisma.areaComercial.update({
      where: { idareacomercial: parseInt(String(idareacomercial), 10) },
      data: updateData
    })
    return NextResponse.json({ message: 'Área comercial actualizada exitosamente', areaComercial })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar área comercial' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.areaComercial.delete({
      where: { idareacomercial: parseInt(id, 10) }
    })
    return NextResponse.json({ message: 'Área comercial eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar área comercial' }, { status: 500 })
  }
}
