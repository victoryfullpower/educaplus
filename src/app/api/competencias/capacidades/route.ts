import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idcompetencia = searchParams.get('idcompetencia')
    const idstandar = searchParams.get('idstandar')
    const id = searchParams.get('id')
    const ids = searchParams.get('ids') // Para múltiples IDs separados por coma

    const where: any = {}
    
    if (id) {
      // Buscar una capacidad específica por ID
      where.id = parseInt(id)
    } else if (ids) {
      // Buscar múltiples capacidades por IDs
      const idsArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      where.id = { in: idsArray }
    } else {
      if (idcompetencia) {
        where.idcompetencia = parseInt(idcompetencia)
      }
      if (idstandar) {
        where.idstandar = parseInt(idstandar)
      }
    }

    const capacidades = await prisma.capacidad.findMany({
      where,
      include: {
        competencia: true,
        estandar: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json(capacidades)
  } catch (error) {
    console.error('Error al obtener capacidades:', error)
    return NextResponse.json(
      { error: 'Error al obtener capacidades' },
      { status: 500 }
    )
  }
}

