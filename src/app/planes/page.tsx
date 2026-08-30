'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import {
  hrefComprarSuscripcion,
  NOTA_USO_JUSTO_ANUAL,
  PLANES_SUSCRIPCION,
  type PlanSuscripcionCatalogo
} from '@/lib/planes-catalogo'
import styles from './planes.module.css'

function nombreCorto(nombre: string) {
  return nombre.replace(/^PLAN\s+/i, '').toUpperCase()
}

function subtituloBanner(plan: PlanSuscripcionCatalogo): string | null {
  if (plan.id === 'basico' || plan.id === 'anual' || plan.destacado) return null
  if (plan.etiqueta) return plan.etiqueta
  return plan.periodo === 'mes' ? 'Suscripción mensual' : 'Pago anual'
}

function PlanCard({
  plan,
  isDimmed,
  onHoverChange,
  notaUsoJustoAnual
}: {
  plan: PlanSuscripcionCatalogo
  isDimmed: boolean
  onHoverChange: (hovered: boolean) => void
  notaUsoJustoAnual: string
}) {
  const router = useRouter()
  const [beneficiosAbierto, setBeneficiosAbierto] = useState(false)
  const isFeatured = Boolean(plan.destacado)

  const temaClass =
    plan.id === 'basico'
      ? styles.cardBlue
      : plan.id === 'premium'
        ? styles.cardGold
        : styles.cardGreen

  const tituloBeneficios =
    plan.id === 'anual' ? 'Beneficios VIP exclusivos' : 'Ver beneficios'

  const comprarHref = hrefComprarSuscripcion(plan.id)

  const handleCardClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (target.closest('button, a')) return
    router.push(comprarHref)
  }

  const subtitulo = subtituloBanner(plan)

  return (
    <article
      className={`${styles.planCard} ${temaClass} ${isFeatured ? styles.planCardFeatured : ''} ${isDimmed ? styles.planCardDimmed : ''}`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onClick={handleCardClick}
      aria-label={`Plan ${nombreCorto(plan.nombre)} — S/ ${plan.precio.toFixed(plan.precio % 1 === 0 ? 0 : 2)}`}
    >
      <div className={styles.priceOrb} aria-hidden>
        <span className={styles.priceOrbCurrency}>S/</span>
        <span className={styles.priceOrbAmount}>
          {plan.precio.toFixed(plan.precio % 1 === 0 ? 0 : 2)}
        </span>
        <span className={styles.priceOrbPeriod}>
          {plan.periodo === 'mes' ? '/ mes' : '/ año'}
        </span>
      </div>

      <div className={styles.planBannerWrap}>
        <div
          className={`${styles.planBanner} ${plan.destacado ? styles.planBannerWithFranja : ''}`}
        >
          {plan.destacado && (
            <div className={styles.planFranja}>
              <span className={styles.planFranjaDecor} aria-hidden />
              <span className={styles.planFranjaText}>El más vendido</span>
              <span className={styles.planFranjaDecor} aria-hidden />
            </div>
          )}
          <div className={styles.planBannerContent}>
            <h2 className={styles.planBannerTitle}>{nombreCorto(plan.nombre)}</h2>
            {subtitulo && <p className={styles.planBannerSub}>{subtitulo}</p>}
            <p className={styles.planBannerCredits}>{plan.creditos}</p>
          </div>
        </div>
      </div>

      <div className={styles.planBody}>
        <p className={styles.generacionLabel}>{plan.generacionTitulo}</p>
        <ul className={styles.featureRows}>
          {plan.generacion.map((item, index) => (
            <li
              key={item}
              className={index % 2 === 0 ? styles.featureRowEven : styles.featureRowOdd}
            >
              <span className={styles.featureCheck} aria-hidden>
                ✓
              </span>
              <span className={styles.featureText}>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className={styles.beneficiosToggle}
          onClick={(e) => {
            e.stopPropagation()
            setBeneficiosAbierto((v) => !v)
          }}
          aria-expanded={beneficiosAbierto}
          aria-controls={`plan-beneficios-${plan.id}`}
        >
          {tituloBeneficios}
          <span
            className={`${styles.beneficiosChevron} ${beneficiosAbierto ? styles.beneficiosChevronAbierto : ''}`}
            aria-hidden
          />
        </button>

        <div
          id={`plan-beneficios-${plan.id}`}
          className={`${styles.beneficiosWrap} ${beneficiosAbierto ? styles.beneficiosWrapAbierto : ''}`}
        >
          <div className={styles.beneficiosInner}>
            <ul className={styles.beneficiosList}>
              {plan.beneficios.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            {plan.id === 'anual' && (
              <p className={styles.notaUsoJusto}>{notaUsoJustoAnual}</p>
            )}
          </div>
        </div>

        <Link href={comprarHref} className={styles.planCta} onClick={(e) => e.stopPropagation()}>
          {plan.cta}
        </Link>
      </div>
    </article>
  )
}

export default function PlanesPage() {
  const [hoveredPlanId, setHoveredPlanId] = useState<string | null>(null)
  const [planes, setPlanes] = useState<PlanSuscripcionCatalogo[]>(PLANES_SUSCRIPCION)
  const [notaUsoJustoAnual, setNotaUsoJustoAnual] = useState(NOTA_USO_JUSTO_ANUAL)

  useEffect(() => {
    fetch('/api/planes/catalogo')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.planes) && data.planes.length > 0) {
          setPlanes(data.planes)
        }
        if (typeof data.notaUsoJustoAnual === 'string' && data.notaUsoJustoAnual) {
          setNotaUsoJustoAnual(data.notaUsoJustoAnual)
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>Suscripciones</span>
            <h1 className={styles.heroTitle}>Elige tu plan EducaPlus</h1>
            <p className={styles.heroSubtitle}>
              Genera material con IA, alineado al MINEDU. Descarga todo en Word editable.
            </p>
          </div>
        </section>

        <section className={styles.plansSection}>
          <div className={styles.grid}>
            {planes.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isDimmed={hoveredPlanId !== null && hoveredPlanId !== plan.id}
                onHoverChange={(hovered) => setHoveredPlanId(hovered ? plan.id : null)}
                notaUsoJustoAnual={notaUsoJustoAnual}
              />
            ))}
          </div>

          <aside className={styles.transparencia}>
            <strong>Transparencia de uso justo</strong>
            <p>
              En el plan anual, el tope de 350 generaciones por mes protege la velocidad del
              sistema para todos los docentes.
            </p>
          </aside>
        </section>
      </main>
    </>
  )
}
