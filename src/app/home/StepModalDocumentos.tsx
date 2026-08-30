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
  generarFichaAprendizaje,
  descargarRubricaAnalitica,
  generarRubricaAnalitica,
  descargarSolucionario,
  descargarListaCotejo,
  generarSesionRefuerzo,
  generarExamenUnidad,
  generarConclusionesDescriptivas,
  regenerarPlanAnualUnidades,
  regenerarUnidadAprendizaje,
  type PlanAnualParaDescarga
} from '@/lib/home-descarga-documento'
import { useAvisoModal } from '@/hooks/useAvisoModal'
import { ModalVisualizarFicha } from './ModalVisualizarFicha'
import { ModalVisualizarSolucionario } from './ModalVisualizarSolucionario'
import { ModalVisualizarRubrica } from './ModalVisualizarRubrica'
import { ModalVisualizarSesionRefuerzo } from './ModalVisualizarSesionRefuerzo'
import { ModalVisualizarExamen } from './ModalVisualizarExamen'
import { ModalVisualizarConclusiones } from './ModalVisualizarConclusiones'
import type { SesionRefuerzoVistaData } from '@/lib/sesion-refuerzo-vista-html'
import type { ExamenUnidadVistaData } from '@/lib/examen-vista-html'
import type { ConclusionesVistaData } from '@/lib/conclusiones-vista-html'
import {
  tieneSuscripcionActivaParaGrado,
  type SuscripcionActivaCliente
} from '@/lib/acceso-cliente'

export type PasoKey = keyof EstadoDocumentosPlan

const PLAN_UNIDADES_MAX = 8

export const PASOS_DOCUMENTOS: { key: PasoKey; label: string; short: string }[] = [
  { key: 'planAnual', label: 'Plan anual', short: 'Plan' },
  { key: 'unidad', label: 'Unidad', short: 'Unidad' },
  { key: 'sesiones', label: 'Sesiones de aprendizaje', short: 'Sesiones' },
  { key: 'fichas', label: 'Fichas de aprendizaje', short: 'Fichas' },
  { key: 'rubrica', label: 'Rúbrica analítica', short: 'Rúbrica' }
]

