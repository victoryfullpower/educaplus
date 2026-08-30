'use client'

import { useMemo } from 'react'
import styles from './home.module.css'
import {
  sesionRefuerzoDocumentoToHtml,
  tituloRefuerzoVisible,
  type SesionRefuerzoVistaData
} from '@/lib/sesion-refuerzo-vista-html'

type Props = {
  abierto: boolean
  cargando?: boolean
  error?: string | null
  datos: SesionRefuerzoVistaData | null
  onCerrar: () => void
}

export function ModalVisualizarSesionRefuerzo({
  abierto,
  cargando = false,
  error = null,
  datos,
  onCerrar
}: Props) {
  const htmlContenido = useMemo(() => {
    if (!datos?.respuestaprompt) return ''
    return sesionRefuerzoDocumentoToHtml(datos)
  }, [datos])

  const tituloDocumento = useMemo(() => {
    if (!datos?.respuestaprompt) return 'Sesión de refuerzo'
    return tituloRefuerzoVisible(datos)
  }, [datos])

  if (!abierto) return null

  return (
    <div
      className={styles.fichaVistaOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refuerzo-vista-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div className={`${styles.fichaVistaPanel} ${styles.refuerzoVistaPanel}`}>
        <header className={`${styles.fichaVistaHeader} ${styles.refuerzoVistaHeader}`}>
          <div>
            <p className={styles.fichaVistaEyebrow}>
              Vista previa · plantilla sesión de refuerzo
            </p>
            <h2 id="refuerzo-vista-title" className={styles.fichaVistaTitle}>
              {tituloDocumento}
            </h2>
            {datos?.area && (
              <p className={styles.fichaVistaSubtitle}>
                {datos.area}
                {datos.grado ? ` · ${datos.grado}` : ''}
                {datos.numeroSesion ? ` · Sesión ${datos.numeroSesion}` : ''}
              </p>
            )}
          </div>
          <button
            type="button"
            className={styles.fichaVistaCerrar}
            onClick={onCerrar}
            aria-label="Cerrar vista de sesión de refuerzo"
          >
            ✕
          </button>
        </header>

        <div className={styles.fichaVistaBody}>
          {cargando && (
            <div className={styles.fichaVistaEstadoBox}>
              <p className={styles.fichaVistaEstado}>
                Generando sesión de refuerzo con IA…
              </p>
              <p className={styles.fichaVistaEstadoSub}>
                Puede tardar varios minutos. Los archivos Word se descargarán
                automáticamente al finalizar.
              </p>
            </div>
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
