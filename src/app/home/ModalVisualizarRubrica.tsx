'use client'

import { useEffect, useMemo, useState } from 'react'
import styles from './home.module.css'
import { rubricaDocumentoToHtml, type RubricaVistaData } from '@/lib/rubrica-vista-html'
import { descargarRubricaAnalitica } from '@/lib/home-descarga-documento'

type Props = {
  abierto: boolean
  sesionId: number | null
  tituloSesion?: string
  onCerrar: () => void
}

export function ModalVisualizarRubrica({
  abierto,
  sesionId,
  tituloSesion,
  onCerrar
}: Props) {
  const [cargando, setCargando] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [datos, setDatos] = useState<RubricaVistaData | null>(null)

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

    fetch(`/api/sesiones-fichas/rubrica-vista?sesionId=${sesionId}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la rúbrica')
        return data
      })
      .then((data) => {
        if (!cancelado) setDatos(data as RubricaVistaData)
      })
      .catch((e: unknown) => {
        if (!cancelado) {
          setError(e instanceof Error ? e.message : 'Error al cargar la rúbrica')
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
    if (!datos?.tabladinamica) return ''
    return rubricaDocumentoToHtml(datos)
  }, [datos])

  const handleDescargar = async () => {
    if (sesionId == null || descargando) return
    setDescargando(true)
    setError(null)
    try {
      await descargarRubricaAnalitica(sesionId)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar la rúbrica')
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
      aria-labelledby="rubrica-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={styles.fichaVistaPanel}>
        <header className={styles.fichaVistaHeader}>
          <div>
            <p className={styles.fichaVistaEyebrow}>Vista previa · plantilla rúbrica analítica</p>
            <h2 id="rubrica-vista-title" className={styles.fichaVistaTitle}>
              {tituloSesion || datos?.tituloSesion || 'Rúbrica analítica'}
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
                {descargando ? 'Descargando…' : '📥 Descargar rúbrica'}
              </button>
            )}
            <button
              type="button"
              className={styles.fichaVistaCerrar}
              onClick={onCerrar}
              aria-label="Cerrar vista de rúbrica"
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
              {descargando ? 'Descargando Word…' : '📥 Descargar rúbrica en Word'}
            </button>
          </div>
        )}

        <div className={styles.fichaVistaBody}>
          {cargando && (
            <p className={styles.fichaVistaEstado}>Cargando rúbrica…</p>
          )}
          {error && !cargando && (
            <p className={styles.fichaVistaError}>{error}</p>
          )}
          {datos && !cargando && (
            <article
              className={`${styles.fichaVistaDocumento} ${styles.rubricaVistaDocumento}`}
              dangerouslySetInnerHTML={{ __html: htmlContenido }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
