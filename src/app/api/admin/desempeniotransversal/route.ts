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
    const idcapacidadtransversal = searchParams.get('idcapacidadtransversal')

    const where: any = {}
    if (idcapacidadtransversal) where.idcapacidadtransversal = parseInt(idcapacidadtransversal)

    const desempeniotransversales = await prisma.desempeniotransversal.findMany({
      where,
      include: {
        capacidadtransversal: {
          include: {
            comptransversal: {
              include: {
                grado: true
              }
            }
          }
        }
      },
      orderBy: { iddesempeniotransversal: 'asc' }
    })
    return NextResponse.json({ desempeniotransversales })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener desempeños transversales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { iddesempeniotransversal, descripcion, idcapacidadtransversal } = await request.json()
    if (!descripcion || !idcapacidadtransversal) {
      return NextResponse.json({ error: 'Descripción e idcapacidadtransversal son requeridos' }, { status: 400 })
    }

    const data: {
      descripcion: string
      idcapacidadtransversal: number
      iddesempeniotransversal?: number
    } = {
      descripcion,
      idcapacidadtransversal: parseInt(String(idcapacidadtransversal), 10)
    }
    if (iddesempeniotransversal != null && String(iddesempeniotransversal).trim() !== '') {
      data.iddesempeniotransversal = parseInt(String(iddesempeniotransversal), 10)
    }

    const desempeniotransversal = await prisma.desempeniotransversal.create({
      data
    })
    return NextResponse.json({ message: 'Desempeño transversal creado exitosamente', desempeniotransversal })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear desempeño transversal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { iddesempeniotransversal, descripcion, idcapacidadtransversal } = await request.json()
    if (!iddesempeniotransversal) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idcapacidadtransversal !== undefined) updateData.idcapacidadtransversal = parseInt(idcapacidadtransversal)

    const desempeniotransversal = await prisma.desempeniotransversal.update({
      where: { iddesempeniotransversal: parseInt(iddesempeniotransversal) },
      data: updateData
    })
    return NextResponse.json({ message: 'Desempeño transversal actualizado exitosamente', desempeniotransversal })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar desempeño transversal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const iddesempeniotransversal = searchParams.get('iddesempeniotransversal') || searchParams.get('id')
    if (!iddesempeniotransversal) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.desempeniotransversal.delete({ where: { iddesempeniotransversal: parseInt(iddesempeniotransversal) } })
    return NextResponse.json({ message: 'Desempeño transversal eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar desempeño transversal' }, { status: 500 })
  }
}

