import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Obtener todas las capacidades transversales o filtrar por idcomtransversal
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idcomtransversal = searchParams.get('idcomtransversal')

    const where: any = {}
    
    if (idcomtransversal) {
      where.idcomtransversal = parseInt(idcomtransversal)
    }

    const capacidadtransversales = await prisma.capacidadtransversal.findMany({
      where,
      include: {
        comptransversal: {
          include: {
            grado: true
          }
        }
      },
      orderBy: {
        idcapacidadtransversal: 'asc'
      }
    })

    return NextResponse.json(capacidadtransversales)
  } catch (error) {
    console.error('Error al obtener capacidades transversales:', error)
    return NextResponse.json(
      { error: 'Error al obtener capacidades transversales' },
      { status: 500 }
    )
  }
}

// POST: Crear una nueva capacidad transversal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { descripcion, idcomtransversal } = body

    if (!descripcion || !idcomtransversal) {
      return NextResponse.json(
        { error: 'descripcion e idcomtransversal son requeridos' },
        { status: 400 }
      )
    }

    const capacidadtransversal = await prisma.capacidadtransversal.create({
      data: {
        descripcion,
        idcomtransversal: parseInt(idcomtransversal)
      },
      include: {
        comptransversal: {
          include: {
            grado: true
          }
        }
      }
    })

    return NextResponse.json(capacidadtransversal, { status: 201 })
  } catch (error) {
    console.error('Error al crear capacidad transversal:', error)
    return NextResponse.json(
      { error: 'Error al crear capacidad transversal' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar una capacidad transversal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { idcapacidadtransversal, descripcion, idcomtransversal } = body

    if (!idcapacidadtransversal) {
      return NextResponse.json(
        { error: 'idcapacidadtransversal es requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idcomtransversal !== undefined) updateData.idcomtransversal = parseInt(idcomtransversal)

    const capacidadtransversal = await prisma.capacidadtransversal.update({
      where: { idcapacidadtransversal: parseInt(idcapacidadtransversal) },
      data: updateData,
      include: {
        comptransversal: {
          include: {
            grado: true
          }
        }
      }
    })

    return NextResponse.json(capacidadtransversal)
  } catch (error) {
    console.error('Error al actualizar capacidad transversal:', error)
    return NextResponse.json(
      { error: 'Error al actualizar capacidad transversal' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar una capacidad transversal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idcapacidadtransversal = searchParams.get('idcapacidadtransversal')

    if (!idcapacidadtransversal) {
      return NextResponse.json(
        { error: 'idcapacidadtransversal es requerido' },
        { status: 400 }
      )
    }

    await prisma.capacidadtransversal.delete({
      where: { idcapacidadtransversal: parseInt(idcapacidadtransversal) }
    })

    return NextResponse.json({ message: 'Capacidad transversal eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar capacidad transversal:', error)
    return NextResponse.json(
      { error: 'Error al eliminar capacidad transversal' },
      { status: 500 }
    )
  }
}

