'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animateValue } from '@/lib/eased-animation'
import {
  BENEFICIOS,
  COMPROMISOS,
  EQUIPO,
  MISION,
  SECCIONES_NAV,
  STATS,
  TESTIMONIOS,
  VISION
} from './nosotros-data'
import { scrollWindowToSlow, SLOW_SCROLL_DURATION_MS } from '@/lib/slow-scroll'
import styles from './nosotros.module.css'

function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}

function Reveal({
  children,
  className = '',
  delay = 0
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const { ref, visible } = useReveal()
  return (
    <div
      ref={ref}
      className={`${styles.reveal} ${visible ? styles.revealVisible : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

function StatCounter({ value, suffix }: { value: number; suffix: string }) {
  const { ref, visible } = useReveal()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!visible) return
    const duration = 1200
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - (1 - p) ** 3
      setDisplay(Math.round(value * eased))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [visible, value])

  return (
    <span ref={ref} className={styles.statValue}>
      {display}
      {suffix}
    </span>
  )
}

const TESTIMONIAL_CAROUSEL_MS = 1400

type SeccionId = (typeof SECCIONES_NAV)[number]['id']

function testimonialPagesFor(perSlide: number) {
  const pages: (typeof TESTIMONIOS)[number][][] = []
  for (let i = 0; i < TESTIMONIOS.length; i += perSlide) {
    pages.push(TESTIMONIOS.slice(i, i + perSlide) as (typeof TESTIMONIOS)[number][])
  }
  return pages
}

export default function NosotrosContent() {
  const [activeSection, setActiveSection] = useState<SeccionId>('quienes')
  const [mvTab, setMvTab] = useState<'mision' | 'vision'>('mision')
  const [benefitIndex, setBenefitIndex] = useState(0)
  const [testimonialIndex, setTestimonialIndex] = useState(0)
  const [equipoActive, setEquipoActive] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [perSlide, setPerSlide] = useState(1)
  const [testimonialTrackPx, setTestimonialTrackPx] = useState(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const carouselViewportRef = useRef<HTMLDivElement>(null)
  const carouselAnimRef = useRef<{ cancel: () => void } | null>(null)
  const testimonialTrackPxRef = useRef(0)
  const testimonialIndexRef = useRef(0)
  const prevTestimonialIndexRef = useRef(0)
  const maxTestimonialPageRef = useRef(0)
  const carouselAutoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stickyNavRef = useRef<HTMLElement>(null)
  const pauseCarousel = useRef(false)
  const isProgrammaticScroll = useRef(false)
  const scrollAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollControllerRef = useRef<{ cancel: () => void } | null>(null)

  const mv = mvTab === 'mision' ? MISION : VISION
  const benefit = BENEFICIOS[benefitIndex]
  const testimonialPages = useMemo(() => testimonialPagesFor(perSlide), [perSlide])
  const maxTestimonialPage = Math.max(0, testimonialPages.length - 1)

  testimonialIndexRef.current = testimonialIndex
  maxTestimonialPageRef.current = maxTestimonialPage

  const goToTestimonialPage = useCallback((index: number) => {
    setTestimonialIndex(index)
    if (carouselAutoplayRef.current) clearInterval(carouselAutoplayRef.current)
    carouselAutoplayRef.current = setInterval(() => {
      if (pauseCarousel.current) return
      setTestimonialIndex((i) => {
        const max = maxTestimonialPageRef.current
        return i >= max ? 0 : i + 1
      })
    }, 5500)
  }, [])

  useEffect(() => {
    const mq = (n: number) => window.matchMedia(`(min-width: ${n}px)`)
    const update = () => {
      if (mq(1024).matches) setPerSlide(3)
      else if (mq(640).matches) setPerSlide(2)
      else setPerSlide(1)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    setTestimonialIndex((i) => Math.min(i, maxTestimonialPage))
  }, [maxTestimonialPage])

  useEffect(() => {
    const snapTrack = () => {
      carouselAnimRef.current?.cancel()
      const w = carouselViewportRef.current?.offsetWidth ?? 0
      const target = testimonialIndexRef.current * w
      testimonialTrackPxRef.current = target
      setTestimonialTrackPx(target)
    }
    snapTrack()
    window.addEventListener('resize', snapTrack)
    return () => window.removeEventListener('resize', snapTrack)
  }, [perSlide])

  useEffect(() => {
    const w = carouselViewportRef.current?.offsetWidth ?? 0
    const target = testimonialIndex * w
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prev = prevTestimonialIndexRef.current
    const max = maxTestimonialPageRef.current
    const isWrap =
      (prev === max && testimonialIndex === 0) ||
      (prev === 0 && testimonialIndex === max)
    prevTestimonialIndexRef.current = testimonialIndex

    carouselAnimRef.current?.cancel()

    if (reduced || w === 0 || isWrap) {
      testimonialTrackPxRef.current = target
      setTestimonialTrackPx(target)
      return
    }

    carouselAnimRef.current = animateValue(
      testimonialTrackPxRef.current,
      target,
      TESTIMONIAL_CAROUSEL_MS,
      (v) => {
        testimonialTrackPxRef.current = v
        setTestimonialTrackPx(v)
      },
      () => {
        carouselAnimRef.current = null
      }
    )

    return () => carouselAnimRef.current?.cancel()
  }, [testimonialIndex])

  const getScrollOffset = () => {
    const siteHeader = document.querySelector('header')
    const headerH = siteHeader?.getBoundingClientRect().height ?? 0
    const navH = stickyNavRef.current?.offsetHeight ?? 0
    return headerH + navH + 20
  }

  useEffect(() => {
    const applyScrollMargin = () => {
      const offset = getScrollOffset()
      for (const s of SECCIONES_NAV) {
        const el = document.getElementById(s.id)
        if (el) el.style.scrollMarginTop = `${offset}px`
      }
    }
    applyScrollMargin()
    const raf = requestAnimationFrame(applyScrollMargin)
    window.addEventListener('resize', applyScrollMargin)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', applyScrollMargin)
    }
  }, [])

  useEffect(() => {
    const ids = SECCIONES_NAV.map((s) => s.id)
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[]

    const onScroll = () => {
      if (isProgrammaticScroll.current) return
      const y = window.scrollY + getScrollOffset()
      let current: SeccionId = ids[0]
      for (const el of sections) {
        if (el.offsetTop <= y && ids.includes(el.id as SeccionId)) {
          current = el.id as SeccionId
        }
      }
      setActiveSection(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      scrollControllerRef.current?.cancel()
      if (scrollAnimTimer.current) clearTimeout(scrollAnimTimer.current)
    }
  }, [])

  useEffect(() => {
    goToTestimonialPage(testimonialIndexRef.current)
    return () => {
      if (carouselAutoplayRef.current) clearInterval(carouselAutoplayRef.current)
    }
  }, [maxTestimonialPage, goToTestimonialPage])

  const scrollTo = (id: SeccionId) => {
    const el = document.getElementById(id)
    if (!el) return

    setActiveSection(id)

    scrollControllerRef.current?.cancel()
    if (scrollAnimTimer.current) clearTimeout(scrollAnimTimer.current)

    isProgrammaticScroll.current = true

    const offset = getScrollOffset()
    const targetY = window.pageYOffset + el.getBoundingClientRect().top - offset

    scrollControllerRef.current = scrollWindowToSlow(
      targetY,
      SLOW_SCROLL_DURATION_MS,
      () => {
        isProgrammaticScroll.current = false
        scrollControllerRef.current = null
      }
    )

    scrollAnimTimer.current = setTimeout(() => {
      isProgrammaticScroll.current = false
    }, SLOW_SCROLL_DURATION_MS + 150)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText('contacto@educaplus.pe')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <main className={styles.main}>
      <nav
        ref={stickyNavRef}
        className={styles.stickyNav}
        aria-label="Secciones de la página"
      >
        <div className={styles.stickyNavInner}>
          {SECCIONES_NAV.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`${styles.navPill} ${activeSection === s.id ? styles.navPillActive : ''}`}
              onClick={(e) => {
                e.preventDefault()
                scrollTo(s.id)
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      <section id="quienes" className={styles.hero}>
        <div className={styles.heroParticles} aria-hidden />
        <div className={styles.heroInner}>
          <Reveal>
            <p className={styles.heroEyebrow}>Sobre nosotros</p>
            <h1 className={styles.heroTitle}>Quiénes somos</h1>
            <p className={styles.heroLead}>
              <strong>EducaPlus</strong> es una plataforma educativa peruana especializada en
              materiales pedagógicos para docentes de educación secundaria.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <p className={styles.heroText}>
              Acompañamos tu labor con recursos claros, actualizados y alineados al Currículo
              Nacional y al MINEDU. Simplificamos tu planificación para que dediques más energía a
              tus estudiantes.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className={styles.statsRow}>
              {STATS.map((s) => (
                <div key={s.label} className={styles.statItem}>
                  <StatCounter value={s.value} suffix={s.suffix} />
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section id="mision" className={styles.mvSection}>
        <div className={styles.container}>
          <Reveal>
            <div className={styles.mvPanel}>
              <div className={styles.mvTabs} role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mvTab === 'mision'}
                  className={`${styles.mvTab} ${mvTab === 'mision' ? styles.mvTabActive : ''}`}
                  onClick={() => setMvTab('mision')}
                >
                  Misión
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mvTab === 'vision'}
                  className={`${styles.mvTab} ${mvTab === 'vision' ? styles.mvTabActive : ''}`}
                  onClick={() => setMvTab('vision')}
                >
                  Visión
                </button>
              </div>
              <article key={mvTab} className={styles.mvCardAnimated}>
                <span className={styles.mvIcon} aria-hidden>
                  {mv.icon}
                </span>
                <h2>{mv.title}</h2>
                <p>{mv.text}</p>
              </article>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="equipo" className={styles.sectionAlt}>
        <div className={styles.container}>
          <Reveal>
            <p className={styles.sectionEyebrow}>Equipo</p>
            <h2 className={styles.sectionTitle}>Nuestro equipo</h2>
            <p className={styles.sectionLead}>
              Haz clic en cada rol para conocer cómo fortalecemos cada material.
            </p>
          </Reveal>
          <ul className={styles.equipoGrid}>
            {EQUIPO.map((item, i) => (
              <li key={item.label}>
                <button
                  type="button"
                  className={`${styles.equipoChip} ${equipoActive === i ? styles.equipoChipActive : ''}`}
                  onClick={() => setEquipoActive(equipoActive === i ? null : i)}
                  aria-pressed={equipoActive === i}
                >
                  <span className={styles.equipoIconWrap} aria-hidden>
                    <span className={styles.equipoIcon}>{item.icon}</span>
                  </span>
                  <span className={styles.equipoLabel}>{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
          <p
            className={`${styles.equipoDetail} ${equipoActive != null ? styles.equipoDetailVisible : ''}`}
          >
            {equipoActive != null ? (
              <>
                <strong>{EQUIPO[equipoActive].label}.</strong> {EQUIPO[equipoActive].detail}
              </>
            ) : (
              'Selecciona un rol del equipo.'
            )}
          </p>
          <Reveal>
            <p className={styles.sectionNote}>
              Cada material pasa por revisión técnica y pedagógica rigurosa.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="ventajas" className={styles.section}>
        <div className={styles.container}>
          <Reveal>
            <p className={styles.sectionEyebrow}>Ventajas</p>
            <h2 className={styles.sectionTitle}>¿Por qué elegirnos?</h2>
          </Reveal>
          <div className={styles.benefitsInteractive}>
            <div className={styles.benefitsList} role="tablist" aria-label="Ventajas">
              {BENEFICIOS.map((b, i) => (
                <button
                  key={b.title}
                  type="button"
                  role="tab"
                  aria-selected={benefitIndex === i}
                  className={`${styles.benefitTab} ${benefitIndex === i ? styles.benefitTabActive : ''}`}
                  onClick={() => setBenefitIndex(i)}
                >
                  <span className={styles.benefitTabIcon} aria-hidden>
                    {b.icon}
                  </span>
                  <span>{b.title}</span>
                </button>
              ))}
            </div>
            <article key={benefitIndex} className={styles.benefitPanel}>
              <span className={styles.benefitPanelIcon} aria-hidden>
                {benefit.icon}
              </span>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </article>
          </div>
        </div>
      </section>

      <section id="testimonios" className={styles.sectionAlt}>
        <div className={styles.container}>
          <Reveal>
            <p className={styles.sectionEyebrow}>Comunidad</p>
            <h2 className={styles.sectionTitle}>Testimonios</h2>
          </Reveal>
          <div
            ref={carouselRef}
            className={styles.carousel}
            onMouseEnter={() => {
              pauseCarousel.current = true
            }}
            onMouseLeave={() => {
              pauseCarousel.current = false
            }}
          >
            <div ref={carouselViewportRef} className={styles.carouselViewport}>
              <div
                className={styles.carouselSlides}
                style={{ transform: `translate3d(-${testimonialTrackPx}px, 0, 0)` }}
              >
                {testimonialPages.map((page, pageIdx) => (
                  <div key={pageIdx} className={styles.carouselSlide}>
                    <div
                      className={styles.carouselSlideGrid}
                      style={{ gridTemplateColumns: `repeat(${perSlide}, 1fr)` }}
                    >
                      {page.map((t) => (
                        <blockquote
                          key={`${t.author}-${t.area}`}
                          className={styles.testimonial}
                        >
                          <span className={styles.testimonialQuoteMark} aria-hidden>
                            ❝
                          </span>
                          <div className={styles.testimonialHead}>
                            <span className={styles.testimonialAvatar} aria-hidden>
                              {t.icon}
                            </span>
                          </div>
                          <p className={styles.quote}>{t.quote}</p>
                          <footer className={styles.author}>
                            <strong>{t.author}</strong>
                            <span> — Docente de {t.area}</span>
                          </footer>
                        </blockquote>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className={styles.carouselControls}>
              <button
                type="button"
                className={styles.carouselBtn}
                aria-label="Testimonio anterior"
                onClick={() =>
                  goToTestimonialPage(
                    testimonialIndex <= 0 ? maxTestimonialPage : testimonialIndex - 1
                  )
                }
              >
                ‹
              </button>
              <div className={styles.carouselDots}>
                {Array.from({ length: maxTestimonialPage + 1 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.carouselDot} ${testimonialIndex === i ? styles.carouselDotActive : ''}`}
                    aria-label={`Ir al grupo ${i + 1}`}
                    onClick={() => goToTestimonialPage(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles.carouselBtn}
                aria-label="Siguiente testimonio"
                onClick={() =>
                  goToTestimonialPage(
                    testimonialIndex >= maxTestimonialPage ? 0 : testimonialIndex + 1
                  )
                }
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="calidad" className={styles.section}>
        <div className={styles.container}>
          <Reveal>
            <div className={styles.calidadCard}>
              <p className={styles.sectionEyebrow}>Compromiso</p>
              <h2 className={styles.sectionTitle}>Política de calidad</h2>
              <p className={styles.sectionLead}>En EducaPlus nos comprometemos a:</p>
              <ul className={styles.commitmentList}>
                {COMPROMISOS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      <section id="contacto" className={styles.contactSection}>
        <div className={styles.container}>
          <Reveal>
            <div className={styles.contactCard}>
              <div className={styles.contactHeader}>
                <h2>Contáctanos</h2>
                <p>¿Consultas, sugerencias o asesoría? Escríbenos.</p>
              </div>
              <ul className={styles.contactList}>
                <li>
                  <span className={styles.contactLabel}>Correo</span>
                  <span className={styles.contactValueRow}>
                    <a href="mailto:contacto@educaplus.pe">contacto@educaplus.pe</a>
                    <button type="button" className={styles.copyBtn} onClick={() => void copyEmail()}>
                      {copied ? '¡Copiado!' : 'Copiar'}
                    </button>
                  </span>
                </li>
                <li>
                  <span className={styles.contactLabel}>WhatsApp</span>
                  <span>
                    <a href="https://wa.me/51933277007" target="_blank" rel="noopener noreferrer">
                      933 277 007
                    </a>
                    {' · '}
                    <a href="https://wa.me/51938535736" target="_blank" rel="noopener noreferrer">
                      938 535 736
                    </a>
                  </span>
                </li>
                <li>
                  <span className={styles.contactLabel}>Facebook</span>
                  <a
                    href="https://www.facebook.com/profile.php?id=61570568559041"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    EducaPlus
                  </a>
                </li>
                <li>
                  <span className={styles.contactLabel}>Horario</span>
                  <span>Lunes a sábado, 7:00 a.m. – 10:00 p.m.</span>
                </li>
              </ul>
              <p className={styles.finalMessage}>
                Tu crecimiento docente es nuestra prioridad.
              </p>
              <Link href="/planes" className={styles.contactCta}>
                Ver planes EducaPlus
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  )
}
