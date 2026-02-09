import { NextRequest } from 'next/server'
import { prisma } from './prisma'

export async function getUserId(request: NextRequest): Promise<number | null> {
  const userId = request.cookies.get('user-id')?.value
  
  if (!userId) {
    return null
  }
  
  try {
    const userIdNumber = parseInt(userId, 10)
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userIdNumber }
    })
    
    return user ? userIdNumber : null
  } catch (error) {
    console.error('Error al verificar usuario:', error)
    return null
  }
}

