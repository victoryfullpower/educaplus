'use client'

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import styles from './home.module.css'
import type { EstadoDocumentosPlan } from '@/lib/plan-estado-documentos'
import { claveAreaTab } from '@/lib/plan-area-tab'
import {
  leerRetornoModal,
  limpiarRetornoModal,
  parsearRetornoDesdeSearchParams,
  type ModalReturnState
} from '@/lib/plan-modal-return'
import { descargarPlanAnual as exportarPlanAnualDocx } from '@/lib/home-descarga-documento'
import {
  DocumentosStepper,
  StepModalDocumentos,
  PASOS_DOCUMENTOS,
  type PasoKey,
  type DocumentosPlanResponse
} from './StepModalDocumentos'

type PlanAnual = {
  id: number
  anio: number
  fechaHora: string
  area?: string | null
  areaId?: string | null
  grado?: string | null
  gradoId?: string | null
  nivel?: string | null
  nivelId?: string | null
  institucion?: string | null
  docente?: string | null
  director?: string | null
  departamento?: string | null
  provincia?: string | null
  distrito?: string | null
  unidades?: unknown
  estadoDocumentos?: EstadoDocumentosPlan
}

function ordenGrado(plan: PlanAnual): number {
  const id = parseInt(String(plan.gradoId ?? ''), 10)
  if (!Number.isNaN(id) && id > 0) return id
  const match = String(plan.grado ?? '').match(/(\d+)/)
  if (match) return parseInt(match[1], 10)
  return 999
}

function compararPlanes(a: PlanAnual, b: PlanAnual): number {
  const diffGrado = ordenGrado(a) - ordenGrado(b)
  if (diffGrado !== 0) return diffGrado
  if (a.anio !== b.anio) return b.anio - a.anio
  return new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime()
}

