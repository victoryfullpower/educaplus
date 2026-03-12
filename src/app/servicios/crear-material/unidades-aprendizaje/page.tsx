'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import styles from './unidades-aprendizaje.module.css'

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

export default function UnidadesAprendizajePage() {
  const [fase, setFase] = useState(1)
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
  const [loading, setLoading] = useState(false)
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
            
            if (unidadGuardada) {
              console.log('📦 Cargando unidad de aprendizaje guardada:', unidadGuardada)
              
              // Setear todos los datos del formData
              setFormData(prev => ({
                ...prev,
                // Datos básicos
                area: unidadGuardada.area || prev.area,
                areaId: unidadGuardada.areaId || prev.areaId,
                grado: unidadGuardada.grado || prev.grado,
                gradoId: unidadGuardada.gradoId || prev.gradoId,
                ciclo: unidadGuardada.ciclo || prev.ciclo,
                cicloId: unidadGuardada.cicloId || prev.cicloId,
                unidad: unidadGuardada.unidad || prev.unidad,
                // Datos institucionales
                institucion: unidadGuardada.institucion || prev.institucion,
                tipoIE: unidadGuardada.tipoIE || prev.tipoIE,
                director: unidadGuardada.director || prev.director,
                docente: unidadGuardada.docente || prev.docente,
                duracion: unidadGuardada.duracion || prev.duracion,
                // Datos temporales
                fechaInicio: unidadGuardada.fechaInicio || prev.fechaInicio,
                fechaTermino: unidadGuardada.fechaTermino || prev.fechaTermino,
                // Datos de contenido
                situacionSignificativa: unidadGuardada.situacionSignificativa || prev.situacionSignificativa,
                producto: unidadGuardada.producto || prev.producto,
                propositoUnidad: unidadGuardada.propositoUnidad || prev.propositoUnidad,
                competencias: Array.isArray(unidadGuardada.competencias) ? unidadGuardada.competencias : prev.competencias,
                campoTematico: unidadGuardada.campoTematico || prev.campoTematico,
                numeroSesiones: unidadGuardada.numeroSesiones || prev.numeroSesiones,
                instrumentoEvaluacion: unidadGuardada.instrumentoEvaluacion || prev.instrumentoEvaluacion,
                // Sesiones
                sesiones: Array.isArray(unidadGuardada.sesiones) ? unidadGuardada.sesiones : prev.sesiones
              }))
              
              // También actualizar datos desde plan anual si hay título
              if (unidadGuardada.tituloUnidad) {
                setDatosDesdePlanAnual({
                  situacionSignificativa: unidadGuardada.situacionSignificativa,
                  producto: unidadGuardada.producto,
                  tituloUnidad: unidadGuardada.tituloUnidad
                })
              }
              
              return // Salir temprano si encontramos datos guardados
            }
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
  }, [formData.unidad, formData.areaId, formData.gradoId])

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
    const semanasMatch = formData.duracion.match(/(\d+)\s*semana/)
    if (!semanasMatch) {
      setFormData(prev => {
        if (prev.sesiones.length === 0) return prev
        return { ...prev, sesiones: [] }
      })
      return
    }

    const semanas = parseInt(semanasMatch[1], 10)
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

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.unidad && formData.areaId && formData.gradoId && formData.duracion && formData.fechaInicio && formData.fechaTermino) {
      setFase(2)
    }
  }

  const handleFase2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFase(3)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔵 [MODAL] handleFinalSubmit llamado')
    console.log('🔵 [MODAL] formData:', { unidad: formData.unidad, areaId: formData.areaId, gradoId: formData.gradoId })

    // Verificar si hay datos guardados antes de mostrar el modal
    try {
      if (formData.unidad && formData.areaId && formData.gradoId) {
        const anio = formData.anio || new Date().getFullYear()
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

  const generarDocumento = async (forzarRegeneracion: boolean) => {
    setShowModalGeneracion(false)
    setLoading(true)
    
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
      
      // Crear un enlace de descarga
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.style.display = 'none'
      
      // Obtener el nombre del archivo del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition')
      let fileName = `unidad_${formData.unidad || '0'}_${Date.now()}.docx`
      if (contentDisposition) {
        // Intentar extraer el nombre del archivo de diferentes formatos
        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (matches && matches[1]) {
          fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''))
        } else {
          // Intentar otro formato
          const matches2 = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/i)
          if (matches2 && matches2[1]) {
            fileName = decodeURIComponent(matches2[1])
          }
        }
      }
      
      console.log('💾 Nombre del archivo:', fileName)
      
      a.download = fileName
      document.body.appendChild(a)
      
      // Forzar el click
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
      
      // También intentar con click() tradicional
      setTimeout(() => {
        a.click()
      }, 10)
      
      // Limpiar después de un delay más largo para asegurar que la descarga inicie
      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        if (document.body.contains(a)) {
          document.body.removeChild(a)
        }
      }, 200)
      
      console.log('✅ Descarga iniciada')
    } catch (error: any) {
      console.error('❌ Error al generar el documento:', error)
      alert(`Error al generar el documento: ${error.message || 'Error desconocido'}`)
    } finally {
      setLoading(false)
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
            Crea unidades de aprendizaje personalizadas en 3 fases
          </p>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${fase >= 1 ? styles.completed : ''}`}>
              Fase 1
            </div>
            <div className={`${styles.progressSegment} ${fase >= 2 ? (fase === 2 ? styles.active : styles.completed) : ''}`}>
              Fase 2
            </div>
            <div className={`${styles.progressSegment} ${fase >= 3 ? styles.active : ''}`}>
              Fase 3
            </div>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 1: Personaliza tu Unidad</h2>
              <p className={styles.phaseDescription}>
                Define el contexto básico para que la IA genere materiales alineados a tu realidad.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="unidad">Unidad <span className={styles.required}>*</span></label>
                  <select
                    id="unidad"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className={styles.select}
                    required
                  >
                    <option value="">Selecciona una unidad</option>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                      <option key={num} value={num}>Unidad {num}</option>
                    ))}
                  </select>
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
                  <label htmlFor="ciclo">Ciclo</label>
                  <select
                    id="ciclo"
                    value={formData.cicloId}
                    className={styles.select}
                    disabled={!formData.gradoId || loadingData}
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
                    className={styles.input}
                    placeholder="Nombre de tu I.E."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="tipoIE">Tipo de I.E.</label>
                  <select
                    id="tipoIE"
                    value={formData.tipoIE}
                    onChange={(e) => setFormData({ ...formData, tipoIE: e.target.value })}
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
                    className={styles.input}
                    placeholder="Nombre del director"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="docente">Nombre del docente</label>
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
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fechaTermino">Fecha de Término <span className={styles.required}>*</span></label>
                  <input
                    id="fechaTermino"
                    type="date"
                    value={formData.fechaTermino}
                    onChange={(e) => setFormData({ ...formData, fechaTermino: e.target.value })}
                    className={styles.input}
                    required
                    min={formData.fechaInicio}
                  />
                </div>
              </div>

              <button type="submit" className={styles.button}>Continuar a Fase 2</button>
            </form>
          )}

          {fase === 2 && (
            <form onSubmit={handleFase2Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Define tu unidad de aprendizaje</h2>
              <p className={styles.phaseDescription}>
                Aquí decides qué aportar o qué dejar en manos de la IA.
              </p>

              {formData.unidad && formData.area && (
                <div className={styles.formGroup}>
                  <label>Título de la Unidad</label>
                  <div className={styles.unidadTitle}>
                    <strong>
                      {datosDesdePlanAnual.tituloUnidad 
                        ? datosDesdePlanAnual.tituloUnidad 
                        : `Unidad ${formData.unidad}: ${formData.area}`}
                    </strong>
                  </div>
                </div>
              )}

              <div className={styles.formGroup}>
                <label htmlFor="situacion">Situación Significativa</label>
                {loadingDatosUnidad ? (
                  <p className={styles.helpText}>Cargando datos del plan anual...</p>
                ) : datosDesdePlanAnual.situacionSignificativa ? (
                  <>
                    <textarea
                      id="situacion"
                      value={formData.situacionSignificativa}
                      readOnly
                      disabled
                      className={styles.input}
                      rows={6}
                      style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                    />
                    <p className={styles.helpText}>
                      ✓ Datos cargados desde el plan anual ({formData.situacionSignificativa.length} caracteres)
                    </p>
                  </>
                ) : (
                  <textarea
                    id="situacion"
                    value={formData.situacionSignificativa}
                    onChange={(e) => setFormData({ ...formData, situacionSignificativa: e.target.value })}
                    className={styles.input}
                    placeholder="Título de la situación significativa (opcional - la IA lo genera si no lo escribes)"
                    rows={4}
                  />
                )}
              </div>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.generarPropositoIA}
                    onChange={(e) => setFormData({ ...formData, generarPropositoIA: e.target.checked })}
                    className={styles.checkbox}
                  />
                  Generarlo con IA
                </label>
                <label htmlFor="proposito">Propósito de la unidad</label>
                <textarea
                  id="proposito"
                  value={formData.propositoUnidad}
                  onChange={(e) => setFormData({ ...formData, propositoUnidad: e.target.value })}
                  className={styles.input}
                  placeholder="Propósito de la unidad"
                  rows={4}
                  disabled={formData.generarPropositoIA}
                  style={formData.generarPropositoIA ? { opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#f5f5f5' } : {}}
                />
                {formData.generarPropositoIA && (
                  <p className={styles.helpText}>Este campo será generado automáticamente por la IA</p>
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="producto">Producto Final Esperado (Opcional)</label>
                {loadingDatosUnidad ? (
                  <p className={styles.helpText}>Cargando datos del plan anual...</p>
                ) : datosDesdePlanAnual.producto ? (
                  <>
                    <textarea
                      id="producto"
                      value={formData.producto}
                      readOnly
                      disabled
                      className={styles.input}
                      rows={4}
                      style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                    />
                    <p className={styles.helpText}>
                      ✓ Datos cargados desde el plan anual ({formData.producto.length} caracteres)
                    </p>
                  </>
                ) : (
                  <>
                    <textarea
                      id="producto"
                      value={formData.producto}
                      onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                      className={styles.input}
                      placeholder="Ej: Mural informativo, presentación oral, prototipo"
                      rows={3}
                    />
                    <p className={styles.helpText}>Si no se llena, la IA lo propone.</p>
                  </>
                )}
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(1)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 1
                </button>
                <button type="submit" className={styles.button}>Continuar a Fase 3</button>
              </div>
            </form>
          )}

          {fase === 3 && (
            <form onSubmit={handleFinalSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 3: Detalles técnicos y pedagógicos</h2>
              <p className={styles.phaseDescription}>
                Define los elementos curriculares clave para que la IA genere una unidad completa y coherente.
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="productoUnidad">Producto Unidad</label>
                {loadingDatosUnidad ? (
                  <p className={styles.helpText}>Cargando datos del plan anual...</p>
                ) : datosDesdePlanAnual.producto ? (
                  <>
                    <textarea
                      id="productoUnidad"
                      value={formData.producto}
                      readOnly
                      disabled
                      className={styles.input}
                      rows={6}
                      style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#f5f5f5' }}
                    />
                    <p className={styles.helpText}>
                      ✓ Datos cargados desde el plan anual ({formData.producto.length} caracteres)
                    </p>
                  </>
                ) : (
                  <textarea
                    id="productoUnidad"
                    value={formData.producto}
                    onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                    className={styles.input}
                    placeholder="Describe el producto de la unidad (opcional)"
                    rows={4}
                  />
                )}
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(2)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 2
                </button>
                <button 
                  type="button" 
                  onClick={handleGeneratePromptWord} 
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'Prompt dinámico'}
                </button>
                <button 
                  type="button" 
                  onClick={handleGeneratePrompt} 
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'Generar texto por prompt'}
                </button>
                <button 
                  type="button" 
                  onClick={handleGeneratePromptEnfoques} 
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'Prompt dinámico enfoques'}
                </button>
                <button 
                  type="button" 
                  onClick={handleGenerateEnfoquesIA} 
                  className={styles.buttonSecondary}
                  disabled={loading}
                >
                  {loading ? 'Generando...' : 'IA genera enfoque'}
                </button>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Generando...' : 'Generar mi unidad con IA'}
                </button>
              </div>
            </form>
          )}
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
    </>
  )
}

