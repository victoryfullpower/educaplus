import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const grados = await prisma.grado.findMany({
      include: {
        ciclo: true
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json(grados)
  } catch (error) {
    console.error('Error al obtener grados:', error)
    return NextResponse.json(
      { error: 'Error al obtener grados' },
      { status: 500 }
    )
  }
}

