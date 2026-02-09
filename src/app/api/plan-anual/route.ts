import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      formData, // Datos de Fase 1
      unidades, // Datos de Fase 2
      variablesTemplate // Variables dinámicas del template
    } = data

    // Obtener el año actual
    const anio = new Date().getFullYear()

    // Buscar si ya existe un plan anual para este usuario y año
    const planExistente = await prisma.planAnual.findFirst({
      where: {
        idusuario: userId,
        anio: anio
      }
    })

    // Preparar los datos a guardar
    const datosPlan: any = {
      idusuario: userId,
      anio: anio,
      fechaHora: new Date(),
      
      // Datos de Fase 1 (siempre actualizar)
      area: formData?.area !== undefined ? formData.area : null,
      areaId: formData?.areaId !== undefined ? formData.areaId : null,
      grado: formData?.grado !== undefined ? formData.grado : null,
      gradoId: formData?.gradoId !== undefined ? formData.gradoId : null,
      institucion: formData?.institucion !== undefined ? formData.institucion : null,
      docente: formData?.docente !== undefined ? formData.docente : null,
      dre: formData?.dre !== undefined ? formData.dre : null,
      ugel: formData?.ugel !== undefined ? formData.ugel : null,
      director: formData?.director !== undefined ? formData.director : null,
      coordinador: formData?.coordinador !== undefined ? formData.coordinador : null,
      nivel: formData?.nivel !== undefined ? formData.nivel : null,
      nivelId: formData?.nivelId !== undefined ? formData.nivelId : null,
      departamento: formData?.departamento !== undefined ? formData.departamento : null,
      provincia: formData?.provincia !== undefined ? formData.provincia : null,
      distrito: formData?.distrito !== undefined ? formData.distrito : null
    }
    
    // Datos de Fase 2 y variables del template
    // Solo actualizar si se proporcionan (no sobrescribir con null si ya existen)
    if (unidades !== undefined && unidades !== null) {
      // Si existe un plan y tiene unidades con datos generados por IA,
      // preservar situacionSignificativa y campoTematico de las unidades existentes
      if (planExistente && planExistente.unidades) {
        const unidadesExistentes = Array.isArray(planExistente.unidades) 
          ? planExistente.unidades 
          : JSON.parse(planExistente.unidades as string)
        const nuevasUnidades = JSON.parse(JSON.stringify(unidades))
        
        // Preservar situacionSignificativa y campoTematico de unidades existentes
        nuevasUnidades.forEach((nuevaUnidad: any, index: number) => {
          const unidadExistente = unidadesExistentes[index]
          if (unidadExistente) {
            // Si la nueva unidad no tiene situacionSignificativa o campoTematico,
            // pero la existente sí los tiene, preservarlos
            if (!nuevaUnidad.situacionSignificativa && unidadExistente.situacionSignificativa) {
              nuevaUnidad.situacionSignificativa = unidadExistente.situacionSignificativa
            }
            if (!nuevaUnidad.campoTematico && unidadExistente.campoTematico) {
              nuevaUnidad.campoTematico = unidadExistente.campoTematico
            }
            if (!nuevaUnidad.tituloUnidad && unidadExistente.tituloUnidad) {
              nuevaUnidad.tituloUnidad = unidadExistente.tituloUnidad
            }
          }
        })
        
        datosPlan.unidades = nuevasUnidades
      } else {
        datosPlan.unidades = JSON.parse(JSON.stringify(unidades))
      }
    } else if (!planExistente) {
      // Solo establecer null si es un nuevo registro
      datosPlan.unidades = null
    }
    // Si planExistente y unidades es null/undefined, no incluir en la actualización
    
    if (variablesTemplate !== undefined && variablesTemplate !== null) {
      datosPlan.variablesTemplate = JSON.parse(JSON.stringify(variablesTemplate))
    } else if (!planExistente) {
      // Solo establecer null si es un nuevo registro
      datosPlan.variablesTemplate = null
    }
    // Si planExistente y variablesTemplate es null/undefined, no incluir en la actualización

    // Si existe, actualizar; si no, crear
    let planAnual
    let mensaje
    
    if (planExistente) {
      // Actualizar el plan existente (solo los campos proporcionados)
      planAnual = await prisma.planAnual.update({
        where: { id: planExistente.id },
        data: datosPlan
      })
      mensaje = 'Plan anual actualizado exitosamente'
    } else {
      // Crear nuevo plan
      planAnual = await prisma.planAnual.create({
        data: datosPlan
      })
      mensaje = 'Plan anual guardado exitosamente'
    }

    return NextResponse.json({
      message: mensaje,
      planAnual: {
        id: planAnual.id,
        anio: planAnual.anio,
        fechaHora: planAnual.fechaHora
      },
      actualizado: !!planExistente
    })
  } catch (error) {
    console.error('Error al guardar plan anual:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al guardar el plan anual', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

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
    const planId = searchParams.get('id')
    const anio = searchParams.get('anio')

    if (planId) {
      // Obtener un plan específico
      const plan = await prisma.planAnual.findFirst({
        where: {
          id: parseInt(planId, 10),
          idusuario: userId
        }
      })

      if (!plan) {
        return NextResponse.json(
          { error: 'Plan anual no encontrado' },
          { status: 404 }
        )
      }

      return NextResponse.json({ planAnual: plan })
    }

    // Obtener todos los planes del usuario
    const where: any = { idusuario: userId }
    if (anio) {
      where.anio = parseInt(anio, 10)
    }

    const planes = await prisma.planAnual.findMany({
      where,
      orderBy: {
        fechaHora: 'desc'
      }
    })

    return NextResponse.json({ planesAnuales: planes })
  } catch (error) {
    console.error('Error al obtener planes anuales:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al obtener los planes anuales', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const { id, formData, unidades, variablesTemplate } = data

    if (!id) {
      return NextResponse.json(
        { error: 'ID del plan anual es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el plan pertenece al usuario
    const planExistente = await prisma.planAnual.findFirst({
      where: {
        id: parseInt(id, 10),
        idusuario: userId
      }
    })

    if (!planExistente) {
      return NextResponse.json(
        { error: 'Plan anual no encontrado o no tienes permisos' },
        { status: 404 }
      )
    }

    // Actualizar el plan
    const planAnual = await prisma.planAnual.update({
      where: { id: parseInt(id, 10) },
      data: {
        // Datos de Fase 1
        area: formData?.area !== undefined ? formData.area : planExistente.area,
        areaId: formData?.areaId !== undefined ? formData.areaId : planExistente.areaId,
        grado: formData?.grado !== undefined ? formData.grado : planExistente.grado,
        gradoId: formData?.gradoId !== undefined ? formData.gradoId : planExistente.gradoId,
        institucion: formData?.institucion !== undefined ? formData.institucion : planExistente.institucion,
        docente: formData?.docente !== undefined ? formData.docente : planExistente.docente,
        dre: formData?.dre !== undefined ? formData.dre : planExistente.dre,
        ugel: formData?.ugel !== undefined ? formData.ugel : planExistente.ugel,
        director: formData?.director !== undefined ? formData.director : planExistente.director,
        coordinador: formData?.coordinador !== undefined ? formData.coordinador : planExistente.coordinador,
        nivel: formData?.nivel !== undefined ? formData.nivel : planExistente.nivel,
        nivelId: formData?.nivelId !== undefined ? formData.nivelId : planExistente.nivelId,
        departamento: formData?.departamento !== undefined ? formData.departamento : planExistente.departamento,
        provincia: formData?.provincia !== undefined ? formData.provincia : planExistente.provincia,
        distrito: formData?.distrito !== undefined ? formData.distrito : planExistente.distrito,
        
        // Datos de Fase 2 y variables del template
        unidades: unidades !== undefined ? JSON.parse(JSON.stringify(unidades)) : planExistente.unidades,
        variablesTemplate: variablesTemplate !== undefined ? JSON.parse(JSON.stringify(variablesTemplate)) : planExistente.variablesTemplate
      }
    })

    return NextResponse.json({
      message: 'Plan anual actualizado exitosamente',
      planAnual: {
        id: planAnual.id,
        anio: planAnual.anio,
        fechaHora: planAnual.fechaHora
      }
    })
  } catch (error) {
    console.error('Error al actualizar plan anual:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al actualizar el plan anual', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

