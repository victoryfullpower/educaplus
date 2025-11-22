import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      )
    }

    // Guardar contraseña en texto plano (si las contraseñas en BD no están encriptadas)
    // Crear usuario
    const user = await prisma.user.create({
      data: {
        email,
        password: password, // Guardar en texto plano
        name: name || null
      }
    })

    const response = NextResponse.json({
      message: 'Usuario creado exitosamente',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })

    response.cookies.set('user-id', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 días
    })

    return response
  } catch (error) {
    console.error('Error en registro:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { error: 'Error interno del servidor', details: process.env.NODE_ENV === 'development' ? errorMessage : undefined },
      { status: 500 }
    )
  }
}

