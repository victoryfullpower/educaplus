'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import { getDepartamentos, getProvinciasByDepartamento, getDistritosByProvincia } from '@/lib/ubigeos'
import {
  guardarRetornoModal,
  leerRetornoModal,
  linkHomeConModalRetorno,
  type ModalReturnState
} from '@/lib/plan-modal-return'
import { linkHomeConAreaTab } from '@/lib/plan-area-tab'
import { errorDesdeResponse } from '@/lib/error-generacion-documento'
import { useAvisoModal } from '@/hooks/useAvisoModal'
import {
  MAX_UNIDAD_INDEX_TRIAL_PLAN,
  payloadUnidadPlanVacia,
  tieneSuscripcionActivaParaGrado,
  unidadPlanTieneConfiguracion,
  type SuscripcionActivaCliente
} from '@/lib/acceso-cliente'
import { MSG_TRIAL_UNA_UNIDAD_PLAN, RUTA_PLANES_PAGO } from '@/lib/error-generacion-documento'
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

function findNivelSecundaria(niveles: Nivel[]): Nivel | undefined {
  return niveles.find((n) => (n.descripcion || '').toLowerCase().includes('secundaria'))
}

function camposNivelSecundaria(
  niveles: Nivel[]
): { nivel: string; nivelId: string } | null {
  const nivelSecundaria = findNivelSecundaria(niveles)
  if (!nivelSecundaria) return null
  return {
    nivel: nivelSecundaria.descripcion || 'secundaria',
    nivelId: String(nivelSecundaria.id)
  }
}

type CampoFase1 = 'areaId' | 'gradoId' | 'departamento' | 'provincia' | 'distrito'
type ErroresFase1 = Partial<Record<CampoFase1, string>>

const ID_CAMPO_FASE1: Record<CampoFase1, string> = {
  areaId: 'area',
  gradoId: 'grado',
  departamento: 'departamento',
  provincia: 'provincia',
  distrito: 'distrito'
}

const ORDEN_CAMPOS_FASE1: CampoFase1[] = [
  'areaId',
  'gradoId',
  'departamento',
  'provincia',
  'distrito'
]

function validarFase1(
  data: {
    areaId: string
    gradoId: string
    departamento: string
    provincia: string
    distrito: string
  },
  soloLectura: boolean
): ErroresFase1 {
  const errores: ErroresFase1 = {}
  if (!data.areaId) errores.areaId = 'Selecciona un área curricular.'
  if (!data.gradoId) errores.gradoId = 'Selecciona un grado.'
  if (!soloLectura) {
    if (!data.departamento.trim()) errores.departamento = 'Selecciona un departamento.'
    if (!data.provincia.trim()) errores.provincia = 'Selecciona una provincia.'
    if (!data.distrito.trim()) errores.distrito = 'Selecciona un distrito.'
  }
  return errores
}

function MensajeCampo({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null
  return (
    <p className={styles.fieldError} role="alert">
      {mensaje}
    </p>
  )
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
  tieneSituacionIA: boolean
  tituloUnidad: string
  situacionSignificativa: string
  campoTematico: string
  competenciaSeleccionada: string  // Para compatibilidad con backend (primera competencia)
  capacidadSeleccionada: string     // Para compatibilidad con backend (primera capacidad)
  competenciasSeleccionadas: string[]  // Array de todas las competencias seleccionadas
  capacidadesSeleccionadas: string[]   // Array de todas las capacidades seleccionadas
  desempeniosSeleccionados: string[]
  conocimientos: string
}

const MIN_CAMPOS_TEMATICOS = 5

const EJEMPLO_CAMPO_TEMATICO = `- Salud sexual y reproductiva
- Prevención del embarazo adolescente
- Derechos de las y los adolescentes
- Comunicación asertiva en la familia
- Uso responsable de herramientas digitales`

/** Extrae ítems de líneas con guion (-, • o *). */
function extraerItemsCampoTematico(texto: string): string[] {
  return String(texto || '')
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-•*]\s*/, '').trim())
    .filter(Boolean)
}

function contarGuionesCampoTematico(texto: string): number {
  return String(texto || '')
    .split(/\n+/)
    .filter((line) => /^\s*[-•*]\s+\S/.test(line))
    .length
}

function campoTematicoEsValido(texto: string): boolean {
  return contarGuionesCampoTematico(texto) >= MIN_CAMPOS_TEMATICOS
}

function formatearCamposTematicos(items: string[]): string {
  return items
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `- ${t}`)
    .join('\n')
}

function textoCampoTematicoDesdeGuardado(
  unidad: { camposTematicos?: string[]; campoTematico?: string }
): string {
  if (typeof unidad.campoTematico === 'string' && unidad.campoTematico.trim()) {
    return unidad.campoTematico
  }
  if (Array.isArray(unidad.camposTematicos) && unidad.camposTematicos.length > 0) {
    return formatearCamposTematicos(unidad.camposTematicos)
  }
  return ''
}

type ErrorParProblemaProducto = { problema?: boolean; producto?: boolean }

/** Si uno tiene texto, el otro es obligatorio; ambos vacíos es válido. */
function erroresParProblemaProducto(
  problema: string,
  producto: string
): ErrorParProblemaProducto {
  const p = problema.trim()
  const pr = producto.trim()
  if (!p && !pr) return {}
  return {
    problema: pr.length > 0 && !p,
    producto: p.length > 0 && !pr
  }
}

