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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idarea = searchParams.get('idarea')
    const idgrado = searchParams.get('idgrado')
    const idnivel = searchParams.get('idnivel')

    const where: any = {}
    if (idarea) where.idarea = parseInt(idarea)
    if (idgrado) where.idgrado = parseInt(idgrado)
    if (idnivel) where.idnivel = parseInt(idnivel)

    const competencias = await prisma.competencia.findMany({
      where,
      include: {
        area: true,
        grado: true,
        nivel: true
      },
      orderBy: { id: 'asc' }
    })
    return NextResponse.json({ competencias })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener competencias' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, numeroCompetencia, transversal, idarea, idgrado, idnivel } = await request.json()
    if (!descripcion || !numeroCompetencia || !idarea || !idgrado || !idnivel) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    const competencia = await prisma.competencia.create({
      data: {
        descripcion,
        numeroCompetencia: parseInt(numeroCompetencia),
        transversal: transversal !== undefined ? Boolean(transversal) : false,
        idarea: parseInt(idarea),
        idgrado: parseInt(idgrado),
        idnivel: parseInt(idnivel)
      }
    })
    return NextResponse.json({ message: 'Competencia creada exitosamente', competencia })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Ya existe un registro con estos datos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al crear competencia' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { id, descripcion, numeroCompetencia, transversal, idarea, idgrado, idnivel } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })
    }

    const competencia = await prisma.competencia.update({
      where: { id: parseInt(id) },
      data: {
        descripcion,
        numeroCompetencia: numeroCompetencia ? parseInt(numeroCompetencia) : undefined,
        transversal: transversal !== undefined ? Boolean(transversal) : undefined,
        idarea: idarea ? parseInt(idarea) : undefined,
        idgrado: idgrado ? parseInt(idgrado) : undefined,
        idnivel: idnivel ? parseInt(idnivel) : undefined
      }
    })
    return NextResponse.json({ message: 'Competencia actualizada exitosamente', competencia })
  } catch (error) {
    return NextResponse.json({ error: 'Error al actualizar competencia' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.competencia.delete({ where: { id: parseInt(id) } })
    return NextResponse.json({ message: 'Competencia eliminada exitosamente' })
  } catch (error) {
    return NextResponse.json({ error: 'Error al eliminar competencia' }, { status: 500 })
  }
}

