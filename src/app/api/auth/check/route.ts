import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        userId: null
      })
    }

    // Obtener datos del usuario incluyendo el rol
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        rol: true
      }
    })

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        userId: null
      })
    }

    return NextResponse.json({
      authenticated: true,
      userId: user.id,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        rol: user.rol
      }
    })
  } catch (error) {
    console.error('Error al verificar autenticación:', error)
    return NextResponse.json({
      authenticated: false,
      userId: null
    })
  }
}