/** Pasos visibles en la barra de progreso (ficha/rúbrica se gestionan desde Sesiones). */
export const PASOS_STEPPER = PASOS_DOCUMENTOS.filter(
  (p) => p.key !== 'fichas' && p.key !== 'rubrica'
)

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
    tieneFicha?: boolean
    tieneSolucionario?: boolean
    tieneRubrica?: boolean
    tieneListaCotejo?: boolean
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
  solucionarios: Array<{
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

type UnidadModalItem = DocumentosPlanResponse['unidades'][number]

function ordenarUnidadesPorNumero(unidades: UnidadModalItem[]) {
  return [...unidades].sort((a, b) => {
    const na = parseInt(String(a.unidad ?? ''), 10)
    const nb = parseInt(String(b.unidad ?? ''), 10)
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
    return String(a.unidad ?? '').localeCompare(String(b.unidad ?? ''), 'es', {
      numeric: true,
      sensitivity: 'base'
    })
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

/** Flujo unificado: sesión + ficha + solucionario + rúbrica en una sola generación con GPT. */
function sesionTieneFichaGuardada(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): boolean {
  return Boolean(sesion.tieneFicha || fichaDeSesion(datos, sesion))
}

function sesionTieneSolucionarioGuardado(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): boolean {
  return Boolean(sesion.tieneSolucionario || solucionarioDeSesion(datos, sesion))
}

function sesionTieneRubricaGuardada(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): boolean {
  return Boolean(sesion.tieneRubrica || rubricaDeSesion(datos, sesion))
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

type SolucionarioModalItem = DocumentosPlanResponse['solucionarios'][number]

function solucionarioDeSesion(
  datos: DocumentosPlanResponse,
  sesion: SesionModalItem
): SolucionarioModalItem | undefined {
  return (datos.solucionarios ?? []).find(
    (s) =>
      s.sesionId === sesion.id ||
      (s.unidadNumero === sesion.unidadNumero && s.numeroSesion === sesion.numeroSesion)
  )
}

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
        {PASOS_STEPPER.map((paso, index) => {
          const listo = estado[paso.key]
          const conectorListo =
            index > 0 ? estado[PASOS_STEPPER[index - 1].key] : false
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
  onVisualizarFicha,
  onGenerarSolucionario,
  onDescargarSolucionario,
  onVisualizarSolucionario,
  onGenerarRubrica,
  onDescargarRubrica,
  onVisualizarRubrica,
  onGenerarListaCotejo,
  onDescargarListaCotejo,
  onGenerarSesionRefuerzo,
  onGenerarExamen,
  onGenerarConclusionesDescriptiva,
  onRegenerarUnidad,
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
  onGenerarFicha?: () => void | Promise<void>
  onDescargarFicha?: () => void | Promise<void>
  onVisualizarFicha?: () => void
  onGenerarSolucionario?: () => void | Promise<void>
  onDescargarSolucionario?: () => void | Promise<void>
  onVisualizarSolucionario?: () => void
  onGenerarRubrica?: () => void | Promise<void>
  onDescargarRubrica?: () => void | Promise<void>
  onVisualizarRubrica?: () => void
  onGenerarListaCotejo?: () => void | Promise<void>
  onDescargarListaCotejo?: () => void | Promise<void>
  onGenerarSesionRefuerzo?: () => void | Promise<void>
  onGenerarExamen?: () => void | Promise<void>
  onGenerarConclusionesDescriptiva?: () => void | Promise<void>
  onRegenerarUnidad?: () => void | Promise<void>
  linkRubrica?: string
  sesionesGeneradas?: Array<{ numeroSesion: number; titulo: string | null }>
}) {
  const cargando = descargandoKey === itemKey
  const regenerarKey = `${itemKey}-regenerar`
  const cargandoRegenerar = descargandoKey === regenerarKey
  const fichaKey = `${itemKey}-ficha`
  const generarFichaKey = `${itemKey}-generar-ficha`
  const solucionarioKey = `${itemKey}-solucionario`
  const generarSolucionarioKey = `${itemKey}-generar-solucionario`
  const rubricaKey = `${itemKey}-rubrica`
  const generarRubricaKey = `${itemKey}-generar-rubrica`
  const generarListaCotejoKey = `${itemKey}-generar-lista-cotejo`
  const cargandoFicha = descargandoKey === fichaKey
  const cargandoGenerarFicha = descargandoKey === generarFichaKey
  const cargandoSolucionario = descargandoKey === solucionarioKey
  const cargandoGenerarSolucionario = descargandoKey === generarSolucionarioKey
  const cargandoRubrica = descargandoKey === rubricaKey
  const cargandoGenerarRubrica = descargandoKey === generarRubricaKey
  const listaCotejoKey = `${itemKey}-lista-cotejo`
  const cargandoListaCotejo = descargandoKey === listaCotejoKey
  const cargandoGenerarListaCotejo = descargandoKey === generarListaCotejoKey
  const generarSesionRefuerzoKey = `${itemKey}-generar-sesion-refuerzo`
  const cargandoGenerarSesionRefuerzo = descargandoKey === generarSesionRefuerzoKey
  const generarExamenKey = `${itemKey}-generar-examen`
  const cargandoGenerarExamen = descargandoKey === generarExamenKey
  const generarConclusionesKey = `${itemKey}-generar-conclusiones`
  const cargandoGenerarConclusiones = descargandoKey === generarConclusionesKey
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
        <button
          type="button"
          className={styles.modalBtnDescargar}
          disabled={descargandoKey !== null}
          onClick={() => void onDescargar()}
        >
          {cargando ? 'Descargando…' : etiquetaDescargar}
        </button>
        {onRegenerarUnidad && (
          <button
            type="button"
            className={styles.modalBtnRegenerarUnidad}
            disabled={descargandoKey !== null}
            onClick={() => void onRegenerarUnidad()}
          >
            {cargandoRegenerar ? 'Regenerando…' : '🔄 Regenerar unidad'}
          </button>
        )}
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
        {onVisualizarFicha && (
          <button
            type="button"
            className={styles.modalBtnVisualizarFicha}
            disabled={descargandoKey !== null}
            onClick={onVisualizarFicha}
          >
            👁 Visualizar ficha
          </button>
        )}
        {onGenerarSolucionario ? (
          <button
            type="button"
            className={styles.modalBtnGenerarFicha}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarSolucionario()}
          >
            {cargandoGenerarSolucionario ? 'Generando…' : '➕ Generar solucionario'}
          </button>
        ) : onDescargarSolucionario ? (
          <button
            type="button"
            className={styles.modalBtnFicha}
            disabled={descargandoKey !== null}
            onClick={() => void onDescargarSolucionario()}
          >
            {cargandoSolucionario ? 'Descargando…' : '📥 Descargar solucionario'}
          </button>
        ) : null}
        {onVisualizarSolucionario && (
          <button
            type="button"
            className={styles.modalBtnVisualizarFicha}
            disabled={descargandoKey !== null}
            onClick={onVisualizarSolucionario}
          >
            👁 Visualizar solucionario
          </button>
        )}
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
        {onVisualizarRubrica && (
          <button
            type="button"
            className={styles.modalBtnVisualizarFicha}
            disabled={descargandoKey !== null}
            onClick={onVisualizarRubrica}
          >
            👁 Visualizar rúbrica
          </button>
        )}
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
        {onGenerarSesionRefuerzo && (
          <button
            type="button"
            className={styles.modalBtnGenerarFicha}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarSesionRefuerzo()}
          >
            {cargandoGenerarSesionRefuerzo ? 'Generando…' : '➕ Sesión de refuerzo'}
          </button>
        )}
        {onGenerarExamen && (
          <button
            type="button"
            className={styles.modalBtnGenerarExamen}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarExamen()}
          >
            {cargandoGenerarExamen ? 'Generando…' : '📝 Generar exámenes'}
          </button>
        )}
        {onGenerarConclusionesDescriptiva && (
          <button
            type="button"
            className={styles.modalBtnGenerarConclusiones}
            disabled={descargandoKey !== null}
            onClick={() => void onGenerarConclusionesDescriptiva()}
          >
            {cargandoGenerarConclusiones
              ? 'Generando…'
              : '📋 Generar conclusiones descriptivas'}
          </button>
        )}
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
  const { manejarErrorGeneracion, mostrarAvisoModoPruebaFichaCotejo, AvisoModalEl } =
    useAvisoModal('EducaPlus · Mis documentos')
  const [suscripcionActiva, setSuscripcionActiva] = useState<SuscripcionActivaCliente>(null)
  const [cuotaUnidad, setCuotaUnidad] = useState<{
    limite: number | null
    usados: number
    restantes: number | null
    puedeCrear: boolean
    mensaje: string | null
    periodo?: string
  } | null>(null)
  const [cuotaPlanAnual, setCuotaPlanAnual] = useState<{
    limite: number | null
    usados: number
    restantes: number | null
    puedeCrear: boolean
    mensaje: string | null
    periodo?: string
  } | null>(null)
  const [descargandoKey, setDescargandoKey] = useState<string | null>(null)
  const [descargandoPlanAnual, setDescargandoPlanAnual] = useState(false)
  const [regenerandoPlanAnual, setRegenerandoPlanAnual] = useState(false)
  const [modoRegeneracionPlan, setModoRegeneracionPlan] = useState(false)
  const [unidadesRegenerarSeleccionadas, setUnidadesRegenerarSeleccionadas] = useState<
    number[]
  >([])
  const [creditosRegeneracion, setCreditosRegeneracion] = useState<{
    total: number
    usados: number
    restantes: number
  } | null>(null)
  const [unidadActivaTab, setUnidadActivaTab] = useState<string | null>(null)
  const [unidadAcordeonAbierta, setUnidadAcordeonAbierta] = useState<string | null>(null)
  const [sesionFichaActiva, setSesionFichaActiva] = useState<{
    unidad: string
    numeroSesion: number
  } | null>(null)
  const [fichaVistaSesion, setFichaVistaSesion] = useState<{
    id: number
    titulo: string | null
  } | null>(null)
  const [solucionarioVistaSesion, setSolucionarioVistaSesion] = useState<{
    id: number
    titulo: string | null
  } | null>(null)
  const [rubricaVistaSesion, setRubricaVistaSesion] = useState<{
    id: number
    titulo: string | null
  } | null>(null)
  const [refuerzoVistaSesion, setRefuerzoVistaSesion] = useState<{
    id: number
    titulo: string | null
    cargando: boolean
    error: string | null
    datos: SesionRefuerzoVistaData | null
  } | null>(null)
  const [examenVistaUnidad, setExamenVistaUnidad] = useState<{
    id: number
    titulo: string | null
    cargando: boolean
    error: string | null
    datos: ExamenUnidadVistaData | null
  } | null>(null)
  const [conclusionesVistaUnidad, setConclusionesVistaUnidad] = useState<{
    id: number
    cargando: boolean
    error: string | null
    datos: ConclusionesVistaData | null
  } | null>(null)
  const fichasAcordeonIniciadoRef = useRef(false)

  useEffect(() => {
    if (!abierto) return
    const cargarAcceso = async () => {
      try {
        const res = await fetch('/api/usuario/acceso')
        if (!res.ok) return
        const data = await res.json()
        setSuscripcionActiva(data.suscripcionActiva ?? null)
        if (data.cuotaUnidad) setCuotaUnidad(data.cuotaUnidad)
        if (data.cuotaPlanAnual) setCuotaPlanAnual(data.cuotaPlanAnual)
        if (data.creditosRegeneracion) setCreditosRegeneracion(data.creditosRegeneracion)
        else setCreditosRegeneracion(null)
      } catch {
        /* sin sesión o error de red */
      }
    }
    void cargarAcceso()
  }, [abierto])

  const modoPrueba = useMemo(() => {
    if (!plan?.areaId || !plan?.gradoId) return true
    return !tieneSuscripcionActivaParaGrado(
      suscripcionActiva,
      String(plan.areaId),
      String(plan.gradoId)
    )
  }, [plan?.areaId, plan?.gradoId, suscripcionActiva])

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

  useEffect(() => {
    if (!abierto || paso !== 'planAnual') {
      setModoRegeneracionPlan(false)
      setUnidadesRegenerarSeleccionadas([])
    }
  }, [abierto, paso])

  if (!abierto || !plan || !paso) return null

  const generandoFicha = Boolean(descargandoKey?.endsWith('-generar-ficha'))
  const generandoSolucionario = Boolean(descargandoKey?.endsWith('-generar-solucionario'))
  const generandoRubrica = Boolean(descargandoKey?.endsWith('-generar-rubrica'))
  const generandoListaCotejo = Boolean(
    descargandoKey?.endsWith('-generar-lista-cotejo')
  )
  const regenerandoUnidad = Boolean(descargandoKey?.endsWith('-regenerar'))
  const generandoDocumento =
    generandoFicha ||
    generandoSolucionario ||
    generandoRubrica ||
    generandoListaCotejo ||
    regenerandoUnidad ||
    descargandoPlanAnual ||
    regenerandoPlanAnual

  const ejecutarDescargaPlan = async () => {
    if (!onDescargarPlan) return
    setDescargandoPlanAnual(true)
    try {
      await onDescargarPlan()
    } catch (e) {
      manejarErrorGeneracion(e)
    } finally {
      setDescargandoPlanAnual(false)
    }
  }

  const puedeRegenerarPlan =
    !modoPrueba &&
    creditosRegeneracion != null &&
    creditosRegeneracion.restantes > 0 &&
    Boolean(datos?.unidadesPlan.length)

  const puedeRegenerarUnidad =
    !modoPrueba &&
    creditosRegeneracion != null &&
    creditosRegeneracion.restantes > 0 &&
    Boolean(datos?.unidades.length)

  const ejecutarRegeneracionUnidad = async (unidadId: number) => {
    const key = `unidad-${unidadId}-regenerar`
    setDescargandoKey(key)
    try {
      await regenerarUnidadAprendizaje(unidadId)
      if (onRecargarDatos) await onRecargarDatos()
      if (creditosRegeneracion) {
        setCreditosRegeneracion({
          ...creditosRegeneracion,
          usados: creditosRegeneracion.usados + 1,
          restantes: Math.max(0, creditosRegeneracion.restantes - 1)
        })
      }
    } catch (e) {
      manejarErrorGeneracion(e)
    } finally {
      setDescargandoKey(null)
    }
  }

  const toggleUnidadRegenerar = (numero: number) => {
    setUnidadesRegenerarSeleccionadas((prev) =>
      prev.includes(numero) ? prev.filter((n) => n !== numero) : [...prev, numero]
    )
  }

  const cancelarModoRegeneracion = () => {
    setModoRegeneracionPlan(false)
    setUnidadesRegenerarSeleccionadas([])
  }

  const ejecutarRegeneracionPlan = async () => {
    if (unidadesRegenerarSeleccionadas.length === 0) return
    setRegenerandoPlanAnual(true)
    try {
      await regenerarPlanAnualUnidades(
        plan as PlanAnualParaDescarga,
        unidadesRegenerarSeleccionadas
      )
      cancelarModoRegeneracion()
      if (onRecargarDatos) await onRecargarDatos()
      if (creditosRegeneracion) {
        setCreditosRegeneracion({
          ...creditosRegeneracion,
          usados: creditosRegeneracion.usados + 1,
          restantes: Math.max(0, creditosRegeneracion.restantes - 1)
        })
      }
    } catch (e) {
      manejarErrorGeneracion(e)
    } finally {
      setRegenerandoPlanAnual(false)
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

  const puedeGenerarUnidadAprendizaje = cuotaUnidad?.puedeCrear !== false
  const contadorUnidadBtn =
    cuotaUnidad?.limite != null
      ? ` (${cuotaUnidad.usados} de ${cuotaUnidad.limite})`
      : ' (… de …)'
  const etiquetaPeriodoCuota = (periodo?: string) =>
    periodo === 'anual' ? 'en tu vigencia anual' : 'este mes'
  const textoUsoUnidad =
    cuotaUnidad?.limite != null
      ? `Uso del plan: ${cuotaUnidad.usados} de ${cuotaUnidad.limite} unidades de aprendizaje ${etiquetaPeriodoCuota(cuotaUnidad.periodo)}.`
      : null
  const tituloContadorUnidad =
    cuotaUnidad?.mensaje ??
    (cuotaUnidad?.limite != null
      ? `${cuotaUnidad.restantes ?? 0} unidad(es) de aprendizaje disponibles ${etiquetaPeriodoCuota(cuotaUnidad.periodo)}`
      : undefined)
  const textoUsoPlanAnual =
    cuotaPlanAnual?.limite != null
      ? `Uso del plan: ${cuotaPlanAnual.usados} de ${cuotaPlanAnual.limite} programaciones anuales ${etiquetaPeriodoCuota(cuotaPlanAnual.periodo)}.`
      : null

  const ejecutarDescarga = async (
    key: string,
    fn: () => Promise<void>,
    opts?: { requierePlan?: boolean }
  ) => {
    if (opts?.requierePlan && modoPrueba) {
      mostrarAvisoModoPruebaFichaCotejo()
      return
    }
    setDescargandoKey(key)
    try {
      await fn()
    } catch (e) {
      manejarErrorGeneracion(e)
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
              <li
                key={u.numero}
                className={`${styles.modalListItem} ${
                  modoRegeneracionPlan ? styles.modalListItemRegenerar : ''
                }`}
              >
                {modoRegeneracionPlan && (
                  <label className={styles.modalRegenerarCheckboxLabel}>
                    <input
                      type="checkbox"
                      className={styles.modalRegenerarCheckbox}
                      checked={unidadesRegenerarSeleccionadas.includes(u.numero)}
                      onChange={() => toggleUnidadRegenerar(u.numero)}
                      disabled={regenerandoPlanAnual}
                    />
                    <span className={styles.srOnly}>Regenerar unidad {u.numero}</span>
                  </label>
                )}
                <div className={styles.modalListItemBody}>
                  <strong>Unidad {u.numero}</strong>
                  {u.tituloUnidad && <span> — {u.tituloUnidad}</span>}
                  {u.producto && (
                    <p className={styles.modalItemSub}>
                      Producto: {u.producto.slice(0, 80)}
                      {u.producto.length > 80 ? '…' : ''}
                    </p>
                  )}
                </div>
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
            {ordenarUnidadesPorNumero(datos.unidades).map((u) => (
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
                onRegenerarUnidad={
                  puedeRegenerarUnidad
                    ? () => ejecutarRegeneracionUnidad(u.id)
                    : undefined
                }
                onGenerarExamen={() =>
                  void ejecutarDescarga(`unidad-${u.id}-generar-examen`, async () => {
                    setExamenVistaUnidad({
                      id: u.id,
                      titulo: u.tituloUnidad,
                      cargando: true,
                      error: null,
                      datos: null
                    })
                    try {
                      const result = await generarExamenUnidad(u.id)
                      setExamenVistaUnidad({
                        id: u.id,
                        titulo: u.tituloUnidad,
                        cargando: false,
                        error: null,
                        datos: result.vista
                      })
                    } catch (e: unknown) {
                      setExamenVistaUnidad({
                        id: u.id,
                        titulo: u.tituloUnidad,
                        cargando: false,
                        error:
                          e instanceof Error
                            ? e.message
                            : 'Error al generar el examen de la unidad',
                        datos: null
                      })
                    }
                  })
                }
                onGenerarConclusionesDescriptiva={
                  (parseInt(String(u.unidad ?? ''), 10) || 0) % 2 === 0
                    ? () =>
                        void ejecutarDescarga(
                          `unidad-${u.id}-generar-conclusiones`,
                          async () => {
                            setConclusionesVistaUnidad({
                              id: u.id,
                              cargando: true,
                              error: null,
                              datos: null
                            })
                            try {
                              const result = await generarConclusionesDescriptivas(u.id)
                              setConclusionesVistaUnidad({
                                id: u.id,
                                cargando: false,
                                error: null,
                                datos: result.vista
                              })
                            } catch (e: unknown) {
                              setConclusionesVistaUnidad({
                                id: u.id,
                                cargando: false,
                                error:
                                  e instanceof Error
                                    ? e.message
                                    : 'Error al generar las conclusiones descriptivas',
                                datos: null
                              })
                            }
                          }
                        )
                    : undefined
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
                      const solucionarioSesion = solucionarioDeSesion(datos, s)
                      const rubricaSesion = rubricaDeSesion(datos, s)
                      const listaCotejoSesion = listaCotejoDeSesion(datos, s)
                      const tieneFicha = sesionTieneFichaGuardada(datos, s)
                      const tieneSolucionario = sesionTieneSolucionarioGuardado(datos, s)
                      const tieneRubrica = sesionTieneRubricaGuardada(datos, s)
                      const tieneListaCotejo = Boolean(
                        listaCotejoSesion || s.tieneListaCotejo
                      )
                      const sesionIdFicha = fichaSesion?.sesionId ?? s.id
                      const sesionIdSolucionario = solucionarioSesion?.sesionId ?? s.id
                      const sesionIdRubrica = rubricaSesion?.sesionId ?? s.id
                      return (
                      <ItemConDescarga
                        key={s.id}
                        itemKey={`sesion-${s.id}`}
                        descargandoKey={descargandoKey}
                        onGenerarFicha={
                          !tieneFicha
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-generar-ficha`,
                                  async () => {
                                    await generarFichaAprendizaje(s.id)
                                    await onRecargarDatos?.()
                                    setFichaVistaSesion({
                                      id: s.id,
                                      titulo: s.titulo
                                    })
                                  },
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onDescargarFicha={
                          tieneFicha
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-ficha`,
                                  () => descargarFichaAprendizaje(sesionIdFicha),
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onVisualizarFicha={
                          tieneFicha
                            ? () => {
                                if (modoPrueba) {
                                  mostrarAvisoModoPruebaFichaCotejo()
                                  return
                                }
                                setFichaVistaSesion({
                                  id: sesionIdFicha,
                                  titulo: s.titulo
                                })
                              }
                            : undefined
                        }
                        onGenerarSolucionario={undefined}
                        onDescargarSolucionario={
                          tieneSolucionario
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-solucionario`,
                                  () => descargarSolucionario(sesionIdSolucionario),
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onVisualizarSolucionario={
                          tieneSolucionario
                            ? () => {
                                if (modoPrueba) {
                                  mostrarAvisoModoPruebaFichaCotejo()
                                  return
                                }
                                setSolucionarioVistaSesion({
                                  id: sesionIdSolucionario,
                                  titulo: s.titulo
                                })
                              }
                            : undefined
                        }
                        onGenerarRubrica={
                          !tieneRubrica
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-generar-rubrica`,
                                  async () => {
                                    await generarRubricaAnalitica(s.id)
                                    await onRecargarDatos?.()
                                  },
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onDescargarRubrica={
                          tieneRubrica
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-rubrica`,
                                  () => descargarRubricaAnalitica(sesionIdRubrica),
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onVisualizarRubrica={
                          tieneRubrica
                            ? () => {
                                setRubricaVistaSesion({
                                  id: sesionIdRubrica,
                                  titulo: s.titulo
                                })
                              }
                            : undefined
                        }
                        onGenerarListaCotejo={
                          tieneListaCotejo
                            ? undefined
                            : () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-generar-lista-cotejo`,
                                  async () => {
                                    await descargarListaCotejo(s.id)
                                    await onRecargarDatos?.()
                                  },
                                  { requierePlan: true }
                                )
                        }
                        onDescargarListaCotejo={
                          tieneListaCotejo
                            ? () =>
                                void ejecutarDescarga(
                                  `sesion-${s.id}-lista-cotejo`,
                                  () => descargarListaCotejo(listaCotejoSesion!.sesionId),
                                  { requierePlan: true }
                                )
                            : undefined
                        }
                        onGenerarSesionRefuerzo={() =>
                          void ejecutarDescarga(
                            `sesion-${s.id}-generar-sesion-refuerzo`,
                            async () => {
                              setRefuerzoVistaSesion({
                                id: s.id,
                                titulo: s.titulo,
                                cargando: true,
                                error: null,
                                datos: null
                              })
                              try {
                                const result = await generarSesionRefuerzo(s.id)
                                setRefuerzoVistaSesion({
                                  id: s.id,
                                  titulo: s.titulo,
                                  cargando: false,
                                  error: null,
                                  datos: result.vista
                                })
                              } catch (e: unknown) {
                                setRefuerzoVistaSesion({
                                  id: s.id,
                                  titulo: s.titulo,
                                  cargando: false,
                                  error:
                                    e instanceof Error
                                      ? e.message
                                      : 'Error al generar la sesión de refuerzo',
                                  datos: null
                                })
                              }
                            },
                            { requierePlan: true }
                          )
                        }
                        etiquetaDescargar="📥 Descargar Sesión"
                        onDescargar={() =>
                          void ejecutarDescarga(`sesion-${s.id}`, async () => {
                            await descargarSesionAprendizaje(s.id)
                            await onRecargarDatos?.()
                          })
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
                                      void ejecutarDescarga(
                                        `ficha-${fichaActiva.id}`,
                                        () => descargarFichaAprendizaje(fichaActiva.sesionId),
                                        { requierePlan: true }
                                      )
                                    }
                                    onVisualizarFicha={() => {
                                      if (modoPrueba) {
                                        mostrarAvisoModoPruebaFichaCotejo()
                                        return
                                      }
                                      setFichaVistaSesion({
                                        id: sesionSeleccionadaFicha.id,
                                        titulo: sesionSeleccionadaFicha.titulo
                                      })
                                    }}
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
                onVisualizarRubrica={() =>
                  setRubricaVistaSesion({
                    id: r.sesionId,
                    titulo: r.titulo
                  })
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
              : paso === 'planAnual'
                ? styles.modalBoxPlanAnual
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

        {paso === 'unidad' && textoUsoUnidad && (
          <p
            className={`${styles.modalUsoCuota} ${!puedeGenerarUnidadAprendizaje ? styles.modalUsoCuotaLimite : ''}`}
          >
            {textoUsoUnidad}
          </p>
        )}
        {paso === 'planAnual' && textoUsoPlanAnual && (
          <p className={styles.modalUsoCuota}>{textoUsoPlanAnual}</p>
        )}
        {paso === 'planAnual' && modoPrueba && (
          <p className={styles.modalUsoCuota}>
            Modo prueba: la descarga del plan anual se entrega en PDF protegido (no editable).
          </p>
        )}
        {modoPrueba && (paso === 'unidad' || paso === 'sesiones' || paso === 'rubrica') && (
          <p className={styles.modalUsoCuota}>
            Modo prueba: los documentos se entregan en PDF protegido (no editable).
          </p>
        )}
        {modoPrueba && paso === 'fichas' && (
          <p className={styles.modalUsoCuota}>
            Modo prueba: solo puedes generar la rúbrica analítica (PDF protegido). Las fichas y
            listas de cotejo requieren activar un plan.
          </p>
        )}
        {paso === 'planAnual' && modoRegeneracionPlan && (
          <p className={styles.modalRegenerarHint}>
            Marca las unidades que quieres regenerar con IA. Las demás se conservan tal como
            están.
            {creditosRegeneracion
              ? ` Créditos de regeneración: ${creditosRegeneracion.restantes} de ${creditosRegeneracion.total}.`
              : ''}
          </p>
        )}

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
                ) : paso === 'unidad' ? (
                  puedeGenerarUnidadAprendizaje ? (
                    <Link
                      href={linkGenerar}
                      className={styles.modalLinkGenerar}
                      title={tituloContadorUnidad}
                    >
                      ➕ {etiquetaLinkGenerar(paso)}
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorUnidadBtn}
                      </span>
                    </Link>
                  ) : (
                    <span
                      className={`${styles.modalLinkGenerar} ${styles.modalLinkGenerarDisabled}`}
                      aria-disabled="true"
                      title={tituloContadorUnidad}
                    >
                      ➕ {etiquetaLinkGenerar(paso)}
                      <span className={styles.modalLinkGenerarContador}>
                        {contadorUnidadBtn}
                      </span>
                    </span>
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
                    disabled={descargandoPlanAnual || regenerandoPlanAnual || modoRegeneracionPlan}
                  >
                    {descargandoPlanAnual
                      ? 'Descargando…'
                      : '📥 Descargar plan anual'}
                  </button>
                )}
                {paso === 'planAnual' && puedeRegenerarPlan && (
                  <>
                    {!modoRegeneracionPlan ? (
                      <button
                        type="button"
                        className={styles.modalLinkRegenerar}
                        onClick={() => setModoRegeneracionPlan(true)}
                        disabled={regenerandoPlanAnual || descargandoPlanAnual}
                      >
                        🔄 Activar regeneración
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.modalLinkRegenerar}
                          onClick={() => void ejecutarRegeneracionPlan()}
                          disabled={
                            regenerandoPlanAnual ||
                            unidadesRegenerarSeleccionadas.length === 0
                          }
                        >
                          {regenerandoPlanAnual
                            ? 'Regenerando…'
                            : '🔄 Regenerar plan'}
                        </button>
                        <button
                          type="button"
                          className={styles.modalLinkSecundario}
                          onClick={cancelarModoRegeneracion}
                          disabled={regenerandoPlanAnual}
                        >
                          Cancelar regeneración
                        </button>
                      </>
                    )}
                  </>
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
                  regenerandoPlanAnual
                    ? '#ea580c'
                    : generandoRubrica
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
            {regenerandoPlanAnual
              ? 'Regenerando plan anual…'
              : regenerandoUnidad
                ? 'Regenerando unidad de aprendizaje…'
                : descargandoPlanAnual &&
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
            {regenerandoPlanAnual
              ? 'La IA está regenerando las unidades seleccionadas. Descargarás un ZIP con el documento y otro Word con la respuesta cruda de la IA.'
              : regenerandoUnidad
                ? 'La IA está regenerando la unidad de aprendizaje. Al terminar se descargará el documento actualizado. No cierres esta ventana.'
                : descargandoPlanAnual &&
                  !generandoFicha &&
                  !generandoRubrica &&
                  !generandoListaCotejo
                ? modoPrueba
                  ? 'Generando PDF protegido con los datos guardados. Puede tardar un momento…'
                  : 'Armando tu documento Word con los datos guardados. Un momento…'
                : generandoListaCotejo
                  ? 'Rellenando la plantilla con los datos de la sesión. Un momento…'
                  : 'La IA está creando tu documento. Puede tardar varios minutos; no cierres esta ventana.'}
          </p>
        </div>
      </div>
    )}

    {AvisoModalEl}

    <ModalVisualizarFicha
      abierto={fichaVistaSesion != null}
      sesionId={fichaVistaSesion?.id ?? null}
      tituloSesion={
        fichaVistaSesion?.titulo
          ? `Sesión — ${fichaVistaSesion.titulo}`
          : undefined
      }
      onCerrar={() => setFichaVistaSesion(null)}
    />

    <ModalVisualizarSolucionario
      abierto={solucionarioVistaSesion != null}
      sesionId={solucionarioVistaSesion?.id ?? null}
      tituloSesion={
        solucionarioVistaSesion?.titulo
          ? `Solucionario — ${solucionarioVistaSesion.titulo}`
          : undefined
      }
      onCerrar={() => setSolucionarioVistaSesion(null)}
    />

    <ModalVisualizarRubrica
      abierto={rubricaVistaSesion != null}
      sesionId={rubricaVistaSesion?.id ?? null}
      tituloSesion={
        rubricaVistaSesion?.titulo
          ? `Rúbrica — ${rubricaVistaSesion.titulo}`
          : undefined
      }
      onCerrar={() => setRubricaVistaSesion(null)}
    />

    <ModalVisualizarSesionRefuerzo
      abierto={refuerzoVistaSesion != null}
      cargando={refuerzoVistaSesion?.cargando ?? false}
      error={refuerzoVistaSesion?.error ?? null}
      datos={refuerzoVistaSesion?.datos ?? null}
      onCerrar={() => setRefuerzoVistaSesion(null)}
    />

    <ModalVisualizarExamen
      abierto={examenVistaUnidad != null}
      cargando={examenVistaUnidad?.cargando ?? false}
      error={examenVistaUnidad?.error ?? null}
      datos={examenVistaUnidad?.datos ?? null}
      onCerrar={() => setExamenVistaUnidad(null)}
    />

    <ModalVisualizarConclusiones
      abierto={conclusionesVistaUnidad != null}
      cargando={conclusionesVistaUnidad?.cargando ?? false}
      error={conclusionesVistaUnidad?.error ?? null}
      datos={conclusionesVistaUnidad?.datos ?? null}
      onCerrar={() => setConclusionesVistaUnidad(null)}
    />
    </>
  )
}
