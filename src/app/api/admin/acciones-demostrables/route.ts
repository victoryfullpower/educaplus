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
    const acciones = await prisma.actDemostrable.findMany({ 
      include: {
        valor: true
      },
      orderBy: { idactdemostrable: 'asc' } 
    })
    return NextResponse.json({ acciones })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener acciones demostrables' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idvalor } = await request.json()
    if (!descripcion || !idvalor) {
      return NextResponse.json({ error: 'Descripción e ID de valor son requeridos' }, { status: 400 })
    }

    const accion = await prisma.actDemostrable.create({ 
      data: { 
        descripcion,
        idvalor: parseInt(idvalor)
      } 
    })
    return NextResponse.json({ message: 'Acción demostrable creada exitosamente', accion })
  } catch (error: any) {
    console.error('Error al crear acción demostrable:', error)
    return NextResponse.json({ error: 'Error al crear acción demostrable' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idactdemostrable, descripcion, idvalor } = await request.json()
    if (!idactdemostrable || !descripcion || !idvalor) {
      return NextResponse.json({ error: 'ID, descripción e ID de valor son requeridos' }, { status: 400 })
    }

    const accion = await prisma.actDemostrable.update({
      where: { idactdemostrable: parseInt(idactdemostrable) },
      data: { 
        descripcion,
        idvalor: parseInt(idvalor)
      }
    })
    return NextResponse.json({ message: 'Acción demostrable actualizada exitosamente', accion })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar acción demostrable' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.actDemostrable.delete({ where: { idactdemostrable: parseInt(id) } })
    return NextResponse.json({ message: 'Acción demostrable eliminada exitosamente' })
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'No se puede eliminar porque tiene relaciones asociadas' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al eliminar acción demostrable' }, { status: 500 })
  }
}

