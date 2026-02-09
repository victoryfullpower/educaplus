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
    const idcapacidad = searchParams.get('idcapacidad')

    const where: any = {}
    if (idcapacidad) {
      where.idcapacidad = parseInt(idcapacidad)
    }

    const desempenios = await prisma.desempenio.findMany({
      where,
      include: { 
        capacidad: {
          include: {
            competencia: {
              include: {
                area: true,
                grado: true,
                nivel: true
              }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ desempenios })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener desempeños' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idcapacidad } = await request.json()
    if (!descripcion || !idcapacidad) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const desempenio = await prisma.desempenio.create({
      data: {
        descripcion,
        idcapacidad: parseInt(idcapacidad)
      }
    })
    return NextResponse.json({ message: 'Desempeño creado exitosamente', desempenio })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear desempeño' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, idcapacidad } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const desempenio = await prisma.desempenio.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        idcapacidad: idcapacidad ? parseInt(idcapacidad) : undefined
      }
    })
    return NextResponse.json({ message: 'Desempeño actualizado exitosamente', desempenio })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar desempeño' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.desempenio.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Desempeño eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar desempeño' }, { status: 500 })
  }
}

