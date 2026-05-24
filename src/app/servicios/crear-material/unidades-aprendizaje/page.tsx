'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import styles from './unidades-aprendizaje.module.css'
import { numerosUnidadYaGenerados, obtenerTipoIEDelPlan } from '@/lib/plan-estado-documentos'
import { linkHomeConAreaTab } from '@/lib/plan-area-tab'
import { linkSesionesDesdeUnidadPlan } from '@/lib/plan-documentos-links'

type UnidadPlanSlot = {
  problemaPotencialidad?: string
  producto?: string
  situacionSignificativa?: string
  tituloUnidad?: string
  campoTematico?: string
  conocimientos?: string
  competenciasSeleccionadas?: string[]
  desempeniosSeleccionados?: string[]
}

function unidadPlanTieneDatos(u: UnidadPlanSlot | undefined): boolean {
  if (!u) return false
  return !!(
    u.problemaPotencialidad?.trim() ||
    u.producto?.trim() ||
    u.situacionSignificativa?.trim() ||
    u.tituloUnidad?.trim() ||
    u.campoTematico?.trim() ||
    u.conocimientos?.trim() ||
    (u.competenciasSeleccionadas?.length ?? 0) > 0 ||
    (u.desempeniosSeleccionados?.length ?? 0) > 0
  )
}

/** Índices 1–8 presentes en el plan anual (unidad 0 no se lista). */
function indicesUnidadesDisponiblesPlan(unidades: unknown[]): number[] {
  const nums: number[] = []
  for (let i = 1; i <= 8; i++) {
    if (unidadPlanTieneDatos(unidades[i] as UnidadPlanSlot)) nums.push(i)
  }
  return nums
}

function primeraUnidadConDatos(unidades: unknown[]): number {
  const disponibles = indicesUnidadesDisponiblesPlan(unidades)
  return disponibles[0] ?? 1
}

const UNIDADES_COMBO_DEFAULT = [1, 2, 3, 4, 5, 6, 7, 8]

function semanasDesdeDuracion(duracion: string): number | null {
  const match = duracion.match(/(\d+)\s*semana/)
  return match ? parseInt(match[1], 10) : null
}

