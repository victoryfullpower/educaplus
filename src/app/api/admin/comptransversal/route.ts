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
    const idgrado = searchParams.get('idgrado')

    const where: any = {}
    if (idgrado) where.idgrado = parseInt(idgrado)

    const comptransversales = await prisma.comptransversal.findMany({
      where,
      include: {
        grado: true
      },
      orderBy: { idcomtransversal: 'asc' }
    })
    return NextResponse.json({ comptransversales })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener competencias transversales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idcomtransversal, descripcion, idgrado } = await request.json()
    if (!descripcion || !idgrado) {
      return NextResponse.json({ error: 'Descripción e idgrado son requeridos' }, { status: 400 })
    }

    const data: { descripcion: string; idgrado: number; idcomtransversal?: number } = {
      descripcion,
      idgrado: parseInt(String(idgrado), 10)
    }
    if (idcomtransversal != null && String(idcomtransversal).trim() !== '') {
      data.idcomtransversal = parseInt(String(idcomtransversal), 10)
    }

    const comptransversal = await prisma.comptransversal.create({
      data
    })
    return NextResponse.json({ message: 'Competencia transversal creada exitosamente', comptransversal })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear competencia transversal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idcomtransversal, descripcion, idgrado } = await request.json()
    if (!idcomtransversal) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idgrado !== undefined) updateData.idgrado = parseInt(idgrado)

    const comptransversal = await prisma.comptransversal.update({
      where: { idcomtransversal: parseInt(idcomtransversal) },
      data: updateData
    })
    return NextResponse.json({ message: 'Competencia transversal actualizada exitosamente', comptransversal })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar competencia transversal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const idcomtransversal = searchParams.get('idcomtransversal') || searchParams.get('id')
    if (!idcomtransversal) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.comptransversal.delete({ where: { idcomtransversal: parseInt(idcomtransversal) } })
    return NextResponse.json({ message: 'Competencia transversal eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar competencia transversal' }, { status: 500 })
  }
}

