'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import logo from '@/assets/log_educaplus.jpeg'
import styles from './Header.module.css'

export default function Header() {
  const router = useRouter()
  const [servicesOpen, setServicesOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Verificar si el usuario está autenticado (solo al montar el componente)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        setIsAuthenticated(data.authenticated || false)
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
    
    // No es necesario verificar periódicamente - el estado de autenticación solo cambia
    // cuando el usuario hace login/logout, y en esos casos se recarga la página
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setServicesOpen(true)
  }

  const handleMouseLeave = () => {
    // Pequeño delay antes de cerrar para permitir movimiento del cursor
    timeoutRef.current = setTimeout(() => {
      setServicesOpen(false)
    }, 200)
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo}>
            <Image 
              src={logo} 
              alt="EducaPlus Logo" 
              className={styles.logoImage}
              priority
            />
          </Link>
        </div>
        
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>INICIO</Link>
          <Link href="/nosotros" className={styles.navLink}>NOSOTROS</Link>
          
          <div 
            ref={dropdownRef}
            className={styles.dropdown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <Link href="/servicios" className={styles.navLink}>
              SERVICIOS <span className={styles.arrow}>▼</span>
            </Link>
            {servicesOpen && (
              <div 
                className={styles.dropdownMenu}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
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
          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  <button 
                    onClick={handleLogout}
                    className={styles.navLink}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit' }}
                  >
                    CERRAR SESIÓN
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className={styles.navLink}>INICIAR SESIÓN</Link>
                  <Link href="/register" className={styles.navButton}>CREAR CUENTA</Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

