'use client'

import { Fragment, useState, useEffect, useMemo, useRef, useLayoutEffect } from 'react'
import Link from 'next/link'
import styles from './home.module.css'
import {
  etiquetaContadorSesionesPendientes,
  type EstadoDocumentosPlan
} from '@/lib/plan-estado-documentos'
import { guardarRetornoModal } from '@/lib/plan-modal-return'
import {
  etiquetaLinkGenerar,
  linkGenerarDocumento,
  linkFichasDesdeSesionPlan,
  linkRubricaDesdeSesionPlan,
  linkSesionesDesdeUnidadPlan
} from '@/lib/plan-documentos-links'
import {
  descargarUnidadAprendizaje,
  descargarSesionAprendizaje,
  descargarFichaAprendizaje,
  descargarRubricaAnalitica,
  descargarListaCotejo
} from '@/lib/home-descarga-documento'

export type PasoKey = keyof EstadoDocumentosPlan

const PLAN_UNIDADES_MAX = 8

export const PASOS_DOCUMENTOS: { key: PasoKey; label: string; short: string }[] = [
  { key: 'planAnual', label: 'Plan anual', short: 'Plan' },
  { key: 'unidad', label: 'Unidad', short: 'Unidad' },
  { key: 'sesiones', label: 'Sesiones de aprendizaje', short: 'Sesiones' },
  { key: 'fichas', label: 'Fichas de aprendizaje', short: 'Fichas' },
  { key: 'rubrica', label: 'Rúbrica analítica', short: 'Rúbrica' }
]

type PlanModal = {
  id: number
  anio: number
  area?: string | null
  areaId?: string | null
  grado?: string | null
  gradoId?: string | null
  unidades?: unknown
}

export type DocumentosPlanResponse = {
  unidadesPlan: Array<{
    numero: number
    tituloUnidad?: string
    producto?: string
    problemaPotencialidad?: string
  }>
  unidades: Array<{
    id: number
    unidad: string | null
    tituloUnidad: string | null
    fechaHora: string
    sesionesGeneradas?: Array<{ numeroSesion: number; titulo: string | null }>
    resumenSesiones?: { total: number; generadas: number; pendientes: number }
  }>
  sesiones: Array<{
    id: number
    numeroSesion: number
    titulo: string | null
    unidadNumero: string | null
    fechaHora: string
  }>
  fichas: Array<{
    id: number
    sesionId: number
    numeroSesion: number
    titulo: string | null
    unidadNumero: string | null
    fechaHora: string
  }>
  rubricas: Array<{
    id: number
    sesionId: number
    numeroSesion: number
    titulo: string | null
    unidadNumero: string | null
    fechaHora: string
  }>
  listasCotejo: Array<{
    id: number
    sesionId: number
    numeroSesion: number
    titulo: string | null
    unidadNumero: string | null
    fechaHora: string
  }>
}

function formatearFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

type SesionModalItem = DocumentosPlanResponse['sesiones'][number]

function ordenarClavesUnidad(keys: string[]) {
  return [...keys].sort((a, b) => {
    const na = parseInt(a, 10)
    const nb = parseInt(b, 10)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return a.localeCompare(b, 'es', { sensitivity: 'base' })
  })
}

function agruparSesionesPorUnidad(sesiones: SesionModalItem[]) {
  const grupos: Record<string, SesionModalItem[]> = {}
  for (const s of sesiones) {
    const key = String(s.unidadNumero ?? '—')
    if (!grupos[key]) grupos[key] = []
    grupos[key].push(s)
  }
  for (const key of Object.keys(grupos)) {
    grupos[key].sort((a, b) => a.numeroSesion - b.numeroSesion)
  }
  return grupos
}

function construirTabsUnidadesSesiones(datos: DocumentosPlanResponse) {
  const grupos = agruparSesionesPorUnidad(datos.sesiones)
  const keys = new Set<string>()
  for (const u of datos.unidades) {
    if (u.unidad && u.unidad !== '0') keys.add(u.unidad)
  }
  for (const up of datos.unidadesPlan) {
    if (up.numero > 0) keys.add(String(up.numero))
  }
  for (const k of Object.keys(grupos)) keys.add(k)
  const unidades = ordenarClavesUnidad([...keys])
  return { unidades, grupos }
}

type FichaModalItem = DocumentosPlanResponse['fichas'][number]

function tituloUnidadEnDatos(datos: DocumentosPlanResponse, numUnidad: string) {
  return (
    datos.unidades.find((u) => u.unidad === numUnidad)?.tituloUnidad ??
    datos.unidadesPlan.find((u) => String(u.numero) === numUnidad)?.tituloUnidad ??
    null
  )
}

function fichaDeSesion(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): FichaModalItem | undefined {
  return datos.fichas.find(
    (f) =>
      f.sesionId === sesion.id ||
      (String(f.unidadNumero) === String(sesion.unidadNumero) &&
        f.numeroSesion === sesion.numeroSesion)
  )
}

type RubricaModalItem = DocumentosPlanResponse['rubricas'][number]

function rubricaDeSesion(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): RubricaModalItem | undefined {
  return datos.rubricas.find(
    (r) =>
      r.sesionId === sesion.id ||
      (String(r.unidadNumero) === String(sesion.unidadNumero) &&
        r.numeroSesion === sesion.numeroSesion)
  )
}

type ListaCotejoModalItem = DocumentosPlanResponse['listasCotejo'][number]

function listaCotejoDeSesion(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): ListaCotejoModalItem | undefined {
  return (datos.listasCotejo ?? []).find(
    (lc) =>
      lc.sesionId === sesion.id ||
      (String(lc.unidadNumero) === String(sesion.unidadNumero) &&
        lc.numeroSesion === sesion.numeroSesion)
  )
}

