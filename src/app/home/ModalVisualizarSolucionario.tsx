'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './home.module.css'
import { solucionarioRefuerzoDocumentoToHtml } from '@/lib/sesion-refuerzo-vista-html'
import { descargarSolucionario } from '@/lib/home-descarga-documento'

type Props = {
  abierto: boolean
  sesionId: number | null
  tituloSesion?: string
  onCerrar: () => void
}

type SolucionarioPreview = {
  tituloSesion: string
  area: string
  grado: string
  respuestaprompt: string
}

export function ModalVisualizarSolucionario({
  abierto,
  sesionId,
  tituloSesion,
  onCerrar
}: Props) {
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState<SolucionarioPreview | null>(null)

  useEffect(() => {
    if (!abierto || sesionId == null) {
      setDatos(null)
      setError(null)
      return
    }

    let cancelado = false
    setCargando(true)
    setError(null)
    setDatos(null)

    fetch(`/api/sesiones-fichas/solucionario-vista?sesionId=${sesionId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar el solucionario')
        return data
      })
      .then((data) => {
        if (!cancelado) setDatos(data as SolucionarioPreview)
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : 'Error al cargar el solucionario')
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

  const htmlContenido = useMemo(() => {
    if (!datos?.respuestaprompt) return ''
    return solucionarioRefuerzoDocumentoToHtml({
      respuestaprompt: datos.respuestaprompt,
      tituloSesion: datos.tituloSesion || tituloSesion,
      area: datos.area,
      grado: datos.grado
    })
  }, [datos, tituloSesion])

  const handleDescargar = async () => {
    if (sesionId == null || descargando) return
    setDescargando(true)
    try {
      await descargarSolucionario(sesionId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el solucionario')
    } finally {
      setDescargando(false)
    }
  }

  if (!abierto) return null

  return (
    <div
      className={styles.fichaVistaOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="solucionario-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={styles.fichaVistaPanel}>
        <header className={styles.fichaVistaHeader}>
          <div>
            <p className={styles.fichaVistaEyebrow}>Solucionario · vista previa</p>
            <h2 id="solucionario-vista-title" className={styles.fichaVistaTitle}>
              {tituloSesion || datos?.tituloSesion || 'Solucionario de ficha'}
            </h2>
            {datos?.area && (
              <p className={styles.fichaVistaSubtitle}>
                {datos.area}
                {datos.grado ? ` · ${datos.grado}` : ''}
              </p>
            )}
          </div>
          <div className={styles.fichaVistaHeaderActions}>
            {datos && !cargando && (
              <button
                type="button"
                className={styles.fichaVistaBtnDescargar}
                disabled={descargando}
                onClick={() => void handleDescargar()}
              >
                {descargando ? 'Descargando…' : '📥 Descargar solucionario'}
              </button>
            )}
            <button
              type="button"
              className={styles.fichaVistaCerrar}
              onClick={onCerrar}
              aria-label="Cerrar vista de solucionario"
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
              disabled={descargando}
              onClick={() => void handleDescargar()}
            >
              {descargando ? 'Descargando Word…' : '📥 Descargar solucionario en Word'}
            </button>
          </div>
        )}

        <div className={styles.fichaVistaBody}>
          {cargando && (
            <p className={styles.fichaVistaEstado}>Cargando solucionario…</p>
          )}
          {error && !cargando && (
            <p className={styles.fichaVistaError}>{error}</p>
          )}
          {datos && !cargando && (
            <article
              className={`${styles.fichaVistaDocumento} ${styles.refuerzoVistaDocumento}`}
              dangerouslySetInnerHTML={{ __html: htmlContenido }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
