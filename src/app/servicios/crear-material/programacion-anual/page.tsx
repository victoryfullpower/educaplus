'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { getDepartamentos, getProvinciasByDepartamento, getDistritosByProvincia } from '@/lib/ubigeos'
import styles from './programacion-anual.module.css'

interface Area {
  id: number
  descripcion: string
}

interface Grado {
  id: number
  descripcion: string | null
}

interface Nivel {
  id: number
  descripcion: string
}

interface Competencia {
  id: number
  descripcion: string
  numeroCompetencia: number
  idarea: number
  idgrado: number
  idnivel: number
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

interface Unidad {
  problemaPotencialidad: string
  producto: string
  tieneTituloIA: boolean
  tituloUnidad: string
  competenciaSeleccionada: string  // Para compatibilidad con backend (primera competencia)
  capacidadSeleccionada: string     // Para compatibilidad con backend (primera capacidad)
  competenciasSeleccionadas: string[]  // Array de todas las competencias seleccionadas
  capacidadesSeleccionadas: string[]   // Array de todas las capacidades seleccionadas
  desempeniosSeleccionados: string[]
  conocimientos: string
}

export default function ProgramacionAnualPage() {
  const searchParams = useSearchParams()
  const planIdParam = searchParams.get('planId')
  
  const [fase, setFase] = useState(1)
  const [formData, setFormData] = useState({
    area: '',
    areaId: '',
    grado: '',
    gradoId: '',
    institucion: '',
    docente: '',
    dre: '',
    ugel: '',
    director: '',
    coordinador: '',
    nivel: '',
    nivelId: '',
    departamento: '',
    provincia: '',
    distrito: ''
  })
  const [provinciasDisponibles, setProvinciasDisponibles] = useState<string[]>([])
  const [distritosDisponibles, setDistritosDisponibles] = useState<string[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [grados, setGrados] = useState<Grado[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true)
        
        let planExistente: any = null
        
        // Si hay un planId en los parámetros, cargar ese plan específico
        if (planIdParam) {
          const planResponse = await fetch(`/api/plan-anual?id=${planIdParam}`)
          if (planResponse.ok) {
            const planData = await planResponse.json()
            if (planData.planAnual) {
              planExistente = planData.planAnual
              setPlanAnualExistente(planExistente)
            }
          }
        } else {
          // Si no hay planId, verificar si existe un plan anual para el año actual
          const anio = new Date().getFullYear()
          const planResponse = await fetch(`/api/plan-anual?anio=${anio}`)
          
          if (planResponse.ok) {
            const planData = await planResponse.json()
            if (planData.planesAnuales && planData.planesAnuales.length > 0) {
              planExistente = planData.planesAnuales[0]
              setPlanAnualExistente(planExistente)
            }
          }
        }
        
        // Cargar datos de Fase 1 desde el plan existente
        if (planExistente) {
          setFormData(prev => ({
            ...prev,
            area: planExistente.area || prev.area,
            areaId: planExistente.areaId || prev.areaId,
            grado: planExistente.grado || prev.grado,
            gradoId: planExistente.gradoId || prev.gradoId,
            institucion: planExistente.institucion || prev.institucion,
            docente: planExistente.docente || prev.docente,
            dre: planExistente.dre || prev.dre,
            ugel: planExistente.ugel || prev.ugel,
            director: planExistente.director || prev.director,
            coordinador: planExistente.coordinador || prev.coordinador,
            nivel: planExistente.nivel || prev.nivel,
            nivelId: planExistente.nivelId || prev.nivelId,
            departamento: planExistente.departamento || prev.departamento,
            provincia: planExistente.provincia || prev.provincia,
            distrito: planExistente.distrito || prev.distrito
          }))
          
          // Inicializar provincias y distritos desde los datos guardados
          if (planExistente.departamento) {
            const provincias = getProvinciasByDepartamento(planExistente.departamento)
            setProvinciasDisponibles(provincias)
            
            if (planExistente.provincia) {
              const distritos = getDistritosByProvincia(planExistente.departamento, planExistente.provincia)
              setDistritosDisponibles(distritos)
            }
          }
          
          console.log('✅ [DEBUG] Plan anual existente cargado al inicio:', {
            nivel: planExistente.nivel,
            nivelId: planExistente.nivelId
          })
        }
        
        const [areasRes, gradosRes, nivelesRes] = await Promise.all([
          fetch('/api/competencias/areas'),
          fetch('/api/competencias/grados'),
          fetch('/api/competencias/niveles')
        ])

        const areasData = await areasRes.json()
        const gradosData = await gradosRes.json()
        const nivelesData = await nivelesRes.json()

        setAreas(areasData)
        setGrados(gradosData)
        setNiveles(nivelesData)

        // No establecer valores por defecto - todo debe venir de la BD o estar vacío
        // Si hay plan existente, los datos ya se cargaron arriba
        // Si no hay plan existente, todo queda vacío para que el usuario lo llene
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadInitialData()
  }, [planIdParam])

  // Cargar competencias cuando cambien área, grado o nivel
  useEffect(() => {
    const loadCompetencias = async () => {
      if (formData.areaId && formData.gradoId && formData.nivelId) {
        try {
          const response = await fetch(
            `/api/competencias/competencias?idarea=${formData.areaId}&idgrado=${formData.gradoId}&idnivel=${formData.nivelId}`
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
  }, [formData.areaId, formData.gradoId, formData.nivelId])
  const [unidades, setUnidades] = useState<Unidad[]>(Array(9).fill(null).map(() => ({
    problemaPotencialidad: '',
    producto: '',
    tieneTituloIA: true,  // Por defecto la IA genera el título
    tituloUnidad: '',
    competenciaSeleccionada: '',  // Primera competencia para compatibilidad
    capacidadSeleccionada: '',     // Primera capacidad para compatibilidad
    competenciasSeleccionadas: [], // Array de todas las competencias
    capacidadesSeleccionadas: [],  // Array de todas las capacidades
    desempeniosSeleccionados: [],
    conocimientos: ''
  })))
  
  // Estados para capacidades y desempeños por unidad
  const [capacidadesPorUnidad, setCapacidadesPorUnidad] = useState<{ [key: number]: Capacidad[] }>({})
  const [desempeniosPorUnidad, setDesempeniosPorUnidad] = useState<{ [key: number]: Desempenio[] }>({})
  const [todosLosDesempeniosPorUnidad, setTodosLosDesempeniosPorUnidad] = useState<{ [key: number]: Desempenio[] }>({})
  const [loadingCapacidades, setLoadingCapacidades] = useState<{ [key: number]: boolean }>({})
  const [loadingDesempenios, setLoadingDesempenios] = useState<{ [key: number]: boolean }>({})
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingSituacion, setDownloadingSituacion] = useState(false)
  const [aiProvider, setAiProvider] = useState<'gemini' | 'gpt-5.1' | 'gpt-5-mini' | 'gpt-5-nano'>('gpt-5-mini')
  const [progreso, setProgreso] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([])
  
  // Estados para plan anual existente
  const [planAnualExistente, setPlanAnualExistente] = useState<any>(null)
  const [showModalPlanExistente, setShowModalPlanExistente] = useState(false)
  const [modoGeneracion, setModoGeneracion] = useState<'regenerar' | 'actualizar' | null>(null)
  const [unidadesExistentes, setUnidadesExistentes] = useState<any[]>([])
  
  // Estados para el modal de selección de competencias/desempeños
  const [showModalCompetencias, setShowModalCompetencias] = useState(false)
  const [unidadModalIndex, setUnidadModalIndex] = useState<number | null>(null)
  const [competenciasSeleccionadasModal, setCompetenciasSeleccionadasModal] = useState<string[]>([])
  const [conocimientosSeleccionadosModal, setConocimientosSeleccionadosModal] = useState<string[]>([])
  const [desempeniosSeleccionadosModal, setDesempeniosSeleccionadosModal] = useState<string[]>([])
  const [capacidadesModal, setCapacidadesModal] = useState<Capacidad[]>([])
  const [desempeniosModal, setDesempeniosModal] = useState<Desempenio[]>([])
  const [loadingCapacidadesModal, setLoadingCapacidadesModal] = useState(false)
  const [loadingDesempeniosModal, setLoadingDesempeniosModal] = useState(false)

  const handleDepartamentoChange = (departamento: string) => {
    setFormData({
      ...formData,
      departamento,
      provincia: '', // Limpiar provincia y distrito al cambiar departamento
      distrito: ''
    })
    const provincias = getProvinciasByDepartamento(departamento)
    setProvinciasDisponibles(provincias)
    setDistritosDisponibles([])
  }

  const handleProvinciaChange = (provincia: string) => {
    setFormData(prev => {
      const distritos = getDistritosByProvincia(prev.departamento, provincia)
      setDistritosDisponibles(distritos)
      return {
        ...prev,
        provincia,
        distrito: '' // Limpiar distrito al cambiar provincia
      }
    })
  }

  const verificarPlanAnualExistente = async () => {
    try {
      const anio = new Date().getFullYear()
      const response = await fetch(`/api/plan-anual?anio=${anio}`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.planesAnuales && data.planesAnuales.length > 0) {
          const plan = data.planesAnuales[0] // Tomar el más reciente
          setPlanAnualExistente(plan)
          
          // Cargar unidades existentes si las hay
          if (plan.unidades && Array.isArray(plan.unidades)) {
            setUnidadesExistentes(plan.unidades)
          }
          
          return plan
        }
      }
      return null
    } catch (error) {
      console.error('Error al verificar plan anual existente:', error)
      return null
    }
  }

  const handleFase1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.areaId && formData.gradoId) {
      try {
        // Guardar/actualizar los datos de la Fase 1 en la BD
        const saveResponse = await fetch('/api/plan-anual', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formData: formData,
            unidades: null, // En Fase 1 aún no hay unidades
            variablesTemplate: null
          }),
        })

