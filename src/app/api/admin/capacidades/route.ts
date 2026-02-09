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
    const idcompetencia = searchParams.get('idcompetencia')

    const where: any = {}
    if (idcompetencia) {
      where.idcompetencia = parseInt(idcompetencia)
    }

    const capacidades = await prisma.capacidad.findMany({
      where,
      include: {
        competencia: {
          include: {
            area: true,
            grado: true,
            nivel: true
          }
        },
        estandar: true
      },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ capacidades })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener capacidades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idcompetencia, idstandar } = await request.json()
    if (!descripcion || !idcompetencia || !idstandar) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const capacidad = await prisma.capacidad.create({
      data: {
        descripcion,
        idcompetencia: parseInt(idcompetencia),
        idstandar: parseInt(idstandar)
      }
    })
    return NextResponse.json({ message: 'Capacidad creada exitosamente', capacidad })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear capacidad' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, idcompetencia, idstandar } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const capacidad = await prisma.capacidad.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        idcompetencia: idcompetencia ? parseInt(idcompetencia) : undefined,
        idstandar: idstandar ? parseInt(idstandar) : undefined
      }
    })
    return NextResponse.json({ message: 'Capacidad actualizada exitosamente', capacidad })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar capacidad' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.capacidad.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Capacidad eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar capacidad' }, { status: 500 })
  }
}

