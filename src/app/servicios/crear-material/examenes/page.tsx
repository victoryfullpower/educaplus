import Header from '@/components/Header'
import styles from '../crear-material.module.css'

export default function ExamenesPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR EXÁMENES</h1>
          <p className={styles.subtitle}>
            Crea exámenes alineados al currículo con el poder de la IA
          </p>
          <div className={styles.warningBox}>
            <p>⚠️ Esta funcionalidad estará disponible próximamente.</p>
            <p>Primero debes registrarte o iniciar sesión para usar esta herramienta.</p>
          </div>
        </div>
      </main>
    </>
  )
}

