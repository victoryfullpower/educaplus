import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idcapacidad = searchParams.get('idcapacidad')
    const idcompetencia = searchParams.get('idcompetencia')
    const id = searchParams.get('id')
    const ids = searchParams.get('ids') // Para múltiples IDs separados por coma

    const where: any = {}
    
    if (id) {
      // Buscar un desempeño específico por ID
      where.id = parseInt(id)
    } else if (ids) {
      // Buscar múltiples desempeños por IDs
      const idsArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      where.id = { in: idsArray }
    } else if (idcapacidad) {
      where.idcapacidad = parseInt(idcapacidad)
    } else if (idcompetencia) {
      // Si se busca por competencia, obtener desempeños a través de capacidades
      where.capacidad = {
        idcompetencia: parseInt(idcompetencia)
      }
    }

    const desempenios = await prisma.desempenio.findMany({
      where,
      include: {
        capacidad: {
          include: {
            competencia: true,
            estandar: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json(desempenios)
  } catch (error) {
    console.error('Error al obtener desempeños:', error)
    return NextResponse.json(
      { error: 'Error al obtener desempeños' },
      { status: 500 }
    )
  }
}

