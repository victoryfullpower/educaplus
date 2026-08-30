'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { useEffect, useState } from 'react'
import { HerramientaIcon, type HerramientaIconName } from './crear-material-icons'
import styles from './crear-material.module.css'

const HERRAMIENTAS: {
  href: string
  title: string
  description: string
  icon: HerramientaIconName
  fase?: string
  destacado?: boolean
}[] = [
  {
    href: '/servicios/crear-material/situaciones-significativas',
    title: 'Situaciones significativas',
    description: 'Diseña situaciones alineadas al currículo y competencias del MINEDU.',
    icon: 'situacion'
  },
  {
    href: '/servicios/crear-material/programacion-anual',
    title: 'Programación anual',
    description: 'Genera tu programación completa en un flujo guiado por fases.',
    icon: 'programacion',
    fase: '2 fases',
    destacado: true
  },
  {
    href: '/servicios/crear-material/unidades-aprendizaje',
    title: 'Unidades de aprendizaje',
    description: 'Crea unidades con secuencia, desempeños y criterios de evaluación.',
    icon: 'unidades',
    fase: '3 fases',
    destacado: true
  },
  {
    href: '/servicios/crear-material/sesiones-fichas',
    title: 'Sesiones de aprendizaje',
    description: 'Sesiones completas con fichas, listas de cotejo y rúbricas.',
    icon: 'sesiones',
    destacado: true
  },
  {
    href: '/servicios/crear-material/ficha-aprendizaje',
    title: 'Ficha de aprendizaje',
    description: 'Genera la ficha de una sesión a partir de tu programación anual.',
    icon: 'ficha'
  },
  {
    href: '/servicios/crear-material/rubricas-solo',
    title: 'Solo rúbricas',
    description: 'Rúbricas analíticas personalizadas listas para evaluar.',
    icon: 'rubricas'
  },
  {
    href: '/servicios/crear-material/conclusiones',
    title: 'Conclusiones descriptivas',
    description: 'Redacta conclusiones descriptivas para el informe de tus estudiantes.',
    icon: 'conclusiones'
  },
  {
    href: '/servicios/crear-material/examenes',
    title: 'Exámenes',
    description: 'Elabora exámenes coherentes con tus competencias y desempeños.',
    icon: 'examenes'
  },
  {
    href: '/servicios/crear-material/probar-prompt',
    title: 'Probar prompt',
    description: 'Pega tu prompt, envíalo a GPT-4o-mini y ve la respuesta en un modal HTML.',
    icon: 'prompt'
  }
]

export default function CrearMaterialPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        setIsAuthenticated(data.authenticated || false)
      } catch {
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroInner}>
            <Link href="/servicios" className={styles.backLink}>
              ← Volver a servicios
            </Link>
            <span className={styles.heroBadge}>Inteligencia artificial</span>
            <h1 className={styles.heroTitle}>Crea tu material con IA</h1>
            <p className={styles.heroSubtitle}>
              Programación anual, unidades, sesiones, fichas, rúbricas y más — en minutos y
              alineado al MINEDU.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          {!loading && !isAuthenticated && (
            <div className={styles.authBanner} role="alert">
              <svg
                className={styles.authBannerIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <div className={styles.authBannerText}>
                <strong>Inicia sesión para generar documentos</strong>
                <p>Necesitas una cuenta activa y un plan con créditos disponibles.</p>
              </div>
              <div className={styles.authBannerActions}>
                <Link href="/login" className={styles.authBtnSecondary}>
                  Iniciar sesión
                </Link>
                <Link href="/register" className={styles.authBtnPrimary}>
                  Crear cuenta
                </Link>
              </div>
            </div>
          )}

          <div className={styles.optionsGrid}>
            {HERRAMIENTAS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.optionCard} ${item.destacado ? styles.optionCardFeatured : ''}`}
              >
                {item.fase && <span className={styles.faseBadge}>{item.fase}</span>}
                <div className={styles.optionIconWrap}>
                  <HerramientaIcon name={item.icon} />
                </div>
                <h2 className={styles.optionTitle}>{item.title}</h2>
                <p className={styles.optionDescription}>{item.description}</p>
                <span className={styles.optionCta}>
                  Abrir herramienta
                  <span className={styles.optionCtaArrow} aria-hidden>
                    →
                  </span>
                </span>
              </Link>
            ))}
          </div>

          <aside className={styles.footerCta}>
            <p>¿Necesitas más créditos o regeneraciones?</p>
            <Link href="/planes">Ver planes disponibles</Link>
          </aside>
        </section>
      </main>
    </>
  )
}
