import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Obtener todas las competencias transversales o filtrar por idgrado
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idgrado = searchParams.get('idgrado')

    const where: any = {}
    
    if (idgrado) {
      where.idgrado = parseInt(idgrado)
    }

    const comptransversales = await prisma.comptransversal.findMany({
      where,
      include: {
        grado: true
      },
      orderBy: {
        idcomtransversal: 'asc'
      }
    })

    return NextResponse.json(comptransversales)
  } catch (error) {
    console.error('Error al obtener competencias transversales:', error)
    return NextResponse.json(
      { error: 'Error al obtener competencias transversales' },
      { status: 500 }
    )
  }
}

// POST: Crear una nueva competencia transversal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { idcomtransversal, descripcion, idgrado } = body

    if (!descripcion || !idgrado) {
      return NextResponse.json(
        { error: 'descripcion e idgrado son requeridos' },
        { status: 400 }
      )
    }

    const data: { descripcion: string; idgrado: number; idcomtransversal?: number } = {
      descripcion,
      idgrado: parseInt(String(idgrado), 10)
    }
    if (idcomtransversal != null && String(idcomtransversal).trim() !== '') {
      data.idcomtransversal = parseInt(String(idcomtransversal), 10)
    }

    const comptransversal = await prisma.comptransversal.create({
      data,
      include: {
        grado: true
      }
    })

    return NextResponse.json(comptransversal, { status: 201 })
  } catch (error) {
    console.error('Error al crear competencia transversal:', error)
    return NextResponse.json(
      { error: 'Error al crear competencia transversal' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar una competencia transversal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { idcomtransversal, descripcion, idgrado } = body

    if (!idcomtransversal) {
      return NextResponse.json(
        { error: 'idcomtransversal es requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idgrado !== undefined) updateData.idgrado = parseInt(idgrado)

    const comptransversal = await prisma.comptransversal.update({
      where: { idcomtransversal: parseInt(idcomtransversal) },
      data: updateData,
      include: {
        grado: true
      }
    })

    return NextResponse.json(comptransversal)
  } catch (error) {
    console.error('Error al actualizar competencia transversal:', error)
    return NextResponse.json(
      { error: 'Error al actualizar competencia transversal' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una competencia transversal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idcomtransversal = searchParams.get('idcomtransversal')

    if (!idcomtransversal) {
      return NextResponse.json(
        { error: 'idcomtransversal es requerido' },
        { status: 400 }
      )
    }

    await prisma.comptransversal.delete({
      where: { idcomtransversal: parseInt(idcomtransversal) }
    })

    return NextResponse.json({ message: 'Competencia transversal eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar competencia transversal:', error)
    return NextResponse.json(
      { error: 'Error al eliminar competencia transversal' },
      { status: 500 }
    )
  }
}

