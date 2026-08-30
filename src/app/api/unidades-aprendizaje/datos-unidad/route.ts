import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { textoCampoTematicoDesdeUnidadPlan } from '@/lib/campo-tematico-unidad'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unidad = searchParams.get('unidad')
    const areaId = searchParams.get('areaId')
    const gradoId = searchParams.get('gradoId')
    const anio = searchParams.get('anio') || new Date().getFullYear().toString()

    if (!unidad || !areaId || !gradoId) {
      return NextResponse.json(
        { error: 'Unidad, área y grado son requeridos' },
        { status: 400 }
      )
    }

    // Buscar el plan anual del usuario
    const planAnual = await prisma.planAnual.findFirst({
      where: {
        idusuario: userId,
        anio: parseInt(anio),
        areaId: areaId,
        gradoId: gradoId
      }
    })

    if (!planAnual || !planAnual.unidades) {
      return NextResponse.json({
        situacionSignificativa: null,
        producto: null,
        tituloUnidad: null,
        campoTematico: null
      })
    }

    // Parsear las unidades
    const unidades = Array.isArray(planAnual.unidades) 
      ? planAnual.unidades 
      : JSON.parse(planAnual.unidades as string)

    // Buscar la unidad específica
    // Puede estar indexada por número de unidad o tener un campo numeroUnidad/unidad
    const unidadNumero = parseInt(unidad, 10)
    let unidadData = null

    // Intentar buscar por índice primero
    if (Array.isArray(unidades) && unidades[unidadNumero]) {
      unidadData = unidades[unidadNumero]
    } else if (Array.isArray(unidades)) {
      // Si no está por índice, buscar por campo numeroUnidad o unidad
      unidadData = unidades.find((u: any) => 
        u.numeroUnidad === unidadNumero || 
        u.unidad === unidadNumero ||
        u.numero === unidadNumero
      )
    }

    if (!unidadData) {
      return NextResponse.json({
        situacionSignificativa: null,
        producto: null,
        tituloUnidad: null,
        campoTematico: null
      })
    }

    const campoTematico = textoCampoTematicoDesdeUnidadPlan(unidadData) || null

    return NextResponse.json({
      situacionSignificativa: unidadData.situacionSignificativa || null,
      producto: unidadData.producto || null,
      tituloUnidad: unidadData.tituloUnidad || null,
      campoTematico
    })
  } catch (error) {
    console.error('Error al obtener datos de unidad:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos de unidad' },
      { status: 500 }
    )
  }
}
