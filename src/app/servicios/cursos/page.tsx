import Header from '@/components/Header'
import styles from './cursos.module.css'

export default function CursosPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CURSOS & CAPACITACIÓN</h1>
          <p className={styles.subtitle}>
            Aprende a tu ritmo. Mejora tu práctica. Certifícate.
          </p>

          <div className={styles.infoBox}>
            <p>
              <strong>Catálogo de cursos</strong> - Planificación, evaluación, herramientas digitales, liderazgo, etc.
            </p>
            <p>
              <strong>Aula virtual</strong> con acceso a grabaciones
            </p>
            <p>
              <strong>Certificados descargables</strong>
            </p>
          </div>

          <div className={styles.ctaButtons}>
            <a href="/register" className={styles.buttonPrimary}>
              🟩 Ingresar / Registrarse
            </a>
            <button className={styles.buttonSecondary}>
              🟦 Ver Catálogo
            </button>
          </div>

          <div className={styles.coursesPlaceholder}>
            <h2>Próximamente</h2>
            <p>Aquí se mostrará el catálogo completo de cursos y capacitaciones disponibles.</p>
          </div>
        </div>
      </main>
    </>
  )
}

