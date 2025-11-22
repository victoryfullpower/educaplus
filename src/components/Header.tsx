'use client'

import Link from 'next/link'
import { useState } from 'react'
import styles from './Header.module.css'

export default function Header() {
  const [servicesOpen, setServicesOpen] = useState(false)

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <span className={styles.logoText}>EducaPlus</span>
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>INICIO</Link>
          <Link href="/nosotros" className={styles.navLink}>NOSOTROS</Link>
          
          <div 
            className={styles.dropdown}
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <Link href="/servicios" className={styles.navLink}>
              SERVICIOS <span className={styles.arrow}>▼</span>
            </Link>
            {servicesOpen && (
              <div className={styles.dropdownMenu}>
                <Link href="/servicios/materiales-listos" className={styles.dropdownItem}>
                  Ver materiales listos
                </Link>
                <Link href="/servicios/crear-material" className={styles.dropdownItem}>
                  Crear tu material con IA
                </Link>
                <Link href="/servicios/cursos" className={styles.dropdownItem}>
                  Cursos & Capacitación
                </Link>
              </div>
            )}
          </div>
          
          <Link href="/servicios/cursos" className={styles.navLink}>CURSOS</Link>
          <Link href="/login" className={styles.navLink}>INICIAR SESIÓN</Link>
          <Link href="/register" className={styles.navButton}>CREAR CUENTA</Link>
        </nav>
      </div>
    </header>
  )
}

