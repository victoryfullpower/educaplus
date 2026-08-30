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
    const db = prisma as any
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        rol: true,
        trialPlanUsado: true,
        trialUnidadUsada: true,
        trialSesionUsada: true
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
        rol: user.rol,
        trial: {
          plan: user.trialPlanUsado ? 1 : 0,
          unidad: user.trialUnidadUsada ? 1 : 0,
          sesion: user.trialSesionUsada ? 1 : 0
        }
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

