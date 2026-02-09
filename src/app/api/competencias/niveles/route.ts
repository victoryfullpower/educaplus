import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const niveles = await prisma.nivel.findMany({
      orderBy: {
        descripcion: 'asc'
      }
    })

    return NextResponse.json(niveles)
  } catch (error) {
    console.error('Error al obtener niveles:', error)
    return NextResponse.json(
      { error: 'Error al obtener niveles' },
      { status: 500 }
    )
  }
}

