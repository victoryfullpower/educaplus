import Link from 'next/link'
import Header from '@/components/Header'
import styles from './page.module.css'

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>
              Crea, descarga y transforma tu enseñanza en minutos. 
              Todo lo que necesitas, en un solo lugar.
            </h1>
            <div className={styles.heroButtons}>
              <Link href="/servicios/crear-material" className={styles.buttonPrimary}>
                Crear tu material con IA
              </Link>
              <Link href="/servicios/materiales-listos" className={styles.buttonSecondary}>
                VER MATERIALES LISTOS
              </Link>
              <Link href="/servicios/cursos" className={styles.buttonSecondary}>
                Cursos & Capacitación
              </Link>
            </div>
          </div>
          
          {/* Hero Image Placeholder */}
          <div className={styles.heroImage}>
            <div className={styles.imagePlaceholder}>
              <p>Imagen principal: Docente enseñando en aula / planificando con laptop / composición gráfica moderna</p>
              <p className={styles.imageNote}>Tonos: Azul, blanco, verde</p>
            </div>
          </div>
        </section>

        {/* Video Demo Section */}
        <section className={styles.videoSection}>
          <h2 className={styles.sectionTitle}>Conoce nuestra plataforma</h2>
          <div className={styles.videoPlaceholder}>
            <p>Video demo corto de la plataforma IA (30 seg)</p>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.featureCard}>
            <h3>Materiales alineados al MINEDU</h3>
            <p>100% alineados al Currículo Nacional y normativas vigentes</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Listos para usar</h3>
            <p>Programaciones, unidades, sesiones, fichas y rúbricas listas</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Ahorro de tiempo</h3>
            <p>Menos horas planificando, más tiempo enseñando</p>
          </div>
        </section>
      </main>
    </>
  )
}
