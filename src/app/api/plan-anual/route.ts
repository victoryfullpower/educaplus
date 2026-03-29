import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

function normalizePlanIdField(v: unknown): string {
  if (v === undefined || v === null || v === '') return ''
  return String(v)
}

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
      variablesTemplate, // Variables dinámicas del template
      planAnualId,
      anio: anioBody
    } = data

    const anio =
      typeof anioBody === 'number'
        ? anioBody
        : typeof formData?.anio === 'number'
          ? formData.anio
          : new Date().getFullYear()

    let planExistente = null as Awaited<ReturnType<typeof prisma.planAnual.findFirst>>

    const idFromBody =
      planAnualId !== undefined && planAnualId !== null && planAnualId !== ''
        ? typeof planAnualId === 'number'
          ? planAnualId
          : parseInt(String(planAnualId), 10)
        : NaN
    const edicionPorId = Number.isFinite(idFromBody)

    if (edicionPorId) {
      planExistente = await prisma.planAnual.findFirst({
        where: { id: idFromBody, idusuario: userId }
      })
      if (!planExistente) {
        return NextResponse.json(
          { error: 'Plan anual no encontrado', code: 'PLAN_NO_ENCONTRADO' },
          { status: 404 }
        )
      }
    } else {
      const areaIdBusq = normalizePlanIdField(formData?.areaId)
      const nivelIdBusq = normalizePlanIdField(formData?.nivelId)
      const gradoIdBusq = normalizePlanIdField(formData?.gradoId)
      const duplicado = await prisma.planAnual.findFirst({
        where: {
          idusuario: userId,
          anio,
          areaId: areaIdBusq,
          nivelId: nivelIdBusq,
          gradoId: gradoIdBusq
        }
      })
      if (duplicado) {
        return NextResponse.json(
          {
            error:
              'Ya existe un plan anual para este año con la misma área, nivel y grado. Ábrelo desde Inicio o elige otra combinación.',
            code: 'PLAN_ANUAL_DUPLICADO',
            planId: duplicado.id
          },
          { status: 409 }
        )
      }
      planExistente = null
    }

    const areaIdGuardado =
      formData?.areaId !== undefined
        ? normalizePlanIdField(formData.areaId)
        : normalizePlanIdField(planExistente?.areaId)
    const nivelIdGuardado =
      formData?.nivelId !== undefined
        ? normalizePlanIdField(formData.nivelId)
        : normalizePlanIdField(planExistente?.nivelId)
    const gradoIdGuardado =
      formData?.gradoId !== undefined
        ? normalizePlanIdField(formData.gradoId)
        : normalizePlanIdField(planExistente?.gradoId)

    // Preparar los datos a guardar
    const datosPlan: any = {
      idusuario: userId,
      anio: anio,
      fechaHora: new Date(),
      
      // Datos de Fase 1 (siempre actualizar)
      area: formData?.area !== undefined ? formData.area : null,
      areaId: areaIdGuardado,
      grado: formData?.grado !== undefined ? formData.grado : null,
      gradoId: gradoIdGuardado,
      institucion: formData?.institucion !== undefined ? formData.institucion : null,
      docente: formData?.docente !== undefined ? formData.docente : null,
      dre: formData?.dre !== undefined ? formData.dre : null,
      ugel: formData?.ugel !== undefined ? formData.ugel : null,
      director: formData?.director !== undefined ? formData.director : null,
      coordinador: formData?.coordinador !== undefined ? formData.coordinador : null,
      nivel: formData?.nivel !== undefined ? formData.nivel : null,
      nivelId: nivelIdGuardado,
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
        areaId:
          formData?.areaId !== undefined
            ? normalizePlanIdField(formData.areaId)
            : planExistente.areaId,
        grado: formData?.grado !== undefined ? formData.grado : planExistente.grado,
        gradoId:
          formData?.gradoId !== undefined
            ? normalizePlanIdField(formData.gradoId)
            : planExistente.gradoId,
        institucion: formData?.institucion !== undefined ? formData.institucion : planExistente.institucion,
        docente: formData?.docente !== undefined ? formData.docente : planExistente.docente,
        dre: formData?.dre !== undefined ? formData.dre : planExistente.dre,
        ugel: formData?.ugel !== undefined ? formData.ugel : planExistente.ugel,
        director: formData?.director !== undefined ? formData.director : planExistente.director,
        coordinador: formData?.coordinador !== undefined ? formData.coordinador : planExistente.coordinador,
        nivel: formData?.nivel !== undefined ? formData.nivel : planExistente.nivel,
        nivelId:
          formData?.nivelId !== undefined
            ? normalizePlanIdField(formData.nivelId)
            : planExistente.nivelId,
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

