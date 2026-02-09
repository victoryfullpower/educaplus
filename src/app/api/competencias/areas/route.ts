import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const areas = await prisma.area.findMany({
      orderBy: {
        descripcion: 'asc'
      }
    })

    return NextResponse.json(areas)
  } catch (error) {
    console.error('Error al obtener áreas:', error)
    return NextResponse.json(
      { error: 'Error al obtener áreas' },
      { status: 500 }
    )
  }
}

