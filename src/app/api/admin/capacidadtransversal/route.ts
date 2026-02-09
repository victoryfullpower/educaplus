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
    const idcomtransversal = searchParams.get('idcomtransversal')

    const where: any = {}
    if (idcomtransversal) where.idcomtransversal = parseInt(idcomtransversal)

    const capacidadtransversales = await prisma.capacidadtransversal.findMany({
      where,
      include: {
        comptransversal: {
          include: {
            grado: true
          }
        }
      },
      orderBy: { idcapacidadtransversal: 'asc' }
    })
    return NextResponse.json({ capacidadtransversales })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener capacidades transversales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idcomtransversal } = await request.json()
    if (!descripcion || !idcomtransversal) {
      return NextResponse.json({ error: 'Descripción e idcomtransversal son requeridos' }, { status: 400 })
    }

    const capacidadtransversal = await prisma.capacidadtransversal.create({
      data: {
        descripcion,
        idcomtransversal: parseInt(idcomtransversal)
      }
    })
    return NextResponse.json({ message: 'Capacidad transversal creada exitosamente', capacidadtransversal })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear capacidad transversal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idcapacidadtransversal, descripcion, idcomtransversal } = await request.json()
    if (!idcapacidadtransversal) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idcomtransversal !== undefined) updateData.idcomtransversal = parseInt(idcomtransversal)

    const capacidadtransversal = await prisma.capacidadtransversal.update({
      where: { idcapacidadtransversal: parseInt(idcapacidadtransversal) },
      data: updateData
    })
    return NextResponse.json({ message: 'Capacidad transversal actualizada exitosamente', capacidadtransversal })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar capacidad transversal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const idcapacidadtransversal = searchParams.get('idcapacidadtransversal') || searchParams.get('id')
    if (!idcapacidadtransversal) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.capacidadtransversal.delete({ where: { idcapacidadtransversal: parseInt(idcapacidadtransversal) } })
    return NextResponse.json({ message: 'Capacidad transversal eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar capacidad transversal' }, { status: 500 })
  }
}

