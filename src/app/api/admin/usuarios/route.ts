import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

// Verificar que el usuario sea administrador
async function checkAdmin(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) {
    return { error: 'No autenticado', status: 401, user: null }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rol: true }
  })

  if (user?.rol !== 'Administrador') {
    return { error: 'No autorizado', status: 403, user: null }
  }

  return { error: null, status: 200, user: { id: userId } }
}

export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin(request)
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const usuarios = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        rol: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    console.error('Error al obtener usuarios:', error)
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin(request)
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const { email, password, name, rol } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'El email ya está en uso' },
        { status: 400 }
      )
    }

    const usuario = await prisma.user.create({
      data: {
        email,
        password, // En texto plano
        name: name || null,
        rol: rol || 'Usuario'
      }
    })

    return NextResponse.json({
      message: 'Usuario creado exitosamente',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return NextResponse.json(
      { error: 'Error al crear usuario' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin(request)
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const { id, email, password, name, rol } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (email !== undefined) updateData.email = email
    if (password !== undefined) updateData.password = password
    if (name !== undefined) updateData.name = name
    if (rol !== undefined) updateData.rol = rol

    if (email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'El email ya está en uso' },
          { status: 400 }
        )
      }
    }

    const usuario = await prisma.user.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      message: 'Usuario actualizado exitosamente',
      usuario: {
        id: usuario.id,
        email: usuario.email,
        name: usuario.name,
        rol: usuario.rol
      }
    })
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminCheck = await checkAdmin(request)
    if (adminCheck.error) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID es requerido' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: parseInt(id, 10) }
    })

    return NextResponse.json({ message: 'Usuario eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return NextResponse.json(
      { error: 'Error al eliminar usuario' },
      { status: 500 }
    )
  }
}

