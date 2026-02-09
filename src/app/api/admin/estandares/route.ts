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

    const estandares = await prisma.estandar.findMany({
      where,
      include: { competencia: true },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ estandares })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener estándares' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, ordenamiento, idcompetencia } = await request.json()
    if (!descripcion || ordenamiento === undefined || !idcompetencia) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const estandar = await prisma.estandar.create({
      data: {
        descripcion,
        ordenamiento: parseInt(ordenamiento),
        idcompetencia: parseInt(idcompetencia)
      }
    })
    return NextResponse.json({ message: 'Estándar creado exitosamente', estandar })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear estándar' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, ordenamiento, idcompetencia } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const estandar = await prisma.estandar.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        ordenamiento: ordenamiento ? parseInt(ordenamiento) : undefined,
        idcompetencia: idcompetencia ? parseInt(idcompetencia) : undefined
      }
    })
    return NextResponse.json({ message: 'Estándar actualizado exitosamente', estandar })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar estándar' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.estandar.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Estándar eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar estándar' }, { status: 500 })
  }
}

