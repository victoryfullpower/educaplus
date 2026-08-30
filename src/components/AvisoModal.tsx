'use client'

import { useEffect, useRef } from 'react'
import styles from './AvisoModal.module.css'

export type AvisoModalTipo = 'info' | 'warn' | 'error'

export type AvisoModalProps = {
  abierto: boolean
  titulo: string
  mensaje: string
  tipo?: AvisoModalTipo
  subtitulo?: string
  botonTexto?: string
  onCerrar: () => void
}

export default function AvisoModal({
  abierto,
  titulo,
  mensaje,
  tipo = 'info',
  subtitulo = 'EducaPlus',
  botonTexto = 'Entendido',
  onCerrar
}: AvisoModalProps) {
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!abierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar()
    }
    document.addEventListener('keydown', onKey)
    cerrarRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [abierto, onCerrar])

  if (!abierto) return null

  const iconClass =
    tipo === 'error'
      ? styles.iconError
      : tipo === 'warn'
        ? styles.iconWarn
        : styles.iconInfo

  return (
    <div className={styles.overlay} role="presentation" onClick={onCerrar}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="aviso-modal-title"
        aria-describedby="aviso-modal-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={`${styles.icon} ${iconClass}`} aria-hidden>
            {tipo === 'error' ? '!' : tipo === 'warn' ? '⚠' : 'i'}
          </div>
          <div className={styles.titles}>
            <h2 id="aviso-modal-title" className={styles.title}>
              {titulo}
            </h2>
            <p className={styles.subtitle}>{subtitulo}</p>
          </div>
        </div>
        <div className={styles.body}>
          <p id="aviso-modal-desc" className={styles.message}>
            {mensaje}
          </p>
        </div>
        <div className={styles.footer}>
          <button
            ref={cerrarRef}
            type="button"
            className={`${styles.btnPrimary} ${tipo === 'error' ? styles.btnDanger : ''}`}
            onClick={onCerrar}
          >
            {botonTexto}
          </button>
        </div>
      </div>
    </div>
  )
}
