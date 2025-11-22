import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Probar conexión a la base de datos
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Health check error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: errorMessage,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