function construirVistaFichasPorUnidad(datos: DocumentosPlanResponse) {
  const grupos = agruparSesionesPorUnidad(datos.sesiones)
  const unidades = ordenarClavesUnidad(
    Object.keys(grupos).filter((k) => (grupos[k]?.length ?? 0) > 0)
  )
  const fichasPorSesion = new Map<string, FichaModalItem>()
  for (const f of datos.fichas) {
    fichasPorSesion.set(`${f.unidadNumero}-${f.numeroSesion}`, f)
  }
  return { unidades, grupos, fichasPorSesion }
}

type DocumentosStepperProps = {
  estado?: EstadoDocumentosPlan
  onPasoClick: (paso: PasoKey, index: number) => void
}

export function DocumentosStepper({ estado, onPasoClick }: DocumentosStepperProps) {
  if (!estado) return null

  return (
    <div className={styles.stepper} aria-label="Documentos generados">
      <p className={styles.stepperTitle}>Progreso de materiales (clic para ver detalle)</p>
      <div className={styles.stepperTrack}>
        {PASOS_DOCUMENTOS.map((paso, index) => {
          const listo = estado[paso.key]
          const conectorListo =
            index > 0 ? estado[PASOS_DOCUMENTOS[index - 1].key] : false
          const unidadesGen = estado.unidadesGeneradas ?? []
          const tooltipUnidad =
            paso.key === 'unidad' && unidadesGen.length > 0
              ? `Unidades generadas: ${unidadesGen.map((n) => `Unidad ${n}`).join(', ')}`
              : null
          return (
            <Fragment key={paso.key}>
              {index > 0 && (
                <div
                  className={`${styles.stepperConnector} ${conectorListo ? styles.stepperConnectorDone : ''}`}
                  aria-hidden
                />
              )}
              <button
                type="button"
                className={`${styles.stepperStep} ${listo ? styles.stepperStepDone : ''} ${
                  tooltipUnidad ? styles.stepperStepWithTooltip : ''
                }`}
                title={tooltipUnidad ?? paso.label}
                aria-label={
                  tooltipUnidad ? `${paso.label}. ${tooltipUnidad}` : paso.label
                }
                onClick={() => onPasoClick(paso.key, index)}
              >
                <span
                  className={`${styles.stepperCircle} ${listo ? styles.stepperCircleDone : ''}`}
                >
                  {paso.key === 'unidad' && unidadesGen.length > 0
                    ? unidadesGen.length
                    : listo
                      ? '✓'
                      : index + 1}
                </span>
                <span className={styles.stepperLabel}>{paso.short}</span>
                {tooltipUnidad && (
                  <span className={styles.stepperTooltip} role="tooltip">
                    {unidadesGen.map((n) => `U${n}`).join(' · ')}
                  </span>
                )}
              </button>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

type StepModalProps = {
  abierto: boolean
  plan: PlanModal | null
  paso: PasoKey | null
  cargando: boolean
  bloqueadoMensaje: string | null
  datos: DocumentosPlanResponse | null
  onCerrar: () => void
  onDescargarPlan?: () => void | Promise<void>
  onRecargarDatos?: () => Promise<void>
  /** Pestaña de unidad al reabrir el modal de sesiones. */
  unidadTabInicial?: string | null
}

const ACORDEON_ABRIR_MS = 2200
const ACORDEON_CERRAR_MS = 1400
const ACORDEON_CAIDA_MS = 1900
const ACORDEON_CAIDA_DELAY_MS = 80
const ACORDEON_CAIDA_INICIO_PX = -120

function easeSuave(t: number) {
  const x = Math.min(1, Math.max(0, t))
  return 1 - (1 - x) ** 4
}

/** Animación cuadro a cuadro: no depende de CSS transition (a veces no corre). */
function animarValor(
  desde: number,
  hasta: number,
  duracionMs: number,
  onFrame: (valor: number) => void,
  delayMs = 0
) {
  let cancelado = false
  let rafId = 0
  let timeoutId = 0

  const iniciar = () => {
    const t0 = performance.now()
    const paso = (ahora: number) => {
      if (cancelado) return
      const t = Math.min(1, (ahora - t0) / duracionMs)
      onFrame(desde + (hasta - desde) * easeSuave(t))
      if (t < 1) rafId = window.requestAnimationFrame(paso)
    }
    rafId = window.requestAnimationFrame(paso)
  }

  if (delayMs > 0) {
    timeoutId = window.setTimeout(iniciar, delayMs)
  } else {
    iniciar()
  }

  return () => {
    cancelado = true
    window.clearTimeout(timeoutId)
    window.cancelAnimationFrame(rafId)
  }
}

function AcordeonPanelAnimado({
  abierta,
  contentKey,
  children
}: {
  abierta: boolean
  contentKey?: string
  children: React.ReactNode
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const estabaAbiertaRef = useRef(false)
  const canceladoresRef = useRef<Array<() => void>>([])
  const [heightPx, setHeightPx] = useState(0)
  const [caidaY, setCaidaY] = useState(ACORDEON_CAIDA_INICIO_PX)
  const [caidaOpacidad, setCaidaOpacidad] = useState(0)
  const caidaYRef = useRef(ACORDEON_CAIDA_INICIO_PX)
  const caidaOpacidadRef = useRef(0)
  caidaYRef.current = caidaY
  caidaOpacidadRef.current = caidaOpacidad

  useLayoutEffect(() => {
    const inner = innerRef.current
    canceladoresRef.current.forEach((f) => f())
    canceladoresRef.current = []
    if (!inner) return

    const registrar = (fn: () => void) => {
      canceladoresRef.current.push(fn)
    }

    if (abierta) {
      const objetivo = inner.scrollHeight

      if (!estabaAbiertaRef.current) {
        setHeightPx(0)
        setCaidaY(ACORDEON_CAIDA_INICIO_PX)
        setCaidaOpacidad(0)
        void inner.offsetHeight

        registrar(animarValor(0, objetivo, ACORDEON_ABRIR_MS, setHeightPx))
        registrar(
          animarValor(
            ACORDEON_CAIDA_INICIO_PX,
            0,
            ACORDEON_CAIDA_MS,
            setCaidaY,
            ACORDEON_CAIDA_DELAY_MS
          )
        )
        registrar(
          animarValor(0, 1, ACORDEON_CAIDA_MS, setCaidaOpacidad, ACORDEON_CAIDA_DELAY_MS)
        )
        estabaAbiertaRef.current = true
      } else {
        setHeightPx(objetivo)
      }
      return () => canceladoresRef.current.forEach((f) => f())
    }

    if (!estabaAbiertaRef.current) {
      setHeightPx(0)
      setCaidaY(ACORDEON_CAIDA_INICIO_PX)
      setCaidaOpacidad(0)
      return
    }

    estabaAbiertaRef.current = false
    const alturaActual = inner.scrollHeight

    registrar(animarValor(alturaActual, 0, ACORDEON_CERRAR_MS, setHeightPx))
    registrar(
      animarValor(
        caidaYRef.current,
        ACORDEON_CAIDA_INICIO_PX,
        ACORDEON_CERRAR_MS * 0.7,
        setCaidaY
      )
    )
    registrar(
      animarValor(caidaOpacidadRef.current, 0, ACORDEON_CERRAR_MS * 0.6, setCaidaOpacidad)
    )

    return () => canceladoresRef.current.forEach((f) => f())
  }, [abierta, contentKey])

  return (
    <div
      className={styles.acordeonPanelAnimado}
      style={{ height: heightPx }}
      aria-hidden={!abierta && heightPx === 0}
    >
      <div
        ref={innerRef}
        className={styles.acordeonPanelInnerAnimado}
        style={{
          transform: `translate3d(0, ${caidaY}px, 0)`,
          opacity: caidaOpacidad
        }}
      >
        {children}
      </div>
    </div>
  )
}

function ItemConDescarga({
  children,
  itemKey,
  descargandoKey,
  onDescargar,
  linkSesiones,
  onAntesIrSesiones,
  onGenerarFicha,
  onDescargarFicha,
  onGenerarRubrica,
  onDescargarRubrica,
  onGenerarListaCotejo,
  onDescargarListaCotejo,
  linkRubrica,
  sesionesGeneradas,
  etiquetaDescargar = '📥 Descargar'
}: {
  children: React.ReactNode
  itemKey: string
  descargandoKey: string | null
  onDescargar: () => void | Promise<void>
  etiquetaDescargar?: string
  linkSesiones?: string
  onAntesIrSesiones?: () => void
  /** Genera y descarga la ficha sin salir del modal. */
  onGenerarFicha?: () => void | Promise<void>
  /** Descarga la ficha ya generada de esta sesión. */
  onDescargarFicha?: () => void | Promise<void>
  /** Genera y descarga la rúbrica sin salir del modal. */
  onGenerarRubrica?: () => void | Promise<void>
  /** Descarga la rúbrica ya generada de esta sesión. */
  onDescargarRubrica?: () => void | Promise<void>
  onGenerarListaCotejo?: () => void | Promise<void>
  onDescargarListaCotejo?: () => void | Promise<void>
  linkRubrica?: string
  sesionesGeneradas?: Array<{ numeroSesion: number; titulo: string | null }>
}) {
  const cargando = descargandoKey === itemKey
  const fichaKey = `${itemKey}-ficha`
  const generarFichaKey = `${itemKey}-generar-ficha`
  const rubricaKey = `${itemKey}-rubrica`
  const generarRubricaKey = `${itemKey}-generar-rubrica`
  const listaCotejoKey = `${itemKey}-lista-cotejo`
  const generarListaCotejoKey = `${itemKey}-generar-lista-cotejo`
  const cargandoFicha = descargandoKey === fichaKey
  const cargandoGenerarFicha = descargandoKey === generarFichaKey
  const cargandoRubrica = descargandoKey === rubricaKey
  const cargandoGenerarRubrica = descargandoKey === generarRubricaKey
  const cargandoListaCotejo = descargandoKey === listaCotejoKey
  const cargandoGenerarListaCotejo = descargandoKey === generarListaCotejoKey
  const countSesiones = sesionesGeneradas?.length ?? 0
  const tooltipSesiones =
    countSesiones > 0
      ? sesionesGeneradas!
          .map(
            (s) =>
              `Sesión ${s.numeroSesion}${s.titulo ? `: ${s.titulo}` : ''}`
          )
          .join('\n')
      : undefined
  return (
    <li className={styles.modalListItem}>
      <div className={styles.modalListItemBody}>{children}</div>
      <div className={styles.modalListItemActions}>
        {linkSesiones && (
          <Link
            href={linkSesiones}
            className={`${styles.modalBtnSesiones} ${
              tooltipSesiones ? styles.modalBtnSesionesWithTooltip : ''
            }`}
            title={tooltipSesiones}
            onClick={() => onAntesIrSesiones?.()}
          >
            📋 Ir a sesiones{countSesiones > 0 ? ` (${countSesiones})` : ''}
            {tooltipSesiones && (
              <span className={styles.modalBtnSesionesTooltip} role="tooltip">
                {sesionesGeneradas!.map((s) => `S${s.numeroSesion}`).join(' · ')}
              </span>
            )}
          </Link>
        )}
        {onGenerarFicha ? (
          <button
            type="button"
            className={styles.modalBtnGenerarFicha}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarFicha()}
          >
            {cargandoGenerarFicha ? 'Generando…' : '➕ Generar ficha'}
          </button>
        ) : onDescargarFicha ? (
          <button
            type="button"
            className={styles.modalBtnFicha}
            disabled={descargandoKey !== null}
            onClick={() => void onDescargarFicha()}
          >
            {cargandoFicha ? 'Descargando…' : '📥 Descargar ficha'}
          </button>
        ) : null}
        {onGenerarRubrica ? (
          <button
            type="button"
            className={styles.modalBtnGenerarRubrica}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarRubrica()}
          >
            {cargandoGenerarRubrica ? 'Generando…' : '➕ Generar rúbrica'}
          </button>
        ) : onDescargarRubrica ? (
          <button
            type="button"
            className={styles.modalBtnRubrica}
            disabled={descargandoKey !== null}
            onClick={() => void onDescargarRubrica()}
          >
            {cargandoRubrica ? 'Descargando…' : '📥 Descargar rúbrica'}
          </button>
        ) : linkRubrica ? (
          <Link href={linkRubrica} className={styles.modalBtnRubrica}>
            📊 Ir a rúbrica
          </Link>
        ) : null}
        {onGenerarListaCotejo ? (
          <button
            type="button"
            className={styles.modalBtnGenerarListaCotejo}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarListaCotejo()}
          >
            {cargandoGenerarListaCotejo ? 'Generando…' : '➕ Generar lista cotejo'}
          </button>
        ) : onDescargarListaCotejo ? (
          <button
            type="button"
            className={styles.modalBtnListaCotejo}
            disabled={descargandoKey !== null}
            onClick={() => void onDescargarListaCotejo()}
          >
            {cargandoListaCotejo ? 'Descargando…' : '📥 Descargar lista cotejo'}
          </button>
        ) : null}
        <button
          type="button"
          className={styles.modalBtnDescargar}
          disabled={descargandoKey !== null}
          onClick={() => void onDescargar()}
        >
          {cargando ? 'Descargando…' : etiquetaDescargar}
        </button>
      </div>
    </li>
  )
}

export function StepModalDocumentos({
  abierto,
  plan,
  paso,
  cargando,
  bloqueadoMensaje,
  datos,
  onCerrar,
  onDescargarPlan,
  onRecargarDatos,
  unidadTabInicial
}: StepModalProps) {
  const [descargandoKey, setDescargandoKey] = useState<string | null>(null)
  const [descargandoPlanAnual, setDescargandoPlanAnual] = useState(false)
  const [unidadActivaTab, setUnidadActivaTab] = useState<string | null>(null)
  const [unidadAcordeonAbierta, setUnidadAcordeonAbierta] = useState<string | null>(null)
  const [sesionFichaActiva, setSesionFichaActiva] = useState<{
    unidad: string
    numeroSesion: number
  } | null>(null)
  const fichasAcordeonIniciadoRef = useRef(false)

  const sesionesPorUnidad = useMemo(
    () => (datos ? construirTabsUnidadesSesiones(datos) : null),
    [datos]
  )

  const vistaFichas = useMemo(
    () => (datos ? construirVistaFichasPorUnidad(datos) : null),
    [datos]
  )

  useEffect(() => {
    if (!abierto || paso !== 'sesiones' || !sesionesPorUnidad) {
      setUnidadActivaTab(null)
      return
    }
    const { unidades } = sesionesPorUnidad
    const tabInicial =
      unidadTabInicial && unidades.includes(String(unidadTabInicial))
        ? String(unidadTabInicial)
        : null
    setUnidadActivaTab((prev) => {
      if (tabInicial) return tabInicial
      if (prev && unidades.includes(prev)) return prev
      return unidades[0] ?? null
    })
  }, [abierto, paso, sesionesPorUnidad, unidadTabInicial])

  useEffect(() => {
    if (!abierto || paso !== 'fichas') {
      setUnidadAcordeonAbierta(null)
      setSesionFichaActiva(null)
      fichasAcordeonIniciadoRef.current = false
      return
    }
    if (!vistaFichas || vistaFichas.unidades.length === 0) return

    const { unidades, grupos } = vistaFichas

    if (!fichasAcordeonIniciadoRef.current) {
      fichasAcordeonIniciadoRef.current = true
      const primeraUnidad = unidades[0]
      setUnidadAcordeonAbierta(primeraUnidad)
      const sesionesIniciales = grupos[primeraUnidad] ?? []
      if (sesionesIniciales[0]) {
        setSesionFichaActiva({
          unidad: primeraUnidad,
          numeroSesion: sesionesIniciales[0].numeroSesion
        })
      }
      return
    }

    if (unidadAcordeonAbierta == null) return

    if (!unidades.includes(unidadAcordeonAbierta)) {
      setUnidadAcordeonAbierta(null)
      setSesionFichaActiva(null)
      return
    }

    const sesiones = grupos[unidadAcordeonAbierta] ?? []
    const sesionValida =
      sesionFichaActiva?.unidad === unidadAcordeonAbierta &&
      sesiones.some((s) => s.numeroSesion === sesionFichaActiva.numeroSesion)
    if (!sesionValida && sesiones[0]) {
      setSesionFichaActiva({
        unidad: unidadAcordeonAbierta,
        numeroSesion: sesiones[0].numeroSesion
      })
    }
  }, [abierto, paso, vistaFichas, unidadAcordeonAbierta, sesionFichaActiva])

  if (!abierto || !plan || !paso) return null

  const generandoFicha = Boolean(descargandoKey?.endsWith('-generar-ficha'))
  const generandoRubrica = Boolean(descargandoKey?.endsWith('-generar-rubrica'))
  const generandoListaCotejo = Boolean(
    descargandoKey?.endsWith('-generar-lista-cotejo')
  )
  const generandoDocumento =
    generandoFicha ||
    generandoRubrica ||
    generandoListaCotejo ||
    descargandoPlanAnual

  const ejecutarDescargaPlan = async () => {
    if (!onDescargarPlan) return
    setDescargandoPlanAnual(true)
    try {
      await onDescargarPlan()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al descargar el plan anual')
    } finally {
      setDescargandoPlanAnual(false)
    }
  }

  const pasoInfo = PASOS_DOCUMENTOS.find((p) => p.key === paso)
  const titulo = pasoInfo?.label ?? paso
  const unidadParaGenerarSesiones =
    paso === 'sesiones'
      ? (unidadActivaTab ?? sesionesPorUnidad?.unidades[0] ?? null)
      : null
  const linkGenerarSesiones =
    unidadParaGenerarSesiones != null
      ? linkSesionesDesdeUnidadPlan(plan, unidadParaGenerarSesiones, {
          volver: 'sesiones'
        })
      : linkGenerarDocumento('sesiones', plan, plan.unidades)
  const linkGenerarFichas =
    sesionFichaActiva != null
      ? linkFichasDesdeSesionPlan(
          plan,
          sesionFichaActiva.unidad,
          sesionFichaActiva.numeroSesion
        )
      : null
  const linkGenerar =
    paso === 'sesiones'
      ? linkGenerarSesiones
      : paso === 'fichas'
        ? (linkGenerarFichas ?? '#')
        : linkGenerarDocumento(paso, plan, plan.unidades)
  const puedeGenerarFicha = paso === 'fichas' && sesionFichaActiva != null

  const guardarRetornoAlIrASesiones = (
    volver: 'unidad' | 'sesiones',
    unidad: string | number | null | undefined
  ) => {
    if (!plan) return
    guardarRetornoModal({
      planId: plan.id,
      paso: volver,
      unidad: unidad != null ? String(unidad) : null,
      area: plan.area ?? null,
      areaId: plan.areaId ?? null
    })
  }

  const guardarRetornoAlIrAPlanAnual = () => {
    if (!plan) return
    guardarRetornoModal({
      planId: plan.id,
      paso: 'planAnual',
      area: plan.area ?? null,
      areaId: plan.areaId ?? null
    })
  }

  const unidadModalSesiones =
    paso === 'sesiones' && unidadParaGenerarSesiones != null && datos
      ? datos.unidades.find(
          (u) => String(u.unidad) === String(unidadParaGenerarSesiones)
        )
      : undefined
  const sesionesEnListaUnidadActiva =
    paso === 'sesiones' &&
    unidadParaGenerarSesiones != null &&
    sesionesPorUnidad
      ? (sesionesPorUnidad.grupos[String(unidadParaGenerarSesiones)] ?? []).length
      : 0
  const resumenSesionesModal = (() => {
    const base = unidadModalSesiones?.resumenSesiones
    if (!base) return undefined
    const generadas = sesionesEnListaUnidadActiva
    return {
      ...base,
      generadas,
      pendientes: Math.max(0, base.total - generadas)
    }
  })()
  const contadorSesionesBtn = resumenSesionesModal
    ? etiquetaContadorSesionesPendientes(resumenSesionesModal)
    : null
  const tituloContadorSesiones =
    resumenSesionesModal && resumenSesionesModal.total > 0
      ? resumenSesionesModal.pendientes > 0
        ? `${resumenSesionesModal.pendientes} sesión(es) pendiente(s) · ${resumenSesionesModal.generadas} ya generada(s)`
        : 'Todas las sesiones de esta unidad ya están generadas'
      : undefined
  const sesionesUnidadCompletas =
    paso === 'sesiones' &&
    resumenSesionesModal != null &&
    resumenSesionesModal.total > 0 &&
    resumenSesionesModal.pendientes <= 0

  const unidadesConfiguradasPlan =
    paso === 'planAnual' && datos ? datos.unidadesPlan.length : 0
  const contadorPlanAnualBtn = ` (${unidadesConfiguradasPlan} de ${PLAN_UNIDADES_MAX})`
  const planAnualCompleto = unidadesConfiguradasPlan >= PLAN_UNIDADES_MAX
  const tituloContadorPlanAnual =
    planAnualCompleto
      ? 'Las 8 unidades del plan ya están configuradas'
      : `${PLAN_UNIDADES_MAX - unidadesConfiguradasPlan} unidad(es) por configurar en el plan`

  const ejecutarDescarga = async (key: string, fn: () => Promise<void>) => {
    setDescargandoKey(key)
    try {
      await fn()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al descargar')
    } finally {
      setDescargandoKey(null)
    }
  }

  const renderLista = () => {
    if (cargando) {
      return <p className={styles.modalMuted}>Cargando...</p>
    }
    if (!datos) return null

    switch (paso) {
      case 'planAnual':
        if (datos.unidadesPlan.length === 0) {
          return (
            <p className={styles.modalMuted}>
              No hay unidades configuradas en el plan. Genera el plan anual para agregar unidades.
            </p>
          )
        }
        return (
          <ul className={styles.modalList}>
            {datos.unidadesPlan.map((u) => (
              <li key={u.numero} className={styles.modalListItem}>
                <strong>Unidad {u.numero}</strong>
                {u.tituloUnidad && <span> — {u.tituloUnidad}</span>}
                {u.producto && (
                  <p className={styles.modalItemSub}>
                    Producto: {u.producto.slice(0, 80)}
                    {u.producto.length > 80 ? '…' : ''}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )

      case 'unidad':
        if (datos.unidades.length === 0) {
          return (
            <p className={styles.modalMuted}>Aún no hay unidades de aprendizaje generadas.</p>
          )
        }
        return (
          <ul className={styles.modalList}>
            {datos.unidades.map((u) => (
              <ItemConDescarga
                key={u.id}
                itemKey={`unidad-${u.id}`}
                descargandoKey={descargandoKey}
                linkSesiones={linkSesionesDesdeUnidadPlan(plan, u.unidad, {
                  volver: 'unidad'
                })}
                onAntesIrSesiones={() => guardarRetornoAlIrASesiones('unidad', u.unidad)}
                sesionesGeneradas={u.sesionesGeneradas}
                etiquetaDescargar="📥 Descargar unidad"
                onDescargar={() =>
                  ejecutarDescarga(`unidad-${u.id}`, () => descargarUnidadAprendizaje(u.id))
                }
              >
                <strong>Unidad {u.unidad ?? '—'}</strong>
                {u.tituloUnidad && <span> — {u.tituloUnidad}</span>}
                <p className={styles.modalItemSub}>{formatearFecha(u.fechaHora)}</p>
              </ItemConDescarga>
            ))}
          </ul>
        )

      case 'sesiones':
        if (datos.sesiones.length === 0) {
          return (
            <p className={styles.modalMuted}>Aún no hay sesiones registradas.</p>
          )
        }
        if (!sesionesPorUnidad) return null
        const { unidades: tabsUnidad, grupos: sesionesGrupos } = sesionesPorUnidad
        const sesionesUnidad =
          unidadActivaTab != null ? (sesionesGrupos[unidadActivaTab] ?? []) : []
        const tituloUnidadActiva =
          datos.unidades.find((u) => u.unidad === unidadActivaTab)?.tituloUnidad ??
          datos.unidadesPlan.find((u) => String(u.numero) === unidadActivaTab)?.tituloUnidad

        return (
          <>
            <p className={styles.modalTabsHint}>
              Elige una unidad para ver sus sesiones generadas.
            </p>
            <div
              className={styles.tabsBar}
              role="tablist"
              aria-label="Unidades con sesiones"
            >
              {tabsUnidad.map((numUnidad) => {
                const activa = numUnidad === unidadActivaTab
                const count = sesionesGrupos[numUnidad]?.length ?? 0
                return (
                  <button
                    key={numUnidad}
                    type="button"
                    role="tab"
                    aria-selected={activa}
                    className={`${styles.tab} ${activa ? styles.tabActive : ''}`}
                    onClick={() => setUnidadActivaTab(numUnidad)}
                  >
                    <span className={styles.tabLabel}>Unidad {numUnidad}</span>
                    <span className={styles.tabBadge}>{count}</span>
                  </button>
                )
              })}
            </div>
            {unidadActivaTab && (
              <div
                className={styles.tabPanel}
                role="tabpanel"
                aria-label={`Sesiones de la unidad ${unidadActivaTab}`}
              >
                <h4 className={styles.modalUnidadPanelTitle}>
                  Unidad {unidadActivaTab}
                  {tituloUnidadActiva ? ` — ${tituloUnidadActiva}` : ''}
                </h4>
                {sesionesUnidad.length === 0 ? (
                  <p className={styles.modalMuted}>
                    No hay sesiones generadas en esta unidad.
                  </p>
                ) : (
                  <ul className={styles.modalList}>
                    {sesionesUnidad.map((s) => {
                      const fichaSesion = fichaDeSesion(datos, s)
                      const rubricaSesion = rubricaDeSesion(datos, s)
                      const listaCotejoSesion = listaCotejoDeSesion(datos, s)
                      return (
                      <ItemConDescarga
                        key={s.id}
                        itemKey={`sesion-${s.id}`}
                        descargandoKey={descargandoKey}
                        onGenerarFicha={
                          fichaSesion
                            ? undefined
                            : () =>
                                ejecutarDescarga(`sesion-${s.id}-generar-ficha`, async () => {
                                  await descargarFichaAprendizaje(s.id)
                                  await onRecargarDatos?.()
                                })
                        }
                        onDescargarFicha={
                          fichaSesion
                            ? () =>
                                ejecutarDescarga(`sesion-${s.id}-ficha`, () =>
                                  descargarFichaAprendizaje(fichaSesion.sesionId)
                                )
                            : undefined
                        }
                        onGenerarRubrica={
                          rubricaSesion
                            ? undefined
                            : () =>
                                ejecutarDescarga(`sesion-${s.id}-generar-rubrica`, async () => {
                                  await descargarRubricaAnalitica(s.id)
                                  await onRecargarDatos?.()
                                })
                        }
                        onDescargarRubrica={
                          rubricaSesion
                            ? () =>
                                ejecutarDescarga(`sesion-${s.id}-rubrica`, () =>
                                  descargarRubricaAnalitica(rubricaSesion.sesionId)
                                )
                            : undefined
                        }
                        onGenerarListaCotejo={
                          listaCotejoSesion
                            ? undefined
                            : () =>
                                ejecutarDescarga(
                                  `sesion-${s.id}-generar-lista-cotejo`,
                                  async () => {
                                    await descargarListaCotejo(s.id)
                                    await onRecargarDatos?.()
                                  }
                                )
                        }
                        onDescargarListaCotejo={
                          listaCotejoSesion
                            ? () =>
                                ejecutarDescarga(`sesion-${s.id}-lista-cotejo`, () =>
                                  descargarListaCotejo(listaCotejoSesion.sesionId)
                                )
                            : undefined
                        }
                        etiquetaDescargar="📥 Descargar Sesión"
                        onDescargar={() =>
                          ejecutarDescarga(`sesion-${s.id}`, () =>
                            descargarSesionAprendizaje(s.id)
                          )
                        }
                      >
                        <strong>Sesión {s.numeroSesion}</strong>
                        {s.titulo && <span> — {s.titulo}</span>}
                        <p className={styles.modalItemSub}>{formatearFecha(s.fechaHora)}</p>
                      </ItemConDescarga>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </>
        )

      case 'fichas':
        if (!vistaFichas) return null
        if (datos.sesiones.length === 0) {
          return (
            <p className={styles.modalMuted}>
              Aún no hay sesiones generadas. Crea sesiones de aprendizaje para poder generar
              fichas.
            </p>
          )
        }
        const { unidades: unidadesFicha, grupos: sesionesPorUnidadFicha, fichasPorSesion } =
          vistaFichas
        const sesionSeleccionadaFicha =
          sesionFichaActiva != null
            ? (sesionesPorUnidadFicha[sesionFichaActiva.unidad] ?? []).find(
                (s) => s.numeroSesion === sesionFichaActiva.numeroSesion
              )
            : undefined
        const fichaActiva =
          sesionFichaActiva != null
            ? fichasPorSesion.get(
                `${sesionFichaActiva.unidad}-${sesionFichaActiva.numeroSesion}`
              )
            : undefined

        return (
          <>
            <p className={styles.modalTabsHint}>
              Abre una unidad, elige una sesión y genera o descarga la ficha de aprendizaje.
            </p>
            <div className={styles.modalAcordeon}>
              {unidadesFicha.map((numUnidad) => {
                const abierta = unidadAcordeonAbierta === numUnidad
                const sesionesUnidad = sesionesPorUnidadFicha[numUnidad] ?? []
                const tituloUnidad = tituloUnidadEnDatos(datos, numUnidad)
                const acordeonId = `acordeon-unidad-${numUnidad}`
                const panelId = `panel-unidad-${numUnidad}`

                return (
                  <div
                    key={numUnidad}
                    className={`${styles.acordeonItem} ${abierta ? styles.acordeonItemOpen : ''}`}
                  >
                    <button
                      type="button"
                      className={`${styles.acordeonHeader} ${abierta ? styles.acordeonHeaderOpen : ''}`}
                      aria-expanded={abierta}
                      aria-controls={panelId}
                      id={acordeonId}
                      onClick={() => {
                        if (abierta) {
                          setUnidadAcordeonAbierta(null)
                          setSesionFichaActiva(null)
                          return
                        }
                        setUnidadAcordeonAbierta(numUnidad)
                        const primera = sesionesUnidad[0]
                        if (primera) {
                          setSesionFichaActiva({
                            unidad: numUnidad,
                            numeroSesion: primera.numeroSesion
                          })
                        } else {
                          setSesionFichaActiva(null)
                        }
                      }}
                    >
                      <span className={styles.acordeonHeaderText}>
                        <strong>Unidad {numUnidad}</strong>
                        {tituloUnidad && <span> — {tituloUnidad}</span>}
                      </span>
                      <span className={styles.acordeonBadge}>{sesionesUnidad.length}</span>
                      <span
                        className={`${styles.acordeonChevron} ${abierta ? styles.acordeonChevronOpen : ''}`}
                        aria-hidden
                      >
                        ▸
                      </span>
                    </button>
                    <AcordeonPanelAnimado
                      abierta={abierta}
                      contentKey={`${numUnidad}-${sesionFichaActiva?.unidad === numUnidad ? sesionFichaActiva.numeroSesion : ''}`}
                    >
                      <div
                        id={panelId}
                        role="region"
                        aria-labelledby={acordeonId}
                        aria-hidden={!abierta}
                        className={styles.acordeonPanel}
                      >
                        <div className={styles.acordeonPanelFall}>
                        <div
                          className={styles.tabsBar}
                          role="tablist"
                          aria-label={`Sesiones de la unidad ${numUnidad}`}
                        >
                          {sesionesUnidad.map((s) => {
                            const activa =
                              sesionFichaActiva?.unidad === numUnidad &&
                              sesionFichaActiva.numeroSesion === s.numeroSesion
                            const tieneFicha = fichasPorSesion.has(
                              `${numUnidad}-${s.numeroSesion}`
                            )
                            return (
                              <button
                                key={s.id}
                                type="button"
                                role="tab"
                                aria-selected={activa}
                                className={`${styles.tab} ${activa ? styles.tabActive : ''}`}
                                onClick={() =>
                                  setSesionFichaActiva({
                                    unidad: numUnidad,
                                    numeroSesion: s.numeroSesion
                                  })
                                }
                              >
                                <span className={styles.tabLabel}>
                                  Sesión {s.numeroSesion}
                                </span>
                                {tieneFicha && (
                                  <span className={styles.tabBadge} title="Ficha generada">
                                    ✓
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                        {sesionFichaActiva?.unidad === numUnidad &&
                          sesionSeleccionadaFicha && (
                            <div
                              className={styles.tabPanel}
                              role="tabpanel"
                              aria-label={`Ficha sesión ${sesionSeleccionadaFicha.numeroSesion}`}
                            >
                              <h4 className={styles.modalUnidadPanelTitle}>
                                Sesión {sesionSeleccionadaFicha.numeroSesion}
                                {sesionSeleccionadaFicha.titulo
                                  ? ` — ${sesionSeleccionadaFicha.titulo}`
                                  : ''}
                              </h4>
                              {fichaActiva ? (
                                <ul className={styles.modalList}>
                                  <ItemConDescarga
                                    itemKey={`ficha-${fichaActiva.id}`}
                                    descargandoKey={descargandoKey}
                                    linkRubrica={linkRubricaDesdeSesionPlan(
                                      plan,
                                      numUnidad,
                                      sesionSeleccionadaFicha.numeroSesion
                                    )}
                                    onDescargar={() =>
                                      ejecutarDescarga(`ficha-${fichaActiva.id}`, () =>
                                        descargarFichaAprendizaje(fichaActiva.sesionId)
                                      )
                                    }
                                  >
                                    <strong>Ficha de aprendizaje</strong>
                                    {fichaActiva.titulo && (
                                      <span> — {fichaActiva.titulo}</span>
                                    )}
                                    <p className={styles.modalItemSub}>
                                      {formatearFecha(fichaActiva.fechaHora)}
                                    </p>
                                  </ItemConDescarga>
                                </ul>
                              ) : (
                                <p className={styles.modalMuted}>
                                  Aún no hay ficha para esta sesión. Usa el botón de abajo para
                                  generarla.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </AcordeonPanelAnimado>
                  </div>
                )
              })}
            </div>
          </>
        )

      case 'rubrica':
        if (datos.rubricas.length === 0) {
          return <p className={styles.modalMuted}>Aún no hay rúbricas generadas.</p>
        }
        return (
          <ul className={styles.modalList}>
            {datos.rubricas.map((r) => (
              <ItemConDescarga
                key={r.id}
                itemKey={`rubrica-${r.id}`}
                descargandoKey={descargandoKey}
                onDescargar={() =>
                  ejecutarDescarga(`rubrica-${r.id}`, () =>
                    descargarRubricaAnalitica(r.sesionId)
                  )
                }
              >
                <strong>
                  Unidad {r.unidadNumero} · Sesión {r.numeroSesion}
                </strong>
                {r.titulo && <span> — {r.titulo}</span>}
                <p className={styles.modalItemSub}>{formatearFecha(r.fechaHora)}</p>
              </ItemConDescarga>
            ))}
          </ul>
        )

      default:
        return null
    }
  }

  return (
    <>
    <div
      className={styles.modalOverlay}
      onClick={generandoDocumento ? undefined : onCerrar}
      role="presentation"
    >
      <div
        className={`${styles.modalBox} ${
          paso === 'sesiones'
            ? styles.modalBoxSesiones
            : paso === 'unidad'
              ? styles.modalBoxUnidad
              : paso === 'fichas'
                ? styles.modalBoxFichas
                : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="step-modal-title"
      >
        <button
          type="button"
          className={styles.modalClose}
          onClick={onCerrar}
          aria-label="Cerrar"
          disabled={generandoDocumento}
        >
          ×
        </button>
        <h3 id="step-modal-title" className={styles.modalTitle}>
          {titulo}
        </h3>
        <p className={styles.modalSubtitle}>
          {plan.grado}
          {plan.area ? ` · ${plan.area}` : ''} · Año {plan.anio}
        </p>

        {bloqueadoMensaje ? (
          <div className={styles.modalAlert}>{bloqueadoMensaje}</div>
        ) : (
          <>
            {paso !== 'sesiones' && paso !== 'fichas' && (
              <div className={styles.modalActionsTop}>
                {paso === 'planAnual' ? (
                  planAnualCompleto ? (
                    <span
                      className={`${styles.modalLinkGenerar} ${styles.modalLinkGenerarDisabled}`}
                      aria-disabled="true"
                      title={tituloContadorPlanAnual}
                    >
                      ✏️ Editar Plan anual
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorPlanAnualBtn}
                      </span>
                    </span>
                  ) : (
                    <Link
                      href={linkGenerar}
                      className={styles.modalLinkGenerar}
                      title={tituloContadorPlanAnual}
                      onClick={guardarRetornoAlIrAPlanAnual}
                    >
                      ✏️ Editar Plan anual
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorPlanAnualBtn}
                      </span>
                    </Link>
                  )
                ) : (
                  <Link href={linkGenerar} className={styles.modalLinkGenerar}>
                    ➕ {etiquetaLinkGenerar(paso)}
                  </Link>
                )}
                {paso === 'planAnual' && onDescargarPlan && (
                  <button
                    type="button"
                    className={styles.modalLinkSecundario}
                    onClick={() => void ejecutarDescargaPlan()}
                    disabled={descargandoPlanAnual}
                  >
                    {descargandoPlanAnual
                      ? 'Descargando…'
                      : '📥 Descargar plan anual'}
                  </button>
                )}
              </div>
            )}
            <div className={styles.modalBody}>{renderLista()}</div>
            {(paso === 'sesiones' || paso === 'fichas') && (
              <div className={styles.modalActionsBottom}>
                {puedeGenerarFicha ? (
                  <Link href={linkGenerar} className={styles.modalLinkGenerar}>
                    ➕ {etiquetaLinkGenerar(paso)}
                  </Link>
                ) : paso === 'fichas' ? (
                  <span
                    className={`${styles.modalLinkGenerar} ${styles.modalLinkGenerarDisabled}`}
                    aria-disabled
                  >
                    ➕ {etiquetaLinkGenerar(paso)}
                  </span>
                ) : sesionesUnidadCompletas ? (
                  <span
                    className={`${styles.modalLinkGenerar} ${styles.modalLinkGenerarDisabled}`}
                    aria-disabled="true"
                    title={tituloContadorSesiones}
                  >
                    ➕ {etiquetaLinkGenerar(paso)}
                    {contadorSesionesBtn ? (
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorSesionesBtn}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <Link
                    href={linkGenerar}
                    className={styles.modalLinkGenerar}
                    title={paso === 'sesiones' ? tituloContadorSesiones : undefined}
                    onClick={() => {
                      if (paso === 'sesiones') {
                        guardarRetornoAlIrASesiones(
                          'sesiones',
                          unidadParaGenerarSesiones
                        )
                      }
                    }}
                  >
                    ➕ {etiquetaLinkGenerar(paso)}
                    {paso === 'sesiones' && contadorSesionesBtn ? (
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorSesionesBtn}
                      </span>
                    ) : null}
                  </Link>
                )}
              </div>
            )}
          </>
        )}

        <button
          type="button"
          className={styles.modalBtnCerrar}
          onClick={onCerrar}
          disabled={generandoDocumento}
        >
          Cerrar
        </button>
      </div>
    </div>

    {generandoDocumento && (
      <div
        className={styles.generatingOverlay}
        role="alertdialog"
        aria-modal="true"
        aria-busy="true"
        aria-labelledby="generando-doc-modal-title"
      >
        <div className={styles.generatingOverlayCard}>
          <div className={styles.generatingSpinner} aria-hidden>
            <svg width="52" height="52" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="#cbd5e1" strokeWidth="6" />
              <path
                d="M25 5a20 20 0 0 1 20 20"
                fill="none"
                stroke={
                  generandoRubrica
                    ? '#7c3aed'
                    : generandoListaCotejo
                      ? '#0d9488'
                      : descargandoPlanAnual && !generandoFicha
                        ? '#0ea5e9'
                        : '#667eea'
                }
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
          <h3 id="generando-doc-modal-title" className={styles.generatingTitle}>
            {descargandoPlanAnual &&
            !generandoFicha &&
            !generandoRubrica &&
            !generandoListaCotejo
              ? 'Descargando plan anual…'
              : generandoRubrica
                ? 'Generando rúbrica analítica…'
                : generandoListaCotejo
                  ? 'Generando lista de cotejo…'
                  : 'Generando ficha de aprendizaje…'}
          </h3>
          <p className={styles.generatingText}>
            {descargandoPlanAnual &&
            !generandoFicha &&
            !generandoRubrica &&
            !generandoListaCotejo
              ? 'Armando tu documento Word con los datos guardados. Un momento…'
              : generandoListaCotejo
                ? 'Rellenando la plantilla con los datos de la sesión. Un momento…'
                : 'La IA está creando tu documento. Puede tardar varios minutos; no cierres esta ventana.'}
          </p>
        </div>
      </div>
    )}
    </>
  )
}
