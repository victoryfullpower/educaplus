import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const idarea = searchParams.get('idarea')
    const idgrado = searchParams.get('idgrado')
    const idnivel = searchParams.get('idnivel')

    const where: any = {}
    
    if (idarea) {
      where.idarea = parseInt(idarea)
    }
    if (idgrado) {
      where.idgrado = parseInt(idgrado)
    }
    if (idnivel) {
      where.idnivel = parseInt(idnivel)
    }

    const competencias = await prisma.competencia.findMany({
      where,
      include: {
        area: true,
        grado: true,
        nivel: true
      },
      orderBy: {
        numeroCompetencia: 'asc'
      }
    })

    return NextResponse.json(competencias)
  } catch (error) {
    console.error('Error al obtener competencias:', error)
    return NextResponse.json(
      { error: 'Error al obtener competencias' },
      { status: 500 }
    )
  }
}