function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRol, setUserRol] = useState<string | null>(null)
  const [planesAnuales, setPlanesAnuales] = useState<PlanAnual[]>([])
  const [loading, setLoading] = useState(true)
  const [areaActiva, setAreaActiva] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [modalPlan, setModalPlan] = useState<PlanAnual | null>(null)
  const [modalPaso, setModalPaso] = useState<PasoKey | null>(null)
  const [modalCargando, setModalCargando] = useState(false)
  const [modalBloqueo, setModalBloqueo] = useState<string | null>(null)
  const [modalDatos, setModalDatos] = useState<DocumentosPlanResponse | null>(null)
  const [modalUnidadTab, setModalUnidadTab] = useState<string | null>(null)
  const retornoModalProcesadoRef = useRef(false)
  const bloquearReabrirModalRef = useRef(false)

  const cerrarModal = useCallback(() => {
    bloquearReabrirModalRef.current = true
    limpiarRetornoModal()
    setModalAbierto(false)
    setModalPlan(null)
    setModalPaso(null)
    setModalBloqueo(null)
    setModalDatos(null)
    setModalCargando(false)
    setModalUnidadTab(null)
    const area = searchParams.get('area')
    if (searchParams.get('modal')) {
      router.replace(area ? `/home?area=${encodeURIComponent(area)}` : '/home')
    } else {
      bloquearReabrirModalRef.current = false
    }
  }, [router, searchParams])

  const recargarModalDatos = useCallback(async () => {
    if (!modalPlan) return
    try {
      const res = await fetch(`/api/plan-anual/documentos?id=${modalPlan.id}`)
      if (res.ok) {
        const data = await res.json()
        setModalDatos({
          unidadesPlan: data.unidadesPlan ?? [],
          unidades: data.unidades ?? [],
          sesiones: data.sesiones ?? [],
          fichas: data.fichas ?? [],
          rubricas: data.rubricas ?? [],
          listasCotejo: data.listasCotejo ?? []
        })
      }
    } catch (e) {
      console.error(e)
    }
  }, [modalPlan])

  const abrirModalDesdeRetorno = useCallback(
    async (retorno: ModalReturnState) => {
      let plan = planesAnuales.find((p) => p.id === retorno.planId)
      try {
        const planesResponse = await fetch('/api/plan-anual')
        if (planesResponse.ok) {
          const planesData = await planesResponse.json()
          const lista: PlanAnual[] = planesData.planesAnuales || []
          setPlanesAnuales(lista)
          plan = lista.find((p) => p.id === retorno.planId) ?? plan
        }
      } catch (e) {
        console.error(e)
      }
      if (!plan) return

      const claveArea = claveAreaTab(
        retorno.area ?? plan.area,
        retorno.areaId ?? plan.areaId
      )
      setAreaActiva(claveArea)

      const params = new URLSearchParams()
      params.set('area', claveArea)
      params.set('modal', retorno.paso)
      params.set('planId', String(retorno.planId))
      if (retorno.unidad != null && String(retorno.unidad).trim() !== '') {
        params.set('unidad', String(retorno.unidad))
      }
      router.replace(`/home?${params.toString()}`)

      setModalPlan(plan)
      setModalPaso(retorno.paso)
      setModalBloqueo(null)
      setModalDatos(null)
      setModalUnidadTab(retorno.unidad ?? null)
      setModalAbierto(true)
      setModalCargando(true)

      try {
        const res = await fetch(`/api/plan-anual/documentos?id=${plan.id}`)
        if (res.ok) {
          const data = await res.json()
          setModalDatos({
            unidadesPlan: data.unidadesPlan ?? [],
            unidades: data.unidades ?? [],
            sesiones: data.sesiones ?? [],
            fichas: data.fichas ?? [],
            rubricas: data.rubricas ?? [],
            listasCotejo: data.listasCotejo ?? []
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setModalCargando(false)
      }
    },
    [planesAnuales, router]
  )

  const handlePasoClick = useCallback(
    async (plan: PlanAnual, paso: PasoKey, index: number) => {
      const estado = plan.estadoDocumentos
      if (!estado) return

      for (let i = 0; i < index; i++) {
        const prev = PASOS_DOCUMENTOS[i]
        if (!estado[prev.key]) {
          setModalPlan(plan)
          setModalPaso(paso)
          setModalBloqueo(
            `Aún no has registrado el paso anterior: ${prev.label}. Complétalo antes de continuar con ${PASOS_DOCUMENTOS.find((p) => p.key === paso)?.label ?? paso}.`
          )
          setModalDatos(null)
          setModalCargando(false)
          setModalAbierto(true)
          return
        }
      }

      setModalPlan(plan)
      setModalPaso(paso)
      setModalBloqueo(null)
      setModalDatos(null)
      setModalAbierto(true)
      setModalCargando(true)

      try {
        const res = await fetch(`/api/plan-anual/documentos?id=${plan.id}`)
        if (res.ok) {
          const data = await res.json()
          setModalDatos({
            unidadesPlan: data.unidadesPlan ?? [],
            unidades: data.unidades ?? [],
            sesiones: data.sesiones ?? [],
            fichas: data.fichas ?? [],
            rubricas: data.rubricas ?? [],
            listasCotejo: data.listasCotejo ?? []
          })
        }
      } catch (e) {
        console.error(e)
      } finally {
        setModalCargando(false)
      }
    },
    []
  )

  const descargarPlanAnual = useCallback(
    (plan: PlanAnual) => exportarPlanAnualDocx(plan),
    []
  )

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await fetch('/api/auth/check')
        const authData = await authResponse.json()
        
        if (!authData.authenticated) {
          router.push('/login?redirect=/home')
          return
        }

        setUserRol(authData.user?.rol)
        setIsAuthenticated(true)

        // Si es Administrador, redirigir al panel
        if (authData.user?.rol === 'Administrador') {
          router.push('/paneladministracion')
          return
        }

        // Si es Usuario, cargar sus planes anuales
        if (authData.user?.rol === 'Usuario') {
          const planesResponse = await fetch('/api/plan-anual')
          if (planesResponse.ok) {
            const planesData = await planesResponse.json()
            setPlanesAnuales(planesData.planesAnuales || [])
          }
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        router.push('/login?redirect=/home')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const { planesPorArea, areasOrdenadas } = useMemo(() => {
    const grupos: Record<string, PlanAnual[]> = {}
    for (const plan of planesAnuales) {
      const clave = claveAreaTab(plan.area, plan.areaId)
      if (!grupos[clave]) grupos[clave] = []
      grupos[clave].push(plan)
    }
    for (const clave of Object.keys(grupos)) {
      grupos[clave].sort(compararPlanes)
    }
    const areas = Object.keys(grupos).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )
    return { planesPorArea: grupos, areasOrdenadas: areas }
  }, [planesAnuales])

  useEffect(() => {
    if (areasOrdenadas.length === 0) {
      setAreaActiva(null)
      return
    }
    const param = searchParams.get('area')
    if (param) {
      const decoded = decodeURIComponent(param)
      if (areasOrdenadas.includes(decoded)) {
        setAreaActiva(decoded)
        return
      }
    }
    setAreaActiva((prev) =>
      prev && areasOrdenadas.includes(prev) ? prev : areasOrdenadas[0]
    )
  }, [areasOrdenadas, searchParams])

  useEffect(() => {
    if (loading || !isAuthenticated || planesAnuales.length === 0) return

    const retorno =
      parsearRetornoDesdeSearchParams(searchParams) ?? leerRetornoModal()
    if (!retorno) {
      bloquearReabrirModalRef.current = false
      retornoModalProcesadoRef.current = false
      return
    }

    if (bloquearReabrirModalRef.current) return

    if (
      modalAbierto &&
      modalPlan?.id === retorno.planId &&
      modalPaso === retorno.paso
    ) {
      return
    }

    if (retornoModalProcesadoRef.current) return

    retornoModalProcesadoRef.current = true
    void abrirModalDesdeRetorno(retorno)
    limpiarRetornoModal()
  }, [
    loading,
    isAuthenticated,
    planesAnuales,
    searchParams,
    abrirModalDesdeRetorno,
    modalPlan?.id,
    modalPaso,
    modalAbierto
  ])

  const planesAreaActiva = areaActiva ? planesPorArea[areaActiva] ?? [] : []

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>Cargando...</div>
        </div>
      </>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mis Documentos Generados</h1>
          <Link
            href="/servicios/crear-material/programacion-anual"
            className={styles.newPlanButton}
          >
            ➕ Nuevo plan anual
          </Link>
        </div>
        <div className={styles.content}>
          {areasOrdenadas.length === 0 ? (
            <div className={styles.card}>
              <h2>No hay documentos generados</h2>
              <p style={{ marginTop: '20px', color: '#666', lineHeight: '1.6' }}>
                Aún no has generado ningún plan anual.
              </p>
              <Link
                href="/servicios/crear-material/programacion-anual"
                className={styles.newPlanButtonCard}
              >
                ➕ Crear mi primer plan anual
              </Link>
            </div>
          ) : (
            <div className={styles.card}>
              <h2 className={styles.sectionTitle}>Mis planes por área</h2>
              <p className={styles.sectionHint}>
                Cada pestaña agrupa tus documentos del mismo área curricular, ordenados por grado.
              </p>

              <div className={styles.tabsBar} role="tablist" aria-label="Áreas curriculares">
                {areasOrdenadas.map((area) => {
                  const count = planesPorArea[area].length
                  const activa = area === areaActiva
                  return (
                    <button
                      key={area}
                      type="button"
                      role="tab"
                      aria-selected={activa}
                      className={`${styles.tab} ${activa ? styles.tabActive : ''}`}
                      onClick={() => setAreaActiva(area)}
                    >
                      <span className={styles.tabLabel}>{area}</span>
                      <span className={styles.tabBadge}>{count}</span>
                    </button>
                  )
                })}
              </div>

              {areaActiva && (
                <div
                  className={styles.tabPanel}
                  role="tabpanel"
                  aria-label={`Planes de ${areaActiva}`}
                >
                  <h3 className={styles.areaPanelTitle}>{areaActiva}</h3>
                  <div className={styles.documentsList}>
                    {planesAreaActiva.map((plan) => (
                      <div key={plan.id} className={styles.documentCard}>
                        <div className={styles.documentCardBody}>
                        <div className={styles.documentInfo}>
                          <h3 className={styles.documentTitle}>
                            {plan.grado || 'Grado no indicado'}
                            {plan.nivel ? ` · ${plan.nivel}` : ''}
                          </h3>
                          <div className={styles.documentMeta}>
                            <span className={styles.metaItem}>📚 Año {plan.anio}</span>
                            <span className={styles.metaItem}>
                              📅{' '}
                              {new Date(plan.fechaHora).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {plan.institucion && (
                              <span className={styles.metaItem}>🏫 {plan.institucion}</span>
                            )}
                            {plan.docente && (
                              <span className={styles.metaItem}>👤 {plan.docente}</span>
                            )}
                          </div>
                          {plan.unidades && Array.isArray(plan.unidades) && (
                            <div className={styles.unidadesCount}>
                              {plan.unidades.filter(
                                (u: { problemaPotencialidad?: string; producto?: string }) =>
                                  u.problemaPotencialidad || u.producto
                              ).length}{' '}
                              unidad(es) configurada(s)
                            </div>
                          )}
                        </div>
                        </div>
                        <DocumentosStepper
                          estado={plan.estadoDocumentos}
                          onPasoClick={(paso, index) => handlePasoClick(plan, paso, index)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <StepModalDocumentos
        abierto={modalAbierto}
        plan={modalPlan}
        paso={modalPaso}
        cargando={modalCargando}
        bloqueadoMensaje={modalBloqueo}
        datos={modalDatos}
        onCerrar={cerrarModal}
        onDescargarPlan={
          modalPlan ? () => descargarPlanAnual(modalPlan) : undefined
        }
        onRecargarDatos={recargarModalDatos}
        unidadTabInicial={modalUnidadTab}
      />
    </>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <>
          <Header />
          <div className={styles.container}>
            <div className={styles.loading}>Cargando...</div>
          </div>
        </>
      }
    >
      <HomeContent />
    </Suspense>
  )
}

