'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './home.module.css'
import {
  etiquetaFichaDocumento,
  fichaDocumentoRestoHtml,
  tituloFichaVisible,
  type FichaVistaData
} from '@/lib/ficha-vista-html'
import { extraerSolucionarioDeFicha } from '@/lib/ficha-contenido-estudiante'
import { markdownFichaToHtml } from '@/lib/markdown-ficha-html'
import {
  descargarFichaAprendizaje,
  descargarSolucionario
} from '@/lib/home-descarga-documento'

type Props = {
  abierto: boolean
  sesionId: number | null
  tituloSesion?: string
  onCerrar: () => void
}

type SolucionarioVistaPayload = {
  respuestaprompt?: string
}

export function ModalVisualizarFicha({ abierto, sesionId, tituloSesion, onCerrar }: Props) {
  const [cargando, setCargando] = useState(false)
  const [descargandoFicha, setDescargandoFicha] = useState(false)
  const [descargandoSolucionario, setDescargandoSolucionario] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState<FichaVistaData | null>(null)
  const [solucionarioBd, setSolucionarioBd] = useState<string>('')

  useEffect(() => {
    if (!abierto || sesionId == null) {
      setDatos(null)
      setError(null)
      setSolucionarioBd('')
      return
    }

    let cancelado = false
    setCargando(true)
    setError(null)
    setDatos(null)
    setSolucionarioBd('')

    Promise.all([
      fetch(`/api/sesiones-fichas/ficha-vista?sesionId=${sesionId}`).then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la ficha')
        return data as FichaVistaData
      }),
      fetch(`/api/sesiones-fichas/solucionario-vista?sesionId=${sesionId}`)
        .then(async (res) => {
          if (!res.ok) return null
          return (await res.json()) as SolucionarioVistaPayload
        })
        .catch(() => null)
    ])
      .then(([ficha, solucionario]) => {
        if (cancelado) return
        setDatos(ficha)
        setSolucionarioBd((solucionario?.respuestaprompt ?? '').trim())
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : 'Error al cargar la ficha')
          setDatos(null)
        }
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })

    return () => {
      cancelado = true
    }
  }, [abierto, sesionId])

  const htmlResto = useMemo(() => {
    if (!datos) return ''
    return fichaDocumentoRestoHtml(datos)
  }, [datos])

  const solucionarioEnFicha = useMemo(() => {
    if (!datos?.respuestaprompt) return ''
    return extraerSolucionarioDeFicha(datos.respuestaprompt).trim()
  }, [datos])

  /** Si el solucionario está solo en BD (no embebido en la ficha), lo mostramos debajo. */
  const htmlSolucionarioExtra = useMemo(() => {
    if (solucionarioEnFicha || !solucionarioBd) return ''
    return `<hr class="ficha-doc-separador" />
    <section class="ficha-doc-solucionario" id="ficha-vista-solucionario">
      <h3 class="ficha-doc-seccion-titulo">SOLUCIONARIO</h3>
      <div class="ficha-doc-analisis-cuerpo ficha-doc-markdown">${markdownFichaToHtml(
        solucionarioBd,
        { contenidoLibre: true, procesosDidacticos: datos?.procesosDidacticos ?? [] }
      )}</div>
    </section>`
  }, [solucionarioEnFicha, solucionarioBd, datos?.procesosDidacticos])

  const puedeDescargarSolucionario = Boolean(solucionarioBd || solucionarioEnFicha)
  const ocupado = descargandoFicha || descargandoSolucionario

  const handleDescargarFicha = async () => {
    if (sesionId == null || ocupado) return
    setDescargandoFicha(true)
    setError(null)
    try {
      await descargarFichaAprendizaje(sesionId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar la ficha')
    } finally {
      setDescargandoFicha(false)
    }
  }

  const handleDescargarSolucionario = async () => {
    if (sesionId == null || ocupado) return
    setDescargandoSolucionario(true)
    setError(null)
    try {
      await descargarSolucionario(sesionId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el solucionario')
    } finally {
      setDescargandoSolucionario(false)
    }
  }

  const tituloDoc = datos ? tituloFichaVisible(datos) : tituloSesion || ''
  const docente = (datos?.docente || 'EducaPlus').trim()
  const area = (datos?.area ?? '').trim()
  const grado = (datos?.grado ?? '').trim()

  if (!abierto) return null

  return (
    <div
      className={styles.fichaVistaOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ficha-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={styles.fichaVistaPanel}>
        <header className={styles.fichaVistaHeader}>
          <div>
            <p className={styles.fichaVistaEyebrow}>Vista previa · ficha de aprendizaje</p>
            <h2 id="ficha-vista-title" className={styles.fichaVistaTitle}>
              {datos?.area || tituloSesion || 'Ficha de aprendizaje'}
              {datos?.grado ? ` · ${datos.grado}` : ''}
            </h2>
          </div>
          <div className={styles.fichaVistaHeaderActions}>
            {datos && !cargando && (
              <>
                <button
                  type="button"
                  className={styles.fichaVistaBtnDescargar}
                  disabled={ocupado}
                  onClick={() => void handleDescargarFicha()}
                >
                  {descargandoFicha ? 'Descargando…' : '📥 Descargar ficha'}
                </button>
                {puedeDescargarSolucionario && (
                  <button
                    type="button"
                    className={styles.fichaVistaBtnDescargar}
                    disabled={ocupado}
                    onClick={() => void handleDescargarSolucionario()}
                  >
                    {descargandoSolucionario ? 'Descargando…' : '📥 Descargar solucionario'}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className={styles.fichaVistaCerrar}
              onClick={onCerrar}
              aria-label="Cerrar vista de ficha"
            >
              ✕
            </button>
          </div>
        </header>

        {datos && !cargando && (
          <div className={styles.fichaVistaAccionesBar}>
            <button
              type="button"
              className={styles.fichaVistaBtnDescargarGrande}
              disabled={ocupado}
              onClick={() => void handleDescargarFicha()}
            >
              {descargandoFicha ? 'Descargando Word…' : '📥 Descargar ficha en Word'}
            </button>
            {puedeDescargarSolucionario && (
              <button
                type="button"
                className={styles.fichaVistaBtnDescargarGrande}
                disabled={ocupado}
                onClick={() => void handleDescargarSolucionario()}
              >
                {descargandoSolucionario
                  ? 'Descargando Word…'
                  : '📥 Descargar solucionario en Word'}
              </button>
            )}
          </div>
        )}

        <div className={styles.fichaVistaBody}>
          {cargando && <p className={styles.fichaVistaEstado}>Cargando ficha…</p>}
          {error && !cargando && <p className={styles.fichaVistaError}>{error}</p>}
          {datos && !cargando && (
            <article
              className={`${styles.fichaVistaDocumento} ${styles.fichaVistaPlantillaDocumento}`}
            >
              <header className={styles.fichaDocEncabezado}>
                <div className={styles.fichaDocTituloWrap}>
                  <p className={styles.fichaDocEtiqueta}>
                    {etiquetaFichaDocumento(datos.numeroSesion)}
                  </p>
                  <div className={styles.fichaDocTituloCard}>
                    <h1 className={styles.fichaDocTituloSesion}>{tituloDoc || '—'}</h1>
                  </div>
                </div>
                <div className={styles.fichaDocTablaWrap}>
                  <table className={styles.fichaDocInfo}>
                    <colgroup>
                      <col className={styles.fichaDocInfoColLabel} />
                      <col className={styles.fichaDocInfoColValor} />
                      <col className={styles.fichaDocInfoColLabel} />
                      <col className={styles.fichaDocInfoColValor} />
                    </colgroup>
                    <tbody>
                      <tr>
                        <th className={styles.fichaDocInfoTh}>DOCENTE</th>
                        <td className={styles.fichaDocInfoTd}>{docente || '—'}</td>
                        <th className={styles.fichaDocInfoTh}>ESTUDIANTE</th>
                        <td className={styles.fichaDocInfoTd}>—</td>
                      </tr>
                      <tr>
                        <th className={styles.fichaDocInfoTh}>ÁREA</th>
                        <td className={styles.fichaDocInfoTd}>{area || '—'}</td>
                        <th className={styles.fichaDocInfoTh}>GRADO / SECCIÓN</th>
                        <td className={styles.fichaDocInfoTd}>{grado || '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </header>
              <div
                className={styles.fichaDocResto}
                dangerouslySetInnerHTML={{
                  __html: `${htmlResto}${htmlSolucionarioExtra}`
                }}
              />
            </article>
          )}
        </div>
      </div>
    </div>
  )
}