function ProgramacionAnualContent() {
  const router = useRouter()
  const { manejarErrorGeneracion, mostrarAviso, AvisoModalEl } = useAvisoModal(
    'EducaPlus · Programación anual'
  )
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
        }
        // Sin ?planId= no se precarga ningún plan; el registro en BD se crea al generar el documento.
        
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
          
          if (planExistente.unidades && Array.isArray(planExistente.unidades)) {
            setUnidadesExistentes(planExistente.unidades)
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

        const nivelSecundaria = camposNivelSecundaria(nivelesData as Nivel[])
        if (nivelSecundaria) {
          setFormData((prev) => ({ ...prev, ...nivelSecundaria }))
        }
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadInitialData()
  }, [planIdParam])

  useEffect(() => {
    const cargarAcceso = async () => {
      try {
        const res = await fetch('/api/usuario/acceso')
        if (!res.ok) return
        const data = await res.json()
        if (data.suscripcionActiva) {
          setSuscripcionActiva(data.suscripcionActiva)
        }
        if (data.cuotaPlanAnual) {
          setCuotaPlanAnual(data.cuotaPlanAnual)
        }
      } catch {
        /* sin sesión o error de red */
      }
    }
    cargarAcceso()
  }, [])

  useEffect(() => {
    const nivelSecundaria = camposNivelSecundaria(niveles)
    if (!nivelSecundaria) return
    setFormData((prev) =>
      prev.nivelId === nivelSecundaria.nivelId ? prev : { ...prev, ...nivelSecundaria }
    )
  }, [niveles])

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

  const unidadSinCompetencias = (u: Unidad): Unidad => ({
    ...u,
    competenciaSeleccionada: '',
    competenciasSeleccionadas: [],
    capacidadSeleccionada: '',
    capacidadesSeleccionadas: [],
    desempeniosSeleccionados: []
  })

  /** Opción 1 o 2: si cumple campos requeridos → todas las competencias del área; si no → se limpian */
  const unidadCumpleCamposParaCompetencias = (
    unidad: Unidad,
    esOpcion1: boolean
  ): boolean => {
    const tieneProducto = !!unidad.producto?.trim()
    const tieneCampoTematico = campoTematicoEsValido(unidad.campoTematico || '')
    if (esOpcion1) {
      return (
        !!unidad.tituloUnidad?.trim() &&
        !!unidad.situacionSignificativa?.trim() &&
        tieneProducto &&
        tieneCampoTematico
      )
    }
    return (
      !!unidad.problemaPotencialidad?.trim() &&
      tieneProducto &&
      tieneCampoTematico
    )
  }

  const autoSeleccionarCompetenciasEnUnidad = (
    unidad: Unidad,
    listaCompetencias: Competencia[],
    esOpcion1: boolean
  ): Unidad => {
    if (!unidadCumpleCamposParaCompetencias(unidad, esOpcion1)) {
      const yaVacias =
        !unidad.competenciaSeleccionada &&
        (unidad.competenciasSeleccionadas?.length ?? 0) === 0 &&
        (unidad.desempeniosSeleccionados?.length ?? 0) === 0
      return yaVacias ? unidad : unidadSinCompetencias(unidad)
    }

    const ids = listaCompetencias.map((c) => c.id.toString())
    if (ids.length === 0) return unidad

    const yaTieneTodas =
      unidad.competenciasSeleccionadas?.length === ids.length &&
      ids.every((id) => unidad.competenciasSeleccionadas!.includes(id))
    if (yaTieneTodas) return unidad

    return {
      ...unidad,
      competenciaSeleccionada: ids[0] || '',
      competenciasSeleccionadas: ids,
      capacidadSeleccionada: '',
      capacidadesSeleccionadas: [],
      desempeniosSeleccionados: []
    }
  }

  const [unidades, setUnidades] = useState<Unidad[]>(Array(9).fill(null).map(() => ({
    problemaPotencialidad: '',
    producto: '',
    tieneTituloIA: true,  // Por defecto la IA genera el título
    tieneSituacionIA: true, // Por defecto la IA genera la situación significativa
    tituloUnidad: '',
    situacionSignificativa: '',
    campoTematico: '',
    competenciaSeleccionada: '',  // Primera competencia para compatibilidad
    capacidadSeleccionada: '',     // Primera capacidad para compatibilidad
    competenciasSeleccionadas: [], // Array de todas las competencias
    capacidadesSeleccionadas: [],  // Array de todas las capacidades
    desempeniosSeleccionados: [],
    conocimientos: ''
  })))

  // Modo de ingreso Fase 2: null = sin elegir; completo = manual; con_ia = IA genera título/situación
  type ModoIngresoPlan = 'completo' | 'con_ia'
  const [modoIngresoPlan, setModoIngresoPlan] = useState<ModoIngresoPlan | null>(null)
  const docenteCompleto = modoIngresoPlan === 'completo'
  const generarTituloConIA = modoIngresoPlan !== 'completo'
  const generarSituacionConIA = modoIngresoPlan !== 'completo'

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
  const [showModalPlanDuplicado, setShowModalPlanDuplicado] = useState(false)
  const [showModalGeneradoExito, setShowModalGeneradoExito] = useState(false)
  const [planDuplicadoId, setPlanDuplicadoId] = useState<number | null>(null)
  const [camposFaltantes, setCamposFaltantes] = useState<string[]>([])
  
  // Estados para plan anual existente
  const [planAnualExistente, setPlanAnualExistente] = useState<any>(null)
  const [showModalPlanExistente, setShowModalPlanExistente] = useState(false)
  const [modoGeneracion, setModoGeneracion] = useState<'regenerar' | 'actualizar' | null>(null)
  const [unidadesExistentes, setUnidadesExistentes] = useState<any[]>([])

  /** Plan cargado por ?planId= o detectado en BD: Fase 1 solo lectura. */
  const esEdicionPlan = Boolean(planIdParam || planAnualExistente?.id)
  const fase1SoloLectura = loadingData || esEdicionPlan

  const unidadesGuardadasEnPlan = (): unknown[] => {
    if (unidadesExistentes.length > 0) return unidadesExistentes
    const u = planAnualExistente?.unidades
    return Array.isArray(u) ? u : []
  }

  const unidadPlanTieneDatosGuardados = (u: unknown): boolean => {
    if (!u || typeof u !== 'object') return false
    const slot = u as Record<string, unknown>
    return !!(
      String(slot.problemaPotencialidad ?? '').trim() ||
      String(slot.producto ?? '').trim() ||
      String(slot.situacionSignificativa ?? '').trim() ||
      String(slot.tituloUnidad ?? '').trim() ||
      String(slot.campoTematico ?? '').trim() ||
      String(slot.conocimientos ?? '').trim() ||
      (Array.isArray(slot.competenciasSeleccionadas) &&
        slot.competenciasSeleccionadas.length > 0) ||
      (Array.isArray(slot.desempeniosSeleccionados) &&
        slot.desempeniosSeleccionados.length > 0)
    )
  }

  const esUnidadRegistradaEnPlan = (index: number): boolean =>
    esEdicionPlan && unidadPlanTieneDatosGuardados(unidadesGuardadasEnPlan()[index])

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

  // Modal de sugerencias (problema / producto)
  type TipoSugerenciaPlan = 'problema' | 'producto'
  const [showModalSugerencias, setShowModalSugerencias] = useState(false)
  const [tipoSugerencia, setTipoSugerencia] = useState<TipoSugerenciaPlan | null>(null)
  const [unidadSugerenciaIndex, setUnidadSugerenciaIndex] = useState<number | null>(null)
  const [sugerenciasLista, setSugerenciasLista] = useState<{ id: number; descripcion: string }[]>([])
  const [loadingSugerencias, setLoadingSugerencias] = useState(false)

  const [erroresParUnidad, setErroresParUnidad] = useState<
    Record<number, ErrorParProblemaProducto>
  >({})
  const [erroresFase1, setErroresFase1] = useState<ErroresFase1>({})
  const [suscripcionActiva, setSuscripcionActiva] = useState<SuscripcionActivaCliente>(null)
  const [cuotaPlanAnual, setCuotaPlanAnual] = useState<{
    limite: number | null
    usados: number
    restantes: number | null
    puedeCrear: boolean
    mensaje: string | null
  } | null>(null)

  const bloqueadoPorCuota = !esEdicionPlan && cuotaPlanAnual?.puedeCrear === false

  const accesoTodasUnidades = useMemo(
    () => tieneSuscripcionActivaParaGrado(suscripcionActiva, formData.areaId, formData.gradoId),
    [suscripcionActiva, formData.areaId, formData.gradoId]
  )

  const unidadBloqueadaTrial = (index: number) =>
    index > MAX_UNIDAD_INDEX_TRIAL_PLAN && !accesoTodasUnidades

  const unidadNoEditable = (index: number) =>
    esUnidadRegistradaEnPlan(index) || unidadBloqueadaTrial(index)

  const limpiarErrorFase1 = (campo: CampoFase1) => {
    setErroresFase1((prev) => {
      if (!prev[campo]) return prev
      const next = { ...prev }
      delete next[campo]
      return next
    })
  }

  const enfocarPrimerErrorFase1 = (errores: ErroresFase1) => {
    const firstKey = ORDEN_CAMPOS_FASE1.find((k) => errores[k])
    if (!firstKey) return
    const el = document.getElementById(ID_CAMPO_FASE1[firstKey])
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLElement) el.focus()
  }

  useEffect(() => {
    if (competencias.length === 0 || !modoIngresoPlan) return
    setUnidades((prev) => {
      let changed = false
      const next = prev.map((u, index) => {
        if (index === 0) return u
        if (unidadBloqueadaTrial(index)) return u
        const updated = autoSeleccionarCompetenciasEnUnidad(
          u,
          competencias,
          modoIngresoPlan === 'completo'
        )
        if (updated !== u) changed = true
        return updated
      })
      return changed ? next : prev
    })
  }, [competencias, accesoTodasUnidades, modoIngresoPlan])

  const handleDepartamentoChange = (departamento: string) => {
    setFormData((prev) => ({
      ...prev,
      departamento,
      provincia: '',
      distrito: ''
    }))
    const provincias = getProvinciasByDepartamento(departamento)
    setProvinciasDisponibles(provincias)
    setDistritosDisponibles([])
    setErroresFase1((prev) => {
      const next = { ...prev }
      delete next.departamento
      delete next.provincia
      delete next.distrito
      return next
    })
  }

  const handleProvinciaChange = (provincia: string) => {
    setFormData((prev) => {
      const distritos = getDistritosByProvincia(prev.departamento, provincia)
      setDistritosDisponibles(distritos)
      return {
        ...prev,
        provincia,
        distrito: ''
      }
    })
    setErroresFase1((prev) => {
      const next = { ...prev }
      delete next.provincia
      delete next.distrito
      return next
    })
  }

  const cargarUnidadesDesdePlan = async (plan: { unidades?: unknown }) => {
    if (!plan.unidades || !Array.isArray(plan.unidades) || plan.unidades.length === 0) {
      return
    }
    setUnidadesExistentes(plan.unidades)

    const nuevasUnidades = [...unidades]
    const nuevasCapacidadesPorUnidad: { [key: number]: Capacidad[] } = {}
    const nuevosDesempeniosPorUnidad: { [key: number]: Desempenio[] } = {}

    for (let index = 0; index < 9 && index < plan.unidades.length; index++) {
      const unidadExistente = plan.unidades[index] as Unidad & {
        situacionSignificativa?: string
        campoTematico?: string
      }

      if (
        unidadExistente &&
        (unidadExistente.problemaPotencialidad ||
          unidadExistente.producto ||
          (unidadExistente.desempeniosSeleccionados?.length ?? 0) > 0)
      ) {
        nuevasUnidades[index] = {
          ...nuevasUnidades[index],
          ...unidadExistente,
          tieneTituloIA:
            unidadExistente.tieneTituloIA !== undefined
              ? unidadExistente.tieneTituloIA
              : true,
          tieneSituacionIA:
            unidadExistente.tieneSituacionIA !== undefined
              ? unidadExistente.tieneSituacionIA
              : true,
          tituloUnidad: unidadExistente.tituloUnidad || '',
          situacionSignificativa: unidadExistente.situacionSignificativa || '',
          campoTematico: textoCampoTematicoDesdeGuardado(unidadExistente),
          competenciasSeleccionadas: unidadExistente.competenciasSeleccionadas || [],
          capacidadesSeleccionadas: unidadExistente.capacidadesSeleccionadas || [],
          desempeniosSeleccionados: unidadExistente.desempeniosSeleccionados || []
        }

        if (
          unidadExistente.desempeniosSeleccionados &&
          Array.isArray(unidadExistente.desempeniosSeleccionados) &&
          unidadExistente.desempeniosSeleccionados.length > 0
        ) {
          try {
            const idsString = unidadExistente.desempeniosSeleccionados.join(',')
            const responseDesempenios = await fetch(
              `/api/competencias/desempenios?ids=${idsString}`
            )
            const desempeniosCompletos: Desempenio[] = await responseDesempenios.json()

            if (desempeniosCompletos?.length > 0) {
              nuevosDesempeniosPorUnidad[index] = desempeniosCompletos
              const capacidadesIds = [...new Set(desempeniosCompletos.map((d) => d.idcapacidad))]
              if (capacidadesIds.length > 0) {
                const responseCapacidades = await fetch(
                  `/api/competencias/capacidades?ids=${capacidadesIds.join(',')}`
                )
                const capacidadesCompletas: Capacidad[] = await responseCapacidades.json()
                if (capacidadesCompletas?.length > 0) {
                  nuevasCapacidadesPorUnidad[index] = capacidadesCompletas
                }
              }
            }
          } catch (error) {
            console.error(`Error al cargar desempeños para unidad ${index}:`, error)
          }
        }
      }
    }

    setUnidades(nuevasUnidades)
    setCapacidadesPorUnidad((prev) => ({ ...prev, ...nuevasCapacidadesPorUnidad }))
    setTodosLosDesempeniosPorUnidad((prev) => ({ ...prev, ...nuevosDesempeniosPorUnidad }))
    setDesempeniosPorUnidad((prev) => ({ ...prev, ...nuevosDesempeniosPorUnidad }))

    // Sincronizar modo de ingreso con lo guardado en el plan
    const unidadesConDatos = nuevasUnidades.filter(
      (u, i) =>
        i > 0 &&
        (u.problemaPotencialidad?.trim() ||
          u.producto?.trim() ||
          (u.desempeniosSeleccionados?.length ?? 0) > 0)
    )
    if (unidadesConDatos.length > 0) {
      const esCompleto = unidadesConDatos.every(
        (u) => u.tieneTituloIA === false && u.tieneSituacionIA === false
      )
      setModoIngresoPlan(esCompleto ? 'completo' : 'con_ia')
    }
  }

  useEffect(() => {
    if (planAnualExistente?.unidades && Array.isArray(planAnualExistente.unidades)) {
      void cargarUnidadesDesdePlan(planAnualExistente)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al cargar el plan por id
  }, [planAnualExistente?.id])

  useEffect(() => {
    if (!planIdParam || !planAnualExistente?.id) return
    guardarRetornoModal({
      planId: planAnualExistente.id,
      paso: 'planAnual',
      area: planAnualExistente.area ?? null,
      areaId: planAnualExistente.areaId ?? null
    })
  }, [planIdParam, planAnualExistente?.id, planAnualExistente?.area, planAnualExistente?.areaId])

  const irAHomeTrasGeneracionExito = () => {
    setShowModalGeneradoExito(false)
    const pidRaw =
      planAnualExistente?.id ?? (planIdParam ? parseInt(planIdParam, 10) : NaN)
    if (!Number.isFinite(pidRaw)) {
      router.push('/home')
      return
    }

    const retornoGuardado = leerRetornoModal()
    const volverAlModalPlan =
      Boolean(planIdParam) ||
      (retornoGuardado?.paso === 'planAnual' && retornoGuardado.planId === pidRaw)

    if (volverAlModalPlan) {
      const state: ModalReturnState = {
        planId: pidRaw,
        paso: 'planAnual',
        area:
          retornoGuardado?.area ??
          formData.area ??
          planAnualExistente?.area ??
          null,
        areaId:
          retornoGuardado?.areaId ??
          formData.areaId ??
          planAnualExistente?.areaId ??
          null
      }
      guardarRetornoModal(state)
      router.push(linkHomeConModalRetorno(state))
      return
    }

    router.push(linkHomeConAreaTab(formData.area, formData.areaId))
  }

  const verificarPlanAnualExistente = async () => {
    try {
      const idRaw = planAnualExistente?.id ?? (planIdParam ? parseInt(planIdParam, 10) : NaN)
      if (Number.isFinite(idRaw)) {
        const response = await fetch(`/api/plan-anual?id=${idRaw}`)
        if (response.ok) {
          const data = await response.json()
          const plan = data.planAnual
          if (plan) {
            setPlanAnualExistente(plan)
            if (plan.unidades && Array.isArray(plan.unidades)) {
              setUnidadesExistentes(plan.unidades)
            }
            return plan
          }
        }
      }

      if (formData.areaId && formData.gradoId && formData.nivelId) {
        const listRes = await fetch('/api/plan-anual')
        if (listRes.ok) {
          const { planesAnuales } = await listRes.json()
          const anio = new Date().getFullYear()
          const plan = (planesAnuales as { id: number; anio: number; areaId: string; nivelId: string; gradoId: string; unidades?: unknown }[]).find(
            (p) =>
              String(p.areaId) === String(formData.areaId) &&
              String(p.nivelId) === String(formData.nivelId) &&
              String(p.gradoId) === String(formData.gradoId) &&
              p.anio === anio
          )
          if (plan) {
            setPlanAnualExistente(plan)
            if (plan.unidades && Array.isArray(plan.unidades)) {
              setUnidadesExistentes(plan.unidades)
            }
            return plan
          }
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
    if (bloqueadoPorCuota) {
      mostrarAviso({
        titulo: 'Límite alcanzado',
        mensaje:
          cuotaPlanAnual?.mensaje ??
          'Has alcanzado el límite de programaciones anuales de tu plan.',
        tipo: 'warn',
        botonTexto: 'Ver planes',
        onCloseRedirect: RUTA_PLANES_PAGO
      })
      return
    }
    const errores = validarFase1(formData, fase1SoloLectura)
    if (Object.keys(errores).length > 0) {
      setErroresFase1(errores)
      enfocarPrimerErrorFase1(errores)
      return
    }
    setErroresFase1({})
    if (planAnualExistente?.unidades) {
      await cargarUnidadesDesdePlan(planAnualExistente)
    }
    setFase(2)
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
        ...(camposNivelSecundaria(niveles) ?? {
          nivel: planAnualExistente.nivel || prev.nivel,
          nivelId: planAnualExistente.nivelId || prev.nivelId
        }),
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

  const aplicarModoIngresoPlan = (modo: ModoIngresoPlan) => {
    setModoIngresoPlan(modo)
    const conIA = modo === 'con_ia'
    const esOpcion1 = modo === 'completo'
    setUnidades((prev) =>
      prev.map((u, index) => {
        const conFlags = {
          ...u,
          tieneTituloIA: conIA,
          tieneSituacionIA: conIA
        }
        if (index === 0 || unidadBloqueadaTrial(index) || competencias.length === 0) {
          return conFlags
        }
        return autoSeleccionarCompetenciasEnUnidad(conFlags, competencias, esOpcion1)
      })
    )
    setErroresParUnidad({})
  }

  const abrirModalSugerencias = async (index: number, tipo: TipoSugerenciaPlan) => {
    if (unidadNoEditable(index)) return
    setUnidadSugerenciaIndex(index)
    setTipoSugerencia(tipo)
    setShowModalSugerencias(true)
    setLoadingSugerencias(true)
    setSugerenciasLista([])
    try {
      let url =
        tipo === 'problema'
          ? '/api/admin/sugerencias-problema-plan'
          : '/api/admin/sugerencias-producto-plan'
      if (tipo === 'producto') {
        if (!formData.areaId) {
          setSugerenciasLista([])
          setLoadingSugerencias(false)
          return
        }
        url += `?idarea=${encodeURIComponent(String(formData.areaId))}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setSugerenciasLista(data.sugerencias || [])
      }
    } catch (error) {
      console.error('Error al cargar sugerencias:', error)
    } finally {
      setLoadingSugerencias(false)
    }
  }

  const cerrarModalSugerencias = () => {
    setShowModalSugerencias(false)
    setTipoSugerencia(null)
    setUnidadSugerenciaIndex(null)
    setSugerenciasLista([])
  }

  const seleccionarSugerencia = (descripcion: string) => {
    if (unidadSugerenciaIndex === null || !tipoSugerencia) return
    const campo: keyof Unidad =
      tipoSugerencia === 'problema' ? 'problemaPotencialidad' : 'producto'
    handleUnidadChange(unidadSugerenciaIndex, campo, descripcion)
    cerrarModalSugerencias()
  }

  const handleUnidadChange = (index: number, field: keyof Unidad, value: string | boolean | string[]) => {
    if (unidadNoEditable(index)) return
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
      let actualizada: Unidad = { ...unidadActual, [field]: value }
      const camposAutoCompetencias = [
        'problemaPotencialidad',
        'producto',
        'tituloUnidad',
        'situacionSignificativa',
        'campoTematico'
      ]
      if (
        index > 0 &&
        modoIngresoPlan &&
        camposAutoCompetencias.includes(field) &&
        typeof value === 'string'
      ) {
        actualizada = autoSeleccionarCompetenciasEnUnidad(
          actualizada,
          competencias,
          docenteCompleto
        )
      }
      newUnidades[index] = actualizada
      if (
        docenteCompleto &&
        (field === 'problemaPotencialidad' || field === 'producto')
      ) {
        setErroresParUnidad((prev) => ({
          ...prev,
          [index]: erroresParProblemaProducto(
            actualizada.problemaPotencialidad,
            actualizada.producto
          )
        }))
      }
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
    if (unidadBloqueadaTrial(index)) {
      mostrarAviso({
        titulo: 'Unidad no disponible en prueba',
        mensaje: MSG_TRIAL_UNA_UNIDAD_PLAN,
        tipo: 'warn',
        botonTexto: 'Ver planes',
        onCloseRedirect: RUTA_PLANES_PAGO
      })
      return
    }
    if (esUnidadRegistradaEnPlan(index)) return
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
  }

  const handleSeleccionarTodasCompetenciasModal = (checked: boolean) => {
    if (checked) {
      setCompetenciasSeleccionadasModal(competencias.map((c) => c.id.toString()))
      return
    }
    setCompetenciasSeleccionadasModal([])
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
    // Modo simplificado: solo competencias
    setUnidades(prevUnidades => {
      const newUnidades = [...prevUnidades]
      newUnidades[unidadModalIndex] = {
        ...newUnidades[unidadModalIndex],
        competenciaSeleccionada: competenciasSeleccionadasModal[0] || '',
        competenciasSeleccionadas: competenciasSeleccionadasModal,
        capacidadSeleccionada: '',
        capacidadesSeleccionadas: [],
        desempeniosSeleccionados: []
      }
      return newUnidades
    })
    setCapacidadesPorUnidad(prev => ({ ...prev, [unidadModalIndex]: [] }))
    setTodosLosDesempeniosPorUnidad(prev => ({ ...prev, [unidadModalIndex]: [] }))
    
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
    if (unidadNoEditable(unidadIndex)) return
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

    if (!modoIngresoPlan) {
      alert('⚠️ Primero elige la Opción 1 o la Opción 2 para continuar.')
      return
    }

    const nuevosErroresPar: Record<number, ErrorParProblemaProducto> = {}
    setErroresParUnidad({})

    for (let index = 1; index < unidades.length; index++) {
      if (esUnidadRegistradaEnPlan(index)) continue
      if (unidadBloqueadaTrial(index)) continue
      const u = unidades[index]

      if (docenteCompleto) {
        // Opción 1: título, situación, campo temático y producto (sin problema)
        const tieneContenido =
          !!u.producto.trim() ||
          !!u.tituloUnidad.trim() ||
          !!u.situacionSignificativa.trim() ||
          !!u.campoTematico.trim()
        if (!tieneContenido) continue

        if (!u.tituloUnidad.trim()) {
          alert(`⚠️ En la UNIDAD ${index} debes ingresar el título.`)
          document.getElementById(`titulo-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!u.situacionSignificativa.trim()) {
          alert(`⚠️ En la UNIDAD ${index} debes ingresar la situación significativa.`)
          document
            .getElementById(`situacion-${index}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!u.producto.trim()) {
          alert(`⚠️ En la UNIDAD ${index} debes ingresar el producto.`)
          document.getElementById(`producto-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!campoTematicoEsValido(u.campoTematico)) {
          alert(
            `⚠️ En la UNIDAD ${index} el campo temático debe tener al menos ${MIN_CAMPOS_TEMATICOS} líneas con guion (- ).\n\nEjemplo:\n${EJEMPLO_CAMPO_TEMATICO}`
          )
          document
            .getElementById(`campo-tematico-${index}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      } else {
        // Opción 2: IA genera título/situación. Exige problema, producto y campo temático.
        const tieneContenido =
          !!u.problemaPotencialidad.trim() || !!u.producto.trim()
        if (!tieneContenido) continue

        if (!u.problemaPotencialidad.trim()) {
          alert(`⚠️ En la UNIDAD ${index} debes ingresar el problema o potencialidad.`)
          document.getElementById(`problema-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!u.producto.trim()) {
          alert(`⚠️ En la UNIDAD ${index} debes ingresar el producto.`)
          document.getElementById(`producto-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        if (!campoTematicoEsValido(u.campoTematico)) {
          alert(
            `⚠️ En la UNIDAD ${index} el campo temático debe tener al menos ${MIN_CAMPOS_TEMATICOS} líneas con guion (- ).\n\nEjemplo:\n${EJEMPLO_CAMPO_TEMATICO}`
          )
          document
            .getElementById(`campo-tematico-${index}`)
            ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
      }
    }

    if (!accesoTodasUnidades) {
      for (let index = MAX_UNIDAD_INDEX_TRIAL_PLAN + 1; index < unidades.length; index++) {
        if (unidadPlanTieneConfiguracion(unidades[index])) {
          mostrarAviso({
            titulo: 'Solo una unidad en prueba',
            mensaje: MSG_TRIAL_UNA_UNIDAD_PLAN,
            tipo: 'warn',
            botonTexto: 'Ver planes',
            onCloseRedirect: RUTA_PLANES_PAGO
          })
          return
        }
      }
    }
    
    const planExistente = await verificarPlanAnualExistente()

    // Editar plan (?planId=): sin modal; solo generar lo pendiente (ahorra tokens)
    if (esEdicionPlan) {
      await handleElegirModoGeneracion('actualizar')
      return
    }

    const tieneDatosGeneradosIa =
      planExistente?.unidades &&
      Array.isArray(planExistente.unidades) &&
      planExistente.unidades.some(
        (u: { situacionSignificativa?: string; campoTematico?: string; tituloUnidad?: string }) =>
          (u.situacionSignificativa?.trim()?.length ?? 0) > 0 ||
          (u.campoTematico?.trim()?.length ?? 0) > 0 ||
          (u.tituloUnidad?.trim()?.length ?? 0) > 0
      )

    if (tieneDatosGeneradosIa) {
      setShowModalPlanExistente(true)
      return
    }

    await generarDocumento('regenerar')
  }

  const generarDocumento = async (modo: 'regenerar' | 'actualizar' = 'regenerar') => {
    setLoading(true)
    
    try {
      // IMPORTANTE: Enviar TODAS las 9 unidades preservando el índice original
      // El backend necesita que el índice del array coincida con el número de unidad (0-8)
      // Si una unidad no tiene datos, enviarla con valores vacíos pero en su posición correcta
      const unidadesParaEnviar = unidades.map((unidad, index) => {
        if (!accesoTodasUnidades && index > MAX_UNIDAD_INDEX_TRIAL_PLAN) {
          return payloadUnidadPlanVacia()
        }
        const conCompetencias =
          index > 0 && modoIngresoPlan && competencias.length > 0
            ? autoSeleccionarCompetenciasEnUnidad(unidad, competencias, docenteCompleto)
            : unidad
        return {
          problemaPotencialidad: conCompetencias.problemaPotencialidad || '',
          producto: conCompetencias.producto || '',
          tieneTituloIA: conCompetencias.tieneTituloIA !== undefined ? conCompetencias.tieneTituloIA : generarTituloConIA,
          tieneSituacionIA:
            conCompetencias.tieneSituacionIA !== undefined ? conCompetencias.tieneSituacionIA : generarSituacionConIA,
          tituloUnidad: conCompetencias.tituloUnidad || '',
          situacionSignificativa: conCompetencias.situacionSignificativa || '',
          camposTematicos: extraerItemsCampoTematico(conCompetencias.campoTematico || ''),
          campoTematico: (() => {
            const items = extraerItemsCampoTematico(conCompetencias.campoTematico || '')
            return items.length > 0
              ? formatearCamposTematicos(items)
              : String(conCompetencias.campoTematico || '').trim()
          })(),
          competenciaSeleccionada: conCompetencias.competenciaSeleccionada || '',
          competenciasSeleccionadas:
            conCompetencias.competenciasSeleccionadas ||
            (conCompetencias.competenciaSeleccionada ? [conCompetencias.competenciaSeleccionada] : []),
          capacidadSeleccionada: conCompetencias.capacidadSeleccionada || '',
          capacidadesSeleccionadas:
            conCompetencias.capacidadesSeleccionadas ||
            (conCompetencias.capacidadSeleccionada ? [conCompetencias.capacidadSeleccionada] : []),
          desempeniosSeleccionados: conCompetencias.desempeniosSeleccionados || [],
          conocimientos: unidad.conocimientos || ''
        }
      })
      
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
          planAnualId:
            planAnualExistente?.id ??
            (planIdParam ? parseInt(planIdParam, 10) : undefined)
        }),
      })

      if (!response.ok) {
        throw await errorDesdeResponse(response)
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
        const pid = planAnualExistente?.id
        if (pid) {
          const planResponse = await fetch(`/api/plan-anual?id=${pid}`)
          if (planResponse.ok) {
            const planData = await planResponse.json()
            if (planData.planAnual) {
              setPlanAnualExistente(planData.planAnual)
              console.log('✅ Plan anual actualizado en el estado local')
            }
          }
        }
      } catch (error) {
        console.error('Error al actualizar estado del plan:', error)
        // No es crítico, solo actualizamos el estado local
      }
      
      await verificarPlanAnualExistente()
      setShowModalGeneradoExito(true)
    } catch (error) {
      console.error('Error al generar programación anual:', error)
      manejarErrorGeneracion(error)
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
    if (!formData.areaId || !formData.gradoId || !formData.nivelId) {
      alert('Por favor completa los campos obligatorios (Área, Nivel y Grado)')
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
        throw await errorDesdeResponse(response)
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
      manejarErrorGeneracion(error)
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

          <div className={styles.contextoPlan} aria-live="polite">
            <span>
              <strong>Área:</strong>{' '}
              {formData.area ||
                areas.find((a) => a.id.toString() === formData.areaId)?.descripcion ||
                '—'}
            </span>
            <span>
              <strong>Grado:</strong>{' '}
              {formData.grado ||
                grados.find((g) => g.id.toString() === formData.gradoId)?.descripcion ||
                (formData.gradoId ? `${formData.gradoId}° grado` : '—')}
            </span>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form} noValidate>
              <h2 className={styles.phaseTitle}>FASE 1: Selección Personalizada</h2>
              <p className={styles.phaseDescription}>
                Define el contexto educativo para que la IA genere una planificación alineada a tu realidad.
              </p>

              {bloqueadoPorCuota && (
                <div className={styles.trialUnidadesBanner} role="alert">
                  <span className={styles.trialUnidadesBannerIcon} aria-hidden>
                    !
                  </span>
                  <div className={styles.trialUnidadesBannerText}>
                    <strong>Límite de tu plan alcanzado</strong>{' '}
                    {cuotaPlanAnual?.mensaje}{' '}
                    <Link href={RUTA_PLANES_PAGO} className={styles.trialUnidadesLink}>
                      Ver planes
                    </Link>
                  </div>
                </div>
              )}

              {Object.keys(erroresFase1).length > 0 && (
                <div className={styles.validationBanner} role="alert">
                  <span className={styles.validationBannerIcon} aria-hidden>
                    !
                  </span>
                  <div className={styles.validationBannerText}>
                    <strong>Faltan datos obligatorios</strong>
                    Revisa los campos marcados en rojo antes de continuar a la Fase 2.
                  </div>
                </div>
              )}

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
                      limpiarErrorFase1('areaId')
                    }}
                    className={`${styles.select} ${erroresFase1.areaId ? styles.fieldInvalid : ''}`}
                    disabled={fase1SoloLectura}
                    aria-invalid={erroresFase1.areaId ? true : undefined}
                    aria-describedby={erroresFase1.areaId ? 'area-error' : undefined}
                  >
                    <option value="">Selecciona un área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.descripcion}</option>
                    ))}
                  </select>
                  <MensajeCampo mensaje={erroresFase1.areaId} />
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
                      limpiarErrorFase1('gradoId')
                    }}
                    className={`${styles.select} ${erroresFase1.gradoId ? styles.fieldInvalid : ''}`}
                    disabled={fase1SoloLectura}
                    aria-invalid={erroresFase1.gradoId ? true : undefined}
                  >
                    <option value="">Selecciona un grado</option>
                    {grados.map(grado => (
                      <option key={grado.id} value={grado.id}>
                        {grado.descripcion || `${grado.id}° grado`}
                      </option>
                    ))}
                  </select>
                  <MensajeCampo mensaje={erroresFase1.gradoId} />
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
                    disabled={fase1SoloLectura}
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
                    disabled={fase1SoloLectura}
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
                    disabled={fase1SoloLectura}
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
                    disabled={fase1SoloLectura}
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
                    disabled={fase1SoloLectura}
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
                    disabled={fase1SoloLectura}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="nivel">Nivel</label>
                  <select
                    id="nivel"
                    value={formData.nivelId}
                    className={styles.select}
                    disabled
                    aria-readonly
                  >
                    {niveles.length === 0 ? (
                      <option value="">Secundaria</option>
                    ) : (
                      niveles.map((nivel) => (
                        <option key={nivel.id} value={nivel.id}>
                          {nivel.descripcion}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="departamento">
                    Departamento <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => handleDepartamentoChange(e.target.value)}
                    className={`${styles.select} ${erroresFase1.departamento ? styles.fieldInvalid : ''}`}
                    disabled={fase1SoloLectura}
                    aria-invalid={erroresFase1.departamento ? true : undefined}
                  >
                    <option value="">Selecciona un departamento</option>
                    {getDepartamentos().map(depto => (
                      <option key={depto} value={depto}>{depto}</option>
                    ))}
                  </select>
                  <MensajeCampo mensaje={erroresFase1.departamento} />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="provincia">
                    Provincia <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="provincia"
                    value={formData.provincia}
                    onChange={(e) => handleProvinciaChange(e.target.value)}
                    className={`${styles.select} ${erroresFase1.provincia ? styles.fieldInvalid : ''}`}
                    disabled={fase1SoloLectura || !formData.departamento}
                    aria-invalid={erroresFase1.provincia ? true : undefined}
                  >
                    <option value="">Selecciona una provincia</option>
                    {provinciasDisponibles.map(prov => (
                      <option key={prov} value={prov}>{prov}</option>
                    ))}
                  </select>
                  <MensajeCampo mensaje={erroresFase1.provincia} />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="distrito">
                    Distrito <span className={styles.required}>*</span>
                  </label>
                  <select
                    id="distrito"
                    value={formData.distrito}
                    onChange={(e) => {
                      setFormData({ ...formData, distrito: e.target.value })
                      limpiarErrorFase1('distrito')
                    }}
                    className={`${styles.select} ${erroresFase1.distrito ? styles.fieldInvalid : ''}`}
                    disabled={fase1SoloLectura || !formData.provincia}
                    aria-invalid={erroresFase1.distrito ? true : undefined}
                  >
                    <option value="">Selecciona un distrito</option>
                    {distritosDisponibles.map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                  <MensajeCampo mensaje={erroresFase1.distrito} />
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="submit"
                  className={styles.button}
                  disabled={bloqueadoPorCuota}
                >
                  Continuar a Fase 2
                </button>
              </div>
            </form>
          )}

          {fase === 2 && (
            <form onSubmit={handleFinalSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Personaliza tu material</h2>
              <p className={styles.phaseDescription}>
                Define las unidades que compondrán tu programación anual. Puedes escribir tus ideas o dejar que la IA las proponga.
              </p>

              <div className={styles.iaTogglesRow}>
                <label
                  className={`${styles.iaRadioCard} ${
                    modoIngresoPlan === 'completo' ? styles.iaRadioCardActiveOpcion1 : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="modoIngresoPlan"
                    value="completo"
                    checked={modoIngresoPlan === 'completo'}
                    onChange={() => aplicarModoIngresoPlan('completo')}
                  />
                  <div className={styles.iaToggleCardText}>
                    <strong>Opción 1</strong>
                    <span>
                      El docente <b>sí tiene</b> su título, situación significativa completa,
                      campo temático y producto.
                    </span>
                  </div>
                </label>
                <label
                  className={`${styles.iaRadioCard} ${
                    modoIngresoPlan === 'con_ia' ? styles.iaRadioCardActive : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="modoIngresoPlan"
                    value="con_ia"
                    checked={modoIngresoPlan === 'con_ia'}
                    onChange={() => aplicarModoIngresoPlan('con_ia')}
                  />
                  <div className={styles.iaToggleCardText}>
                    <strong>Opción 2</strong>
                    <span>
                      El docente <b>no tiene</b> título ni situación significativa
                      (la IA los generará).
                    </span>
                  </div>
                </label>
              </div>

              {!modoIngresoPlan && (
                <p className={styles.modoIngresoHint}>
                  Selecciona una opción para mostrar y configurar las unidades.
                </p>
              )}

              {modoIngresoPlan && !accesoTodasUnidades && (
                <div className={styles.trialUnidadesBanner}>
                  <span className={styles.trialUnidadesBannerIcon} aria-hidden>
                    !
                  </span>
                  <div className={styles.trialUnidadesBannerText}>
                    <strong>Modo prueba gratuita</strong>{' '}
                    Solo puedes configurar la <strong>UNIDAD 1</strong>. Las demás unidades se
                    habilitan al activar un plan de pago.{' '}
                    <Link href={RUTA_PLANES_PAGO} className={styles.trialUnidadesLink}>
                      Ver planes
                    </Link>
                  </div>
                </div>
              )}

              {modoIngresoPlan && (
              <div className={styles.unidadesContainer}>
                {unidades.map((unidad, index) => {
                  if (index === 0) return null
                  const unidadRegistrada = esUnidadRegistradaEnPlan(index)
                  const bloqueadaTrial = unidadBloqueadaTrial(index)
                  const noEditable = unidadNoEditable(index)
                  return (
                  <div
                    key={index}
                    className={`${styles.unidadCard} ${
                      docenteCompleto ? styles.unidadCardOpcion1 : ''
                    } ${
                      unidadRegistrada ? styles.unidadCardRegistrada : ''
                    } ${bloqueadaTrial ? styles.unidadCardBloqueada : ''}`}
                  >
                    <h3 className={styles.unidadTitle}>
                      UNIDAD {index}
                      {unidadRegistrada && (
                        <span className={styles.unidadBadgeRegistrada}>Registrada</span>
                      )}
                      {bloqueadaTrial && (
                        <span className={styles.unidadBadgeBloqueada}>Requiere plan</span>
                      )}
                    </h3>
                    {bloqueadaTrial && (
                      <p className={styles.unidadBloqueadaMsg}>
                        Disponible con plan de pago.{' '}
                        <Link href={RUTA_PLANES_PAGO}>Activar plan</Link>
                      </p>
                    )}

                    {docenteCompleto && (
                      <div className={styles.formGroup}>
                        <label htmlFor={`titulo-${index}`}>
                          Título de la unidad
                          {!noEditable ? <span className={styles.required}> *</span> : null}
                        </label>
                        <input
                          id={`titulo-${index}`}
                          type="text"
                          value={unidad.tituloUnidad}
                          onChange={(e) =>
                            handleUnidadChange(index, 'tituloUnidad', e.target.value)
                          }
                          className={styles.input}
                          placeholder="Ej: Promovemos la salud como un bien de todos"
                          disabled={noEditable}
                          readOnly={noEditable}
                        />
                      </div>
                    )}

                    {docenteCompleto && (
                      <div className={styles.formGroup}>
                        <label htmlFor={`situacion-${index}`}>
                          Situación significativa
                          {!noEditable ? <span className={styles.required}> *</span> : null}
                        </label>
                        <textarea
                          id={`situacion-${index}`}
                          value={unidad.situacionSignificativa}
                          onChange={(e) =>
                            handleUnidadChange(index, 'situacionSignificativa', e.target.value)
                          }
                          className={`${styles.input} ${styles.textareaProblema}`}
                          placeholder="Escribe la situación significativa de esta unidad"
                          disabled={noEditable}
                          readOnly={noEditable}
                          rows={5}
                        />
                      </div>
                    )}

                    {!docenteCompleto && (
                    <div className={styles.formGroup}>
                      <label htmlFor={`problema-${index}`}>
                        Problema o potencialidad
                        {!noEditable ? <span className={styles.required}> *</span> : null}
                      </label>
                      <div className={styles.inputConSugerencia}>
                        <input
                          id={`problema-${index}`}
                          type="text"
                          value={unidad.problemaPotencialidad}
                          onChange={(e) => handleUnidadChange(index, 'problemaPotencialidad', e.target.value)}
                          className={styles.input}
                          placeholder="Ej: Alimentación saludable, contaminación ambiental, etc."
                          disabled={noEditable}
                          readOnly={noEditable}
                        />
                        {!noEditable && (
                          <button
                            type="button"
                            className={styles.btnSugerenciasIcon}
                            onClick={() => abrirModalSugerencias(index, 'problema')}
                            title="Sugerencias"
                            aria-label="Ver sugerencias de problema o potencialidad"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M9 18h6" />
                              <path d="M10 22h4" />
                              <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                    )}

                    <div className={styles.formGroup}>
                      <label htmlFor={`producto-${index}`}>
                        Producto
                        {!noEditable ? <span className={styles.required}> *</span> : null}
                      </label>
                      <div className={styles.inputConSugerencia}>
                        <input
                          id={`producto-${index}`}
                          type="text"
                          value={unidad.producto}
                          onChange={(e) => handleUnidadChange(index, 'producto', e.target.value)}
                          className={styles.input}
                          placeholder="Ej: Mural informativo, presentación oral, prototipo"
                          disabled={noEditable}
                          readOnly={noEditable}
                        />
                        {!noEditable && (
                          <button
                            type="button"
                            className={styles.btnSugerenciasIcon}
                            onClick={() => abrirModalSugerencias(index, 'producto')}
                            title="Sugerencias"
                            aria-label="Ver sugerencias de producto"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M9 18h6" />
                              <path d="M10 22h4" />
                              <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={styles.formGroup} id={`campo-tematico-${index}`}>
                      <label htmlFor={`campo-tematico-input-${index}`}>
                        Campo temático
                        {!noEditable &&
                        (docenteCompleto
                          ? unidad.producto.trim() ||
                            unidad.tituloUnidad.trim() ||
                            unidad.situacionSignificativa.trim()
                          : unidad.problemaPotencialidad.trim() || unidad.producto.trim()) ? (
                          <span className={styles.required}> *</span>
                        ) : null}
                        <span className={styles.campoTematicoAyuda}>
                          {' '}
                          [Escribe al menos {MIN_CAMPOS_TEMATICOS} ítems, cada uno en una línea que
                          empiece con guion (- )]
                        </span>
                      </label>
                      <textarea
                        id={`campo-tematico-input-${index}`}
                        value={unidad.campoTematico}
                        onChange={(e) =>
                          handleUnidadChange(index, 'campoTematico', e.target.value)
                        }
                        className={`${styles.input} ${styles.textareaProblema} ${
                          unidad.campoTematico.trim() &&
                          !campoTematicoEsValido(unidad.campoTematico)
                            ? styles.inputError
                            : ''
                        }`}
                        placeholder={EJEMPLO_CAMPO_TEMATICO}
                        disabled={noEditable}
                        readOnly={noEditable}
                        rows={6}
                      />
                      {unidad.campoTematico.trim() ? (
                        <p
                          className={
                            campoTematicoEsValido(unidad.campoTematico)
                              ? styles.campoTematicoOk
                              : styles.fieldErrorHint
                          }
                        >
                          {campoTematicoEsValido(unidad.campoTematico)
                            ? `${contarGuionesCampoTematico(unidad.campoTematico)} guiones detectados ✓`
                            : `Faltan guiones: tienes ${contarGuionesCampoTematico(unidad.campoTematico)} de ${MIN_CAMPOS_TEMATICOS} mínimos.`}
                        </p>
                      ) : null}
                    </div>

                    {(unidad.desempeniosSeleccionados?.length ?? 0) > 0 && (
                      <div className={styles.formGroup} style={{ marginTop: '12px' }}>
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
                                    disabled={noEditable}
                                    style={{
                                      background: noEditable ? '#cbd5e1' : '#ef4444',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '50%',
                                      width: '20px',
                                      height: '20px',
                                      cursor: noEditable ? 'not-allowed' : 'pointer',
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
                      </div>
                    )}
                  </div>
                  )
                })}
              </div>
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
                  type="submit"
                  className={styles.button}
                  disabled={loading || !modoIngresoPlan}
                >
                  {loading ? 'Generando Programación Anual Completa...' : '🚀 Generar mi PROGRAMACIÓN ANUAL con IA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>

      {/* Plan anual duplicado (mismo usuario, año, área, nivel, grado) */}
      {showModalPlanDuplicado && (
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
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModalPlanDuplicado(false)
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: '16px',
                color: '#b45309',
                fontSize: '20px',
                fontWeight: 600
              }}
            >
              Plan anual ya existe
            </h2>
            <p style={{ marginBottom: '20px', color: '#444', fontSize: '15px', lineHeight: 1.5 }}>
              Ya tienes un plan anual para este <strong>año</strong> con la misma{' '}
              <strong>área</strong>, <strong>nivel</strong> y <strong>grado</strong>. No se puede crear otro duplicado.
              Podés abrir el que ya existe o cambiar área, nivel o grado.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setShowModalPlanDuplicado(false)
                  setPlanDuplicadoId(null)
                }}
                style={{
                  padding: '10px 18px',
                  backgroundColor: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Cerrar
              </button>
              {planDuplicadoId != null && (
                <button
                  type="button"
                  onClick={() => {
                    setShowModalPlanDuplicado(false)
                    router.push(
                      `/servicios/crear-material/programacion-anual?planId=${planDuplicadoId}`
                    )
                  }}
                  style={{
                    padding: '10px 18px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  Abrir plan existente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de generación exitosa */}
      {showModalGeneradoExito && (
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
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '460px',
              width: '90%',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: '12px',
                color: '#1e40af',
                fontSize: '24px',
                fontWeight: 700
              }}
            >
              Felicitaciones
            </h2>
            <p
              style={{
                marginBottom: '20px',
                color: '#334155',
                fontSize: '16px',
                lineHeight: 1.5
              }}
            >
              Haz creado con exito tu programacion anual
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={irAHomeTrasGeneracionExito}
                style={{
                  padding: '10px 22px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sugerencias (problema / producto) */}
      {showModalSugerencias && unidadSugerenciaIndex !== null && tipoSugerencia && (
        <div
          className={styles.sugerenciasOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) cerrarModalSugerencias()
          }}
        >
          <div className={styles.sugerenciasDialog} role="dialog" aria-modal="true">
            <div className={styles.sugerenciasHeader}>
              <h2>
                {tipoSugerencia === 'problema'
                  ? 'Sugerencias — Problema / Campo temático'
                  : 'Sugerencias — Producto'}
              </h2>
              <p className={styles.sugerenciasSub}>
                UNIDAD {unidadSugerenciaIndex}
                {tipoSugerencia === 'producto' && formData.area
                  ? ` — ${formData.area}`
                  : ''}{' '}
                — elige una opción para completar el campo
              </p>
            </div>
            <div className={styles.sugerenciasLista}>
              {loadingSugerencias ? (
                <p className={styles.sugerenciasVacio}>Cargando sugerencias…</p>
              ) : sugerenciasLista.length === 0 ? (
                <p className={styles.sugerenciasVacio}>
                  {tipoSugerencia === 'producto' && !formData.areaId
                    ? 'Selecciona un área en la Fase 1 para ver sugerencias de producto.'
                    : 'No hay sugerencias registradas para esta área. Puedes agregarlas en el panel de administración.'}
                </p>
              ) : (
                sugerenciasLista.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.sugerenciaItem}
                    onClick={() => seleccionarSugerencia(item.descripcion)}
                  >
                    {item.descripcion}
                  </button>
                ))
              )}
            </div>
            <div className={styles.sugerenciasFooter}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={cerrarModalSugerencias}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de Competencias */}
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
              Seleccionar Competencias - UNIDAD {unidadModalIndex}
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
              {competencias.length > 0 && (
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#334155',
                    cursor: 'pointer'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={
                      competencias.length > 0 &&
                      competenciasSeleccionadasModal.length === competencias.length
                    }
                    onChange={(e) => handleSeleccionarTodasCompetenciasModal(e.target.checked)}
                  />
                  Seleccionar todas
                </label>
              )}
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

            {/* Conocimientos (oculto) */}
            {false && competenciasSeleccionadasModal.length > 0 && (
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

            {/* Desempeños (oculto) */}
            {false && conocimientosSeleccionadosModal.length > 0 && (
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
                disabled={competenciasSeleccionadasModal.length === 0}
                style={{
                  padding: '12px 24px',
                  backgroundColor: competenciasSeleccionadasModal.length === 0 ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: competenciasSeleccionadasModal.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
                onMouseOver={(e) => {
                  if (competenciasSeleccionadasModal.length > 0) {
                    e.currentTarget.style.backgroundColor = '#2563eb'
                  }
                }}
                onMouseOut={(e) => {
                  if (competenciasSeleccionadasModal.length > 0) {
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

      {/* Loader durante la generación de programación anual */}
      {loading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1200,
            padding: '16px'
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '22px 24px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 16px 30px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <svg width="52" height="52" viewBox="0 0 50 50" role="img" aria-label="Cargando">
                <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" strokeWidth="6" />
                <path d="M25 5a20 20 0 0 1 20 20" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round">
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
            <h3 style={{ margin: '0 0 8px', color: '#1e3a8a', fontSize: '18px', fontWeight: 700 }}>
              Generando programación anual...
            </h3>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: 1.45 }}>
              Este proceso puede tardar unos minutos. Por favor espera sin cerrar la página.
            </p>
          </div>
        </div>
      )}

      {AvisoModalEl}
    </>
  )
}

export default function ProgramacionAnualPage() {
  return (
    <Suspense fallback={
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>Cargando...</div>
        </div>
      </>
    }>
      <ProgramacionAnualContent />
    </Suspense>
  )
}

