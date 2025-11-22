'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import styles from './crear-material.module.css'

export default function CrearMaterialPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREA TU MATERIAL CON IA</h1>
          <p className={styles.subtitle}>
            Tu programación, unidades, sesiones y fichas… en minutos, con el poder de la inteligencia artificial.
          </p>

          <div className={styles.warningBox}>
            <p>⚠️ <strong>Primero debes registrarte o iniciar sesión</strong> para usar esta herramienta.</p>
          </div>

          <div className={styles.optionsGrid}>
            <Link href="/servicios/crear-material/situaciones-significativas" className={styles.optionCard}>
              <h2>CREAR TU SITUACIONES SIGNIFICATIVAS</h2>
              <p>Crea situaciones significativas alineadas al MINEDU</p>
            </Link>

            <Link href="/servicios/crear-material/programacion-anual" className={styles.optionCard}>
              <h2>CREAR PROGRAMACIÓN ANUAL</h2>
              <p>Genera tu programación anual completa en 2 fases</p>
            </Link>

            <Link href="/servicios/crear-material/unidades-aprendizaje" className={styles.optionCard}>
              <h2>CREAR UNIDADES DE APRENDIZAJE</h2>
              <p>Crea unidades de aprendizaje personalizadas en 3 fases</p>
            </Link>

            <Link href="/servicios/crear-material/sesiones-fichas" className={styles.optionCard}>
              <h2>CREAR SESIONES, FICHAS Y RÚBRICAS</h2>
              <p>Genera sesiones completas con fichas y rúbricas</p>
            </Link>

            <Link href="/servicios/crear-material/conclusiones" className={styles.optionCard}>
              <h2>CONCLUSIONES DESCRIPTIVAS</h2>
              <p>Genera conclusiones descriptivas para tus estudiantes</p>
            </Link>

            <Link href="/servicios/crear-material/examenes" className={styles.optionCard}>
              <h2>EXÁMENES</h2>
              <p>Crea exámenes alineados al currículo</p>
            </Link>

            <Link href="/servicios/crear-material/rubricas-solo" className={styles.optionCard}>
              <h2>CREAR SOLO RÚBRICAS</h2>
              <p>Genera rúbricas analíticas personalizadas</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}

