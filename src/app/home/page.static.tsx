'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './home.module.css'

// Versión estática de la página home (sin autenticación)
export default function HomePageStatic() {
  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Bienvenido a EducaPlus</h1>
        </div>
        <div className={styles.content}>
          <div className={styles.card}>
            <h2>Versión de Demostración</h2>
            <div className={styles.info}>
              <div className={styles.infoItem}>
                <span className={styles.label}>Estado:</span>
                <span className={styles.value}>Versión estática (solo visualización)</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.label}>Nota:</span>
                <span className={styles.value}>Esta es una versión de demostración. Las funcionalidades completas requieren un servidor.</span>
              </div>
            </div>
            <p style={{ marginTop: '20px', color: '#666', lineHeight: '1.6' }}>
              Para acceder a todas las funcionalidades (autenticación, creación de materiales con IA, etc.), 
              visita la versión completa desplegada en Vercel o similar.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

