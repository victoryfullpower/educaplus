import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

async function checkAdmin(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return { error: 'No autenticado', status: 401 }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { rol: true } })
  if (user?.rol !== 'Administrador') return { error: 'No autorizado', status: 403 }
  return { error: null }
}

export async function GET() {
  try {
    const planes = await prisma.planAnual.findMany({
      include: {
        usuario: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      },
      orderBy: { fechaHora: 'desc' }
    })
    return NextResponse.json({ planes })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener planes anuales' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.planAnual.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Plan anual eliminado exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar plan anual' }, { status: 500 })
  }
}

