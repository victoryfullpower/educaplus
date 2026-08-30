import Image from 'next/image'
import Link from 'next/link'
import Header from '@/components/Header'
import homeImage from '@/assets/imges/home1.png'
import styles from './page.module.css'

const FEATURES = [
  {
    icon: '📋',
    title: 'Materiales alineados al MINEDU',
    text: '100% alineados al Currículo Nacional y normativas vigentes.'
  },
  {
    icon: '⚡',
    title: 'Listos para usar',
    text: 'Programaciones, unidades, sesiones, fichas y rúbricas en minutos.'
  },
  {
    icon: '⏱️',
    title: 'Ahorro de tiempo',
    text: 'Menos horas planificando, más tiempo enseñando en el aula.'
  }
] as const

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroGlow} aria-hidden />
          <div className={styles.heroInner}>
            <div className={styles.heroVisual}>
              <Image
                src={homeImage}
                alt="Tu tiempo es valioso. Crea tu material docente con IA"
                className={styles.heroBanner}
                priority
                sizes="(max-width: 1200px) 100vw, 1200px"
              />
              <div className={styles.heroCtaRow}>
                <Link href="/register" className={styles.heroTrialButton}>
                  Inicia tu prueba gratuita
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.videoSection}>
          <div className={styles.sectionInner}>
            <p className={styles.sectionEyebrow}>Demostración</p>
            <h2 className={styles.sectionTitle}>Conoce nuestra plataforma</h2>
            <p className={styles.sectionLead}>
              Mira cómo generar programaciones, sesiones y evaluaciones con unos pocos clics.
            </p>
            <div className={styles.videoPlaceholder}>
              <span className={styles.videoPlay} aria-hidden>
                ▶
              </span>
              <p>Video demo de la plataforma (próximamente)</p>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.sectionInner}>
            <p className={styles.sectionEyebrow}>Ventajas</p>
            <h2 className={styles.sectionTitleCenter}>¿Por qué EducaPlus?</h2>
            <div className={styles.featuresGrid}>
              {FEATURES.map((f) => (
                <article key={f.title} className={styles.featureCard}>
                  <span className={styles.featureIcon} aria-hidden>
                    {f.icon}
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.ctaStrip}>
          <div className={styles.ctaStripInner}>
            <div>
              <h2 className={styles.ctaTitle}>Empieza gratis o elige tu plan</h2>
              <p className={styles.ctaText}>
                Prueba la plataforma y activa Básico, Premium o Anual cuando estés listo.
              </p>
            </div>
            <Link href="/planes" className={styles.ctaButton}>
              Ver planes
            </Link>
          </div>
        </section>
      </main>
    </>
  )
}