/** Último día de la unidad: inicio + N semanas − 1 día (evita desfase por zona horaria). */
function calcularFechaTermino(fechaInicio: string, duracion: string): string {
  const semanas = semanasDesdeDuracion(duracion)
  if (!semanas || !fechaInicio) return ''
  const inicio = new Date(`${fechaInicio}T12:00:00`)
  if (Number.isNaN(inicio.getTime())) return ''
  const fin = new Date(inicio)
  fin.setDate(fin.getDate() + semanas * 7 - 1)
  const y = fin.getFullYear()
  const m = String(fin.getMonth() + 1).padStart(2, '0')
  const d = String(fin.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface Area {
  id: number
  descripcion: string
  sesionx2?: boolean | null
}

interface Ciclo {
  id: number // Prisma mapea idciclo como id en el modelo
  descripcion: string
}

interface Grado {
  id: number
  descripcion: string | null
  idciclo: number
  ciclo: Ciclo
}

interface Competencia {
  id: number
  descripcion: string
  numeroCompetencia: number
}

interface Capacidad {
  id: number
  descripcion: string
  idcompetencia: number
  idstandar: number
}

interface Desempenio {
  id: number
  descripcion: string
  idcapacidad: number
}

function UnidadesAprendizajeContent() {
  const searchParams = useSearchParams()
  const planIdParam = searchParams.get('planId')
  const unidadParam = searchParams.get('unidad')
  const planPrecargadoRef = useRef(false)
  const planAnualRef = useRef<{ unidadesArr: unknown[]; tipoIE?: string } | null>(null)
  const [formularioBloqueadoPlan, setFormularioBloqueadoPlan] = useState(false)
  const [unidadesCombo, setUnidadesCombo] = useState<number[]>(UNIDADES_COMBO_DEFAULT)

  const bloqueadoPlan = formularioBloqueadoPlan
  const [formData, setFormData] = useState({
    area: '',
    areaId: '',
    grado: '',
    gradoId: '',
    ciclo: '',
    cicloId: '',
    unidad: '',
    institucion: '',
    tipoIE: '',
    director: '',
    docente: '',
    duracion: '',
    fechaInicio: '',
    fechaTermino: '',
    situacionSignificativa: '',
    producto: '',
    propositoUnidad: '',
    generarPropositoIA: true,
    competencias: [] as string[],
    campoTematico: '',
    numeroSesiones: '',
    instrumentoEvaluacion: '',
    sesiones: [] as { 
      titulo: string
      competenciasSeleccionadas: string[]
      capacidadesSeleccionadas: string[]
      desempeniosSeleccionados: string[]
      instrumentoEvaluacion: string
    }[]
  })
  const [areaSeleccionada, setAreaSeleccionada] = useState<Area | null>(null)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [overlayGeneracion, setOverlayGeneracion] = useState(false)
  const [generacionCompletada, setGeneracionCompletada] = useState(false)
  const generandoUnidad = overlayGeneracion && !generacionCompletada
  const [areas, setAreas] = useState<Area[]>([])
  const [grados, setGrados] = useState<Grado[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [datosDesdePlanAnual, setDatosDesdePlanAnual] = useState({
    situacionSignificativa: null as string | null,
    producto: null as string | null,
    tituloUnidad: null as string | null
  })
  const [loadingDatosUnidad, setLoadingDatosUnidad] = useState(false)
  
  // Estados para el modal de selección de competencias/desempeños por sesión
  const [showModalSesion, setShowModalSesion] = useState(false)
  
  // Estados para el modal de opciones de generación
  const [showModalGeneracion, setShowModalGeneracion] = useState(false)
  const [tieneDatosGuardados, setTieneDatosGuardados] = useState(false)
  const [sesionModalIndex, setSesionModalIndex] = useState<number | null>(null)
  const [competenciasSeleccionadasModal, setCompetenciasSeleccionadasModal] = useState<string[]>([])
  const [capacidadesSeleccionadasModal, setCapacidadesSeleccionadasModal] = useState<string[]>([])
  const [desempeniosSeleccionadosModal, setDesempeniosSeleccionadosModal] = useState<string[]>([])
  const [capacidadesModal, setCapacidadesModal] = useState<Capacidad[]>([])
  const [desempeniosModal, setDesempeniosModal] = useState<Desempenio[]>([])
  const [loadingCapacidadesModal, setLoadingCapacidadesModal] = useState(false)
  const [loadingDesempeniosModal, setLoadingDesempeniosModal] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true)
        const [areasRes, gradosRes] = await Promise.all([
          fetch('/api/competencias/areas'),
          fetch('/api/competencias/grados')
        ])

        const areasData = await areasRes.json()
        const gradosData = await gradosRes.json()

        setAreas(areasData)
        setGrados(gradosData)
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadInitialData()
  }, [])

  // Precarga desde plan anual (enlace desde /home con ?planId=&unidad=)
  useEffect(() => {
    if (!planIdParam || loadingData || areas.length === 0 || grados.length === 0) return
    if (planPrecargadoRef.current) return

    const cargarDesdePlanAnual = async () => {
      try {
        const [resPlan, resUnidades] = await Promise.all([
          fetch(`/api/plan-anual?id=${planIdParam}`),
          fetch(`/api/unidad-aprendizaje?idplananual=${planIdParam}`)
        ])
        if (!resPlan.ok) return

        const data = await resPlan.json()
        const plan = data.planAnual
        if (!plan) return

        const unidadesArr = Array.isArray(plan.unidades) ? plan.unidades : []

        const enPlan = indicesUnidadesDisponiblesPlan(unidadesArr)
        let yaGeneradas = new Set<number>()
        let tipoIEPlan = ''
        if (resUnidades.ok) {
          const dataUa = await resUnidades.json()
          const unidadesPlanDb = dataUa.unidadesAprendizaje ?? []
          yaGeneradas = numerosUnidadYaGenerados(unidadesPlanDb)
          tipoIEPlan = obtenerTipoIEDelPlan(unidadesPlanDb)
        }
        if (!tipoIEPlan && plan.areaId && plan.gradoId) {
          const anioPlan = plan.anio ?? new Date().getFullYear()
          const resMismoPlan = await fetch(
            `/api/unidad-aprendizaje?anio=${anioPlan}&areaId=${plan.areaId}&gradoId=${plan.gradoId}`
          )
          if (resMismoPlan.ok) {
            const dataMismo = await resMismoPlan.json()
            tipoIEPlan = obtenerTipoIEDelPlan(dataMismo.unidadesAprendizaje ?? [])
          }
        }

        planAnualRef.current = { unidadesArr, tipoIE: tipoIEPlan || undefined }

        const pendientes = enPlan.filter((n) => !yaGeneradas.has(n))
        setUnidadesCombo(pendientes)

        let unidadNum = parseInt(unidadParam || '', 10)
        if (pendientes.length > 0) {
          if (Number.isNaN(unidadNum) || !pendientes.includes(unidadNum)) {
            unidadNum = pendientes[0]
          }
        } else {
          unidadNum = enPlan[0] ?? 1
        }

        const unidadData = unidadesArr[unidadNum] as UnidadPlanSlot | undefined

        const gradoSel = grados.find((g) => String(g.id) === String(plan.gradoId))
        const areaSel = areas.find((a) => String(a.id) === String(plan.areaId))

        if (areaSel) setAreaSeleccionada(areaSel)

        setFormData((prev) => ({
          ...prev,
          area: plan.area || areaSel?.descripcion || prev.area,
          areaId: plan.areaId ? String(plan.areaId) : prev.areaId,
          grado: plan.grado || gradoSel?.descripcion || prev.grado,
          gradoId: plan.gradoId ? String(plan.gradoId) : prev.gradoId,
          ciclo: gradoSel?.ciclo?.descripcion || prev.ciclo,
          cicloId: gradoSel?.ciclo?.id?.toString() || prev.cicloId,
          unidad: String(unidadNum),
          institucion: plan.institucion || prev.institucion,
          tipoIE: tipoIEPlan || prev.tipoIE,
          docente: plan.docente || prev.docente,
          director: plan.director || prev.director,
          situacionSignificativa:
            unidadData?.situacionSignificativa || prev.situacionSignificativa,
          producto: unidadData?.producto || prev.producto
        }))

        setDatosDesdePlanAnual({
          situacionSignificativa: unidadData?.situacionSignificativa ?? null,
          producto: unidadData?.producto ?? null,
          tituloUnidad: unidadData?.tituloUnidad ?? null
        })

        planPrecargadoRef.current = true
        setFormularioBloqueadoPlan(true)
      } catch (error) {
        console.error('Error al precargar desde plan anual:', error)
      }
    }

    cargarDesdePlanAnual()
  }, [planIdParam, unidadParam, loadingData, areas, grados])

  const aplicarUnidadDesdePlan = (unidadNum: number) => {
    const arr = planAnualRef.current?.unidadesArr
    if (!arr || unidadNum < 1 || unidadNum > 8) return

    const unidadData = arr[unidadNum] as UnidadPlanSlot | undefined
    const tipoIEPlan = planAnualRef.current?.tipoIE
    setFormData((prev) => ({
      ...prev,
      unidad: String(unidadNum),
      situacionSignificativa: unidadData?.situacionSignificativa || '',
      producto: unidadData?.producto || '',
      tipoIE: prev.tipoIE || tipoIEPlan || ''
    }))
    setDatosDesdePlanAnual({
      situacionSignificativa: unidadData?.situacionSignificativa ?? null,
      producto: unidadData?.producto ?? null,
      tituloUnidad: unidadData?.tituloUnidad ?? null
    })
  }

  const opcionesUnidadCombo =
    planIdParam && unidadesCombo.length > 0 ? unidadesCombo : UNIDADES_COMBO_DEFAULT

  // Cargar área seleccionada cuando cambie areaId
  useEffect(() => {
    if (formData.areaId && areas.length > 0) {
      const area = areas.find(a => a.id.toString() === formData.areaId)
      if (area) {
        setAreaSeleccionada(area)
      }
    } else if (!formData.areaId) {
      setAreaSeleccionada(null)
    }
  }, [formData.areaId, areas])

  // Cargar competencias cuando cambien área y grado
  useEffect(() => {
    const loadCompetencias = async () => {
      if (formData.areaId && formData.gradoId) {
        try {
          // Necesitamos también el nivel, pero por ahora cargamos todas las competencias del área y grado
          const response = await fetch(
            `/api/competencias/competencias?idarea=${formData.areaId}&idgrado=${formData.gradoId}`
          )
          const data = await response.json()
          setCompetencias(data)
        } catch (error) {
          console.error('Error al cargar competencias:', error)
          setCompetencias([])
        }
      } else {
        setCompetencias([])
      }
    }

    loadCompetencias()
  }, [formData.areaId, formData.gradoId])

  // Cargar datos de la unidad guardada desde la BD cuando cambien unidad, área o grado
  useEffect(() => {
    const loadUnidadAprendizajeGuardada = async () => {
      const bloqueado = formularioBloqueadoPlan || Boolean(planIdParam)
      if (formData.unidad && formData.areaId && formData.gradoId) {
        try {
          setLoadingDatosUnidad(true)
          const anio = new Date().getFullYear()
          
          // Primero intentar cargar desde unidad de aprendizaje guardada
          const responseUnidad = await fetch(
            `/api/unidad-aprendizaje?anio=${anio}&areaId=${formData.areaId}&gradoId=${formData.gradoId}&unidad=${formData.unidad}`
          )
          
          if (responseUnidad.ok) {
            const dataUnidad = await responseUnidad.json()
            const unidadGuardada = dataUnidad.unidadesAprendizaje?.[0]
            
            const tipoIEPlan = planIdParam ? planAnualRef.current?.tipoIE : undefined

            if (unidadGuardada) {
              console.log('📦 Cargando unidad de aprendizaje guardada:', unidadGuardada)

              setFormData((prev) => {
                const tipoIE =
                  unidadGuardada.tipoIE || tipoIEPlan || prev.tipoIE
                if (bloqueado) {
                  return {
                    ...prev,
                    tipoIE,
                    duracion: unidadGuardada.duracion || prev.duracion,
                    fechaInicio: unidadGuardada.fechaInicio || prev.fechaInicio,
                    fechaTermino: unidadGuardada.fechaTermino || prev.fechaTermino,
                    propositoUnidad: unidadGuardada.propositoUnidad || prev.propositoUnidad,
                    competencias: Array.isArray(unidadGuardada.competencias)
                      ? unidadGuardada.competencias
                      : prev.competencias,
                    campoTematico: unidadGuardada.campoTematico || prev.campoTematico,
                    numeroSesiones: unidadGuardada.numeroSesiones || prev.numeroSesiones,
                    instrumentoEvaluacion:
                      unidadGuardada.instrumentoEvaluacion || prev.instrumentoEvaluacion,
                    sesiones: Array.isArray(unidadGuardada.sesiones)
                      ? unidadGuardada.sesiones
                      : prev.sesiones
                  }
                }
                return {
                  ...prev,
                  area: unidadGuardada.area || prev.area,
                  areaId: unidadGuardada.areaId || prev.areaId,
                  grado: unidadGuardada.grado || prev.grado,
                  gradoId: unidadGuardada.gradoId || prev.gradoId,
                  ciclo: unidadGuardada.ciclo || prev.ciclo,
                  cicloId: unidadGuardada.cicloId || prev.cicloId,
                  unidad: unidadGuardada.unidad || prev.unidad,
                  institucion: unidadGuardada.institucion || prev.institucion,
                  tipoIE,
                  director: unidadGuardada.director || prev.director,
                  docente: unidadGuardada.docente || prev.docente,
                  duracion: unidadGuardada.duracion || prev.duracion,
                  fechaInicio: unidadGuardada.fechaInicio || prev.fechaInicio,
                  fechaTermino: unidadGuardada.fechaTermino || prev.fechaTermino,
                  situacionSignificativa:
                    unidadGuardada.situacionSignificativa || prev.situacionSignificativa,
                  producto: unidadGuardada.producto || prev.producto,
                  propositoUnidad: unidadGuardada.propositoUnidad || prev.propositoUnidad,
                  competencias: Array.isArray(unidadGuardada.competencias)
                    ? unidadGuardada.competencias
                    : prev.competencias,
                  campoTematico: unidadGuardada.campoTematico || prev.campoTematico,
                  numeroSesiones: unidadGuardada.numeroSesiones || prev.numeroSesiones,
                  instrumentoEvaluacion:
                    unidadGuardada.instrumentoEvaluacion || prev.instrumentoEvaluacion,
                  sesiones: Array.isArray(unidadGuardada.sesiones)
                    ? unidadGuardada.sesiones
                    : prev.sesiones
                }
              })

              if (!bloqueado && unidadGuardada.tituloUnidad) {
                setDatosDesdePlanAnual({
                  situacionSignificativa: unidadGuardada.situacionSignificativa,
                  producto: unidadGuardada.producto,
                  tituloUnidad: unidadGuardada.tituloUnidad
                })
              }

              return
            }
          }

          if (bloqueado) {
            const tipoIEPlan = planAnualRef.current?.tipoIE
            if (tipoIEPlan) {
              setFormData((prev) =>
                prev.tipoIE ? prev : { ...prev, tipoIE: tipoIEPlan }
              )
            }
            return
          }

          // Si no hay datos guardados, intentar cargar desde plan anual (fallback)
          const response = await fetch(
            `/api/unidades-aprendizaje/datos-unidad?unidad=${formData.unidad}&areaId=${formData.areaId}&gradoId=${formData.gradoId}&anio=${anio}`
          )
          
          if (response.ok) {
            const data = await response.json()
            setDatosDesdePlanAnual({
              situacionSignificativa: data.situacionSignificativa,
              producto: data.producto,
              tituloUnidad: data.tituloUnidad
            })
            
            // Si hay datos del plan anual, actualizar el formData
            if (data.situacionSignificativa) {
              setFormData(prev => ({ ...prev, situacionSignificativa: data.situacionSignificativa }))
            }
            if (data.producto) {
              setFormData(prev => ({ ...prev, producto: data.producto }))
            }
          } else {
            setDatosDesdePlanAnual({ situacionSignificativa: null, producto: null, tituloUnidad: null })
          }
        } catch (error) {
          console.error('Error al cargar datos de unidad:', error)
          setDatosDesdePlanAnual({ situacionSignificativa: null, producto: null, tituloUnidad: null })
        } finally {
          setLoadingDatosUnidad(false)
        }
      } else {
        setDatosDesdePlanAnual({ situacionSignificativa: null, producto: null, tituloUnidad: null })
      }
    }

    loadUnidadAprendizajeGuardada()
  }, [formData.unidad, formData.areaId, formData.gradoId, formularioBloqueadoPlan, planIdParam])

  // Calcular número de sesiones basado en semanas y sesionx2
  useEffect(() => {
    if (!formData.duracion || !areaSeleccionada) {
      setFormData(prev => {
        if (prev.sesiones.length === 0) return prev
        return { ...prev, sesiones: [] }
      })
      return
    }

    // Extraer número de semanas (ej: "1 semana" -> 1)
    const semanas = semanasDesdeDuracion(formData.duracion)
    if (semanas === null) {
      setFormData(prev => {
        if (prev.sesiones.length === 0) return prev
        return { ...prev, sesiones: [] }
      })
      return
    }

    const sesionesPorSemana = areaSeleccionada.sesionx2 === true ? 2 : 1
    const totalSesiones = semanas * sesionesPorSemana

    setFormData(prev => {
      // Si el número de sesiones no ha cambiado, mantener los títulos existentes
      if (prev.sesiones.length === totalSesiones) {
        return prev
      }

      // Crear array de sesiones, preservando datos existentes si hay menos sesiones
      const nuevasSesiones = Array.from({ length: totalSesiones }, (_, index) => ({
        titulo: prev.sesiones[index]?.titulo || '',
        competenciasSeleccionadas: prev.sesiones[index]?.competenciasSeleccionadas || [],
        capacidadesSeleccionadas: prev.sesiones[index]?.capacidadesSeleccionadas || [],
        desempeniosSeleccionados: prev.sesiones[index]?.desempeniosSeleccionados || [],
        instrumentoEvaluacion: prev.sesiones[index]?.instrumentoEvaluacion || ''
      }))

      return { ...prev, sesiones: nuevasSesiones }
    })
  }, [formData.duracion, areaSeleccionada?.id, areaSeleccionada?.sesionx2])

  useEffect(() => {
    if (!formData.duracion || !formData.fechaInicio) {
      setFormData((prev) =>
        prev.fechaTermino === '' ? prev : { ...prev, fechaTermino: '' }
      )
      return
    }
    const nueva = calcularFechaTermino(formData.fechaInicio, formData.duracion)
    setFormData((prev) =>
      prev.fechaTermino === nueva ? prev : { ...prev, fechaTermino: nueva }
    )
  }, [formData.duracion, formData.fechaInicio])

  // Función para obtener el color pastel de una competencia según su índice
  const getCompetenciaColor = (competenciaIndex: number): { bg: string; border: string; text: string } => {
    const colors = [
      { bg: '#E3F2FD', border: '#90CAF9', text: '#1565C0' }, // Azul pastel
      { bg: '#FCE4EC', border: '#F48FB1', text: '#C2185B' }, // Rosa pastel
      { bg: '#E8F5E9', border: '#A5D6A7', text: '#2E7D32' }  // Verde pastel
    ]
    return colors[competenciaIndex % 3] // Cicla entre los 3 colores
  }

  // Funciones para el modal de competencias/desempeños por sesión
  const abrirModalSesion = async (index: number) => {
    const sesion = formData.sesiones[index]
    setSesionModalIndex(index)
    
    // Cargar las selecciones actuales en el modal
    setCompetenciasSeleccionadasModal(sesion?.competenciasSeleccionadas || [])
    setCapacidadesSeleccionadasModal(sesion?.capacidadesSeleccionadas || [])
    setDesempeniosSeleccionadosModal(sesion?.desempeniosSeleccionados || [])
    
    // Cargar capacidades de todas las competencias seleccionadas
    if (sesion?.competenciasSeleccionadas && sesion.competenciasSeleccionadas.length > 0) {
      await loadCapacidadesModal(sesion.competenciasSeleccionadas)
    } else {
      setCapacidadesModal([])
    }
    
    // Cargar desempeños de todas las capacidades seleccionadas
    if (sesion?.capacidadesSeleccionadas && sesion.capacidadesSeleccionadas.length > 0) {
      await loadDesempeniosModal(sesion.capacidadesSeleccionadas)
    } else {
      setDesempeniosModal([])
    }
    
    setShowModalSesion(true)
  }

  const cerrarModalSesion = () => {
    setShowModalSesion(false)
    setSesionModalIndex(null)
    setCompetenciasSeleccionadasModal([])
    setCapacidadesSeleccionadasModal([])
    setDesempeniosSeleccionadosModal([])
    setCapacidadesModal([])
    setDesempeniosModal([])
  }

  const loadCapacidadesModal = async (competenciasIds: string[]): Promise<Capacidad[]> => {
    if (competenciasIds.length === 0) {
      setCapacidadesModal([])
      return []
    }
    
    try {
      setLoadingCapacidadesModal(true)
      const promesas = competenciasIds.map(id => 
        fetch(`/api/competencias/capacidades?idcompetencia=${id}`).then(r => r.json())
      )
      const resultados = await Promise.all(promesas)
      const todasLasCapacidades = resultados.flat()
      const capacidadesUnicas = todasLasCapacidades.filter((c: Capacidad, idx: number, self: Capacidad[]) => 
        idx === self.findIndex(cap => cap.id === c.id)
      )
      setCapacidadesModal(capacidadesUnicas)
      return capacidadesUnicas
    } catch (error) {
      console.error('Error al cargar capacidades en modal:', error)
      setCapacidadesModal([])
      return []
    } finally {
      setLoadingCapacidadesModal(false)
    }
  }

  const loadDesempeniosModal = async (capacidadesIds: string[]): Promise<Desempenio[]> => {
    if (capacidadesIds.length === 0) {
      setDesempeniosModal([])
      return []
    }
    
    try {
      setLoadingDesempeniosModal(true)
      const promesas = capacidadesIds.map(id => 
        fetch(`/api/competencias/desempenios?idcapacidad=${id}`).then(r => r.json())
      )
      const resultados = await Promise.all(promesas)
      const todosLosDesempenios = resultados.flat()
      const desempeniosUnicos = todosLosDesempenios.filter((d: Desempenio, idx: number, self: Desempenio[]) => 
        idx === self.findIndex(des => des.id === d.id)
      )
      setDesempeniosModal(desempeniosUnicos)
      return desempeniosUnicos
    } catch (error) {
      console.error('Error al cargar desempeños en modal:', error)
      setDesempeniosModal([])
      return []
    } finally {
      setLoadingDesempeniosModal(false)
    }
  }

  const handleCompetenciaChangeModal = async (competenciaId: string, checked: boolean) => {
    const newSelection = checked
      ? [...competenciasSeleccionadasModal, competenciaId]
      : competenciasSeleccionadasModal.filter(id => id !== competenciaId)
    
    setCompetenciasSeleccionadasModal(newSelection)
    
    if (newSelection.length > 0) {
      const nuevasCapacidades = await loadCapacidadesModal(newSelection)
      
      // Filtrar capacidades seleccionadas para mantener solo las válidas
      setCapacidadesSeleccionadasModal(prev => {
        const capacidadesValidas = prev.filter(capId => 
          nuevasCapacidades.some(c => c.id.toString() === capId)
        )
        
        if (capacidadesValidas.length > 0) {
          loadDesempeniosModal(capacidadesValidas).then((nuevosDesempenios) => {
            setDesempeniosSeleccionadosModal(prevDesempenios => {
              return prevDesempenios.filter(desId => 
                nuevosDesempenios.some(d => d.id.toString() === desId)
              )
            })
          })
        } else {
          setDesempeniosModal([])
          setDesempeniosSeleccionadosModal([])
        }
        
        return capacidadesValidas
      })
    } else {
      setCapacidadesModal([])
      setCapacidadesSeleccionadasModal([])
      setDesempeniosModal([])
      setDesempeniosSeleccionadosModal([])
    }
  }

  const handleCapacidadChangeModal = async (capacidadId: string, checked: boolean) => {
    const newSelection = checked
      ? [...capacidadesSeleccionadasModal, capacidadId]
      : capacidadesSeleccionadasModal.filter(id => id !== capacidadId)
    
    setCapacidadesSeleccionadasModal(newSelection)
    
    if (newSelection.length > 0) {
      const nuevosDesempenios = await loadDesempeniosModal(newSelection)
      
      setDesempeniosSeleccionadosModal(prev => {
        return prev.filter(desId => 
          nuevosDesempenios.some(d => d.id.toString() === desId)
        )
      })
    } else {
      setDesempeniosModal([])
      setDesempeniosSeleccionadosModal([])
    }
  }

  const handleDesempenioChangeModal = (desempenioId: string, checked: boolean) => {
    if (checked) {
      if (desempeniosSeleccionadosModal.length >= 4) {
        alert('Máximo 4 desempeños por sesión')
        return
      }
      setDesempeniosSeleccionadosModal([...desempeniosSeleccionadosModal, desempenioId])
    } else {
      setDesempeniosSeleccionadosModal(desempeniosSeleccionadosModal.filter(id => id !== desempenioId))
    }
  }

  const guardarSeleccionSesion = () => {
    if (sesionModalIndex === null) return
    
    const nuevasSesiones = [...formData.sesiones]
    nuevasSesiones[sesionModalIndex] = {
      ...nuevasSesiones[sesionModalIndex],
      competenciasSeleccionadas: competenciasSeleccionadasModal,
      capacidadesSeleccionadas: capacidadesSeleccionadasModal,
      desempeniosSeleccionados: desempeniosSeleccionadosModal
    }
    
    setFormData({ ...formData, sesiones: nuevasSesiones })
    cerrarModalSesion()
  }

  const handleGenerarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !formData.unidad ||
      !formData.areaId ||
      !formData.gradoId ||
      !formData.duracion ||
      !formData.fechaInicio ||
      !formData.fechaTermino
    ) {
      return
    }
    await handleFinalSubmit(e)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔵 [MODAL] handleFinalSubmit llamado')
    console.log('🔵 [MODAL] formData:', { unidad: formData.unidad, areaId: formData.areaId, gradoId: formData.gradoId })

    // Verificar si hay datos guardados antes de mostrar el modal
    try {
      if (formData.unidad && formData.areaId && formData.gradoId) {
        const anio = new Date().getFullYear()
        const url = `/api/unidad-aprendizaje?anio=${anio}&areaId=${formData.areaId}&gradoId=${formData.gradoId}&unidad=${formData.unidad}`
        console.log('🔵 [MODAL] Consultando:', url)
        
        const checkResponse = await fetch(url)
        
        console.log('🔵 [MODAL] Respuesta status:', checkResponse.status, 'ok:', checkResponse.ok)
        
        if (checkResponse.ok) {
          const responseData = await checkResponse.json()
          console.log('🔵 [MODAL] Datos recibidos:', responseData)
          
          // La API puede devolver {unidadesAprendizaje: [...]} o un objeto directo
          let unidadData = null
          if (responseData.unidadesAprendizaje && Array.isArray(responseData.unidadesAprendizaje) && responseData.unidadesAprendizaje.length > 0) {
            unidadData = responseData.unidadesAprendizaje[0]
            console.log('🔵 [MODAL] Registro encontrado en array:', unidadData)
          } else if (responseData.id) {
            unidadData = responseData
            console.log('🔵 [MODAL] Registro encontrado como objeto directo:', unidadData)
          }
          
          console.log('🔵 [MODAL] Tiene sesiones?', !!unidadData?.sesiones)
          
          // Si existe un registro, mostrar el modal SIEMPRE
          if (unidadData && unidadData.id) {
            console.log('🟢 [MODAL] REGISTRO ENCONTRADO - Mostrando modal')
            setTieneDatosGuardados(true)
            setShowModalGeneracion(true)
            return // No continuar, esperar la decisión del usuario
          } else {
            console.log('🔴 [MODAL] No se encontró registro válido')
          }
        } else {
          console.log('🔴 [MODAL] Respuesta no OK:', checkResponse.status)
        }
      } else {
        console.log('🔴 [MODAL] Faltan datos:', { unidad: formData.unidad, areaId: formData.areaId, gradoId: formData.gradoId })
      }
    } catch (error) {
      console.error('🔴 [MODAL] Error:', error)
      // Si hay error al verificar, continuar con generación normal
    }

    console.log('🔴 [MODAL] Generando directamente sin modal')
    // Si no hay datos guardados, generar directamente
    generarDocumento(false)
  }

  const cerrarOverlayGeneracion = () => {
    setOverlayGeneracion(false)
    setGeneracionCompletada(false)
  }

  const linkSesionesTrasUnidad = () => {
    if (planIdParam) {
      return linkSesionesDesdeUnidadPlan(
        {
          id: parseInt(planIdParam, 10),
          areaId: formData.areaId,
          gradoId: formData.gradoId
        },
        formData.unidad
      )
    }
    const params = new URLSearchParams()
    if (formData.areaId) params.set('areaId', formData.areaId)
    if (formData.gradoId) params.set('gradoId', formData.gradoId)
    if (formData.unidad) params.set('unidad', formData.unidad)
    params.set('desdeUnidad', '1')
    const q = params.toString()
    return `/servicios/crear-material/sesiones-fichas${q ? `?${q}` : ''}`
  }

  const generarDocumento = async (forzarRegeneracion: boolean) => {
    setShowModalGeneracion(false)
    setOverlayGeneracion(true)
    setGeneracionCompletada(false)

    try {
      const response = await fetch('/api/unidades-aprendizaje/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: {
            ...formData,
            forzarRegeneracion: forzarRegeneracion
          }
        }),
      })

      console.log('📥 Respuesta recibida:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('Content-Type')
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta:', errorData)
        throw new Error(errorData.error || `Error al generar el documento (${response.status})`)
      }

      // Verificar que el content-type sea el correcto
      const contentType = response.headers.get('Content-Type')
      console.log('📄 Content-Type:', contentType)

      // Obtener el blob del documento
      const blob = await response.blob()
      console.log('📦 Blob recibido:', {
        size: blob.size,
        type: blob.type
      })

      if (blob.size === 0) {
        throw new Error('El archivo generado está vacío')
      }

      console.log('✅ Unidad generada correctamente')
      setGeneracionCompletada(true)
    } catch (error: any) {
      console.error('❌ Error al generar el documento:', error)
      alert(`Error al generar el documento: ${error.message || 'Error desconocido'}`)
      cerrarOverlayGeneracion()
    }
  }

  const handleGeneratePromptWord = async () => {
    setLoading(true)
    
    try {
      console.log('📤 Enviando solicitud para generar Word del prompt dinámico...', {
        gradoId: formData.gradoId,
        unidad: formData.unidad,
        area: formData.area
      })

      const response = await fetch('/api/unidades-aprendizaje/generate-prompt-word', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta:', errorData)
        throw new Error(errorData.error || `Error al generar el Word del prompt (${response.status})`)
      }

      // Verificar el Content-Type de la respuesta
      const contentType = response.headers.get('Content-Type')
      console.log('📄 Content-Type recibido:', contentType)
      
      // Si la respuesta no es un documento Word, verificar si es un error JSON
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta (JSON):', errorData)
        throw new Error(errorData.error || 'Error al generar el documento Word')
      }

      // Obtener el blob del documento Word
      const blob = await response.blob()
      
      if (!blob || blob.size === 0) {
        throw new Error('No se generó ningún documento')
      }

      console.log('📦 Blob recibido - Tipo:', blob.type, 'Tamaño:', blob.size, 'bytes')

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `prompt-dinamico-${formData.unidad || '0'}-${Date.now()}.docx`
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (matches && matches[1]) {
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        }
      }
      
      // Asegurar que el nombre del archivo termine en .docx
      if (!fileName.toLowerCase().endsWith('.docx')) {
        fileName = fileName.replace(/\.txt$/, '') + '.docx'
      }
      
      console.log('📝 Nombre del archivo:', fileName)
      
      // Crear enlace de descarga con tipo MIME correcto
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.style.display = 'none'
      a.download = fileName
      a.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      document.body.appendChild(a)
      a.click()
      
      // Limpiar después
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      }, 200)
      
      console.log('✅ Descarga de Word del prompt dinámico iniciada')
    } catch (error: any) {
      console.error('❌ Error al generar el Word del prompt:', error)
      alert(`Error al generar el Word del prompt: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePromptEnfoques = async () => {
    setLoading(true)
    
    try {
      console.log('📤 Enviando solicitud para generar prompt de enfoques...', {
        gradoId: formData.gradoId,
        unidad: formData.unidad,
        area: formData.area
      })

      const response = await fetch('/api/unidades-aprendizaje/generate-prompt-enfoques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta:', errorData)
        throw new Error(errorData.error || `Error al generar enfoques con IA (${response.status})`)
      }

      // Verificar el Content-Type de la respuesta
      const contentType = response.headers.get('Content-Type')
      console.log('📄 Content-Type recibido:', contentType)
      
      // Si la respuesta no es un documento Word, verificar si es un error JSON
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta (JSON):', errorData)
        throw new Error(errorData.error || 'Error al generar el documento Word')
      }

      // Obtener el blob del documento Word
      const blob = await response.blob()
      
      if (!blob || blob.size === 0) {
        throw new Error('No se generó ningún documento')
      }

      console.log('📦 Blob recibido - Tipo:', blob.type, 'Tamaño:', blob.size, 'bytes')

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `prompt-enfoques-${formData.unidad || '0'}-${Date.now()}.docx`
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (matches && matches[1]) {
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        }
      }
      
      // Asegurar que el nombre del archivo termine en .docx
      if (!fileName.toLowerCase().endsWith('.docx')) {
        fileName = fileName.replace(/\.txt$/, '') + '.docx'
      }
      
      console.log('📝 Nombre del archivo:', fileName)
      
      // Crear enlace de descarga con tipo MIME correcto
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.style.display = 'none'
      a.download = fileName
      a.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      document.body.appendChild(a)
      a.click()
      
      // Limpiar después
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      }, 200)
      
      console.log('✅ Descarga de Word del prompt de enfoques iniciada')
    } catch (error: any) {
      console.error('❌ Error al generar el prompt de enfoques:', error)
      alert(`Error al generar el prompt de enfoques: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateEnfoquesIA = async () => {
    setLoading(true)
    
    try {
      console.log('📤 Enviando solicitud para generar enfoques con IA...', {
        gradoId: formData.gradoId,
        unidad: formData.unidad,
        area: formData.area
      })

      const response = await fetch('/api/unidades-aprendizaje/generate-prompt-enfoques-ia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta:', errorData)
        throw new Error(errorData.error || `Error al generar enfoques con IA (${response.status})`)
      }

      // Verificar el Content-Type de la respuesta
      const contentType = response.headers.get('Content-Type')
      console.log('📄 Content-Type recibido:', contentType)
      
      // Si la respuesta no es un documento Word, verificar si es un error JSON
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta (JSON):', errorData)
        throw new Error(errorData.error || 'Error al generar el documento Word')
      }

      // Obtener el blob del documento Word
      const blob = await response.blob()
      
      if (!blob || blob.size === 0) {
        throw new Error('No se generó ningún documento')
      }

      console.log('📦 Blob recibido - Tipo:', blob.type, 'Tamaño:', blob.size, 'bytes')

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `enfoques-generados-${formData.unidad || '0'}-${Date.now()}.docx`
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (matches && matches[1]) {
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        }
      }
      
      // Asegurar que el nombre del archivo termine en .docx
      if (!fileName.toLowerCase().endsWith('.docx')) {
        fileName = fileName.replace(/\.txt$/, '') + '.docx'
      }
      
      console.log('📝 Nombre del archivo:', fileName)
      
      // Crear enlace de descarga con tipo MIME correcto
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.style.display = 'none'
      a.download = fileName
      a.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      document.body.appendChild(a)
      a.click()
      
      // Limpiar después
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      }, 200)
      
      console.log('✅ Descarga de Word de enfoques generados con IA iniciada')
    } catch (error: any) {
      console.error('❌ Error al generar enfoques con IA:', error)
      alert(`Error al generar enfoques con IA: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePrompt = async () => {
    setLoading(true)
    
    try {
      console.log('📤 Enviando solicitud para generar texto por prompt...', {
        gradoId: formData.gradoId,
        unidad: formData.unidad,
        area: formData.area
      })

      const response = await fetch('/api/unidades-aprendizaje/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta:', errorData)
        throw new Error(errorData.error || `Error al generar el texto (${response.status})`)
      }

      // Verificar el Content-Type de la respuesta
      const contentType = response.headers.get('Content-Type')
      console.log('📄 Content-Type recibido:', contentType)
      
      // Si la respuesta no es un documento Word, verificar si es un error JSON
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }))
        console.error('❌ Error en la respuesta (JSON):', errorData)
        throw new Error(errorData.error || 'Error al generar el documento Word')
      }

      // Obtener el blob del documento Word
      const blob = await response.blob()
      
      if (!blob || blob.size === 0) {
        throw new Error('No se generó ningún documento')
      }

      console.log('📦 Blob recibido - Tipo:', blob.type, 'Tamaño:', blob.size, 'bytes')

      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `texto-generado-${formData.unidad || '0'}-${Date.now()}.docx`
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (matches && matches[1]) {
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        }
      }
      
      // Asegurar que el nombre del archivo termine en .docx
      if (!fileName.toLowerCase().endsWith('.docx')) {
        fileName = fileName.replace(/\.txt$/, '') + '.docx'
      }
      
      console.log('📝 Nombre del archivo:', fileName)
      
      // Crear enlace de descarga con tipo MIME correcto
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.style.display = 'none'
      a.download = fileName
      a.type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      document.body.appendChild(a)
      a.click()
      
      // Limpiar después
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      }, 200)
      
      console.log('✅ Descarga de documento Word (.docx) generado iniciada')
    } catch (error: any) {
      console.error('❌ Error al generar el texto por prompt:', error)
      alert(`Error al generar el texto: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR UNIDADES DE APRENDIZAJE</h1>
          <p className={styles.subtitle}>
            Completa el formulario y genera tu unidad de aprendizaje con IA
          </p>

          <form onSubmit={handleGenerarSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>Personaliza tu Unidad</h2>
              <p className={styles.phaseDescription}>
                Define el contexto básico para que la IA genere materiales alineados a tu realidad.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="unidad">Unidad <span className={styles.required}>*</span></label>
                  {planIdParam && unidadesCombo.length === 0 ? (
                    <p className={styles.planReadonlyBanner}>
                      Todas las unidades de este plan ya fueron generadas. Vuelve a Inicio para
                      ver tu progreso.
                    </p>
                  ) : (
                    <select
                      id="unidad"
                      value={formData.unidad}
                      onChange={(e) => {
                        const value = e.target.value
                        if (planIdParam && planAnualRef.current && value) {
                          aplicarUnidadDesdePlan(parseInt(value, 10))
                        } else {
                          setFormData({ ...formData, unidad: value })
                        }
                      }}
                      className={styles.select}
                      required
                      disabled={
                        (!planIdParam && bloqueadoPlan) ||
                        (planIdParam && unidadesCombo.length === 0)
                      }
                    >
                      <option value="">Selecciona una unidad</option>
                      {opcionesUnidadCombo.map((num) => (
                        <option key={num} value={num}>
                          Unidad {num}
                        </option>
                      ))}
                    </select>
                  )}
                  {planIdParam && unidadesCombo.length > 0 && (
                    <p className={styles.helpText}>
                      Unidades pendientes por generar: {unidadesCombo.join(', ')}
                    </p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="area">Área Curricular <span className={styles.required}>*</span></label>
                  <select
                    id="area"
                    value={formData.areaId}
                    onChange={(e) => {
                      const selectedArea = areas.find(a => a.id.toString() === e.target.value)
                      setAreaSeleccionada(selectedArea || null)
                      setFormData({ 
                        ...formData, 
                        area: selectedArea?.descripcion || '', 
                        areaId: e.target.value 
                      })
                    }}
                    className={`${styles.select} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    required
                    disabled={loadingData || bloqueadoPlan}
                  >
                    <option value="">Selecciona un área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="grado">Grado Escolar <span className={styles.required}>*</span></label>
                  <select
                    id="grado"
                    value={formData.gradoId}
                    onChange={(e) => {
                      const selectedGrado = grados.find(g => g.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        grado: selectedGrado?.descripcion || '', 
                        gradoId: e.target.value,
                        ciclo: selectedGrado?.ciclo?.descripcion || '',
                        cicloId: selectedGrado?.ciclo?.id.toString() || ''
                      })
                    }}
                    className={`${styles.select} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    required
                    disabled={loadingData || bloqueadoPlan}
                  >
                    <option value="">Selecciona un grado</option>
                    {grados.map(grado => (
                      <option key={grado.id} value={grado.id}>
                        {grado.descripcion || `${grado.id}° grado`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ciclo">Ciclo</label>
                  <select
                    id="ciclo"
                    value={formData.cicloId}
                    className={`${styles.select} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    disabled={!formData.gradoId || loadingData || bloqueadoPlan}
                  >
                    <option value="">Selecciona un grado primero</option>
                    {formData.cicloId && (
                      <option value={formData.cicloId}>{formData.ciclo}</option>
                    )}
                  </select>
                  <p className={styles.helpText}>El ciclo se selecciona automáticamente según el grado</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="institucion">Nombre de la Institución Educativa</label>
                  <input
                    id="institucion"
                    type="text"
                    value={formData.institucion}
                    onChange={(e) => setFormData({ ...formData, institucion: e.target.value })}
                    className={`${styles.input} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    placeholder="Nombre de tu I.E."
                    disabled={bloqueadoPlan}
                    readOnly={bloqueadoPlan}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="tipoIE">Tipo de I.E.</label>
                  <select
                    id="tipoIE"
                    value={formData.tipoIE}
                    onChange={(e) => {
                      const value = e.target.value
                      if (planAnualRef.current) {
                        planAnualRef.current.tipoIE = value || undefined
                      }
                      setFormData({ ...formData, tipoIE: value })
                    }}
                    className={styles.select}
                  >
                    <option value="">Selecciona tipo</option>
                    <option value="1">Pública</option>
                    <option value="2">Privado</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="director">Director</label>
                  <input
                    id="director"
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className={`${styles.input} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    placeholder="Nombre del director"
                    disabled={bloqueadoPlan}
                    readOnly={bloqueadoPlan}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="docente">Nombre del docente</label>
                  <input
                    id="docente"
                    type="text"
                    value={formData.docente}
                    onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                    className={`${styles.input} ${bloqueadoPlan ? styles.fieldReadonly : ''}`}
                    placeholder="Tu nombre"
                    disabled={bloqueadoPlan}
                    readOnly={bloqueadoPlan}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="duracion">Duración <span className={styles.required}>*</span></label>
                  <select
                    id="duracion"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecciona duración</option>
                    <option value="1 semana">1 semana</option>
                    <option value="2 semanas">2 semanas</option>
                    <option value="3 semanas">3 semanas</option>
                    <option value="4 semanas">4 semanas</option>
                    <option value="5 semanas">5 semanas</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fechaInicio">Fecha de Inicio <span className={styles.required}>*</span></label>
                  <input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    className={styles.input}
                    required
                    disabled={!formData.duracion}
                  />
                  {!formData.duracion && (
                    <p className={styles.helpText}>Selecciona primero la duración</p>
                  )}
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fechaTermino">Fecha de Término <span className={styles.required}>*</span></label>
                  <input
                    id="fechaTermino"
                    type="date"
                    value={formData.fechaTermino}
                    readOnly
                    disabled
                    className={`${styles.input} ${styles.fieldReadonly}`}
                    required
                    aria-label="Fecha de término calculada automáticamente"
                  />
                  <p className={styles.helpText}>
                    {formData.duracion && formData.fechaInicio
                      ? `Calculada según ${formData.duracion} desde la fecha de inicio`
                      : 'Se calculará al elegir duración y fecha de inicio'}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                className={styles.button}
                disabled={generandoUnidad || (Boolean(planIdParam) && unidadesCombo.length === 0)}
              >
                {generandoUnidad ? 'Generando...' : 'Generar mi unidad con IA'}
              </button>
            </form>
        </div>

        {/* Modal de opciones de generación */}
        {showModalGeneracion && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }} onClick={() => setShowModalGeneracion(false)}>
            <div style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '12px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{
                marginTop: 0,
                marginBottom: '15px',
                color: '#0066cc',
                fontSize: '24px'
              }}>Opciones de Generación</h3>
              <p style={{
                marginBottom: '25px',
                color: '#666',
                lineHeight: '1.6'
              }}>
                Se encontraron datos guardados para esta unidad. ¿Qué deseas hacer?
              </p>
              
              <div style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '15px',
                flexDirection: 'column'
              }}>
                <button
                  className={styles.button}
                  onClick={() => generarDocumento(false)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: 600
                  }}
                >
                  📦 Generar lo guardado
                </button>
                <button
                  className={styles.buttonSecondary}
                  onClick={() => generarDocumento(true)}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: 600
                  }}
                >
                  🔄 Generar nuevamente
                </button>
              </div>
              
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowModalGeneracion(false)}
                style={{
                  width: '100%',
                  padding: '10px 20px',
                  fontSize: '14px'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Modal de selección de Competencias y Desempeños por Sesión */}
        {showModalSesion && sesionModalIndex !== null && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalSesion()
          }}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '30px',
              maxWidth: '900px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{ marginBottom: '20px', color: '#0066cc', fontSize: '24px' }}>
                Seleccionar Competencias y Desempeños - Sesión {sesionModalIndex + 1}
              </h2>

              {/* Competencias */}
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '16px' }}>
                  Competencias <span className={styles.required}>*</span>
                  {competenciasSeleccionadasModal.length > 0 && (
                    <span style={{ marginLeft: '10px', color: '#3b82f6', fontWeight: 600 }}>
                      ({competenciasSeleccionadasModal.length} seleccionada{competenciasSeleccionadasModal.length > 1 ? 's' : ''})
                    </span>
                  )}
                </label>
                {competencias.length === 0 ? (
                  <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                    Selecciona área y grado en la Fase 1 para ver competencias
                  </p>
                ) : (
                  <div style={{ 
                    maxHeight: '200px', 
                    overflowY: 'auto', 
                    border: '1px solid #d1d5db', 
                    borderRadius: '6px', 
                    padding: '10px',
                    backgroundColor: '#f9fafb'
                  }}>
                    {competencias.map((competencia, compIndex) => {
                      const isSelected = competenciasSeleccionadasModal.includes(competencia.id.toString())
                      const color = getCompetenciaColor(compIndex)
                      return (
                        <label 
                          key={competencia.id} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            padding: '10px',
                            marginBottom: '6px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            backgroundColor: color.bg,
                            border: `2px solid ${color.border}`,
                            transition: 'all 0.2s',
                            opacity: isSelected ? 1 : 0.7
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.opacity = '1'
                            e.currentTarget.style.borderWidth = '3px'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.opacity = isSelected ? '1' : '0.7'
                            e.currentTarget.style.borderWidth = '2px'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleCompetenciaChangeModal(competencia.id.toString(), e.target.checked)}
                            style={{ marginRight: '12px', marginTop: '2px', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '14px', lineHeight: '1.5', flex: 1, color: color.text, fontWeight: isSelected ? 600 : 500 }}>
                            {competencia.descripcion}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Capacidades */}
              {competenciasSeleccionadasModal.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '16px' }}>
                    Capacidades <span className={styles.required}>*</span>
                    {capacidadesSeleccionadasModal.length > 0 && (
                      <span style={{ marginLeft: '10px', color: '#3b82f6', fontWeight: 600 }}>
                        ({capacidadesSeleccionadasModal.length} seleccionada{capacidadesSeleccionadasModal.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </label>
                  {loadingCapacidadesModal ? (
                    <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic' }}>Cargando capacidades...</p>
                  ) : capacidadesModal.length > 0 ? (
                    <div style={{ 
                      maxHeight: '200px', 
                      overflowY: 'auto', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px', 
                      padding: '10px',
                      backgroundColor: '#f9fafb'
                    }}>
                      {capacidadesModal.map(capacidad => {
                        const isSelected = capacidadesSeleccionadasModal.includes(capacidad.id.toString())
                        const competenciaId = capacidad.idcompetencia?.toString()
                        const competenciaIndex = competencias.findIndex(c => c.id.toString() === competenciaId)
                        const color = competenciaIndex >= 0 
                          ? getCompetenciaColor(competenciaIndex) 
                          : { bg: '#F5F5F5', border: '#E0E0E0', text: '#666' }
                        return (
                          <label 
                            key={capacidad.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              padding: '10px',
                              marginBottom: '6px',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              backgroundColor: color.bg,
                              border: `2px solid ${color.border}`,
                              transition: 'all 0.2s',
                              opacity: isSelected ? 1 : 0.7
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1'
                              e.currentTarget.style.borderWidth = '3px'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = isSelected ? '1' : '0.7'
                              e.currentTarget.style.borderWidth = '2px'
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleCapacidadChangeModal(capacidad.id.toString(), e.target.checked)}
                              style={{ marginRight: '12px', marginTop: '2px', cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', lineHeight: '1.5', flex: 1, color: color.text, fontWeight: isSelected ? 600 : 500 }}>
                              {capacidad.descripcion}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                      No se encontraron capacidades para las competencias seleccionadas
                    </p>
                  )}
                </div>
              )}

              {/* Desempeños */}
              {capacidadesSeleccionadasModal.length > 0 && (
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '16px' }}>
                    Desempeños <span className={styles.required}>*</span>
                    {desempeniosSeleccionadosModal.length > 0 && (
                      <span style={{ marginLeft: '10px', color: desempeniosSeleccionadosModal.length >= 4 ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>
                        ({desempeniosSeleccionadosModal.length}/4)
                      </span>
                    )}
                  </label>
                  {loadingDesempeniosModal ? (
                    <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic' }}>Cargando desempeños...</p>
                  ) : desempeniosModal.length > 0 ? (
                    <div style={{ 
                      maxHeight: '300px', 
                      overflowY: 'auto', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '6px', 
                      padding: '10px',
                      backgroundColor: '#f9fafb'
                    }}>
                      {desempeniosModal.map(desempenio => {
                        const capacidad = capacidadesModal.find(c => c.id === desempenio.idcapacidad)
                        const isSelected = desempeniosSeleccionadosModal.includes(desempenio.id.toString())
                        const isDisabled = !isSelected && desempeniosSeleccionadosModal.length >= 4
                        
                        const competenciaId = capacidad?.idcompetencia?.toString()
                        const competenciaIndex = competenciaId 
                          ? competencias.findIndex(c => c.id.toString() === competenciaId)
                          : -1
                        const color = competenciaIndex >= 0 
                          ? getCompetenciaColor(competenciaIndex) 
                          : { bg: '#F5F5F5', border: '#E0E0E0', text: '#666' }
                        
                        return (
                          <label 
                            key={desempenio.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'flex-start', 
                              padding: '10px',
                              marginBottom: '6px',
                              cursor: isDisabled ? 'not-allowed' : 'pointer',
                              borderRadius: '4px',
                              backgroundColor: color.bg,
                              border: `2px solid ${color.border}`,
                              opacity: isDisabled ? 0.4 : (isSelected ? 1 : 0.7),
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.opacity = '1'
                                e.currentTarget.style.borderWidth = '3px'
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDisabled) {
                                e.currentTarget.style.opacity = isSelected ? '1' : '0.7'
                                e.currentTarget.style.borderWidth = '2px'
                              }
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={(e) => handleDesempenioChangeModal(desempenio.id.toString(), e.target.checked)}
                              style={{ marginRight: '12px', marginTop: '2px', cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                            />
                            <span style={{ fontSize: '14px', lineHeight: '1.5', flex: 1 }}>
                              {capacidad && (
                                <span style={{ color: color.text, fontWeight: 600, fontSize: '12px' }}>
                                  [{capacidad.descripcion.substring(0, 40)}{capacidad.descripcion.length > 40 ? '...' : ''}] 
                                </span>
                              )}
                              <span style={{ marginLeft: capacidad ? '5px' : '0', color: color.text, fontWeight: isSelected ? 600 : 500 }}>
                                {desempenio.descripcion}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  ) : (
                    <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                      No hay desempeños disponibles para las capacidades seleccionadas
                    </p>
                  )}
                  <p className={styles.helpText} style={{ marginTop: '8px', fontSize: '12px' }}>
                    Máximo 4 desempeños. Puedes seleccionar desempeños de diferentes capacidades.
                  </p>
                </div>
              )}

              {/* Botones del modal */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px solid #e0e0e0'
              }}>
                <button
                  onClick={cerrarModalSesion}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarSeleccionSesion}
                  disabled={competenciasSeleccionadasModal.length === 0 || desempeniosSeleccionadosModal.length === 0}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: competenciasSeleccionadasModal.length === 0 || desempeniosSeleccionadosModal.length === 0 ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: competenciasSeleccionadasModal.length === 0 || desempeniosSeleccionadosModal.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 500
                  }}
                  onMouseOver={(e) => {
                    if (competenciasSeleccionadasModal.length > 0 && desempeniosSeleccionadosModal.length > 0) {
                      e.currentTarget.style.backgroundColor = '#2563eb'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (competenciasSeleccionadasModal.length > 0 && desempeniosSeleccionadosModal.length > 0) {
                      e.currentTarget.style.backgroundColor = '#3b82f6'
                    }
                  }}
                >
                  Guardar Selección
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {overlayGeneracion && (
        <div
          className={styles.generatingOverlay}
          role="dialog"
          aria-modal="true"
          aria-busy={generandoUnidad}
        >
          <div className={styles.generatingOverlayCard}>
            {generacionCompletada ? (
              <>
                <div className={styles.generatingSuccessIcon} aria-hidden>
                  ✓
                </div>
                <h3 className={styles.generatingTitle}>¡Unidad generada!</h3>
                <p className={styles.generatingText}>
                  Tu unidad de aprendizaje se guardó correctamente. ¿Qué deseas hacer ahora?
                </p>
                <div className={styles.generatingActions}>
                  <button
                    type="button"
                    className={styles.generatingBtnSecondary}
                    onClick={() => {
                      cerrarOverlayGeneracion()
                      router.push(linkHomeConAreaTab(formData.area, formData.areaId))
                    }}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className={styles.generatingBtnPrimary}
                    onClick={() => {
                      cerrarOverlayGeneracion()
                      router.push(linkSesionesTrasUnidad())
                    }}
                  >
                    Ir por sesiones
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.generatingSpinner} aria-hidden>
                  <svg width="52" height="52" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                    <path
                      d="M25 5a20 20 0 0 1 20 20"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="6"
                      strokeLinecap="round"
                    >
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 25 25"
                        to="360 25 25"
                        dur="0.9s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </svg>
                </div>
                <h3 className={styles.generatingTitle}>Generando unidad de aprendizaje…</h3>
                <p className={styles.generatingText}>
                  La IA está creando tu documento. Puede tardar varios minutos; no cierres esta
                  página.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function UnidadesAprendizajePage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <main className={styles.main}>
            <div className={styles.container}>
              <p className={styles.subtitle}>Cargando…</p>
            </div>
          </main>
        </>
      }
    >
      <UnidadesAprendizajeContent />
    </Suspense>
  )
}
