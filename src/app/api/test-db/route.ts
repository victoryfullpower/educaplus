import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Probar conexión
    await prisma.$connect()
    
    // Contar usuarios
    const userCount = await prisma.user.count()
    
    // Listar usuarios (sin contraseñas)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      }
    })
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      userCount,
      users,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Test DB Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json({
      status: 'error',
      database: 'disconnected',
      error: errorMessage,
      stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}


