'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import styles from './sesiones-fichas.module.css'

interface Area {
  id: number
  descripcion: string
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
  competencia?: {
    id: number
    descripcion: string
  }
  estandar?: {
    id: number
    descripcion: string
  }
}

interface Desempenio {
  id: number
  descripcion: string
  idcapacidad: number
  capacidad?: {
    id: number
    descripcion: string
    competencia?: {
      id: number
      descripcion: string
    }
  }
}

export default function SesionesFichasPage() {
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
    director: '',
    docente: '',
    duracion: '',
    fecha: '',
    competenciaSeleccionada: '',
    capacidadSeleccionada: '',
    desempeniosSeleccionados: [] as string[],
    tituloSesion: '',
    continuarUnidad: false,
    sesionSeleccionada: ''
  })
  const [sesionesGuardadas, setSesionesGuardadas] = useState<Array<{
    titulo: string
    campoTematico?: string
    competenciasSeleccionadas: string[]
    capacidadesSeleccionadas: string[]
    desempeniosSeleccionados: string[]
    evidencias?: string
    criterios?: string
    instrumentoEvaluacion: string
  }>>([])
  const [loadingSesiones, setLoadingSesiones] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [loadingRespuestaPrompt, setLoadingRespuestaPrompt] = useState(false)
  const [tipoGenerar, setTipoGenerar] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  const [grados, setGrados] = useState<Grado[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [capacidades, setCapacidades] = useState<Capacidad[]>([])
  const [desempenios, setDesempenios] = useState<Desempenio[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingCapacidades, setLoadingCapacidades] = useState(false)
  const [loadingDesempenios, setLoadingDesempenios] = useState(false)
  const [tableTextFromPrompt, setTableTextFromPrompt] = useState<string>('')
  const [showModalGeneracion, setShowModalGeneracion] = useState(false)
  const [contenidoGuardado, setContenidoGuardado] = useState<{
    motivacion: string
    saberes: string
    problematizacion: string
    proposito: string
    desarrollo: string
    desarrolloantes: string
    desarrollodurante: string
    desarrollodespues: string
  } | null>(null)

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

  // Cargar competencias cuando cambien área y grado
  useEffect(() => {
    const loadCompetencias = async () => {
      if (formData.areaId && formData.gradoId) {
        try {
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

  // Estado para almacenar todos los desempeños disponibles (de todas las capacidades)
  const [todosLosDesempenios, setTodosLosDesempenios] = useState<Desempenio[]>([])

  // Cargar capacidades cuando se seleccione una competencia
  useEffect(() => {
    const loadCapacidades = async () => {
      if (formData.competenciaSeleccionada) {
        try {
          setLoadingCapacidades(true)
          const response = await fetch(
            `/api/competencias/capacidades?idcompetencia=${formData.competenciaSeleccionada}`
          )
          const data = await response.json()
          setCapacidades(data)
          // Limpiar capacidad seleccionada al cambiar competencia, pero mantener desempeños si no se ha alcanzado el límite
          setFormData(prev => ({ 
            ...prev, 
            capacidadSeleccionada: ''
          }))
          setDesempenios([])
          setTodosLosDesempenios([])
        } catch (error) {
          console.error('Error al cargar capacidades:', error)
          setCapacidades([])
        } finally {
          setLoadingCapacidades(false)
        }
      } else {
        setCapacidades([])
        setDesempenios([])
        setTodosLosDesempenios([])
      }
    }

    loadCapacidades()
  }, [formData.competenciaSeleccionada])

  // Cargar desempeños cuando se seleccione una capacidad y agregarlos a la lista total
  useEffect(() => {
    const loadDesempenios = async () => {
      if (formData.capacidadSeleccionada) {
        try {
          setLoadingDesempenios(true)
          const response = await fetch(
            `/api/competencias/desempenios?idcapacidad=${formData.capacidadSeleccionada}`
          )
          const data = await response.json()
          setDesempenios(data)
          
          // Agregar estos desempeños a la lista total (evitando duplicados)
          setTodosLosDesempenios(prev => {
            const nuevosIds = data.map((d: Desempenio) => d.id)
            const sinDuplicados = prev.filter(d => !nuevosIds.includes(d.id))
            return [...sinDuplicados, ...data]
          })
        } catch (error) {
          console.error('Error al cargar desempeños:', error)
          setDesempenios([])
        } finally {
          setLoadingDesempenios(false)
        }
      }
    }

    loadDesempenios()
  }, [formData.capacidadSeleccionada])

  // Cargar sesiones guardadas cuando se seleccione área, grado y unidad
  useEffect(() => {
    const loadSesionesGuardadas = async () => {
      if (formData.continuarUnidad && formData.areaId && formData.gradoId && formData.unidad) {
        try {
          setLoadingSesiones(true)
          const anio = new Date().getFullYear()
          
          const response = await fetch(
            `/api/unidad-aprendizaje?anio=${anio}&areaId=${formData.areaId}&gradoId=${formData.gradoId}&unidad=${formData.unidad}`
          )
          
          if (response.ok) {
            const data = await response.json()
            
            let unidadData = null
            
            if (data && Array.isArray(data.unidadesAprendizaje) && data.unidadesAprendizaje.length > 0) {
              unidadData = data.unidadesAprendizaje[0]
            } else if (data && data.id) {
              unidadData = data
            }
            
            if (unidadData && unidadData.sesiones && Array.isArray(unidadData.sesiones)) {
              // Filtrar sesiones que tengan datos válidos
              const sesionesConDatos = unidadData.sesiones.filter((s: any) => 
                s && (s.titulo || (Array.isArray(s.competenciasSeleccionadas) && s.competenciasSeleccionadas.length > 0))
              )
              setSesionesGuardadas(sesionesConDatos)
            } else {
              setSesionesGuardadas([])
            }
          } else {
            setSesionesGuardadas([])
          }
        } catch (error) {
          console.error('Error al cargar sesiones guardadas:', error)
          setSesionesGuardadas([])
        } finally {
          setLoadingSesiones(false)
        }
      } else {
        setSesionesGuardadas([])
      }
    }

    loadSesionesGuardadas()
  }, [formData.continuarUnidad, formData.areaId, formData.gradoId, formData.unidad])

  // Cargar datos de la sesión seleccionada
  useEffect(() => {
    if (formData.continuarUnidad && formData.sesionSeleccionada && sesionesGuardadas.length > 0) {
      const sesionIndex = parseInt(formData.sesionSeleccionada, 10)
      const sesion = sesionesGuardadas[sesionIndex]
      
      if (sesion) {
        // Las sesiones guardadas tienen descripciones, no IDs
        // Necesitamos buscar los IDs correspondientes a las descripciones
        const buscarIdCompetencia = async (descripcionCompetencia: string) => {
          if (!descripcionCompetencia || !formData.areaId || !formData.gradoId) return ''
          
          try {
            const response = await fetch(
              `/api/competencias/competencias?idarea=${formData.areaId}&idgrado=${formData.gradoId}`
            )
            const competenciasData = await response.json()
            const competenciaEncontrada = competenciasData.find((c: Competencia) => 
              c.descripcion === descripcionCompetencia || c.descripcion.includes(descripcionCompetencia) || descripcionCompetencia.includes(c.descripcion)
            )
            return competenciaEncontrada ? competenciaEncontrada.id.toString() : ''
          } catch (error) {
            console.error('[SESIONES] Error al buscar competencia:', error)
            return ''
          }
        }
        
        const buscarIdCapacidad = async (descripcionCapacidad: string, idcompetencia: string) => {
          if (!descripcionCapacidad || !idcompetencia) return ''
          
          try {
            const response = await fetch(
              `/api/competencias/capacidades?idcompetencia=${idcompetencia}`
            )
            const capacidadesData = await response.json()
            const capacidadEncontrada = capacidadesData.find((c: Capacidad) => 
              c.descripcion === descripcionCapacidad || c.descripcion.includes(descripcionCapacidad) || descripcionCapacidad.includes(c.descripcion)
            )
            return capacidadEncontrada ? capacidadEncontrada.id.toString() : ''
          } catch (error) {
            console.error('[SESIONES] Error al buscar capacidad:', error)
            return ''
          }
        }
        
        const buscarIdsDesempenios = async (descripcionesDesempenios: string[], idcapacidad: string) => {
          if (!descripcionesDesempenios || descripcionesDesempenios.length === 0 || !idcapacidad) return []
          
          try {
            const response = await fetch(
              `/api/competencias/desempenios?idcapacidad=${idcapacidad}`
            )
            const desempeniosData = await response.json()
            const idsEncontrados: string[] = []
            
            descripcionesDesempenios.forEach((desc: string) => {
              const desempenioEncontrado = desempeniosData.find((d: Desempenio) => 
                d.descripcion === desc || d.descripcion.includes(desc) || desc.includes(d.descripcion)
              )
              if (desempenioEncontrado) {
                idsEncontrados.push(desempenioEncontrado.id.toString())
              }
            })
            
            return idsEncontrados
          } catch (error) {
            console.error('[SESIONES] Error al buscar desempeños:', error)
            return []
          }
        }
        
        // Cargar los datos de la sesión seleccionada
        const cargarDatosSesion = async () => {
          const primeraCompetencia = sesion.competenciasSeleccionadas && sesion.competenciasSeleccionadas.length > 0 
            ? sesion.competenciasSeleccionadas[0] 
            : ''
          
          const primeraCapacidad = sesion.capacidadesSeleccionadas && sesion.capacidadesSeleccionadas.length > 0
            ? sesion.capacidadesSeleccionadas[0]
            : ''
          
          // Buscar IDs
          const idCompetencia = await buscarIdCompetencia(primeraCompetencia)
          const idCapacidad = idCompetencia ? await buscarIdCapacidad(primeraCapacidad, idCompetencia) : ''
          const idsDesempenios = idCapacidad && sesion.desempeniosSeleccionados 
            ? await buscarIdsDesempenios(sesion.desempeniosSeleccionados, idCapacidad)
            : []
          
          setFormData(prev => ({
            ...prev,
            tituloSesion: sesion.titulo || '',
            competenciaSeleccionada: idCompetencia,
            capacidadSeleccionada: idCapacidad,
            desempeniosSeleccionados: idsDesempenios
          }))
        }
        
        cargarDatosSesion()
      }
    }
  }, [formData.sesionSeleccionada, sesionesGuardadas, formData.continuarUnidad, formData.areaId, formData.gradoId])

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.areaId && formData.gradoId) {
      setFase(2)
    }
  }

  const numeroSesionActual = formData.continuarUnidad && formData.sesionSeleccionada
    ? parseInt(formData.sesionSeleccionada, 10) + 1
    : 1

  const generarDocumento = async (usarContenidoBD: boolean) => {
    setShowModalGeneracion(false)
    setLoading(true)
    try {
      let sesionData = null
      let unidadData = null
      if (formData.continuarUnidad && formData.sesionSeleccionada && sesionesGuardadas.length > 0) {
        const sesionIndex = parseInt(formData.sesionSeleccionada, 10)
        const sesion = sesionesGuardadas[sesionIndex]
        if (sesion) {
          sesionData = {
            numeroSesion: (sesionIndex + 1).toString(),
            titulo: sesion.titulo || '',
            competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
            capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
            desempeniosSeleccionados: sesion.desempeniosSeleccionados || [],
            campoTematico: sesion.campoTematico || '',
            evidencias: sesion.evidencias || '',
            criterios: sesion.criterios || ''
          }
          unidadData = { areaId: formData.areaId, gradoId: formData.gradoId, unidad: formData.unidad }
        }
      }
      const body: Record<string, unknown> = {
        formData: {
          institucion: formData.institucion,
          area: formData.area,
          grado: formData.grado,
          gradoId: formData.gradoId,
          areaId: formData.areaId,
          unidad: formData.unidad,
          ciclo: formData.ciclo,
          director: formData.director,
          docente: formData.docente,
          fecha: formData.fecha,
          duracion: formData.duracion,
          tituloSesion: formData.tituloSesion,
          continuarUnidad: formData.continuarUnidad
        },
        sesionData,
        unidadData,
        tableTextFromPrompt: tableTextFromPrompt || undefined
      }
      if (usarContenidoBD && contenidoGuardado) {
        body.contenidoDesdeBD = contenidoGuardado
      }
      const response = await fetch('/api/sesiones-fichas/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al generar el documento')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `SESION_${formData.area || 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al generar documento:', error)
      alert(error instanceof Error ? error.message : 'Error al generar el documento. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleFase2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.continuarUnidad) {
      if (!formData.competenciaSeleccionada || !formData.capacidadSeleccionada) {
        alert('Por favor selecciona una competencia y una capacidad')
        return
      }
      if (formData.desempeniosSeleccionados.length === 0) {
        alert('Por favor selecciona al menos un desempeño')
        return
      }
    } else {
      if (!formData.sesionSeleccionada) {
        alert('Por favor selecciona una sesión')
        return
      }
    }
    try {
      const params = new URLSearchParams({
        areaId: String(formData.areaId || ''),
        gradoId: String(formData.gradoId || ''),
        unidad: String(formData.unidad || ''),
        numeroSesion: String(numeroSesionActual)
      })
      const checkRes = await fetch(`/api/sesiones-fichas/sesion-contenido?${params}`)
      if (checkRes.ok) {
        const data = await checkRes.json()
        if (data.existe && data.contenido) {
          setContenidoGuardado(data.contenido)
          setShowModalGeneracion(true)
          return
        }
      }
    } catch (_) {
      // Si falla la consulta, continuar y generar con IA
    }
    generarDocumento(false)
  }

  const handlePromptDinamico = async () => {
    setLoadingPrompt(true)
    try {
      let sesionData = null
      if (formData.continuarUnidad && formData.sesionSeleccionada && sesionesGuardadas.length > 0) {
        const sesionIndex = parseInt(formData.sesionSeleccionada, 10)
        const sesion = sesionesGuardadas[sesionIndex]
        if (sesion) {
          sesionData = {
            numeroSesion: (sesionIndex + 1).toString(),
            titulo: sesion.titulo || '',
            competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
            capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
            desempeniosSeleccionados: sesion.desempeniosSeleccionados || []
          }
        }
      } else {
        sesionData = { numeroSesion: '1', titulo: formData.tituloSesion || '', competenciasSeleccionadas: [], capacidadesSeleccionadas: [], desempeniosSeleccionados: [] }
      }
      const response = await fetch('/api/sesiones-fichas/generate-prompt-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            area: formData.area,
            grado: formData.grado,
            ciclo: formData.ciclo,
            duracion: formData.duracion,
            tituloSesion: formData.tituloSesion,
            areaId: formData.areaId,
            gradoId: formData.gradoId,
            unidad: formData.unidad
          },
          sesionData
        })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al generar el prompt')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Prompt_Sesion_${formData.area || 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al generar prompt:', error)
      alert(error instanceof Error ? error.message : 'Error al generar el documento de prompt.')
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleRespuestaPrompt = async () => {
    setLoadingRespuestaPrompt(true)
    try {
      let sesionData = null
      if (formData.continuarUnidad && formData.sesionSeleccionada && sesionesGuardadas.length > 0) {
        const sesionIndex = parseInt(formData.sesionSeleccionada, 10)
        const sesion = sesionesGuardadas[sesionIndex]
        if (sesion) {
          sesionData = {
            numeroSesion: (sesionIndex + 1).toString(),
            titulo: sesion.titulo || '',
            competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
            capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
            desempeniosSeleccionados: sesion.desempeniosSeleccionados || []
          }
        }
      } else {
        sesionData = { numeroSesion: '1', titulo: formData.tituloSesion || '', competenciasSeleccionadas: [], capacidadesSeleccionadas: [], desempeniosSeleccionados: [] }
      }
      const response = await fetch('/api/sesiones-fichas/respuesta-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formData: {
            area: formData.area,
            grado: formData.grado,
            ciclo: formData.ciclo,
            duracion: formData.duracion,
            tituloSesion: formData.tituloSesion,
            areaId: formData.areaId,
            gradoId: formData.gradoId,
            unidad: formData.unidad
          },
          sesionData,
          includePreviewImage: true
        })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al generar la respuesta del prompt')
      }
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        if (data.tableText) setTableTextFromPrompt(data.tableText)
        const ts = Date.now()
        const baseName = `Respuesta_Prompt_Sesion_${(formData.area || 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
        const docxName = data.fileNameDocx || `${baseName}.docx`
        const imageName = data.fileNameImage || `${baseName}_vista_previa.svg`
        const docxBuf = Uint8Array.from(atob(data.docxBase64), (c) => c.charCodeAt(0))
        const imageBuf = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0))
        const mimeImage = data.mimeImage || 'image/svg+xml'
        const blobDocx = new Blob([docxBuf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const blobImage = new Blob([imageBuf], { type: mimeImage })
        const urlDocx = window.URL.createObjectURL(blobDocx)
        const urlImage = window.URL.createObjectURL(blobImage)
        const a1 = document.createElement('a')
        a1.href = urlDocx
        a1.download = docxName
        document.body.appendChild(a1)
        a1.click()
        document.body.removeChild(a1)
        window.URL.revokeObjectURL(urlDocx)
        const a2 = document.createElement('a')
        a2.href = urlImage
        a2.download = imageName
        document.body.appendChild(a2)
        a2.click()
        document.body.removeChild(a2)
        window.URL.revokeObjectURL(urlImage)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Respuesta_Prompt_Sesion_${formData.area || 'documento'}_${Date.now()}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error al generar respuesta prompt:', error)
      alert(error instanceof Error ? error.message : 'Error al generar la respuesta del prompt.')
    } finally {
      setLoadingRespuestaPrompt(false)
    }
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR SESIONES</h1>
          <p className={styles.subtitle}>
            Genera sesiones completas con fichas y rúbricas en 3 fases
          </p>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${fase >= 1 ? styles.completed : ''}`}>
              Fase 1
            </div>
            <div className={`${styles.progressSegment} ${fase >= 2 ? styles.active : ''}`}>
              Fase 2
            </div>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 1: Selección Personalizada</h2>
              <p className={styles.phaseDescription}>
                Define el contexto básico para que la IA genere materiales alineados a tu realidad.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="area">Área Curricular <span className={styles.required}>*</span></label>
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
                    disabled
                  >
                    {formData.cicloId && (
                      <option value={formData.cicloId}>{formData.ciclo}</option>
                    )}
                    {!formData.cicloId && (
                      <option value="">Selecciona un grado primero</option>
                    )}
                  </select>
                  <p className={styles.helpText}>El ciclo se selecciona automáticamente según el grado</p>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="institucion">Nombre de la Institución Educativa (Opcional)</label>
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
                  <label htmlFor="duracion">Duración (Opcional)</label>
                  <select
                    id="duracion"
                    value={formData.duracion}
                    onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                    className={styles.select}
                  >
                    <option value="">Selecciona la duración</option>
                    <option value="45">45 minutos</option>
                    <option value="90">90 minutos</option>
                    <option value="135">135 minutos</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="fecha">Fecha (Opcional)</label>
                  <input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="unidad">Unidad (Opcional)</label>
                  <input
                    id="unidad"
                    type="text"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className={styles.input}
                    placeholder="Número de unidad (ej: 1, 2, 3...)"
                  />
                  <p className={styles.helpText}>Necesario si deseas continuar con una unidad ya generada</p>
                </div>
              </div>

              <button type="submit" className={styles.button}>Continuar a Fase 2</button>
            </form>
          )}

          {fase === 2 && (
            <form onSubmit={handleFase2Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Personaliza tu sesión</h2>
              <p className={styles.phaseDescription}>
                Decide si deseas crear tu sesión desde cero o continuar con la secuencia de una unidad ya generada.
              </p>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.continuarUnidad}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        continuarUnidad: e.target.checked,
                        sesionSeleccionada: e.target.checked ? formData.sesionSeleccionada : ''
                      })
                    }}
                    className={styles.checkbox}
                  />
                  Continuar con secuencia de una unidad ya generada
                </label>
              </div>

              {formData.continuarUnidad && (
                <div className={styles.formGroup}>
                  <label htmlFor="sesionSeleccionada">Seleccionar Sesión <span className={styles.required}>*</span></label>
                  <p className={styles.helpText}>
                    {loadingSesiones 
                      ? 'Cargando sesiones guardadas...'
                      : sesionesGuardadas.length === 0
                      ? formData.areaId && formData.gradoId && formData.unidad
                        ? 'No se encontraron sesiones guardadas para esta unidad. Asegúrate de haber generado la unidad de aprendizaje primero.'
                        : 'Selecciona área, grado y unidad en la Fase 1 para cargar las sesiones guardadas.'
                      : `Se encontraron ${sesionesGuardadas.length} sesión(es) guardada(s).`}
                  </p>
                  <select
                    id="sesionSeleccionada"
                    value={formData.sesionSeleccionada}
                    onChange={(e) => setFormData({ ...formData, sesionSeleccionada: e.target.value })}
                    className={styles.select}
                    required={formData.continuarUnidad}
                    disabled={loadingSesiones || sesionesGuardadas.length === 0 || !formData.areaId || !formData.gradoId || !formData.unidad}
                    style={{ 
                      display: 'block',
                      width: '100%',
                      padding: '8px',
                      fontSize: '16px',
                      border: '1px solid #ccc',
                      borderRadius: '4px'
                    }}
                  >
                    <option value="">Selecciona una sesión</option>
                    {sesionesGuardadas.length > 0 ? (
                      sesionesGuardadas.map((sesion, index) => (
                        <option key={index} value={index.toString()}>
                          Sesión {index + 1}: {sesion.titulo || 'Sin título'}
                        </option>
                      ))
                    ) : (
                      <option value="" disabled>No hay sesiones disponibles</option>
                    )}
                  </select>
                  {formData.sesionSeleccionada && sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)] && (
                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                      <strong style={{ color: '#1e40af' }}>Datos de la sesión seleccionada:</strong>
                      <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
                        <li style={{ marginBottom: '4px' }}>
                          <strong>Título:</strong> {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].titulo || 'Sin título'}
                        </li>
                        {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].competenciasSeleccionadas && 
                         sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].competenciasSeleccionadas.length > 0 && (
                          <li style={{ marginBottom: '4px' }}>
                            <strong>Competencias:</strong> {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].competenciasSeleccionadas.length} seleccionada(s)
                          </li>
                        )}
                        {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].capacidadesSeleccionadas && 
                         sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].capacidadesSeleccionadas.length > 0 && (
                          <li style={{ marginBottom: '4px' }}>
                            <strong>Capacidades:</strong> {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].capacidadesSeleccionadas.length} seleccionada(s)
                          </li>
                        )}
                        {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].desempeniosSeleccionados && 
                         sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].desempeniosSeleccionados.length > 0 && (
                          <li style={{ marginBottom: '4px' }}>
                            <strong>Desempeños:</strong> {sesionesGuardadas[parseInt(formData.sesionSeleccionada, 10)].desempeniosSeleccionados.length} seleccionado(s)
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!formData.continuarUnidad && (
                <>
                  {/* Paso 1: Seleccionar Competencia */}
                  <div className={styles.formGroup}>
                    <label htmlFor="competencia">Seleccionar Competencia <span className={styles.required}>*</span></label>
                    <p className={styles.helpText}>Selecciona una competencia para comenzar.</p>
                    {competencias.length === 0 && formData.areaId && formData.gradoId ? (
                      <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic' }}>
                        Cargando competencias...
                      </p>
                    ) : competencias.length === 0 ? (
                      <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                        Por favor selecciona un área y grado en la Fase 1 primero
                      </p>
                    ) : null}
                    <select
                      id="competencia"
                      className={styles.select}
                      value={formData.competenciaSeleccionada}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          competenciaSeleccionada: e.target.value,
                          capacidadSeleccionada: '',
                          desempeniosSeleccionados: []
                        })
                      }}
                      required
                      disabled={competencias.length === 0}
                    >
                      <option value="">Selecciona una competencia</option>
                      {competencias.map(competencia => (
                        <option key={competencia.id} value={competencia.id.toString()}>
                          {competencia.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Paso 2: Seleccionar Capacidad */}
                  {formData.competenciaSeleccionada && (
                    <div className={styles.formGroup}>
                      <label htmlFor="capacidad">Seleccionar Capacidad <span className={styles.required}>*</span></label>
                      <p className={styles.helpText}>
                        {loadingCapacidades 
                          ? 'Cargando capacidades...'
                          : capacidades.length > 0
                          ? `Se encontraron ${capacidades.length} capacidades para esta competencia.`
                          : 'No se encontraron capacidades para esta competencia.'}
                      </p>
                      <select
                        id="capacidad"
                        className={styles.select}
                        value={formData.capacidadSeleccionada}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            capacidadSeleccionada: e.target.value,
                            desempeniosSeleccionados: []
                          })
                        }}
                        required
                        disabled={loadingCapacidades || capacidades.length === 0}
                      >
                        <option value="">Selecciona una capacidad</option>
                        {capacidades.map(capacidad => (
                          <option key={capacidad.id} value={capacidad.id.toString()}>
                            {capacidad.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Paso 3: Seleccionar Desempeños (hasta 3) */}
                  {formData.competenciaSeleccionada && (
                    <div className={styles.formGroup}>
                      <label htmlFor="desempenios">Seleccionar Desempeños <span className={styles.required}>*</span></label>
                      <p className={styles.helpText}>
                        {formData.capacidadSeleccionada && loadingDesempenios 
                          ? 'Cargando desempeños...'
                          : todosLosDesempenios.length > 0
                          ? `Hay ${todosLosDesempenios.length} desempeños disponibles. Puedes seleccionar hasta 3 desempeños de diferentes capacidades.`
                          : formData.capacidadSeleccionada
                          ? 'No se encontraron desempeños para esta capacidad.'
                          : 'Selecciona una capacidad para ver los desempeños disponibles.'}
                        {formData.desempeniosSeleccionados.length > 0 && (
                          <span style={{ display: 'block', marginTop: '5px', color: formData.desempeniosSeleccionados.length >= 3 ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>
                            {formData.desempeniosSeleccionados.length} de 3 desempeños seleccionados
                          </span>
                        )}
                      </p>
                      {todosLosDesempenios.length > 0 ? (
                        <>
                          <select
                            id="desempenios"
                            className={styles.select}
                            multiple
                            size={6}
                            value={formData.desempeniosSeleccionados}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value)
                              // Limitar a 3 desempeños
                              if (selected.length <= 3) {
                                setFormData({ ...formData, desempeniosSeleccionados: selected })
                              } else {
                                alert('Solo puedes seleccionar hasta 3 desempeños')
                                // Mantener solo los primeros 3
                                setFormData({ ...formData, desempeniosSeleccionados: selected.slice(0, 3) })
                              }
                            }}
                            required
                            disabled={todosLosDesempenios.length === 0}
                          >
                            {todosLosDesempenios.map(desempenio => {
                              const capacidad = capacidades.find(c => c.id === desempenio.idcapacidad)
                              const isSelected = formData.desempeniosSeleccionados.includes(desempenio.id.toString())
                              return (
                                <option 
                                  key={desempenio.id} 
                                  value={desempenio.id.toString()}
                                  style={{ 
                                    backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                                    fontWeight: isSelected ? 600 : 'normal'
                                  }}
                                >
                                  {capacidad ? `[${capacidad.descripcion.substring(0, 30)}...] ` : ''}
                                  {desempenio.descripcion}
                                </option>
                              )
                            })}
                          </select>
                          <p className={styles.helpText}>
                            Mantén presionado Ctrl/Cmd para seleccionar múltiples. Máximo 3 desempeños. Puedes cambiar de capacidad para ver más opciones.
                          </p>
                        </>
                      ) : formData.capacidadSeleccionada ? (
                        <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                          No hay desempeños disponibles para esta capacidad. Intenta seleccionar otra capacidad.
                        </p>
                      ) : null}
                      {formData.desempeniosSeleccionados.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <strong style={{ color: '#1e40af' }}>Desempeños seleccionados ({formData.desempeniosSeleccionados.length}/3):</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
                            {formData.desempeniosSeleccionados.map(id => {
                              const desempenio = todosLosDesempenios.find(d => d.id.toString() === id)
                              const capacidad = desempenio ? capacidades.find(c => c.id === desempenio.idcapacidad) : null
                              return desempenio ? (
                                <li key={id} style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                                  <strong style={{ color: '#3b82f6' }}>
                                    {capacidad ? `[${capacidad.descripcion}] ` : ''}
                                  </strong>
                                  {desempenio.descripcion}
                                </li>
                              ) : null
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opción para cambiar de capacidad y seleccionar más desempeños */}
                  {formData.desempeniosSeleccionados.length > 0 && formData.desempeniosSeleccionados.length < 3 && (
                    <div className={styles.formGroup}>
                      <p className={styles.helpText} style={{ color: '#3b82f6', fontStyle: 'italic', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
                        💡 Puedes cambiar de capacidad arriba para seleccionar desempeños adicionales hasta completar 3. Los desempeños ya seleccionados se mantendrán.
                      </p>
                    </div>
                  )}

                  <div className={styles.formGroup}>
                    <label htmlFor="tituloSesion">Título de la Sesión</label>
                    <input
                      id="tituloSesion"
                      type="text"
                      value={formData.tituloSesion}
                      onChange={(e) => setFormData({ ...formData, tituloSesion: e.target.value })}
                      className={styles.input}
                      placeholder="¿Deseas que la IA proponga el título de tu sesión? (Opcional)"
                    />
                  </div>
                </>
              )}

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(1)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 1
                </button>
                <button
                  type="button"
                  onClick={handlePromptDinamico}
                  className={styles.buttonSecondary}
                  disabled={loadingPrompt || !formData.duracion}
                  title={!formData.duracion ? 'Selecciona duración en Fase 1' : ''}
                >
                  {loadingPrompt ? 'Descargando...' : 'Prompt dinámico'}
                </button>
                <button
                  type="button"
                  onClick={handleRespuestaPrompt}
                  className={styles.buttonSecondary}
                  disabled={loadingRespuestaPrompt || !formData.duracion}
                  title={!formData.duracion ? 'Selecciona duración en Fase 1' : ''}
                >
                  {loadingRespuestaPrompt ? 'Generando...' : 'Respuesta prompt'}
                </button>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Generando...' : 'Generar documento'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal: actualizar o traer de la BD (igual que unidad aprendizaje) */}
        {showModalGeneracion && (
          <div
            style={{
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
            }}
            onClick={() => setShowModalGeneracion(false)}
          >
            <div
              style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0066cc', fontSize: '24px' }}>
                Opciones de generación
              </h3>
              <p style={{ marginBottom: '25px', color: '#666', lineHeight: '1.6' }}>
                Hay datos guardados para esta sesión. ¿Qué deseas hacer?
              </p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', flexDirection: 'column' }}>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => generarDocumento(true)}
                  style={{ width: '100%', padding: '12px 20px', fontSize: '16px', fontWeight: 600 }}
                >
                  📦 Generar lo guardado
                </button>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => generarDocumento(false)}
                  style={{ width: '100%', padding: '12px 20px', fontSize: '16px', fontWeight: 600 }}
                >
                  🔄 Generar nuevamente
                </button>
              </div>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setShowModalGeneracion(false)}
                style={{ width: '100%', padding: '10px 20px', fontSize: '14px' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}

