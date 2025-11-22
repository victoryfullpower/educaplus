import Link from 'next/link'
import Header from '@/components/Header'
import styles from './servicios.module.css'

export default function ServiciosPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>NUESTROS SERVICIOS</h1>
          
          <div className={styles.servicesGrid}>
            <Link href="/servicios/materiales-listos" className={styles.serviceCard}>
              <h2>Ver Materiales Listos</h2>
              <p>Descarga en segundos lo que necesitas para enseñar con confianza.</p>
              <p className={styles.feature}>Filtros por área y grado</p>
              <p className={styles.feature}>Vista previa de materiales</p>
              <p className={styles.feature}>Listos para usar</p>
            </Link>

            <Link href="/servicios/crear-material" className={styles.serviceCard}>
              <h2>Crear tu Material con IA</h2>
              <p>Tu programación, unidades, sesiones y fichas… en minutos, con el poder de la inteligencia artificial.</p>
              <p className={styles.feature}>Creación personalizada</p>
              <p className={styles.feature}>Alineado al MINEDU</p>
              <p className={styles.feature}>Resultados instantáneos</p>
            </Link>

            <Link href="/servicios/cursos" className={styles.serviceCard}>
              <h2>Cursos & Capacitación</h2>
              <p>Aprende a tu ritmo. Mejora tu práctica. Certifícate.</p>
              <p className={styles.feature}>Catálogo de cursos</p>
              <p className={styles.feature}>Aula virtual</p>
              <p className={styles.feature}>Certificados descargables</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

