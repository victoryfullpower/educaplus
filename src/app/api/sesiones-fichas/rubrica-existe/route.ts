import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET ?sesionId=... — Indica si existe una rúbrica guardada para la sesión.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const sesionIdParam = request.nextUrl.searchParams.get('sesionId')
    const sesionId = sesionIdParam != null ? parseInt(sesionIdParam, 10) : null
    if (sesionId == null || isNaN(sesionId)) {
      return NextResponse.json({ existe: false })
    }
    const sesion = await prisma.sesion.findFirst({
      where: { id: sesionId },
      include: { unidadAprendizaje: true, rubrica: true }
    })
    if (!sesion || sesion.unidadAprendizaje.idusuario !== userId) {
      return NextResponse.json({ existe: false })
    }
    return NextResponse.json({ existe: !!sesion.rubrica })
  } catch (error) {
    console.error('Error en rubrica-existe:', error)
    return NextResponse.json({ existe: false })
  }
}
