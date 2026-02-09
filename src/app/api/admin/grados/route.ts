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
    const grados = await prisma.grado.findMany({ orderBy: { id: 'asc' } })
    return NextResponse.json({ grados })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener grados' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idciclo } = await request.json()

    if (!idciclo) {
      return NextResponse.json({ error: 'idciclo es requerido' }, { status: 400 })
    }

    const grado = await prisma.grado.create({ 
      data: { 
        descripcion: descripcion || null,
        idciclo: parseInt(idciclo)
      } 
    })
    return NextResponse.json({ message: 'Grado creado exitosamente', grado })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear grado' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const grado = await prisma.grado.update({
      where: { id: parseInt(id) },
      data: { descripcion: descripcion || null }
    })
    return NextResponse.json({ message: 'Grado actualizado exitosamente', grado })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar grado' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.grado.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Grado eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar grado' }, { status: 500 })
  }
}

