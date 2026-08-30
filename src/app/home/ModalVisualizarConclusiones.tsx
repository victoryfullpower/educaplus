'use client'

import { useMemo } from 'react'
import styles from './home.module.css'
import {
  conclusionesDocumentoToHtml,
  tituloConclusionesVisible,
  type ConclusionesVistaData
} from '@/lib/conclusiones-vista-html'

type Props = {
  abierto: boolean
  cargando?: boolean
  error?: string | null
  datos: ConclusionesVistaData | null
  onCerrar: () => void
}

export function ModalVisualizarConclusiones({
  abierto,
  cargando = false,
  error = null,
  datos,
  onCerrar
}: Props) {
  const htmlContenido = useMemo(() => {
    if (!datos?.respuestaprompt) return ''
    return conclusionesDocumentoToHtml(datos)
  }, [datos])

  const tituloDocumento = useMemo(() => {
    if (!datos?.respuestaprompt) return 'Conclusiones descriptivas'
    return tituloConclusionesVisible(datos)
  }, [datos])

  if (!abierto) return null

  return (
    <div
      className={styles.fichaVistaOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="conclusiones-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className={`${styles.fichaVistaPanel} ${styles.refuerzoVistaPanel} ${styles.conclusionesVistaPanel}`}
      >
        <header className={`${styles.fichaVistaHeader} ${styles.refuerzoVistaHeader}`}>
          <div>
            <p className={styles.fichaVistaEyebrow}>
              Vista previa · conclusiones descriptivas
            </p>
            <h2 id="conclusiones-vista-title" className={styles.fichaVistaTitle}>
              {tituloDocumento}
            </h2>
            {datos?.area && (
              <p className={styles.fichaVistaSubtitle}>
                {datos.area}
                {datos.grado ? ` · ${datos.grado}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.fichaVistaCerrar}
            onClick={onCerrar}
            aria-label="Cerrar vista de conclusiones"
          >
            ✕
          </button>
        </header>

        <div className={styles.fichaVistaBody}>
          {cargando && (
            <div className={styles.fichaVistaEstadoBox}>
              <p className={styles.fichaVistaEstado}>
                Generando conclusiones descriptivas con IA…
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
              className={`${styles.fichaVistaDocumento} ${styles.refuerzoVistaDocumento} ${styles.conclusionesVistaDocumento}`}
              dangerouslySetInnerHTML={{ __html: htmlContenido }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