        if (saveResponse.ok) {
          const saveData = await saveResponse.json()
          console.log('✅ Datos de Fase 1 guardados/actualizados:', saveData)
          
          // Obtener el plan completo para tenerlo disponible
          const planResponse = await fetch(`/api/plan-anual?anio=${new Date().getFullYear()}`)
          if (planResponse.ok) {
            const planData = await planResponse.json()
            if (planData.planesAnuales && planData.planesAnuales.length > 0) {
              const plan = planData.planesAnuales[0]
              setPlanAnualExistente(plan)
              
              // Si hay unidades existentes, cargarlas en el formulario
              if (plan.unidades && Array.isArray(plan.unidades) && plan.unidades.length > 0) {
                setUnidadesExistentes(plan.unidades)
                
                // Cargar las unidades existentes en el formulario
                const nuevasUnidades = [...unidades]
                const nuevasCapacidadesPorUnidad: { [key: number]: Capacidad[] } = {}
                const nuevosDesempeniosPorUnidad: { [key: number]: Desempenio[] } = {}
                
                // Cargar datos de cada unidad existente
                for (let index = 0; index < 9 && index < plan.unidades.length; index++) {
                  const unidadExistente = plan.unidades[index]
                  
                  if (unidadExistente && (unidadExistente.problemaPotencialidad || unidadExistente.producto || 
                      unidadExistente.desempeniosSeleccionados?.length > 0)) {
                    
                    // Actualizar la unidad con los datos existentes
                    nuevasUnidades[index] = {
                      ...nuevasUnidades[index],
                      ...unidadExistente,
                      // Preservar arrays
                      competenciasSeleccionadas: unidadExistente.competenciasSeleccionadas || [],
                      capacidadesSeleccionadas: unidadExistente.capacidadesSeleccionadas || [],
                      desempeniosSeleccionados: unidadExistente.desempeniosSeleccionados || []
                    }
                    
                    // Si hay desempeños seleccionados, cargarlos desde la BD
                    if (unidadExistente.desempeniosSeleccionados && 
                        Array.isArray(unidadExistente.desempeniosSeleccionados) && 
                        unidadExistente.desempeniosSeleccionados.length > 0) {
                      
                      try {
                        // Cargar desempeños desde la BD
                        const idsString = unidadExistente.desempeniosSeleccionados.join(',')
                        const responseDesempenios = await fetch(`/api/competencias/desempenios?ids=${idsString}`)
                        const desempeniosCompletos: Desempenio[] = await responseDesempenios.json()
                        
                        if (desempeniosCompletos && desempeniosCompletos.length > 0) {
                          nuevosDesempeniosPorUnidad[index] = desempeniosCompletos
                          
                          // Obtener las capacidades relacionadas a estos desempeños
                          const capacidadesIds = [...new Set(desempeniosCompletos.map(d => d.idcapacidad))]
                          if (capacidadesIds.length > 0) {
                            const capacidadesIdsString = capacidadesIds.join(',')
                            const responseCapacidades = await fetch(`/api/competencias/capacidades?ids=${capacidadesIdsString}`)
                            const capacidadesCompletas: Capacidad[] = await responseCapacidades.json()
                            
                            if (capacidadesCompletas && capacidadesCompletas.length > 0) {
                              nuevasCapacidadesPorUnidad[index] = capacidadesCompletas
                            }
                          }
                          
                          console.log(`✅ [DEBUG] Cargados ${desempeniosCompletos.length} desempeños para unidad ${index}`)
                        }
                      } catch (error) {
                        console.error(`❌ [DEBUG] Error al cargar desempeños para unidad ${index} desde BD:`, error)
                      }
                    }
                  }
                }
                
                // Actualizar todos los estados con los datos cargados
                setUnidades(nuevasUnidades)
                setCapacidadesPorUnidad(prev => ({ ...prev, ...nuevasCapacidadesPorUnidad }))
                setTodosLosDesempeniosPorUnidad(prev => ({ ...prev, ...nuevosDesempeniosPorUnidad }))
                setDesempeniosPorUnidad(prev => ({ ...prev, ...nuevosDesempeniosPorUnidad }))
                
                console.log('✅ [DEBUG] Datos de Fase 2 cargados desde BD:', {
                  unidadesCargadas: nuevasUnidades.filter(u => u.problemaPotencialidad || u.producto || u.desempeniosSeleccionados?.length > 0).length
                })
              }
            }
          }
          
          // Continuar a Fase 2 directamente (el modal se mostrará al generar el documento)
          setFase(2)
        } else {
          console.error('Error al guardar datos de Fase 1')
          // Continuar a Fase 2 de todas formas
          setFase(2)
        }
      } catch (error) {
        console.error('Error al guardar datos de Fase 1:', error)
        // Continuar a Fase 2 de todas formas
        setFase(2)
      }
    }
  }

  const handleElegirModoGeneracion = async (modo: 'regenerar' | 'actualizar') => {
    setModoGeneracion(modo)
    setShowModalPlanExistente(false)
    
    // Si se elige "actualizar", cargar los datos existentes antes de generar
    if (modo === 'actualizar' && planAnualExistente) {
      // Cargar datos existentes de la Fase 1 directamente desde planAnualExistente
      setFormData(prev => ({
        ...prev,
        // Cargar datos guardados desde BD, usar valores vacíos si no existen
        area: planAnualExistente.area || prev.area,
        areaId: planAnualExistente.areaId || prev.areaId,
        grado: planAnualExistente.grado || prev.grado,
        gradoId: planAnualExistente.gradoId || prev.gradoId,
        institucion: planAnualExistente.institucion || prev.institucion,
        docente: planAnualExistente.docente || prev.docente,
        dre: planAnualExistente.dre || prev.dre,
        ugel: planAnualExistente.ugel || prev.ugel,
        director: planAnualExistente.director || prev.director,
        coordinador: planAnualExistente.coordinador || prev.coordinador,
        nivel: planAnualExistente.nivel || prev.nivel,
        nivelId: planAnualExistente.nivelId || prev.nivelId,
        departamento: planAnualExistente.departamento || prev.departamento,
        provincia: planAnualExistente.provincia || prev.provincia,
        distrito: planAnualExistente.distrito || prev.distrito
      }))
      
      // Inicializar provincias y distritos desde los datos guardados
      if (planAnualExistente.departamento) {
        const provincias = getProvinciasByDepartamento(planAnualExistente.departamento)
        setProvinciasDisponibles(provincias)
        
        if (planAnualExistente.provincia) {
          const distritos = getDistritosByProvincia(planAnualExistente.departamento, planAnualExistente.provincia)
          setDistritosDisponibles(distritos)
        }
      }
      
      // Cargar unidades existentes
      if (planAnualExistente.unidades && Array.isArray(planAnualExistente.unidades)) {
        // Actualizar unidadesExistentes con los datos completos de la BD
        setUnidadesExistentes(planAnualExistente.unidades)
        
        const nuevasUnidades = [...unidades]
        const nuevasCapacidadesPorUnidad: { [key: number]: Capacidad[] } = {}
        const nuevosDesempeniosPorUnidad: { [key: number]: Desempenio[] } = {}
        
        // Cargar datos de cada unidad existente
        for (let index = 0; index < 9 && index < planAnualExistente.unidades.length; index++) {
          const unidadExistente = planAnualExistente.unidades[index]
          
          if (unidadExistente && (unidadExistente.problemaPotencialidad || unidadExistente.producto || 
              unidadExistente.desempeniosSeleccionados?.length > 0)) {
            
            // Actualizar la unidad con los datos existentes
            nuevasUnidades[index] = {
              ...nuevasUnidades[index],
              ...unidadExistente,
              // Preservar arrays
              competenciasSeleccionadas: unidadExistente.competenciasSeleccionadas || [],
              capacidadesSeleccionadas: unidadExistente.capacidadesSeleccionadas || [],
              desempeniosSeleccionados: unidadExistente.desempeniosSeleccionados || []
            }
            
            // Si hay desempeños seleccionados, cargarlos desde la BD
            if (unidadExistente.desempeniosSeleccionados && 
                Array.isArray(unidadExistente.desempeniosSeleccionados) && 
                unidadExistente.desempeniosSeleccionados.length > 0) {
              
              try {
                // Cargar desempeños desde la BD
                const idsString = unidadExistente.desempeniosSeleccionados.join(',')
                const responseDesempenios = await fetch(`/api/competencias/desempenios?ids=${idsString}`)
                const desempeniosCompletos: Desempenio[] = await responseDesempenios.json()
                
                if (desempeniosCompletos && desempeniosCompletos.length > 0) {
                  nuevosDesempeniosPorUnidad[index] = desempeniosCompletos
                  
                  // Obtener las capacidades relacionadas a estos desempeños
                  const capacidadesIds = [...new Set(desempeniosCompletos.map(d => d.idcapacidad))]
                  if (capacidadesIds.length > 0) {
                    const capacidadesIdsString = capacidadesIds.join(',')
                    const responseCapacidades = await fetch(`/api/competencias/capacidades?ids=${capacidadesIdsString}`)
                    const capacidadesCompletas: Capacidad[] = await responseCapacidades.json()
                    
                    if (capacidadesCompletas && capacidadesCompletas.length > 0) {
                      nuevasCapacidadesPorUnidad[index] = capacidadesCompletas
                    }
                  }
                  
                  console.log(`✅ [DEBUG] Cargados ${desempeniosCompletos.length} desempeños para unidad ${index}`)
                }
              } catch (error) {
                console.error(`❌ [DEBUG] Error al cargar desempeños para unidad ${index} desde BD:`, error)
              }
            }
          }
        }
        
        setUnidades(nuevasUnidades)
        setCapacidadesPorUnidad(nuevasCapacidadesPorUnidad)
        setTodosLosDesempeniosPorUnidad(nuevosDesempeniosPorUnidad)
      }
    }
    
    // Continuar con la generación del documento usando el modo seleccionado
    await generarDocumento(modo)
  }

  const handleUnidadChange = (index: number, field: keyof Unidad, value: string | boolean | string[]) => {
    setUnidades(prevUnidades => {
      const newUnidades = [...prevUnidades]
      const unidadActual = newUnidades[index]
      
      // Si cambia la competencia, cargar capacidades
      if (field === 'competenciaSeleccionada' && typeof value === 'string') {
        newUnidades[index] = { ...unidadActual, [field]: value }
        if (value) {
          loadCapacidadesParaUnidad(index, value, newUnidades)
        } else {
          setCapacidadesPorUnidad(prev => ({ ...prev, [index]: [] }))
          setDesempeniosPorUnidad(prev => ({ ...prev, [index]: [] }))
          setTodosLosDesempeniosPorUnidad(prev => ({ ...prev, [index]: [] }))
        }
        return newUnidades
      }
      
      // Si cambia la capacidad, cargar desempeños (pero mantener desempeños ya seleccionados)
      if (field === 'capacidadSeleccionada' && typeof value === 'string') {
        newUnidades[index] = { ...unidadActual, [field]: value }
        if (value) {
          loadDesempeniosParaUnidad(index, value)
        }
        return newUnidades
      }
      
      // Para desempeños, actualizar directamente
      if (field === 'desempeniosSeleccionados') {
        newUnidades[index] = { ...unidadActual, [field]: value as string[] }
        return newUnidades
      }
      
      // Para otros campos, actualizar normalmente
      newUnidades[index] = { ...unidadActual, [field]: value }
      return newUnidades
    })
  }

  const loadCapacidadesParaUnidad = async (index: number, competenciaId: string, unidadesActualizadas: Unidad[]) => {
    try {
      setLoadingCapacidades(prev => ({ ...prev, [index]: true }))
      const response = await fetch(`/api/competencias/capacidades?idcompetencia=${competenciaId}`)
      const data = await response.json()
      setCapacidadesPorUnidad(prev => ({ ...prev, [index]: data }))
      // Limpiar capacidad y desempeños seleccionados, pero mantener la competencia seleccionada
      setUnidades(prevUnidades => {
        const newUnidades = [...prevUnidades]
        newUnidades[index] = {
          ...newUnidades[index],
          capacidadSeleccionada: '',
          desempeniosSeleccionados: []
        }
        return newUnidades
      })
      setDesempeniosPorUnidad(prev => ({ ...prev, [index]: [] }))
      setTodosLosDesempeniosPorUnidad(prev => ({ ...prev, [index]: [] }))
    } catch (error) {
      console.error(`Error al cargar capacidades para unidad ${index}:`, error)
      setCapacidadesPorUnidad(prev => ({ ...prev, [index]: [] }))
    } finally {
      setLoadingCapacidades(prev => ({ ...prev, [index]: false }))
    }
  }

  const loadDesempeniosParaUnidad = async (index: number, capacidadId: string) => {
    try {
      setLoadingDesempenios(prev => ({ ...prev, [index]: true }))
      const response = await fetch(`/api/competencias/desempenios?idcapacidad=${capacidadId}`)
      const data = await response.json()
      setDesempeniosPorUnidad(prev => ({ ...prev, [index]: data }))
      
      // Agregar estos desempeños a la lista total (evitando duplicados)
      setTodosLosDesempeniosPorUnidad(prev => {
        const desempeniosActuales = prev[index] || []
        const nuevosIds = data.map((d: Desempenio) => d.id)
        const sinDuplicados = desempeniosActuales.filter(d => !nuevosIds.includes(d.id))
        return { ...prev, [index]: [...sinDuplicados, ...data] }
      })
    } catch (error) {
      console.error(`Error al cargar desempeños para unidad ${index}:`, error)
      setDesempeniosPorUnidad(prev => ({ ...prev, [index]: [] }))
    } finally {
      setLoadingDesempenios(prev => ({ ...prev, [index]: false }))
    }
  }

  // Función para obtener el color pastel de una competencia según su índice
  const getCompetenciaColor = (competenciaIndex: number): { bg: string; border: string; text: string } => {
    const colors = [
      { bg: '#E3F2FD', border: '#90CAF9', text: '#1565C0' }, // Azul pastel
      { bg: '#FCE4EC', border: '#F48FB1', text: '#C2185B' }, // Rosa pastel
      { bg: '#E8F5E9', border: '#A5D6A7', text: '#2E7D32' }  // Verde pastel
    ]
    return colors[competenciaIndex % 3] // Cicla entre los 3 colores
  }

  // Funciones para el modal de competencias/desempeños
  const abrirModalCompetencias = async (index: number) => {
    const unidad = unidades[index]
    setUnidadModalIndex(index)
    
    // Cargar las selecciones actuales en el modal (usar arrays si existen, sino usar los valores individuales)
    const competenciasSeleccionadas = unidad.competenciasSeleccionadas?.length > 0 
      ? unidad.competenciasSeleccionadas 
      : (unidad.competenciaSeleccionada ? [unidad.competenciaSeleccionada] : [])
    
    const capacidadesSeleccionadas = unidad.capacidadesSeleccionadas?.length > 0
      ? unidad.capacidadesSeleccionadas
      : (unidad.capacidadSeleccionada ? [unidad.capacidadSeleccionada] : [])
    
    setCompetenciasSeleccionadasModal(competenciasSeleccionadas)
    setConocimientosSeleccionadosModal(capacidadesSeleccionadas)
    setDesempeniosSeleccionadosModal(unidad.desempeniosSeleccionados || [])
    
    // Cargar capacidades de todas las competencias seleccionadas
    if (competenciasSeleccionadas.length > 0) {
      await loadCapacidadesModal(competenciasSeleccionadas)
    } else {
      setCapacidadesModal([])
    }
    
    // Cargar desempeños de todas las capacidades seleccionadas
    if (capacidadesSeleccionadas.length > 0) {
      await loadDesempeniosModal(capacidadesSeleccionadas)
    } else {
      setDesempeniosModal([])
    }
    
    setShowModalCompetencias(true)
  }

  const cerrarModalCompetencias = () => {
    setShowModalCompetencias(false)
    setUnidadModalIndex(null)
    setCompetenciasSeleccionadasModal([])
    setConocimientosSeleccionadosModal([])
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

  const loadDesempeniosModal = async (conocimientosIds: string[]): Promise<Desempenio[]> => {
    if (conocimientosIds.length === 0) {
      setDesempeniosModal([])
      return []
    }
    
    try {
      setLoadingDesempeniosModal(true)
      const promesas = conocimientosIds.map(id => 
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
    
    // Cargar capacidades de las competencias seleccionadas
    if (newSelection.length > 0) {
      const nuevasCapacidades = await loadCapacidadesModal(newSelection)
      const idsNuevasCapacidades = nuevasCapacidades.map((c: Capacidad) => c.id.toString())
      
      // Mantener solo las capacidades seleccionadas que aún existen
      setConocimientosSeleccionadosModal(prev => {
        const capacidadesValidas = prev.filter(id => idsNuevasCapacidades.includes(id))
        
        // Si hay capacidades válidas, recargar desempeños
        if (capacidadesValidas.length > 0) {
          loadDesempeniosModal(capacidadesValidas).then((nuevosDesempenios) => {
            // Mantener solo los desempeños seleccionados que aún existen
            setDesempeniosSeleccionadosModal(prevDesempenios => {
              const idsNuevosDesempenios = nuevosDesempenios.map((d: Desempenio) => d.id.toString())
              return prevDesempenios.filter(id => idsNuevosDesempenios.includes(id))
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
      setConocimientosSeleccionadosModal([])
      setDesempeniosModal([])
      setDesempeniosSeleccionadosModal([])
    }
  }

  const handleConocimientoChangeModal = async (conocimientoId: string, checked: boolean) => {
    const newSelection = checked
      ? [...conocimientosSeleccionadosModal, conocimientoId]
      : conocimientosSeleccionadosModal.filter(id => id !== conocimientoId)
    
    setConocimientosSeleccionadosModal(newSelection)
    
    // Cargar desempeños de los conocimientos seleccionados
    if (newSelection.length > 0) {
      const nuevosDesempenios = await loadDesempeniosModal(newSelection)
      // Mantener solo los desempeños seleccionados que aún existen en los nuevos desempeños cargados
      setDesempeniosSeleccionadosModal(prev => {
        const idsNuevosDesempenios = nuevosDesempenios.map((d: Desempenio) => d.id.toString())
        return prev.filter(id => idsNuevosDesempenios.includes(id))
      })
    } else {
      setDesempeniosModal([])
      setDesempeniosSeleccionadosModal([])
    }
  }

  const handleDesempenioChangeModal = (desempenioId: string, checked: boolean) => {
    if (checked) {
      if (desempeniosSeleccionadosModal.length >= 4) {
        alert('Solo puedes seleccionar hasta 4 desempeños')
        return
      }
      setDesempeniosSeleccionadosModal([...desempeniosSeleccionadosModal, desempenioId])
    } else {
      setDesempeniosSeleccionadosModal(desempeniosSeleccionadosModal.filter(id => id !== desempenioId))
    }
  }

  const guardarSeleccionModal = async () => {
    if (unidadModalIndex === null) return
    
    // Determinar las competencias y capacidades relacionadas SOLO a los desempeños seleccionados
    let competenciasRelacionadas: string[] = []
    let capacidadesRelacionadas: string[] = []
    
    if (desempeniosSeleccionadosModal.length > 0) {
      try {
        // Obtener todos los desempeños seleccionados de la BD con sus capacidades y competencias
        const idsString = desempeniosSeleccionadosModal.join(',')
        const response = await fetch(`/api/competencias/desempenios?ids=${idsString}`)
        const todosLosDesempenios: any[] = await response.json()
        
        // Extraer las capacidades únicas relacionadas a los desempeños seleccionados
        const capacidadesIds = [...new Set(todosLosDesempenios.map((d: any) => d.idcapacidad).filter((id: any) => id !== undefined && id !== null))]
        capacidadesRelacionadas = capacidadesIds.map((id: number) => id.toString())
        
        // Extraer las competencias únicas desde las capacidades de los desempeños
        const competenciasIds = [...new Set(todosLosDesempenios.map((d: any) => d.capacidad?.idcompetencia).filter((id: any) => id !== undefined && id !== null))]
        competenciasRelacionadas = competenciasIds.map((id: number) => id.toString())
        
        // Obtener las capacidades completas para mostrarlas en la página principal
        const capacidadesIdsString = capacidadesIds.join(',')
        const responseCapacidades = await fetch(`/api/competencias/capacidades?ids=${capacidadesIdsString}`)
        const todasLasCapacidades = await responseCapacidades.json()
        
        // Guardar solo las competencias y capacidades relacionadas a los desempeños seleccionados
        setUnidades(prevUnidades => {
          const newUnidades = [...prevUnidades]
          newUnidades[unidadModalIndex] = {
            ...newUnidades[unidadModalIndex],
            competenciaSeleccionada: competenciasRelacionadas[0] || '',  // Primera para compatibilidad
            capacidadSeleccionada: capacidadesRelacionadas[0] || '',     // Primera para compatibilidad
            competenciasSeleccionadas: competenciasRelacionadas,         // Solo las relacionadas
            capacidadesSeleccionadas: capacidadesRelacionadas,           // Solo las relacionadas
            desempeniosSeleccionados: desempeniosSeleccionadosModal
          }
          return newUnidades
        })
        
        // Cargar los desempeños y capacidades relacionados para mostrarlos en la página principal
        setTodosLosDesempeniosPorUnidad(prev => ({ ...prev, [unidadModalIndex]: todosLosDesempenios }))
        setCapacidadesPorUnidad(prev => ({ ...prev, [unidadModalIndex]: todasLasCapacidades }))
        
        console.log('✅ [DEBUG] Guardando selección:', {
          desempenios: desempeniosSeleccionadosModal.length,
          capacidadesRelacionadas: capacidadesRelacionadas.length,
          competenciasRelacionadas: competenciasRelacionadas.length
        })
      } catch (error) {
        console.error('Error al cargar desempeños relacionados:', error)
        // En caso de error, guardar lo que se tenía seleccionado
        setUnidades(prevUnidades => {
          const newUnidades = [...prevUnidades]
          newUnidades[unidadModalIndex] = {
            ...newUnidades[unidadModalIndex],
            competenciaSeleccionada: competenciasSeleccionadasModal[0] || '',
            capacidadSeleccionada: conocimientosSeleccionadosModal[0] || '',
            competenciasSeleccionadas: competenciasSeleccionadasModal,
            capacidadesSeleccionadas: conocimientosSeleccionadosModal,
            desempeniosSeleccionados: desempeniosSeleccionadosModal
          }
          return newUnidades
        })
      }
    } else {
      // Si no hay desempeños seleccionados, limpiar todo
      setUnidades(prevUnidades => {
        const newUnidades = [...prevUnidades]
        newUnidades[unidadModalIndex] = {
          ...newUnidades[unidadModalIndex],
          competenciaSeleccionada: '',
          capacidadSeleccionada: '',
          competenciasSeleccionadas: [],
          capacidadesSeleccionadas: [],
          desempeniosSeleccionados: []
        }
        return newUnidades
      })
    }
    
    cerrarModalCompetencias()
  }

  // Función para eliminar una competencia específica
  const eliminarCompetencia = (unidadIndex: number, competenciaId: string) => {
    const unidad = unidades[unidadIndex]
    if (!unidad) return

    // Obtener las competencias seleccionadas actuales
    const competenciasActuales = unidad.competenciasSeleccionadas?.length > 0
      ? unidad.competenciasSeleccionadas
      : (unidad.competenciaSeleccionada ? [unidad.competenciaSeleccionada] : [])

    // Filtrar la competencia a eliminar
    const nuevasCompetencias = competenciasActuales.filter(id => id !== competenciaId)

    // Obtener los desempeños seleccionados actuales
    const desempeniosActuales = unidad.desempeniosSeleccionados || []

    // Si hay desempeños seleccionados, verificar cuáles pertenecen a la competencia eliminada
    if (desempeniosActuales.length > 0) {
      // Cargar los desempeños para verificar a qué competencia pertenecen
      const idsString = desempeniosActuales.join(',')
      fetch(`/api/competencias/desempenios?ids=${idsString}`)
        .then(response => response.json())
        .then((todosLosDesempenios: any[]) => {
          // Filtrar desempeños que pertenecen a la competencia eliminada
          const desempeniosAMantener = todosLosDesempenios
            .filter(d => {
              const capacidad = capacidadesPorUnidad[unidadIndex]?.find(c => c.id === d.idcapacidad)
              return capacidad && capacidad.idcompetencia.toString() !== competenciaId
            })
            .map(d => d.id.toString())

          // Actualizar la unidad
          const nuevasUnidades = [...unidades]
          nuevasUnidades[unidadIndex] = {
            ...unidad,
            competenciaSeleccionada: nuevasCompetencias[0] || '',
            competenciasSeleccionadas: nuevasCompetencias,
            desempeniosSeleccionados: desempeniosAMantener,
            capacidadSeleccionada: '' // Limpiar capacidad seleccionada
          }
          setUnidades(nuevasUnidades)

          // Actualizar capacidades y desempeños cargados
          if (desempeniosAMantener.length > 0) {
            // Recargar capacidades y desempeños para las competencias restantes
            const capacidadesIds = [...new Set(todosLosDesempenios
              .filter(d => desempeniosAMantener.includes(d.id.toString()))
              .map((d: any) => d.idcapacidad)
              .filter((id: any) => id !== undefined && id !== null))]
            
            const competenciasIds = [...new Set(todosLosDesempenios
              .filter(d => desempeniosAMantener.includes(d.id.toString()))
              .map((d: any) => {
                const cap = capacidadesPorUnidad[unidadIndex]?.find(c => c.id === d.idcapacidad)
                return cap?.idcompetencia
              })
              .filter((id: any) => id !== undefined && id !== null))]

            // Cargar capacidades actualizadas
            if (competenciasIds.length > 0) {
              const capacidadesIdsString = capacidadesIds.join(',')
              fetch(`/api/competencias/capacidades?ids=${capacidadesIdsString}`)
                .then(r => r.json())
                .then((caps: Capacidad[]) => {
                  const nuevasCapacidades = { ...capacidadesPorUnidad }
                  nuevasCapacidades[unidadIndex] = caps
                  setCapacidadesPorUnidad(nuevasCapacidades)
                })
            } else {
              const nuevasCapacidades = { ...capacidadesPorUnidad }
              nuevasCapacidades[unidadIndex] = []
              setCapacidadesPorUnidad(nuevasCapacidades)
            }

            // Actualizar desempeños cargados
            const nuevosDesempenios = { ...todosLosDesempeniosPorUnidad }
            nuevosDesempenios[unidadIndex] = todosLosDesempenios.filter(d => 
              desempeniosAMantener.includes(d.id.toString())
            )
            setTodosLosDesempeniosPorUnidad(nuevosDesempenios)
          } else {
            // Si no quedan desempeños, limpiar todo
            const nuevasCapacidades = { ...capacidadesPorUnidad }
            nuevasCapacidades[unidadIndex] = []
            setCapacidadesPorUnidad(nuevasCapacidades)

            const nuevosDesempenios = { ...todosLosDesempeniosPorUnidad }
            nuevosDesempenios[unidadIndex] = []
            setTodosLosDesempeniosPorUnidad(nuevosDesempenios)
          }
        })
        .catch(error => {
          console.error('Error al verificar desempeños:', error)
          // Si hay error, simplemente eliminar la competencia sin verificar desempeños
          const nuevasUnidades = [...unidades]
          nuevasUnidades[unidadIndex] = {
            ...unidad,
            competenciaSeleccionada: nuevasCompetencias[0] || '',
            competenciasSeleccionadas: nuevasCompetencias
          }
          setUnidades(nuevasUnidades)
        })
    } else {
      // Si no hay desempeños, simplemente eliminar la competencia
      const nuevasUnidades = [...unidades]
      nuevasUnidades[unidadIndex] = {
        ...unidad,
        competenciaSeleccionada: nuevasCompetencias[0] || '',
        competenciasSeleccionadas: nuevasCompetencias
      }
      setUnidades(nuevasUnidades)
    }
  }

  // Función para eliminar un desempeño específico
  const eliminarDesempenio = (unidadIndex: number, desempenioId: string) => {
    const unidad = unidades[unidadIndex]
    if (!unidad) return

    // Filtrar el desempeño a eliminar
    const nuevosDesempenios = unidad.desempeniosSeleccionados.filter(id => id !== desempenioId)

    // Actualizar la unidad
    const nuevasUnidades = [...unidades]
    nuevasUnidades[unidadIndex] = {
      ...unidad,
      desempeniosSeleccionados: nuevosDesempenios
    }
    setUnidades(nuevasUnidades)

    // Si no quedan desempeños, verificar si debemos limpiar competencias y capacidades
    if (nuevosDesempenios.length === 0) {
      // No limpiar competencias automáticamente, solo desempeños
      const nuevasCapacidades = { ...capacidadesPorUnidad }
      nuevasCapacidades[unidadIndex] = []
      setCapacidadesPorUnidad(nuevasCapacidades)

      const nuevosDesempeniosCargados = { ...todosLosDesempeniosPorUnidad }
      nuevosDesempeniosCargados[unidadIndex] = []
      setTodosLosDesempeniosPorUnidad(nuevosDesempeniosCargados)
    } else {
      // Actualizar desempeños cargados
      const desempeniosActuales = todosLosDesempeniosPorUnidad[unidadIndex] || []
      const nuevosDesempeniosCargados = desempeniosActuales.filter(d => 
        nuevosDesempenios.includes(d.id.toString())
      )
      const nuevosDesempeniosPorUnidad = { ...todosLosDesempeniosPorUnidad }
      nuevosDesempeniosPorUnidad[unidadIndex] = nuevosDesempeniosCargados
      setTodosLosDesempeniosPorUnidad(nuevosDesempeniosPorUnidad)

      // Actualizar capacidades (mantener solo las que tienen desempeños seleccionados)
      const capacidadesIds = [...new Set(nuevosDesempeniosCargados.map(d => d.idcapacidad))]
      const capacidadesActuales = capacidadesPorUnidad[unidadIndex] || []
      const nuevasCapacidades = capacidadesActuales.filter(c => 
        capacidadesIds.includes(c.id)
      )
      const nuevasCapacidadesPorUnidad = { ...capacidadesPorUnidad }
      nuevasCapacidadesPorUnidad[unidadIndex] = nuevasCapacidades
      setCapacidadesPorUnidad(nuevasCapacidadesPorUnidad)
    }
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar que al menos la unidad 0 tenga desempeños seleccionados
    const unidad0 = unidades[0]
    if (!unidad0.desempeniosSeleccionados || unidad0.desempeniosSeleccionados.length === 0) {
      alert('⚠️ Por favor, selecciona al menos un desempeño en la UNIDAD 0 para generar el campo temático.')
      return
    }
    
    // Validar que al menos la unidad 0 tenga competencia seleccionada
    if (!unidad0.competenciaSeleccionada) {
      alert('⚠️ Por favor, selecciona al menos una competencia en la UNIDAD 0.')
      return
    }
    
    // Validar que no haya más de 4 desempeños
    if (unidad0.desempeniosSeleccionados.length > 4) {
      alert('⚠️ Solo puedes seleccionar hasta 4 desempeños.')
      return
    }
    
    // Verificar si hay un plan anual existente con unidades generadas
    const planExistente = await verificarPlanAnualExistente()
    
    if (planExistente && planExistente.unidades && 
        Array.isArray(planExistente.unidades) && 
        planExistente.unidades.some((u: any) => 
          (u.situacionSignificativa && u.situacionSignificativa.trim().length > 0) ||
          (u.campoTematico && u.campoTematico.trim().length > 0) ||
          (u.tituloUnidad && u.tituloUnidad.trim().length > 0)
        )) {
      // Si hay unidades con datos generados, mostrar modal preguntando qué hacer
      setShowModalPlanExistente(true)
      return // No continuar con la generación hasta que el usuario elija
    }
    
    // Si no hay plan existente o no tiene datos generados, continuar con la generación
    await generarDocumento('regenerar')
  }

  const generarDocumento = async (modo: 'regenerar' | 'actualizar' = 'regenerar') => {
    setLoading(true)
    
    try {
      // IMPORTANTE: Enviar TODAS las 9 unidades preservando el índice original
      // El backend necesita que el índice del array coincida con el número de unidad (0-8)
      // Si una unidad no tiene datos, enviarla con valores vacíos pero en su posición correcta
      const unidadesParaEnviar = unidades.map((unidad, index) => ({
        problemaPotencialidad: unidad.problemaPotencialidad || '',
        producto: unidad.producto || '',
        tieneTituloIA: unidad.tieneTituloIA !== undefined ? unidad.tieneTituloIA : true,
        tituloUnidad: unidad.tituloUnidad || '',
        competenciaSeleccionada: unidad.competenciaSeleccionada || '',  // Para compatibilidad
        competenciasSeleccionadas: unidad.competenciasSeleccionadas || (unidad.competenciaSeleccionada ? [unidad.competenciaSeleccionada] : []),  // Array de competencias
        capacidadSeleccionada: unidad.capacidadSeleccionada || '',  // Para compatibilidad
        capacidadesSeleccionadas: unidad.capacidadesSeleccionadas || (unidad.capacidadSeleccionada ? [unidad.capacidadSeleccionada] : []),  // Array de capacidades
        desempeniosSeleccionados: unidad.desempeniosSeleccionados || [],
        conocimientos: unidad.conocimientos || ''
      }))
      
      console.log('📤 [FRONTEND] Enviando datos para generar programación anual...', {
        formData,
        unidades: unidadesParaEnviar,
        aiProvider,
        cantidadUnidades: unidadesParaEnviar.length
      })
      
      // Log detallado de cada unidad
      unidadesParaEnviar.forEach((unidad, index) => {
        console.log(`📋 [FRONTEND] Unidad ${index}:`, {
          producto: unidad.producto,
          competenciaSeleccionada: unidad.competenciaSeleccionada,
          competenciasSeleccionadas: {
            cantidad: unidad.competenciasSeleccionadas?.length || 0,
            valores: unidad.competenciasSeleccionadas
          },
          capacidadesSeleccionadas: {
            cantidad: unidad.capacidadesSeleccionadas?.length || 0,
            valores: unidad.capacidadesSeleccionadas
          },
          desempeniosSeleccionados: {
            cantidad: unidad.desempeniosSeleccionados?.length || 0,
            valores: unidad.desempeniosSeleccionados,
            tipo: Array.isArray(unidad.desempeniosSeleccionados) ? 'array' : typeof unidad.desempeniosSeleccionados
          },
          tituloUnidad: unidad.tituloUnidad,
          problemaPotencialidad: unidad.problemaPotencialidad
        })
      })
      
      // Determinar qué unidades necesitan generación con IA
      // Si estamos en modo "actualizar", solo generar las que no tienen datos completos
      const unidadesParaGenerar: number[] = []
      const datosExistentes: any = {}
      
      if (modo === 'actualizar' && planAnualExistente) {
        // Obtener unidades existentes directamente del plan (más confiable)
        const unidadesBD = planAnualExistente.unidades && Array.isArray(planAnualExistente.unidades) 
          ? planAnualExistente.unidades 
          : unidadesExistentes
        
        console.log('🔍 [DEBUG] Verificando unidades existentes en BD:', {
          tienePlanAnual: !!planAnualExistente,
          tieneUnidadesBD: !!planAnualExistente?.unidades,
          cantidadUnidadesBD: unidadesBD.length,
          unidadesExistentesLength: unidadesExistentes.length
        })
        
        // En modo actualizar, identificar qué unidades necesitan generación
        unidadesParaEnviar.forEach((unidad, index) => {
          const unidadExistente = unidadesBD[index]
          
          // Verificar si la unidad tiene datos generados previamente (situación significativa, campo temático, título)
          const tieneDatosGenerados = unidadExistente && (
            (unidadExistente.situacionSignificativa && unidadExistente.situacionSignificativa.trim().length > 0) ||
            (unidadExistente.campoTematico && unidadExistente.campoTematico.trim().length > 0) ||
            (unidadExistente.tituloUnidad && unidadExistente.tituloUnidad.trim().length > 0)
          )
          
          // Verificar si la unidad actual tiene nuevos datos que requieren generación
          const tieneNuevosDatos = (unidad.problemaPotencialidad && unidad.problemaPotencialidad.trim().length > 0) || 
                                   (unidad.producto && unidad.producto.trim().length > 0) || 
                                   (unidad.desempeniosSeleccionados && unidad.desempeniosSeleccionados.length > 0)
          
          console.log(`🔍 [DEBUG] Unidad ${index}:`, {
            tieneDatosGenerados,
            tieneNuevosDatos,
            situacionSignificativa: unidadExistente?.situacionSignificativa?.substring(0, 50) || '(vacío)',
            campoTematico: unidadExistente?.campoTematico?.substring(0, 50) || '(vacío)',
            tituloUnidad: unidadExistente?.tituloUnidad || '(vacío)'
          })
          
          // Si tiene datos generados en BD, usar esos datos (NO generar con IA)
          if (tieneDatosGenerados) {
            // Guardar datos existentes para esta unidad
            datosExistentes[index] = {
              situacionSignificativa: unidadExistente.situacionSignificativa || '',
              campoTematico: unidadExistente.campoTematico || '',
              tituloUnidad: unidadExistente.tituloUnidad || ''
            }
            console.log(`✅ [DEBUG] Unidad ${index}: Usará datos existentes (NO se generará con IA)`)
          } else if (tieneNuevosDatos) {
            // Si tiene nuevos datos pero NO tiene datos generados, necesita generación con IA
            unidadesParaGenerar.push(index)
            console.log(`🤖 [DEBUG] Unidad ${index}: Necesita generación con IA`)
          } else {
            console.log(`⏭️ [DEBUG] Unidad ${index}: Sin datos, se omitirá`)
          }
        })
      } else {
        // En modo regenerar, generar todas las unidades que tengan datos
        unidadesParaEnviar.forEach((unidad, index) => {
          if (unidad.problemaPotencialidad || unidad.producto || unidad.desempeniosSeleccionados?.length > 0) {
            unidadesParaGenerar.push(index)
          }
        })
      }
      
      console.log('📊 [DEBUG] Modo de generación:', modo)
      console.log('📊 [DEBUG] Unidades a generar con IA:', unidadesParaGenerar)
      console.log('📊 [DEBUG] Datos existentes a usar:', Object.keys(datosExistentes))
      
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: formData,
          unidades: unidadesParaEnviar,
          aiProvider: aiProvider === 'gemini' ? 'gemini' : 'openai',
          openaiModel: aiProvider !== 'gemini' ? aiProvider : undefined,
          modoGeneracion: modo,
          unidadesParaGenerar: unidadesParaGenerar,
          datosExistentes: datosExistentes,
          planAnualId: planAnualExistente?.id
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar el documento')
      }

      // Obtener el blob del documento
      const blob = await response.blob()
      
      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'PLANIFICACION_ANUAL.docx'
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1]
        }
      }
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      // NO hacer POST adicional aquí porque /api/generate-document ya guarda los datos correctamente
      // incluyendo situacionSignificativa y campoTematico generados por IA
      // Si hacemos POST aquí con unidadesParaEnviar (que no tiene los datos de IA),
      // estaríamos sobrescribiendo los datos guardados por /api/generate-document
      
      // Solo actualizar el estado del plan existente para reflejar los cambios
      try {
        const anio = new Date().getFullYear()
        const planResponse = await fetch(`/api/plan-anual?anio=${anio}`)
        if (planResponse.ok) {
          const planData = await planResponse.json()
          if (planData.planesAnuales && planData.planesAnuales.length > 0) {
            setPlanAnualExistente(planData.planesAnuales[0])
            console.log('✅ Plan anual actualizado en el estado local')
          }
        }
      } catch (error) {
        console.error('Error al actualizar estado del plan:', error)
        // No es crítico, solo actualizamos el estado local
      }
      
      alert('✅ Programación anual generada exitosamente')
    } catch (error) {
      console.error('Error al generar programación anual:', error)
      let errorMessage = 'Error al generar el documento'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      alert(`❌ ERROR: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadSituacionSignificativa = async () => {
    const unidad0 = unidades[0]
    
    // Validar todos los campos requeridos
    const camposRequeridos: { campo: string; valor: any; nombre: string }[] = [
      { campo: 'Área', valor: formData.area, nombre: 'area' },
      { campo: 'Grado', valor: formData.grado, nombre: 'grado' },
      { campo: 'Institución educativa', valor: formData.institucion, nombre: 'institucion' },
      { campo: 'Departamento', valor: formData.departamento, nombre: 'departamento' },
      { campo: 'Provincia', valor: formData.provincia, nombre: 'provincia' },
      { campo: 'Distrito', valor: formData.distrito, nombre: 'distrito' },
      { campo: 'Problema o potencialidad', valor: unidad0.problemaPotencialidad, nombre: 'problemaPotencialidad' },
      { campo: 'Producto', valor: unidad0.producto, nombre: 'producto' }
    ]
    
    const faltantes = camposRequeridos
      .filter(c => !c.valor || (typeof c.valor === 'string' && c.valor.trim() === ''))
      .map(c => c.campo)
    
    if (faltantes.length > 0) {
      setCamposFaltantes(faltantes)
      setShowModal(true)
      return
    }

    setDownloadingSituacion(true)
    const tiempoInicio = Date.now()
    console.log('⏱️ [FRONTEND] Iniciando descarga de situación significativa...')
    setProgreso('⏱️ Preparando prompt...')
    
    try {
      // Determinar el provider y modelo basado en la selección
      const provider = aiProvider === 'gemini' ? 'gemini' : 'openai'
      const modelo = aiProvider === 'gemini' ? undefined : aiProvider
      
      console.log(`⏱️ [FRONTEND] Enviando petición a la API (IA: ${provider}, Modelo: ${modelo || 'N/A'})...`)
      const response = await fetch('/api/generate-situacion-significativa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          unidadData: unidad0,
          formData: formData,
          aiProvider: provider, // Enviar el provider (gemini o openai)
          openaiModel: modelo, // Enviar el modelo específico (gpt-5.1 o gpt-5-mini)
        }),
      })

      const tiempoPeticion = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
      console.log(`⏱️ [FRONTEND] Petición enviada en ${tiempoPeticion}s`)
      setProgreso('Procesando con la IA... (esto puede tomar 10-15 segundos)')

      if (!response.ok) {
        const error = await response.json()
        const tiempoError = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
        console.error(`❌ [FRONTEND] Error después de ${tiempoError}s:`, error)
        setProgreso('❌ Error al generar el documento')
        throw new Error(error.error || 'Error al generar el documento')
      }

      const tiempoRespuesta = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
      console.log(`⏱️ [FRONTEND] Respuesta recibida en ${tiempoRespuesta}s`)
      setProgreso('Generando documento Word...')

      // Obtener el blob del documento
      const tiempoBlobInicio = Date.now()
      const blob = await response.blob()
      const tiempoBlob = ((Date.now() - tiempoBlobInicio) / 1000).toFixed(2)
      console.log(`⏱️ [FRONTEND] Blob recibido en ${tiempoBlob}s (Tamaño: ${(blob.size / 1024).toFixed(2)} KB)`)
      setProgreso('Preparando descarga...')
      
      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'SITUACION_SIGNIFICATIVA.docx'
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1]
        }
      }
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      const tiempoTotal = ((Date.now() - tiempoInicio) / 1000).toFixed(2)
      console.log(`✅ [FRONTEND] Descarga completada en ${tiempoTotal}s totales`)
      console.log(`📊 [FRONTEND] Resumen: Petición: ${tiempoPeticion}s | Respuesta: ${tiempoRespuesta}s | Blob: ${tiempoBlob}s | Total: ${tiempoTotal}s`)
      setProgreso('✅ Documento descargado exitosamente')
      
      // Limpiar el mensaje de progreso después de 3 segundos
      setTimeout(() => {
        setProgreso('')
      }, 3000)
    } catch (error) {
      console.error('❌ [FRONTEND] Error al descargar:', error)
      setProgreso('❌ Error al generar el documento')
      let errorMessage = 'Error al generar el documento'
      
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Mostrar alert con el error detallado
      alert(`❌ ERROR AL GENERAR DOCUMENTO\n\n${errorMessage}\n\nPor favor verifica tu configuración e intenta nuevamente.`)
    } finally {
      setDownloadingSituacion(false)
    }
  }

  const handleDownload = async () => {
    if (!formData.areaId || !formData.gradoId) {
      alert('Por favor completa los campos obligatorios (Área y Grado)')
      return
    }

    setDownloading(true)
    try {
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar el documento')
      }

      // Obtener el blob del documento
      const blob = await response.blob()
      
      // Crear un enlace temporal para descargar
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = 'PLANIFICACION_ANUAL.docx'
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1]
        }
      }
      
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error al descargar:', error)
      let errorMessage = 'Error al generar el documento'
      
      if (error instanceof Error) {
        errorMessage = error.message
        
        // Si hay detalles adicionales en el mensaje, mostrarlos
        if (error.message.includes('SOLUCIÓN:')) {
          // Mostrar un alert más detallado
          alert(errorMessage)
        } else {
          alert(errorMessage)
        }
      } else {
        alert(errorMessage)
      }
    } finally {
      setDownloading(false)
    }
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR PROGRAMACIÓN ANUAL</h1>
          <p className={styles.subtitle}>
            Genera tu programación anual completa en 2 fases
          </p>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${fase >= 1 ? styles.completed : ''}`}>
              Fase 1: Selección
            </div>
            <div className={`${styles.progressSegment} ${fase >= 2 ? styles.active : ''}`}>
              Fase 2: Personalización
            </div>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 1: Selección Personalizada</h2>
              <p className={styles.phaseDescription}>
                Define el contexto educativo para que la IA genere una planificación alineada a tu realidad.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="area">Área <span className={styles.required}>*</span></label>
                  <select
                    id="area"
                    value={formData.areaId}
                    onChange={(e) => {
                      const selectedArea = areas.find(a => a.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        area: selectedArea?.descripcion || '', 
                        areaId: e.target.value 
                      })
                    }}
                    className={styles.select}
                    required
                    disabled={loadingData}
                  >
                    <option value="">Selecciona un área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="grado">Grado <span className={styles.required}>*</span></label>
                  <select
                    id="grado"
                    value={formData.gradoId}
                    onChange={(e) => {
                      const selectedGrado = grados.find(g => g.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        grado: selectedGrado?.descripcion || '', 
                        gradoId: e.target.value 
                      })
                    }}
                    className={styles.select}
                    required
                    disabled={loadingData}
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
                  <label htmlFor="institucion">Nombre de la Institución Educativa (I.E) (Opcional)</label>
                  <input
                    id="institucion"
                    type="text"
                    value={formData.institucion}
                    onChange={(e) => setFormData({ ...formData, institucion: e.target.value })}
                    className={styles.input}
                    placeholder="Nombre de tu I.E."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="docente">Nombre del docente (Opcional)</label>
                  <input
                    id="docente"
                    type="text"
                    value={formData.docente}
                    onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                    className={styles.input}
                    placeholder="Tu nombre"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="dre">DRE (Opcional)</label>
                  <input
                    id="dre"
                    type="text"
                    value={formData.dre}
                    onChange={(e) => setFormData({ ...formData, dre: e.target.value })}
                    className={styles.input}
                    placeholder="Dirección Regional de Educación"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="ugel">UGEL (Opcional)</label>
                  <input
                    id="ugel"
                    type="text"
                    value={formData.ugel}
                    onChange={(e) => setFormData({ ...formData, ugel: e.target.value })}
                    className={styles.input}
                    placeholder="Unidad de Gestión Educativa Local"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="director">Director (Opcional)</label>
                  <input
                    id="director"
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className={styles.input}
                    placeholder="Nombre del director"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="coordinador">Coordinador(a) (Opcional)</label>
                  <input
                    id="coordinador"
                    type="text"
                    value={formData.coordinador}
                    onChange={(e) => setFormData({ ...formData, coordinador: e.target.value })}
                    className={styles.input}
                    placeholder="Nombre del coordinador"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="nivel">Nivel (Opcional)</label>
                  <select
                    id="nivel"
                    value={formData.nivelId}
                    onChange={(e) => {
                      const selectedNivel = niveles.find(n => n.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        nivel: selectedNivel?.descripcion || '', 
                        nivelId: e.target.value 
                      })
                    }}
                    className={styles.select}
                    disabled={loadingData}
                  >
                    <option value="">Selecciona un nivel</option>
                    {niveles.map(nivel => (
                      <option key={nivel.id} value={nivel.id}>{nivel.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="departamento">Departamento (Opcional)</label>
                  <select
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => handleDepartamentoChange(e.target.value)}
                    className={styles.select}
                  >
                    <option value="">Selecciona un departamento</option>
                    {getDepartamentos().map(depto => (
                      <option key={depto} value={depto}>{depto}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="provincia">Provincia (Opcional)</label>
                  <select
                    id="provincia"
                    value={formData.provincia}
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                    className={styles.select}
                    disabled={!formData.departamento}
                  >
                    <option value="">Selecciona una provincia</option>
                    {provinciasDisponibles.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="distrito">Distrito (Opcional)</label>
                  <select
                    id="distrito"
                    value={formData.distrito}
                    onChange={(e) => setFormData({ ...formData, distrito: e.target.value })}
                    className={styles.select}
                    disabled={!formData.provincia}
                  >
                    <option value="">Selecciona un distrito</option>
                    {distritosDisponibles.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={handleDownload}
                  className={styles.buttonDownload}
                  disabled={downloading || !formData.areaId || !formData.gradoId}
                >
                  {downloading ? 'Generando documento...' : '📥 Descargar Plantilla'}
                </button>
                <button type="submit" className={styles.button}>Continuar a Fase 2</button>
              </div>
            </form>
          )}

          {fase === 2 && (
            <form onSubmit={handleFinalSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Personaliza tu material</h2>
              <p className={styles.phaseDescription}>
                Define las unidades que compondrán tu programación anual. Puedes escribir tus ideas o dejar que la IA las proponga.
              </p>

              <div className={styles.unidadesContainer}>
                {unidades.map((unidad, index) => (
                  <div key={index} className={styles.unidadCard}>
                    <h3 className={styles.unidadTitle}>
                      {index === 0 ? 'UNIDAD 0' : `UNIDAD ${index}`}
                    </h3>

                    <div className={styles.formGroup}>
                      <label htmlFor={`problema-${index}`}>Problema o potencialidad</label>
                      <input
                        id={`problema-${index}`}
                        type="text"
                        value={unidad.problemaPotencialidad}
                        onChange={(e) => handleUnidadChange(index, 'problemaPotencialidad', e.target.value)}
                        className={styles.input}
                        placeholder="Describe el problema o potencialidad"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor={`producto-${index}`}>Producto</label>
                      <input
                        id={`producto-${index}`}
                        type="text"
                        value={unidad.producto}
                        onChange={(e) => handleUnidadChange(index, 'producto', e.target.value)}
                        className={styles.input}
                        placeholder="Ej: Mural informativo, presentación oral, prototipo"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        <input
                          type="checkbox"
                          checked={unidad.tieneTituloIA}
                          onChange={(e) => handleUnidadChange(index, 'tieneTituloIA', e.target.checked)}
                          className={styles.checkbox}
                        />
                        La IA generará el título de la unidad didáctica
                      </label>
                      {!unidad.tieneTituloIA && (
                        <input
                          type="text"
                          value={unidad.tituloUnidad}
                          onChange={(e) => handleUnidadChange(index, 'tituloUnidad', e.target.value)}
                          className={styles.input}
                          placeholder="Título de la unidad didáctica"
                        />
                      )}
                      {unidad.tieneTituloIA && (
                        <p className={styles.helpText}>El título será generado automáticamente por la IA</p>
                      )}
                    </div>

                    {/* Selección de Competencias y Desempeños */}
                    <div className={styles.formGroup} style={{ borderTop: '2px solid #e0e0e0', paddingTop: '20px', marginTop: '20px' }}>
                      <h4 style={{ marginBottom: '15px', color: '#0066cc', fontSize: '16px' }}>Competencias y Desempeños</h4>
                      
                      <button
                        type="button"
                        onClick={() => abrirModalCompetencias(index)}
                        className={styles.button}
                        style={{ marginBottom: '15px', width: '100%' }}
                        disabled={competencias.length === 0}
                      >
                        {unidad.competenciaSeleccionada || unidad.desempeniosSeleccionados.length > 0 
                          ? '✏️ Editar Competencias y Desempeños' 
                          : '➕ Seleccionar Competencias y Desempeños'}
                      </button>
                      
                      {/* Mostrar competencias seleccionadas */}
                      {(unidad.competenciasSeleccionadas?.length > 0 || unidad.competenciaSeleccionada) && (
                        <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <strong style={{ color: '#1e40af', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                            Competencia{unidad.competenciasSeleccionadas?.length > 1 ? 's' : ''} seleccionada{unidad.competenciasSeleccionadas?.length > 1 ? 's' : ''}:
                            {unidad.competenciasSeleccionadas?.length > 0 && (
                              <span style={{ marginLeft: '8px', color: '#3b82f6', fontWeight: 600 }}>
                                ({unidad.competenciasSeleccionadas.length})
                              </span>
                            )}
                          </strong>
                          {unidad.competenciasSeleccionadas?.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                              {unidad.competenciasSeleccionadas.map(id => {
                                const competencia = competencias.find(c => c.id.toString() === id)
                                return competencia ? (
                                  <li key={id} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                    <span style={{ flex: 1 }}>{competencia.descripcion}</span>
                                    <button
                                      type="button"
                                      onClick={() => eliminarCompetencia(index, id)}
                                      style={{
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '50%',
                                        width: '20px',
                                        height: '20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        padding: 0,
                                        flexShrink: 0,
                                        transition: 'background-color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                      title="Eliminar competencia"
                                    >
                                      ×
                                    </button>
                                  </li>
                                ) : null
                              })}
                            </ul>
                          ) : unidad.competenciaSeleccionada ? (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                              <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.5', flex: 1 }}>
                                {competencias.find(c => c.id.toString() === unidad.competenciaSeleccionada)?.descripcion || 'Competencia no encontrada'}
                              </p>
                              <button
                                type="button"
                                onClick={() => eliminarCompetencia(index, unidad.competenciaSeleccionada)}
                                style={{
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '20px',
                                  height: '20px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 'bold',
                                  padding: 0,
                                  flexShrink: 0,
                                  transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                title="Eliminar competencia"
                              >
                                ×
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                      
                      {/* Mostrar desempeños seleccionados */}
                      {unidad.desempeniosSeleccionados.length > 0 && (
                        <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', border: '1px solid #86efac' }}>
                          <strong style={{ color: '#166534', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
                            Desempeños seleccionados ({unidad.desempeniosSeleccionados.length}/4):
                          </strong>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6' }}>
                            {unidad.desempeniosSeleccionados.map(id => {
                              const desempenio = todosLosDesempeniosPorUnidad[index]?.find(d => d.id.toString() === id)
                              const capacidad = desempenio ? capacidadesPorUnidad[index]?.find(c => c.id === desempenio.idcapacidad) : null
                              return desempenio ? (
                                <li key={id} style={{ marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                                  <span style={{ flex: 1 }}>
                                    <strong style={{ color: '#3b82f6' }}>
                                      {capacidad ? `[${capacidad.descripcion}] ` : ''}
                                    </strong>
                                    {desempenio.descripcion}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => eliminarDesempenio(index, id)}
                                    style={{
                                      background: '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '20px',
                                      height: '20px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      padding: 0,
                                      flexShrink: 0,
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                                    title="Eliminar desempeño"
                                  >
                                    ×
                                  </button>
                                </li>
                              ) : null
                            })}
                          </ul>
                        </div>
                      )}
                      
                      {(!unidad.competenciasSeleccionadas?.length && !unidad.competenciaSeleccionada) && unidad.desempeniosSeleccionados.length === 0 && (
                        <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
                          Haz clic en el botón arriba para seleccionar competencias y desempeños
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

        

              <div style={{ 
                padding: '15px', 
                backgroundColor: '#eff6ff', 
                borderRadius: '8px', 
                border: '2px solid #3b82f6',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, color: '#1e40af', fontWeight: 600, fontSize: '14px' }}>
                  📋 <strong>Generar Programación Anual Completa:</strong> Este botón generará el documento Word completo con:
                </p>
                <ul style={{ margin: '10px 0 0 20px', color: '#1e40af', fontSize: '13px' }}>
                  <li>✅ Situación Significativa (si ya la generaste)</li>
                  <li>✅ Campo Temático (generado automáticamente con IA usando los desempeños seleccionados)</li>
                  <li>✅ Competencias (obtenidas de la base de datos)</li>
                  <li>✅ Producto (el que ingresaste)</li>
                </ul>
                <p style={{ margin: '10px 0 0 0', color: '#dc2626', fontWeight: 600, fontSize: '12px' }}>
                  ⚠️ Asegúrate de haber seleccionado al menos una competencia y desempeños en la UNIDAD 0 antes de generar.
                </p>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(1)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 1
                </button>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Generando Programación Anual Completa...' : '🚀 Generar mi PROGRAMACIÓN ANUAL con IA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Modal de campos faltantes */}
      {showModal && (
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
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: '16px',
              color: '#ef4444',
              fontSize: '20px',
              fontWeight: 600
            }}>
              ⚠️ Campos Requeridos Faltantes
            </h2>
            <p style={{
              marginBottom: '16px',
              color: '#666',
              fontSize: '14px'
            }}>
              Por favor completa los siguientes campos antes de generar el documento:
            </p>
            <ul style={{
              marginBottom: '20px',
              paddingLeft: '20px',
              color: '#333'
            }}>
              {camposFaltantes.map((campo, index) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  <strong>{campo}</strong>
                </li>
              ))}
            </ul>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de Competencias y Desempeños */}
      {showModalCompetencias && unidadModalIndex !== null && (
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
          if (e.target === e.currentTarget) cerrarModalCompetencias()
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
              Seleccionar Competencias y Desempeños - {unidadModalIndex === 0 ? 'UNIDAD 0' : `UNIDAD ${unidadModalIndex}`}
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
                  Selecciona área, grado y nivel en la Fase 1 para ver competencias
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

            {/* Conocimientos */}
            {competenciasSeleccionadasModal.length > 0 && (
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, fontSize: '16px' }}>
                  Conocimientos (Capacidades) <span className={styles.required}>*</span>
                  {conocimientosSeleccionadosModal.length > 0 && (
                    <span style={{ marginLeft: '10px', color: '#3b82f6', fontWeight: 600 }}>
                      ({conocimientosSeleccionadosModal.length} seleccionado{conocimientosSeleccionadosModal.length > 1 ? 's' : ''})
                    </span>
                  )}
                </label>
                {loadingCapacidadesModal ? (
                  <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic' }}>Cargando conocimientos...</p>
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
                      const isSelected = conocimientosSeleccionadosModal.includes(capacidad.id.toString())
                      // Encontrar la competencia a la que pertenece esta capacidad
                      const competenciaId = capacidad.idcompetencia?.toString()
                      // Buscar el índice de la competencia en el array completo de competencias
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
                            onChange={(e) => handleConocimientoChangeModal(capacidad.id.toString(), e.target.checked)}
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
                    No se encontraron conocimientos para las competencias seleccionadas
                  </p>
                )}
              </div>
            )}

            {/* Desempeños */}
            {conocimientosSeleccionadosModal.length > 0 && (
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
                      
                      // Encontrar la competencia a la que pertenece este desempeño (a través de su capacidad)
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
                    No hay desempeños disponibles para los conocimientos seleccionados
                  </p>
                )}
                <p className={styles.helpText} style={{ marginTop: '8px', fontSize: '12px' }}>
                  Máximo 4 desempeños. Puedes seleccionar desempeños de diferentes conocimientos.
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
                onClick={cerrarModalCompetencias}
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
                onClick={guardarSeleccionModal}
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

      {/* Modal para plan anual existente */}
      {showModalPlanExistente && planAnualExistente && (
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
          if (e.target === e.currentTarget) {
            setShowModalPlanExistente(false)
          }
        }}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '30px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '20px', 
              color: '#0066cc', 
              fontSize: '24px',
              fontWeight: 600
            }}>
              Plan Anual Existente Detectado
            </h2>
            
            <p style={{
              marginBottom: '20px',
              color: '#666',
              fontSize: '16px',
              lineHeight: '1.6'
            }}>
              Ya existe un plan anual para el año <strong>{new Date().getFullYear()}</strong> guardado en la base de datos.
            </p>
            
            <div style={{
              backgroundColor: '#f0f9ff',
              padding: '15px',
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid #bfdbfe'
            }}>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
                <strong>¿Qué deseas hacer?</strong>
              </p>
              <ul style={{ margin: '10px 0 0 20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
                <li><strong>Regenerar todo:</strong> Generará todas las unidades nuevamente con IA (usará más tokens)</li>
                <li><strong>Actualizar solo lo que falta:</strong> Usará los datos ya generados y solo generará las unidades nuevas o modificadas (optimiza tokens)</li>
              </ul>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '30px'
            }}>
              <button
                onClick={() => {
                  setShowModalPlanExistente(false)
                  setFase(1)
                }}
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
                onClick={() => handleElegirModoGeneracion('regenerar')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                🔄 Regenerar Todo
              </button>
              <button
                onClick={() => handleElegirModoGeneracion('actualizar')}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#22c55e'}
              >
                ⚡ Actualizar Solo lo que Falta
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

