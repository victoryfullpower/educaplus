import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET: Obtener todos los desempeños transversales o filtrar por idcapacidadtransversal
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idcapacidadtransversal = searchParams.get('idcapacidadtransversal')

    const where: any = {}
    
    if (idcapacidadtransversal) {
      where.idcapacidadtransversal = parseInt(idcapacidadtransversal)
    }

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
      orderBy: {
        iddesempeniotransversal: 'asc'
      }
    })

    return NextResponse.json(desempeniotransversales)
  } catch (error) {
    console.error('Error al obtener desempeños transversales:', error)
    return NextResponse.json(
      { error: 'Error al obtener desempeños transversales' },
      { status: 500 }
    )
  }
}

// POST: Crear un nuevo desempeño transversal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { iddesempeniotransversal, descripcion, idcapacidadtransversal } = body

    if (!descripcion || !idcapacidadtransversal) {
      return NextResponse.json(
        { error: 'descripcion e idcapacidadtransversal son requeridos' },
        { status: 400 }
      )
    }

    if (!iddesempeniotransversal) {
      return NextResponse.json(
        { error: 'iddesempeniotransversal es requerido' },
        { status: 400 }
      )
    }

    const desempeniotransversal = await prisma.desempeniotransversal.create({
      data: {
        iddesempeniotransversal: parseInt(iddesempeniotransversal),
        descripcion,
        idcapacidadtransversal: parseInt(idcapacidadtransversal)
      },
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
      }
    })

    return NextResponse.json(desempeniotransversal, { status: 201 })
  } catch (error) {
    console.error('Error al crear desempeño transversal:', error)
    return NextResponse.json(
      { error: 'Error al crear desempeño transversal' },
      { status: 500 }
    )
  }
}

// PUT: Actualizar un desempeño transversal
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { iddesempeniotransversal, descripcion, idcapacidadtransversal } = body

    if (!iddesempeniotransversal) {
      return NextResponse.json(
        { error: 'iddesempeniotransversal es requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (descripcion !== undefined) updateData.descripcion = descripcion
    if (idcapacidadtransversal !== undefined) updateData.idcapacidadtransversal = parseInt(idcapacidadtransversal)

    const desempeniotransversal = await prisma.desempeniotransversal.update({
      where: { iddesempeniotransversal: parseInt(iddesempeniotransversal) },
      data: updateData,
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
      }
    })

    return NextResponse.json(desempeniotransversal)
  } catch (error) {
    console.error('Error al actualizar desempeño transversal:', error)
    return NextResponse.json(
      { error: 'Error al actualizar desempeño transversal' },
      { status: 500 }
    )
  }
}

// DELETE: Eliminar un desempeño transversal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const iddesempeniotransversal = searchParams.get('iddesempeniotransversal')

    if (!iddesempeniotransversal) {
      return NextResponse.json(
        { error: 'iddesempeniotransversal es requerido' },
        { status: 400 }
      )
    }

    await prisma.desempeniotransversal.delete({
      where: { iddesempeniotransversal: parseInt(iddesempeniotransversal) }
    })

    return NextResponse.json({ message: 'Desempeño transversal eliminado correctamente' })
  } catch (error) {
    console.error('Error al eliminar desempeño transversal:', error)
    return NextResponse.json(
      { error: 'Error al eliminar desempeño transversal' },
      { status: 500 }
    )
  }
}

