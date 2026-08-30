import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'
import { assertPuedeCrearUnidad } from '@/lib/limites-plan-anual'

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
      formData, // Datos básicos de la unidad
      sesiones, // Array de sesiones
      variablesTemplate, // Variables dinámicas del template
      idplananual // ID del plan anual relacionado (opcional)
    } = data

    // Obtener el año actual
    const anio = new Date().getFullYear()

    // Validar campos requeridos
    if (!formData?.areaId || !formData?.gradoId || !formData?.unidad) {
      return NextResponse.json(
        { error: 'Area, grado y unidad son requeridos' },
        { status: 400 }
      )
    }

    // Buscar si ya existe una unidad de aprendizaje para este usuario, año, área, grado y unidad
    const unidadExistente = await prisma.unidadAprendizaje.findFirst({
      where: {
        idusuario: userId,
        anio: anio,
        areaId: formData.areaId,
        gradoId: formData.gradoId,
        unidad: formData.unidad
      }
    })

    // Preparar los datos a guardar
    const datosUnidad: any = {
      idusuario: userId,
      anio: anio,
      fechaHora: new Date(),
      
      // Datos básicos
      area: formData?.area !== undefined ? formData.area : null,
      areaId: formData?.areaId !== undefined ? formData.areaId : null,
      grado: formData?.grado !== undefined ? formData.grado : null,
      gradoId: formData?.gradoId !== undefined ? formData.gradoId : null,
      ciclo: formData?.ciclo !== undefined ? formData.ciclo : null,
      cicloId: formData?.cicloId !== undefined ? formData.cicloId : null,
      unidad: formData?.unidad !== undefined ? formData.unidad : null,
      
      // Datos institucionales
      institucion: formData?.institucion !== undefined ? formData.institucion : null,
      tipoIE: formData?.tipoIE !== undefined ? formData.tipoIE : null,
      director: formData?.director !== undefined ? formData.director : null,
      docente: formData?.docente !== undefined ? formData.docente : null,
      duracion: formData?.duracion !== undefined ? formData.duracion : null,
      
      // Datos temporales
      fechaInicio: formData?.fechaInicio !== undefined ? formData.fechaInicio : null,
      fechaTermino: formData?.fechaTermino !== undefined ? formData.fechaTermino : null,
      
      // Datos de contenido
      situacionSignificativa: formData?.situacionSignificativa !== undefined ? formData.situacionSignificativa : null,
      producto: formData?.producto !== undefined ? formData.producto : null,
      tituloUnidad: formData?.tituloUnidad !== undefined ? formData.tituloUnidad : null,
      propositoUnidad: formData?.propositoUnidad !== undefined ? formData.propositoUnidad : null,
      competencias: formData?.competencias !== undefined ? JSON.parse(JSON.stringify(formData.competencias)) : null,
      campoTematico: formData?.campoTematico !== undefined ? formData.campoTematico : null,
      numeroSesiones: formData?.numeroSesiones !== undefined ? formData.numeroSesiones : null,
      instrumentoEvaluacion: formData?.instrumentoEvaluacion !== undefined ? formData.instrumentoEvaluacion : null,
      
      // Relación con plan anual (opcional)
      idplananual: idplananual !== undefined ? (idplananual ? parseInt(idplananual, 10) : null) : null
    }
    
    // Reparar sesiones: unir ítems que se cortaron por coma cuando el siguiente empieza en minúscula (ej. "Adecúa" + "organiza y desarrolla...")
    const repararListaCortadaPorComa = (arr: string[]): string[] => {
      if (!Array.isArray(arr) || arr.length <= 1) return arr
      const out: string[] = []
      let i = 0
      while (i < arr.length) {
        let item = (arr[i] || '').trim()
        while (i + 1 < arr.length) {
          const next = (arr[i + 1] || '').trim()
          const siguienteEmpiezaMinuscula = /^[a-záéíóúñ]/.test(next)
          if (siguienteEmpiezaMinuscula) {
            item = item + ', ' + next
            i++
          } else break
        }
        if (item) out.push(item)
        i++
      }
      return out
    }
    const repararSesiones = (lista: any[]): any[] => lista.map((s: any) => ({
      ...s,
      competenciasSeleccionadas: Array.isArray(s.competenciasSeleccionadas) ? repararListaCortadaPorComa(s.competenciasSeleccionadas) : (s.competenciasSeleccionadas ?? []),
      capacidadesSeleccionadas: Array.isArray(s.capacidadesSeleccionadas) ? repararListaCortadaPorComa(s.capacidadesSeleccionadas) : (s.capacidadesSeleccionadas ?? []),
      desempeniosSeleccionados: Array.isArray(s.desempeniosSeleccionados) ? repararListaCortadaPorComa(s.desempeniosSeleccionados) : (s.desempeniosSeleccionados ?? [])
    }))

    // Sesiones y variables del template (siempre reparar antes de guardar para unir ítems cortados por coma)
    if (sesiones !== undefined && sesiones !== null) {
      const sesionesArr = Array.isArray(sesiones) ? JSON.parse(JSON.stringify(sesiones)) : []
      datosUnidad.sesiones = repararSesiones(sesionesArr)
    } else if (!unidadExistente) {
      // Solo establecer null si es un nuevo registro
      datosUnidad.sesiones = null
    }
    
    if (variablesTemplate !== undefined && variablesTemplate !== null) {
      datosUnidad.variablesTemplate = JSON.parse(JSON.stringify(variablesTemplate))
    } else if (!unidadExistente) {
      // Solo establecer null si es un nuevo registro
      datosUnidad.variablesTemplate = null
    }

    // Si existe, actualizar; si no, crear
    let unidadAprendizaje
    let mensaje
    
    if (unidadExistente) {
      // Actualizar la unidad existente (solo los campos proporcionados)
      unidadAprendizaje = await prisma.unidadAprendizaje.update({
        where: { id: unidadExistente.id },
        data: datosUnidad
      })
      mensaje = 'Unidad de aprendizaje actualizada exitosamente'
    } else {
      const limite = await assertPuedeCrearUnidad(userId)
      if (!limite.ok) {
        return NextResponse.json(
          { error: limite.error, code: limite.code },
          { status: 403 }
        )
      }
      unidadAprendizaje = await prisma.unidadAprendizaje.create({
        data: datosUnidad
      })
      mensaje = 'Unidad de aprendizaje guardada exitosamente'
    }

    return NextResponse.json({
      message: mensaje,
      unidadAprendizaje: {
        id: unidadAprendizaje.id,
        anio: unidadAprendizaje.anio,
        unidad: unidadAprendizaje.unidad,
        fechaHora: unidadAprendizaje.fechaHora
      },
      actualizado: !!unidadExistente
    })
  } catch (error) {
    console.error('Error al guardar unidad de aprendizaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al guardar la unidad de aprendizaje', 
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
    const unidadId = searchParams.get('id')
    const anio = searchParams.get('anio')
    const areaId = searchParams.get('areaId')
    const gradoId = searchParams.get('gradoId')
    const unidad = searchParams.get('unidad')
    const idplananual = searchParams.get('idplananual')

    if (unidadId) {
      // Obtener una unidad específica con sus sesiones (para ficha de aprendizaje, etc.)
      const unidadAprendizaje = await prisma.unidadAprendizaje.findFirst({
        where: {
          id: parseInt(unidadId, 10),
          idusuario: userId
        },
        include: {
          listaSesiones: {
            orderBy: { numeroSesion: 'asc' }
          }
        }
      })

      if (!unidadAprendizaje) {
        return NextResponse.json(
          { error: 'Unidad de aprendizaje no encontrada' },
          { status: 404 }
        )
      }

      return NextResponse.json({ unidadAprendizaje })
    }

    // Obtener unidades de aprendizaje del usuario con filtros opcionales
    const where: any = { idusuario: userId }
    
    if (anio) {
      where.anio = parseInt(anio, 10)
    }
    
    if (areaId) {
      where.areaId = areaId
    }
    
    if (gradoId) {
      where.gradoId = gradoId
    }
    
    if (unidad) {
      where.unidad = unidad
    }

    if (idplananual) {
      const planId = parseInt(idplananual, 10)
      if (!isNaN(planId)) {
        where.idplananual = planId
      }
    }

    const unidades = await prisma.unidadAprendizaje.findMany({
      where,
      orderBy: {
        fechaHora: 'desc'
      },
      include: {
        listaSesiones: {
          orderBy: { numeroSesion: 'asc' }
        }
      }
    })

    return NextResponse.json({ unidadesAprendizaje: unidades })
  } catch (error) {
    console.error('Error al obtener unidades de aprendizaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al obtener las unidades de aprendizaje', 
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
    const { id, formData, sesiones, variablesTemplate, idplananual } = data

    if (!id) {
      return NextResponse.json(
        { error: 'ID de la unidad de aprendizaje es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la unidad pertenece al usuario
    const unidadExistente = await prisma.unidadAprendizaje.findFirst({
      where: {
        id: parseInt(id, 10),
        idusuario: userId
      }
    })

    if (!unidadExistente) {
      return NextResponse.json(
        { error: 'Unidad de aprendizaje no encontrada o no tienes permisos' },
        { status: 404 }
      )
    }

    // Preparar datos para actualizar
    const datosActualizar: any = {}
    
    // Datos básicos
    if (formData?.area !== undefined) datosActualizar.area = formData.area
    if (formData?.areaId !== undefined) datosActualizar.areaId = formData.areaId
    if (formData?.grado !== undefined) datosActualizar.grado = formData.grado
    if (formData?.gradoId !== undefined) datosActualizar.gradoId = formData.gradoId
    if (formData?.ciclo !== undefined) datosActualizar.ciclo = formData.ciclo
    if (formData?.cicloId !== undefined) datosActualizar.cicloId = formData.cicloId
    if (formData?.unidad !== undefined) datosActualizar.unidad = formData.unidad
    
    // Datos institucionales
    if (formData?.institucion !== undefined) datosActualizar.institucion = formData.institucion
    if (formData?.tipoIE !== undefined) datosActualizar.tipoIE = formData.tipoIE
    if (formData?.director !== undefined) datosActualizar.director = formData.director
    if (formData?.docente !== undefined) datosActualizar.docente = formData.docente
    if (formData?.duracion !== undefined) datosActualizar.duracion = formData.duracion
    
    // Datos temporales
    if (formData?.fechaInicio !== undefined) datosActualizar.fechaInicio = formData.fechaInicio
    if (formData?.fechaTermino !== undefined) datosActualizar.fechaTermino = formData.fechaTermino
    
    // Datos de contenido
    if (formData?.situacionSignificativa !== undefined) datosActualizar.situacionSignificativa = formData.situacionSignificativa
    if (formData?.producto !== undefined) datosActualizar.producto = formData.producto
    if (formData?.tituloUnidad !== undefined) datosActualizar.tituloUnidad = formData.tituloUnidad
    if (formData?.propositoUnidad !== undefined) datosActualizar.propositoUnidad = formData.propositoUnidad
    if (formData?.competencias !== undefined) datosActualizar.competencias = JSON.parse(JSON.stringify(formData.competencias))
    if (formData?.campoTematico !== undefined) datosActualizar.campoTematico = formData.campoTematico
    if (formData?.numeroSesiones !== undefined) datosActualizar.numeroSesiones = formData.numeroSesiones
    if (formData?.instrumentoEvaluacion !== undefined) datosActualizar.instrumentoEvaluacion = formData.instrumentoEvaluacion
    
    // Sesiones y variables del template
    if (sesiones !== undefined) {
      datosActualizar.sesiones = JSON.parse(JSON.stringify(sesiones))
    }
    
    if (variablesTemplate !== undefined) {
      datosActualizar.variablesTemplate = JSON.parse(JSON.stringify(variablesTemplate))
    }
    
    // Relación con plan anual
    if (idplananual !== undefined) {
      datosActualizar.idplananual = idplananual ? parseInt(idplananual, 10) : null
    }

    // Actualizar la unidad
    const unidadAprendizaje = await prisma.unidadAprendizaje.update({
      where: { id: parseInt(id, 10) },
      data: datosActualizar
    })

    return NextResponse.json({
      message: 'Unidad de aprendizaje actualizada exitosamente',
      unidadAprendizaje: {
        id: unidadAprendizaje.id,
        anio: unidadAprendizaje.anio,
        unidad: unidadAprendizaje.unidad,
        fechaHora: unidadAprendizaje.fechaHora
      }
    })
  } catch (error) {
    console.error('Error al actualizar unidad de aprendizaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al actualizar la unidad de aprendizaje', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const unidadId = searchParams.get('id')

    if (!unidadId) {
      return NextResponse.json(
        { error: 'ID de la unidad de aprendizaje es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la unidad pertenece al usuario
    const unidadExistente = await prisma.unidadAprendizaje.findFirst({
      where: {
        id: parseInt(unidadId, 10),
        idusuario: userId
      }
    })

    if (!unidadExistente) {
      return NextResponse.json(
        { error: 'Unidad de aprendizaje no encontrada o no tienes permisos' },
        { status: 404 }
      )
    }

    // Eliminar la unidad
    await prisma.unidadAprendizaje.delete({
      where: { id: parseInt(unidadId, 10) }
    })

    return NextResponse.json({
      message: 'Unidad de aprendizaje eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error al eliminar unidad de aprendizaje:', error)
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      { 
        error: 'Error al eliminar la unidad de aprendizaje', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    )
  }
}

