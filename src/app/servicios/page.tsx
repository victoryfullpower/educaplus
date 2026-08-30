import Link from 'next/link'
import Header from '@/components/Header'
import { NavIcon, type NavIconName } from '@/components/icons/NavIcons'
import styles from './servicios.module.css'

const SERVICIOS = [
  {
    href: '/servicios/crear-material',
    title: 'Crear material con IA',
    description:
      'Genera programación anual, unidades, sesiones, fichas y rúbricas en minutos, alineado al MINEDU.',
    features: ['Creación personalizada', 'Regeneración con créditos', 'Resultados en Word'],
    icon: 'sparkles' as NavIconName,
    tema: 'violet',
    destacado: 'Potenciado con IA'
  },
  {
    href: '/servicios/cursos',
    title: 'Cursos y capacitación',
    description: 'Aprende a tu ritmo, mejora tu práctica docente y obtén certificados.',
    features: ['Catálogo por competencias', 'Aula virtual', 'Certificados descargables'],
    icon: 'graduation' as NavIconName,
    tema: 'emerald'
  }
] as const

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroInner}>
            <span className={styles.heroBadge}>Servicios</span>
            <h1 className={styles.heroTitle}>Todo lo que necesitas para enseñar mejor</h1>
            <p className={styles.heroSubtitle}>
              Generación con inteligencia artificial y formación continua en un solo ecosistema
              pensado para docentes de secundaria.
            </p>
            <ul className={styles.heroPills}>
              <li>Alineado MINEDU</li>
              <li>Word editable</li>
              <li>Soporte docente</li>
            </ul>
          </div>
        </section>

        <section className={styles.servicesSection}>
          <div className={styles.servicesGrid}>
            {SERVICIOS.map((servicio) => {
              const temaClass =
                servicio.tema === 'violet' ? styles.cardViolet : styles.cardEmerald

              return (
                <Link
                  key={servicio.href}
                  href={servicio.href}
                  className={`${styles.serviceCard} ${temaClass} ${
                    'destacado' in servicio && servicio.destacado
                      ? styles.serviceCardFeatured
                      : ''
                  }`}
                >
                  {'destacado' in servicio && servicio.destacado && (
                    <span className={styles.serviceBadge}>{servicio.destacado}</span>
                  )}

                  <div className={styles.cardIconWrap}>
                    <NavIcon name={servicio.icon} size={28} />
                  </div>

                  <h2 className={styles.cardTitle}>{servicio.title}</h2>
                  <p className={styles.cardDescription}>{servicio.description}</p>

                  <ul className={styles.cardFeatures}>
                    {servicio.features.map((f) => (
                      <li key={f}>
                        <CheckIcon className={styles.checkIcon} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <span className={styles.cardCta}>
                    Explorar
                    <span className={styles.cardCtaArrow} aria-hidden>
                      →
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>

          <aside className={styles.ctaBanner}>
            <div className={styles.ctaBannerText}>
              <strong>¿Aún no tienes plan?</strong>
              <p>Compara planes y elige el que mejor se adapte a tu carga docente del año.</p>
            </div>
            <Link href="/planes" className={styles.ctaBannerBtn}>
              Ver planes
            </Link>
          </aside>
        </section>
      </main>
    </>
  )
}
