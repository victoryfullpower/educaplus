import Link from 'next/link'
import Header from '@/components/Header'
import { NavIcon } from '@/components/icons/NavIcons'
import styles from './cursos.module.css'

const BENEFICIOS = [
  {
    title: 'Catálogo por competencias',
    description:
      'Planificación, evaluación, herramientas digitales, liderazgo pedagógico y más.',
    icon: 'catalog' as const
  },
  {
    title: 'Aula virtual',
    description: 'Accede a grabaciones y recursos cuando lo necesites, a tu ritmo.',
    icon: 'virtual' as const
  },
  {
    title: 'Certificados',
    description: 'Descarga certificados al completar cada capacitación.',
    icon: 'cert' as const
  }
]

const TEMAS = [
  'Planificación curricular',
  'Evaluación formativa',
  'Herramientas digitales',
  'Liderazgo en el aula',
  'IA para docentes',
  'Convivencia escolar'
]

function BeneficioIcon({ type }: { type: 'catalog' | 'virtual' | 'cert' }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: styles.beneficioSvg
  }

  if (type === 'catalog') {
    return (
      <svg {...props}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    )
  }
  if (type === 'virtual') {
    return (
      <svg {...props}>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  )
}

export default function CursosPage() {
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
            <span className={styles.heroBadge}>Formación docente</span>
            <div className={styles.heroIconWrap}>
              <NavIcon name="graduation" size={32} />
            </div>
            <h1 className={styles.heroTitle}>Cursos y capacitación</h1>
            <p className={styles.heroSubtitle}>
              Aprende a tu ritmo, fortalece tu práctica en el aula y obtén certificados que respaldan
              tu desarrollo profesional.
            </p>
          </div>
        </section>

        <section className={styles.content}>
          <div className={styles.beneficiosGrid}>
            {BENEFICIOS.map((b) => (
              <article key={b.title} className={styles.beneficioCard}>
                <div className={styles.beneficioIconWrap}>
                  <BeneficioIcon type={b.icon} />
                </div>
                <h2 className={styles.beneficioTitle}>{b.title}</h2>
                <p className={styles.beneficioText}>{b.description}</p>
              </article>
            ))}
          </div>

          <div className={styles.ctaRow}>
            <Link href="/register" className={styles.btnPrimary}>
              Crear cuenta gratis
            </Link>
            <a href="#catalogo" className={styles.btnSecondary}>
              Ver avance del catálogo
            </a>
          </div>

          <div id="catalogo" className={styles.proximamente}>
            <div className={styles.proximamenteHeader}>
              <span className={styles.proximamenteBadge}>Próximamente</span>
              <h2 className={styles.proximamenteTitle}>Catálogo en preparación</h2>
              <p className={styles.proximamenteLead}>
                Estamos armando cursos prácticos para docentes de secundaria. Muy pronto podrás
                inscribirte desde esta misma página.
              </p>
            </div>

            <div className={styles.temasWrap}>
              <p className={styles.temasLabel}>Temáticas previstas</p>
              <ul className={styles.temasList}>
                {TEMAS.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            <p className={styles.proximamenteNote}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className={styles.inlineLink}>
                Inicia sesión
              </Link>{' '}
              para enterarte primero cuando abramos inscripciones.
            </p>
          </div>

          <aside className={styles.footerCta}>
            <p>¿Buscas generar material con IA para tu aula?</p>
            <Link href="/servicios/crear-material">Ir a crear material</Link>
          </aside>
        </section>
      </main>
    </>
  )
}
