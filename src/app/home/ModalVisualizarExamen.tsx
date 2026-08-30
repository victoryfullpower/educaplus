'use client'

import { useMemo } from 'react'
import styles from './home.module.css'
import {
  examenUnidadDocumentoToHtml,
  tituloExamenVisible,
  type ExamenUnidadVistaData
} from '@/lib/examen-vista-html'

type Props = {
  abierto: boolean
  cargando?: boolean
  error?: string | null
  datos: ExamenUnidadVistaData | null
  onCerrar: () => void
}

export function ModalVisualizarExamen({
  abierto,
  cargando = false,
  error = null,
  datos,
  onCerrar
}: Props) {
  const htmlContenido = useMemo(() => {
    if (!datos?.respuestaprompt) return ''
    return examenUnidadDocumentoToHtml(datos)
  }, [datos])

  const tituloDocumento = useMemo(() => {
    if (!datos?.respuestaprompt) return 'Examen de fin de unidad'
    return tituloExamenVisible(datos)
  }, [datos])

  if (!abierto) return null

  return (
    <div
      className={styles.fichaVistaOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="examen-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={`${styles.fichaVistaPanel} ${styles.refuerzoVistaPanel} ${styles.examenVistaPanel}`}>
        <header className={`${styles.fichaVistaHeader} ${styles.refuerzoVistaHeader}`}>
          <div>
            <p className={styles.fichaVistaEyebrow}>
              Vista previa · examen final de unidad
            </p>
            <h2 id="examen-vista-title" className={styles.fichaVistaTitle}>
              {tituloDocumento}
            </h2>
            {datos?.area && (
              <p className={styles.fichaVistaSubtitle}>
                {datos.area}
                {datos.grado ? ` · ${datos.grado}` : ''}
                {datos.numunidad ? ` · Unidad ${datos.numunidad}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.fichaVistaCerrar}
            onClick={onCerrar}
            aria-label="Cerrar vista del examen"
          >
            ✕
          </button>
        </header>

        <div className={styles.fichaVistaBody}>
          {cargando && (
            <div className={styles.fichaVistaEstadoBox}>
              <p className={styles.fichaVistaEstado}>
                Generando examen con IA…
              </p>
            </div>
          )}
          {error && !cargando && (
            <div className={styles.fichaVistaEstadoBox}>
              <p className={styles.fichaVistaError}>{error}</p>
            </div>
          )}
          {!cargando && !error && htmlContenido && (
            <div
              className={`${styles.fichaVistaDocumento} ${styles.refuerzoVistaDocumento} ${styles.examenVistaDocumento}`}
              dangerouslySetInnerHTML={{ __html: htmlContenido }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
