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
    const prompts = await prisma.prompt.findMany({ 
      orderBy: { fechacreacion: 'desc' } 
    })
    console.log(`[GET /api/admin/prompts] Encontrados ${prompts.length} prompts`)
    return NextResponse.json({ prompts })
  } catch (error) {
    console.error('[GET /api/admin/prompts] Error:', error)
    return NextResponse.json({ error: 'Error al obtener prompts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, contenido, estado = 'activo' } = await request.json()
    if (!descripcion || !contenido) {
      return NextResponse.json({ error: 'Descripción y contenido son requeridos' }, { status: 400 })
    }

    if (estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const prompt = await prisma.prompt.create({ 
      data: { descripcion, contenido, estado } 
    })
    return NextResponse.json({ message: 'Prompt creado exitosamente', prompt })
  } catch (error: any) {
    console.error('Error al crear prompt:', error)
    return NextResponse.json({ error: 'Error al crear prompt' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idprompt, descripcion, contenido, estado } = await request.json()
    if (!idprompt || !descripcion || !contenido) {
      return NextResponse.json({ error: 'ID, descripción y contenido son requeridos' }, { status: 400 })
    }

    if (estado && estado !== 'activo' && estado !== 'inactivo') {
      return NextResponse.json({ error: 'El estado debe ser "activo" o "inactivo"' }, { status: 400 })
    }

    const prompt = await prisma.prompt.update({
      where: { idprompt: parseInt(idprompt) },
      data: { descripcion, contenido, estado: estado || undefined }
    })
    return NextResponse.json({ message: 'Prompt actualizado exitosamente', prompt })
  } catch (error) {
    console.error('Error al actualizar prompt:', error)
    return NextResponse.json({ error: 'Error al actualizar prompt' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.prompt.delete({ where: { idprompt: parseInt(id) } })
    return NextResponse.json({ message: 'Prompt eliminado exitosamente' })
  } catch (error) {
    console.error('Error al eliminar prompt:', error)
    return NextResponse.json({ error: 'Error al eliminar prompt' }, { status: 500 })
  }
}

