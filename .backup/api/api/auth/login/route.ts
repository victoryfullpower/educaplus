import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    console.log("useeeeeer",password);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })
    console.log("useeeeeer",user);
    if (!user) {
      console.log("paso");
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }
    console.log("paso2");
    // Comparación directa si las contraseñas están en texto plano
    const isValidPassword = password === user.password

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // En una aplicación real, aquí generarías un token JWT o usarías NextAuth
    const response = NextResponse.json({
      message: 'Login exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

    // Simulamos una sesión simple (en producción usa NextAuth o JWT)
    response.cookies.set('user-id', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })

    return response
  } catch (error) {
    console.error('Error en login:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    // Log completo del error en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('Error completo:', {
        message: errorMessage,
        stack: errorStack,
        error: error
      })
    }
    
    // Detectar errores específicos de Prisma
    let userFriendlyError = 'Error interno del servidor'
    if (errorMessage.includes('P1001') || errorMessage.includes('Can\'t reach database')) {
      userFriendlyError = 'No se puede conectar a la base de datos. Verifica que PostgreSQL esté corriendo.'
    } else if (errorMessage.includes('P2002')) {
      userFriendlyError = 'Error de duplicado en la base de datos'
    } else if (errorMessage.includes('P2025')) {
      userFriendlyError = 'Registro no encontrado'
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyError, 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

