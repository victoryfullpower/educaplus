'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import styles from './sesiones-fichas.module.css'
import { descargarBlobDesdeResponse } from '@/lib/home-descarga-documento'
import {
  guardarRetornoModal,
  leerRetornoModal,
  linkHomeConModalRetorno,
  type ModalReturnPaso
} from '@/lib/plan-modal-return'
import { sesionTieneDocumento } from '@/lib/plan-estado-documentos'

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

type SesionPendienteItem = {
  numeroSesion: number
  titulo: string
  campoTematico?: string
  competenciasSeleccionadas: string[]
  capacidadesSeleccionadas: string[]
  desempeniosSeleccionados: string[]
  evidencias?: string
  criterios?: string
  instrumentoEvaluacion: string
  duracion: string
  fecha: string
}

type EstadoProgresoSesion = 'pendiente' | 'generando' | 'ok' | 'error'

type ProgresoSesionItem = {
  numeroSesion: number
  titulo: string
  estado: EstadoProgresoSesion
  mensaje?: string
}

function SesionesFichasContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const areaIdParam = searchParams.get('areaId')
  const gradoIdParam = searchParams.get('gradoId')
  const unidadParam = searchParams.get('unidad')
  const planIdParam = searchParams.get('planId')
  const volverParam = searchParams.get('volver') as ModalReturnPaso | null
  const desdeUnidadParam = searchParams.get('desdeUnidad') === '1'
  const precargadoUnidadRef = useRef(false)
  const unidadAprendizajeIdRef = useRef<number | null>(null)

  const [bloqueadoDesdeUnidad, setBloqueadoDesdeUnidad] = useState(false)
  const [sesionesYaGeneradasCount, setSesionesYaGeneradasCount] = useState(0)
  const [overlayGeneracion, setOverlayGeneracion] = useState(false)
  const [generacionCompletada, setGeneracionCompletada] = useState(false)
  const [progresoLote, setProgresoLote] = useState<ProgresoSesionItem[]>([])
  const [resumenLote, setResumenLote] = useState({ exitosas: 0, fallidas: 0 })
  const generandoSesion = overlayGeneracion && !generacionCompletada
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
    continuarUnidad: false
  })
  const [sesionesGuardadas, setSesionesGuardadas] = useState<SesionPendienteItem[]>([])
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

  // Precarga desde unidad generada (?areaId=&gradoId=&unidad=&desdeUnidad=1)
  useEffect(() => {
    if (
      !desdeUnidadParam ||
      !areaIdParam ||
      !gradoIdParam ||
      !unidadParam ||
      loadingData ||
      areas.length === 0 ||
      grados.length === 0
    ) {
      return
    }
    if (precargadoUnidadRef.current) return

    const cargarDesdeUnidad = async () => {
      try {
        const anio = new Date().getFullYear()
        const response = await fetch(
          `/api/unidad-aprendizaje?anio=${anio}&areaId=${areaIdParam}&gradoId=${gradoIdParam}&unidad=${unidadParam}`
        )
        if (!response.ok) return

        const data = await response.json()
        const unidadGuardada =
          data.unidadesAprendizaje?.[0] ?? (data.id ? data : null)
        if (!unidadGuardada) return

        if (unidadGuardada.id) {
          unidadAprendizajeIdRef.current = unidadGuardada.id
        }

        const gradoSel = grados.find((g) => String(g.id) === String(gradoIdParam))
        const areaSel = areas.find((a) => String(a.id) === String(areaIdParam))

        setFormData((prev) => ({
          ...prev,
          area: unidadGuardada.area || areaSel?.descripcion || prev.area,
          areaId: String(unidadGuardada.areaId ?? areaIdParam),
          grado: unidadGuardada.grado || gradoSel?.descripcion || prev.grado,
          gradoId: String(unidadGuardada.gradoId ?? gradoIdParam),
          ciclo: unidadGuardada.ciclo || gradoSel?.ciclo?.descripcion || prev.ciclo,
          cicloId:
            unidadGuardada.cicloId?.toString() ||
            gradoSel?.ciclo?.id?.toString() ||
            prev.cicloId,
          unidad: String(unidadGuardada.unidad ?? unidadParam),
          institucion: unidadGuardada.institucion || prev.institucion,
          director: unidadGuardada.director || prev.director,
          docente: unidadGuardada.docente || prev.docente,
          continuarUnidad: true
        }))

        precargadoUnidadRef.current = true
        setBloqueadoDesdeUnidad(true)
      } catch (error) {
        console.error('Error al precargar sesiones desde unidad:', error)
      }
    }

    cargarDesdeUnidad()
  }, [
    desdeUnidadParam,
    areaIdParam,
    gradoIdParam,
    unidadParam,
    loadingData,
    areas,
    grados
  ])

  useEffect(() => {
    if (!planIdParam) return
    const id = parseInt(planIdParam, 10)
    if (Number.isNaN(id)) return
    const paso: ModalReturnPaso = volverParam === 'unidad' ? 'unidad' : 'sesiones'
    guardarRetornoModal({
      planId: id,
      paso,
      unidad: formData.unidad || unidadParam,
      area: formData.area,
      areaId: formData.areaId || areaIdParam
    })
  }, [
    planIdParam,
    volverParam,
    formData.unidad,
    formData.area,
    formData.areaId,
    unidadParam,
    areaIdParam
  ])

  const irAlModalOrigen = () => {
    const guardado = leerRetornoModal()
    const id = planIdParam ? parseInt(planIdParam, 10) : NaN
    const paso: ModalReturnPaso = volverParam === 'unidad' ? 'unidad' : 'sesiones'
    const areaNombre =
      formData.area?.trim() ||
      areas.find((a) => String(a.id) === String(formData.areaId || areaIdParam))
        ?.descripcion ||
      ''
    const retorno =
      guardado != null
        ? {
            ...guardado,
            area: guardado.area || areaNombre || undefined,
            areaId: guardado.areaId || formData.areaId || areaIdParam,
            unidad: guardado.unidad || formData.unidad || unidadParam
          }
        : !Number.isNaN(id)
          ? {
              planId: id,
              paso,
              unidad: formData.unidad || unidadParam,
              area: areaNombre,
              areaId: formData.areaId || areaIdParam
            }
          : null
    if (retorno) {
      router.push(linkHomeConModalRetorno(retorno))
      return
    }
    router.push('/home')
  }

  const bloqueado = bloqueadoDesdeUnidad
  const modoSecuenciaUnidad = formData.continuarUnidad || bloqueadoDesdeUnidad
  const sesionesPendientesConfiguradas =
    sesionesGuardadas.length > 0 &&
    sesionesGuardadas.every((s) => s.duracion && s.fecha)
  const puedeGenerarLote =
    modoSecuenciaUnidad &&
    Boolean(formData.areaId && formData.gradoId && formData.unidad) &&
    sesionesPendientesConfiguradas

  const actualizarSesionPendiente = (
    numeroSesion: number,
    campo: 'duracion' | 'fecha',
    valor: string
  ) => {
    setSesionesGuardadas((prev) =>
      prev.map((s) => (s.numeroSesion === numeroSesion ? { ...s, [campo]: valor } : s))
    )
  }

  const claseEstadoProgreso = (estado: EstadoProgresoSesion) => {
    switch (estado) {
      case 'ok':
        return styles.progresoEstado_ok
      case 'error':
        return styles.progresoEstado_error
      case 'generando':
        return styles.progresoEstado_generando
      default:
        return styles.progresoEstado_pendiente
    }
  }

  const iconoEstadoProgreso = (estado: EstadoProgresoSesion) => {
    if (estado === 'generando') {
      return <span className={styles.progresoSpinnerMini} aria-label="Generando" />
    }
    if (estado === 'ok') {
      return <span className={styles.progresoIconoOk} aria-hidden>✓</span>
    }
    if (estado === 'error') {
      return <span className={styles.progresoIconoError} aria-hidden>✕</span>
    }
    return <span className={styles.progresoIconoPendiente} aria-hidden>○</span>
  }

  const sesionEnCurso = progresoLote.find((p) => p.estado === 'generando')
  const sesionesCompletadas = progresoLote.filter((p) => p.estado === 'ok').length

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
      const debeCargar =
        (formData.continuarUnidad || bloqueadoDesdeUnidad) &&
        formData.areaId &&
        formData.gradoId &&
        formData.unidad

      if (debeCargar) {
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

            if (unidadData?.id) {
              unidadAprendizajeIdRef.current = unidadData.id
            }
            
            if (unidadData && unidadData.sesiones && Array.isArray(unidadData.sesiones)) {
              const numsGenerados = new Set<number>(
                (unidadData.listaSesiones || [])
                  .filter((s: { titulo?: string; motivacion?: string; desarrollo?: string; proposito?: string; saberes?: string }) =>
                    sesionTieneDocumento(s)
                  )
                  .map((s: { numeroSesion: number }) => s.numeroSesion)
              )
              setSesionesYaGeneradasCount(numsGenerados.size)

              const sesionesConDatos: SesionPendienteItem[] = []
              unidadData.sesiones.forEach(
                (
                  s: {
                    titulo?: string
                    competenciasSeleccionadas?: string[]
                    capacidadesSeleccionadas?: string[]
                    desempeniosSeleccionados?: string[]
                    campoTematico?: string
                    evidencias?: string
                    criterios?: string
                    instrumentoEvaluacion?: string
                  },
                  index: number
                ) => {
                  const numeroSesion = index + 1
                  if (
                    !s ||
                    (!s.titulo &&
                      !(Array.isArray(s.competenciasSeleccionadas) &&
                        s.competenciasSeleccionadas.length > 0))
                  ) {
                    return
                  }
                  if (numsGenerados.has(numeroSesion)) return
                  sesionesConDatos.push({
                    numeroSesion,
                    titulo: s.titulo || '',
                    campoTematico: s.campoTematico,
                    competenciasSeleccionadas: s.competenciasSeleccionadas || [],
                    capacidadesSeleccionadas: s.capacidadesSeleccionadas || [],
                    desempeniosSeleccionados: s.desempeniosSeleccionados || [],
                    evidencias: s.evidencias,
                    criterios: s.criterios,
                    instrumentoEvaluacion: s.instrumentoEvaluacion || '',
                    duracion: '',
                    fecha: ''
                  })
                }
              )
              setSesionesGuardadas(sesionesConDatos)
            } else {
              setSesionesGuardadas([])
              setSesionesYaGeneradasCount(0)
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
        setSesionesYaGeneradasCount(0)
      }
    }

    loadSesionesGuardadas()
  }, [
    formData.continuarUnidad,
    formData.areaId,
    formData.gradoId,
    formData.unidad,
    bloqueadoDesdeUnidad
  ])

  const cerrarOverlayGeneracion = () => {
    setOverlayGeneracion(false)
    setGeneracionCompletada(false)
    setProgresoLote([])
    setResumenLote({ exitosas: 0, fallidas: 0 })
  }

  const generarUnaSesion = async (sesion: SesionPendienteItem) => {
    const sesionData = {
      numeroSesion: String(sesion.numeroSesion),
      titulo: sesion.titulo || '',
      competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
      capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
      desempeniosSeleccionados: sesion.desempeniosSeleccionados || [],
      campoTematico: sesion.campoTematico || '',
      evidencias: sesion.evidencias || '',
      criterios: sesion.criterios || ''
    }
    const unidadData = {
      areaId: formData.areaId,
      gradoId: formData.gradoId,
      unidad: formData.unidad
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
        fecha: sesion.fecha,
        duracion: sesion.duracion,
        tituloSesion: sesion.titulo,
        continuarUnidad: formData.continuarUnidad
      },
      sesionData,
      unidadData,
      tableTextFromPrompt: tableTextFromPrompt || undefined
    }
    const response = await fetch('/api/sesiones-fichas/generate-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const areaSlug = (formData.area || 'documento')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
    const nombreFallback = `SESION_${areaSlug}_U${formData.unidad || '0'}_S${sesion.numeroSesion}.docx`
    await descargarBlobDesdeResponse(response, nombreFallback)
  }

  const generarLoteSesiones = async () => {
    const pendientes = [...sesionesGuardadas]
    if (pendientes.length === 0) return

    setOverlayGeneracion(true)
    setGeneracionCompletada(false)
    setProgresoLote(
      pendientes.map((s) => ({
        numeroSesion: s.numeroSesion,
        titulo: s.titulo || 'Sin título',
        estado: 'pendiente' as const
      }))
    )

    const numerosExitosos: number[] = []
    let exitosas = 0
    let fallidas = 0

    for (let i = 0; i < pendientes.length; i++) {
      const sesion = pendientes[i]
      setProgresoLote((prev) =>
        prev.map((p) =>
          p.numeroSesion === sesion.numeroSesion ? { ...p, estado: 'generando', mensaje: undefined } : p
        )
      )
      try {
        await generarUnaSesion(sesion)
        exitosas += 1
        numerosExitosos.push(sesion.numeroSesion)
        setProgresoLote((prev) =>
          prev.map((p) =>
            p.numeroSesion === sesion.numeroSesion ? { ...p, estado: 'ok', mensaje: undefined } : p
          )
        )
        if (i < pendientes.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      } catch (error) {
        fallidas += 1
        const mensaje =
          error instanceof Error ? error.message : 'Error al generar el documento'
        setProgresoLote((prev) =>
          prev.map((p) =>
            p.numeroSesion === sesion.numeroSesion ? { ...p, estado: 'error', mensaje } : p
          )
        )
      }
    }

    if (numerosExitosos.length > 0) {
      setSesionesGuardadas((prev) =>
        prev.filter((s) => !numerosExitosos.includes(s.numeroSesion))
      )
      setSesionesYaGeneradasCount((c) => c + numerosExitosos.length)
    }
    setResumenLote({ exitosas, fallidas })
    setGeneracionCompletada(true)
  }

  const verificarYGenerarSesion = async () => {
    if (!formData.areaId || !formData.gradoId) return
    if (!modoSecuenciaUnidad) {
      alert(
        'Activa "Continuar con secuencia de una unidad ya generada" y selecciona la unidad para generar sesiones.'
      )
      return
    }
    if (sesionesGuardadas.length === 0) {
      alert('No hay sesiones pendientes para generar.')
      return
    }
    const sinConfigurar = sesionesGuardadas.filter((s) => !s.duracion || !s.fecha)
    if (sinConfigurar.length > 0) {
      alert(
        `Configura duración y fecha para todas las sesiones pendientes (${sinConfigurar.length} sin completar).`
      )
      return
    }
    await generarLoteSesiones()
  }

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    void verificarYGenerarSesion()
  }

  const primeraSesionPendiente = sesionesGuardadas[0] ?? null

  const handlePromptDinamico = async () => {
    setLoadingPrompt(true)
    try {
      let sesionData = null
      if (modoSecuenciaUnidad && primeraSesionPendiente) {
        const sesion = primeraSesionPendiente
        sesionData = {
          numeroSesion: String(sesion.numeroSesion),
          titulo: sesion.titulo || '',
          competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
          capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
          desempeniosSeleccionados: sesion.desempeniosSeleccionados || []
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
            duracion: primeraSesionPendiente?.duracion || formData.duracion,
            tituloSesion: primeraSesionPendiente?.titulo || formData.tituloSesion,
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
      if (modoSecuenciaUnidad && primeraSesionPendiente) {
        const sesion = primeraSesionPendiente
        sesionData = {
          numeroSesion: String(sesion.numeroSesion),
          titulo: sesion.titulo || '',
          competenciasSeleccionadas: sesion.competenciasSeleccionadas || [],
          capacidadesSeleccionadas: sesion.capacidadesSeleccionadas || [],
          desempeniosSeleccionados: sesion.desempeniosSeleccionados || []
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
            duracion: primeraSesionPendiente?.duracion || formData.duracion,
            tituloSesion: primeraSesionPendiente?.titulo || formData.tituloSesion,
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
            Genera la sesión de aprendizaje de una unidad ya creada
          </p>

          <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>Datos de la sesión</h2>
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
                    className={`${styles.select} ${bloqueado ? styles.fieldReadonly : ''}`}
                    required
                    disabled={loadingData || bloqueado}
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
                    className={`${styles.select} ${bloqueado ? styles.fieldReadonly : ''}`}
                    required
                    disabled={loadingData || bloqueado}
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
                    className={`${styles.input} ${bloqueado ? styles.fieldReadonly : ''}`}
                    placeholder="Nombre de tu I.E."
                    disabled={bloqueado}
                    readOnly={bloqueado}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="director">Director (Opcional)</label>
                  <input
                    id="director"
                    type="text"
                    value={formData.director}
                    onChange={(e) => setFormData({ ...formData, director: e.target.value })}
                    className={`${styles.input} ${bloqueado ? styles.fieldReadonly : ''}`}
                    placeholder="Nombre del director"
                    disabled={bloqueado}
                    readOnly={bloqueado}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="docente">Nombre del docente (Opcional)</label>
                  <input
                    id="docente"
                    type="text"
                    value={formData.docente}
                    onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                    className={`${styles.input} ${bloqueado ? styles.fieldReadonly : ''}`}
                    placeholder="Tu nombre"
                    disabled={bloqueado}
                    readOnly={bloqueado}
                  />
                </div>

                {!modoSecuenciaUnidad && (
                  <>
                    <div className={styles.formGroup}>
                      <label htmlFor="duracion">
                        Duración <span className={styles.required}>*</span>
                      </label>
                      <select
                        id="duracion"
                        value={formData.duracion}
                        onChange={(e) => setFormData({ ...formData, duracion: e.target.value })}
                        className={styles.select}
                        required
                      >
                        <option value="">Selecciona la duración</option>
                        <option value="45">45 minutos</option>
                        <option value="90">90 minutos</option>
                        <option value="135">135 minutos</option>
                      </select>
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="fecha">
                        Fecha <span className={styles.required}>*</span>
                      </label>
                      <input
                        id="fecha"
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        className={styles.input}
                        required
                      />
                    </div>
                  </>
                )}

                <div className={styles.formGroup}>
                  <label htmlFor="unidad">Unidad (Opcional)</label>
                  <input
                    id="unidad"
                    type="text"
                    value={formData.unidad}
                    onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                    className={`${styles.input} ${bloqueado ? styles.fieldReadonly : ''}`}
                    placeholder="Número de unidad (ej: 1, 2, 3...)"
                    disabled={bloqueado}
                    readOnly={bloqueado}
                  />
                  <p className={styles.helpText}>
                    {bloqueado
                      ? 'Unidad vinculada a la que acabas de generar'
                      : 'Necesario si deseas continuar con una unidad ya generada'}
                  </p>
                </div>
              </div>

              <div className={styles.sesionSection}>
                {!bloqueado && (
                  <div className={styles.formGroup}>
                    <label>
                      <input
                        type="checkbox"
                        checked={formData.continuarUnidad}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            continuarUnidad: e.target.checked
                          })
                        }}
                        className={styles.checkbox}
                      />
                      Continuar con secuencia de una unidad ya generada
                    </label>
                  </div>
                )}

                {modoSecuenciaUnidad && (
                  <div className={styles.formGroup}>
                    <label>
                      Sesiones pendientes <span className={styles.required}>*</span>
                    </label>
                    <p className={styles.helpText}>
                      {loadingSesiones
                        ? 'Cargando sesiones guardadas...'
                        : sesionesGuardadas.length === 0
                          ? formData.areaId && formData.gradoId && formData.unidad
                            ? sesionesYaGeneradasCount > 0
                              ? 'Todas las sesiones de esta unidad ya fueron generadas.'
                              : 'No se encontraron sesiones en la unidad. Genera la unidad de aprendizaje primero.'
                            : 'Indica área, grado y unidad para cargar las sesiones.'
                          : `Configura duración y fecha de cada sesión. Pendientes: ${sesionesGuardadas.length}.${
                              sesionesYaGeneradasCount > 0
                                ? ` Ya generadas: ${sesionesYaGeneradasCount}.`
                                : ''
                            } Al generar, se procesarán una tras otra.`}
                    </p>
                    {sesionesGuardadas.length > 0 && (
                      <ul className={styles.sesionesPendientesLista}>
                        {sesionesGuardadas.map((sesion) => (
                          <li
                            key={sesion.numeroSesion}
                            className={styles.sesionPendienteCard}
                          >
                            <div className={styles.sesionPendienteTitulo}>
                              <strong>Sesión {sesion.numeroSesion}</strong>
                              <span>{sesion.titulo || 'Sin título'}</span>
                            </div>
                            <div className={styles.sesionPendienteCampos}>
                              <div className={styles.formGroup}>
                                <label htmlFor={`duracion-${sesion.numeroSesion}`}>
                                  Duración <span className={styles.required}>*</span>
                                </label>
                                <select
                                  id={`duracion-${sesion.numeroSesion}`}
                                  value={sesion.duracion}
                                  onChange={(e) =>
                                    actualizarSesionPendiente(
                                      sesion.numeroSesion,
                                      'duracion',
                                      e.target.value
                                    )
                                  }
                                  className={styles.select}
                                  disabled={generandoSesion}
                                >
                                  <option value="">Selecciona la duración</option>
                                  <option value="45">45 minutos</option>
                                  <option value="90">90 minutos</option>
                                  <option value="135">135 minutos</option>
                                </select>
                              </div>
                              <div className={styles.formGroup}>
                                <label htmlFor={`fecha-${sesion.numeroSesion}`}>
                                  Fecha <span className={styles.required}>*</span>
                                </label>
                                <input
                                  id={`fecha-${sesion.numeroSesion}`}
                                  type="date"
                                  value={sesion.fecha}
                                  onChange={(e) =>
                                    actualizarSesionPendiente(
                                      sesion.numeroSesion,
                                      'fecha',
                                      e.target.value
                                    )
                                  }
                                  className={styles.input}
                                  disabled={generandoSesion}
                                />
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className={styles.button}
                disabled={
                  generandoSesion ||
                  !puedeGenerarLote ||
                  loadingSesiones
                }
              >
                {generandoSesion
                  ? 'Generando sesiones...'
                  : sesionesGuardadas.length > 1
                    ? `Generar ${sesionesGuardadas.length} sesiones`
                    : 'Generar documento'}
              </button>
            </form>
        </div>

        {overlayGeneracion && (
          <div
            className={styles.generatingOverlay}
            role="dialog"
            aria-modal="true"
            aria-busy={generandoSesion}
          >
            <div
              className={`${styles.generatingOverlayCard} ${
                progresoLote.length > 0 ? styles.generatingOverlayCardWide : ''
              }`}
            >
              {generacionCompletada ? (
                <>
                  <div className={styles.generatingSuccessIcon} aria-hidden>
                    ✓
                  </div>
                  <h3 className={styles.generatingTitle}>
                    {resumenLote.fallidas === 0
                      ? progresoLote.length > 1
                        ? '¡Sesiones generadas!'
                        : '¡Sesión generada!'
                      : 'Proceso finalizado'}
                  </h3>
                  <p className={styles.generatingText}>
                    {resumenLote.exitosas > 0
                      ? `${resumenLote.exitosas} sesión(es) guardada(s) y descargada(s) en tu equipo. Revisa la carpeta de descargas.`
                      : 'No se pudo generar ninguna sesión.'}
                    {resumenLote.fallidas > 0
                      ? ` ${resumenLote.fallidas} con error (puedes corregir y volver a intentar).`
                      : ''}
                  </p>
                  {progresoLote.length > 0 && (
                    <ul className={styles.progresoChecklist}>
                      {progresoLote.map((item) => (
                        <li
                          key={item.numeroSesion}
                          className={`${styles.progresoChecklistItem} ${claseEstadoProgreso(item.estado)}`}
                        >
                          <span className={styles.progresoChecklistIcon}>
                            {iconoEstadoProgreso(item.estado)}
                          </span>
                          <span className={styles.progresoChecklistTexto}>
                            Sesión {item.numeroSesion}: {item.titulo}
                            {item.mensaje ? ` — ${item.mensaje}` : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className={styles.generatingActions}>
                    <button
                      type="button"
                      className={styles.generatingBtnPrimary}
                      onClick={() => {
                        cerrarOverlayGeneracion()
                        irAlModalOrigen()
                      }}
                    >
                      Cerrar
                    </button>
                  </div>
                </>
              ) : progresoLote.length > 0 ? (
                <>
                  <div className={styles.progresoSpinnerHeader}>
                    <div className={styles.progresoSpinnerGrande} aria-hidden />
                  </div>
                  <h3 className={styles.generatingTitle}>Generando sesiones…</h3>
                  <p className={styles.generatingText}>
                    {sesionEnCurso
                      ? `Sesión ${sesionEnCurso.numeroSesion} en curso (${sesionesCompletadas} de ${progresoLote.length} lista(s)).`
                      : 'La IA está creando cada documento en secuencia.'}{' '}
                    No cierres esta página.
                  </p>
                  <ul className={styles.progresoChecklist}>
                    {progresoLote.map((item) => (
                      <li
                        key={item.numeroSesion}
                        className={`${styles.progresoChecklistItem} ${claseEstadoProgreso(item.estado)}`}
                      >
                        <span className={styles.progresoChecklistIcon}>
                          {iconoEstadoProgreso(item.estado)}
                        </span>
                        <span className={styles.progresoChecklistTexto}>
                          Sesión {item.numeroSesion}: {item.titulo}
                          {item.estado === 'generando' ? ' — generando…' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
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
                  <h3 className={styles.generatingTitle}>Preparando generación…</h3>
                </>
              )}
            </div>
          </div>
        )}

      </main>
    </>
  )
}

export default function SesionesFichasPage() {
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
      <SesionesFichasContent />
    </Suspense>
  )
}

