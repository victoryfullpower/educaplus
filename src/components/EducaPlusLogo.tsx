'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import logo from '@/assets/log_educaplus.png'
import styles from './EducaPlusLogo.module.css'

type EducaPlusLogoProps = {
  href?: string
  linkClassName?: string
  imageClassName?: string
  priority?: boolean
  showTooltip?: boolean
  onLinkClick?: () => void
}

export default function EducaPlusLogo({
  href,
  linkClassName = '',
  imageClassName = '',
  priority = false,
  showTooltip = true,
  onLinkClick
}: EducaPlusLogoProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const tooltipId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  const openModal = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setTooltipOpen(false)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => setModalOpen(false), [])

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') closeModal()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [modalOpen, closeModal])

  const image = (
    <Image
      src={logo}
      alt="EducaPlus — Descubre, aprende y triunfa"
      className={`${styles.image} ${imageClassName}`.trim()}
      priority={priority}
    />
  )

  return (
    <>
      <div
        ref={wrapRef}
        className={styles.wrap}
        onMouseEnter={() => showTooltip && setTooltipOpen(true)}
        onMouseLeave={() => setTooltipOpen(false)}
        onFocusCapture={() => showTooltip && setTooltipOpen(true)}
        onBlurCapture={(e) => {
          if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
            setTooltipOpen(false)
          }
        }}
      >
        {href ? (
          <Link
            href={href}
            className={`${styles.link} ${linkClassName}`.trim()}
            onClick={onLinkClick}
          >
            {image}
          </Link>
        ) : (
          <span className={`${styles.link} ${linkClassName}`.trim()}>{image}</span>
        )}

        {showTooltip && tooltipOpen && (
          <div
            id={tooltipId}
            className={styles.tooltip}
            role="tooltip"
            onMouseEnter={() => setTooltipOpen(true)}
          >
            <span className={styles.tooltipHint}>Logo EducaPlus</span>
            <button type="button" className={styles.tooltipBtn} onClick={openModal}>
              Ver más grande
            </button>
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-label="Logo EducaPlus ampliado"
          onClick={closeModal}
        >
          <div className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              aria-label="Cerrar"
              onClick={closeModal}
            >
              ×
            </button>
            <Image
              src={logo}
              alt="EducaPlus"
              className={styles.modalImage}
              width={1024}
              height={1024}
              sizes="(max-width: 768px) 90vw, 480px"
            />
            <p className={styles.modalCaption}>Descubre, aprende y triunfa</p>
          </div>
        </div>
      )}
    </>
  )
}
