'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import styles from './paneladministracion.module.css'

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRol, setUserRol] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await fetch('/api/auth/check')
        const authData = await authResponse.json()
        
        if (!authData.authenticated) {
          router.push('/login?redirect=' + encodeURIComponent(pathname))
          return
        }

        if (authData.user?.rol !== 'Administrador') {
          router.push('/home')
          return
        }

        setUserRol(authData.user.rol)
        setIsAuthenticated(true)
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        router.push('/login?redirect=' + encodeURIComponent(pathname))
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, pathname])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Panel de Administración</h2>
        </div>
        
        <nav className={styles.sidebarNav}>
          <div className={styles.navSection}>
            <h3 className={styles.navSectionTitle}>Mantenedores</h3>
            <ul className={styles.navList}>
              <li>
                <Link 
                  href="/paneladministracion/usuarios" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/usuarios' ? styles.navLinkActive : ''}`}
                >
                  👥 Usuarios
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/areas" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/areas' ? styles.navLinkActive : ''}`}
                >
                  📚 Áreas
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/niveles" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/niveles' ? styles.navLinkActive : ''}`}
                >
                  🎓 Niveles
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/grados" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/grados' ? styles.navLinkActive : ''}`}
                >
                  📖 Grados
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/competencias" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/competencias' ? styles.navLinkActive : ''}`}
                >
                  🎯 Competencias
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/comptransversal" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/comptransversal' ? styles.navLinkActive : ''}`}
                >
                  🔀 Competencias Transversales
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/capacidadtransversal" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/capacidadtransversal' ? styles.navLinkActive : ''}`}
                >
                  💡 Capacidades Transversales
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/estandares" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/estandares' ? styles.navLinkActive : ''}`}
                >
                  📋 Estándares
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/capacidades" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/capacidades' ? styles.navLinkActive : ''}`}
                >
                  💡 Capacidades
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/desempenios" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/desempenios' ? styles.navLinkActive : ''}`}
                >
                  ⭐ Desempeños
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/desempeniotransversal" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/desempeniotransversal' ? styles.navLinkActive : ''}`}
                >
                  ⭐ Desempeños Transversales
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/enfoques-transversales" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/enfoques-transversales' ? styles.navLinkActive : ''}`}
                >
                  🔄 Enfoques Transversales
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/valores" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/valores' ? styles.navLinkActive : ''}`}
                >
                  💎 Valores
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/acciones-demostrables" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/acciones-demostrables' ? styles.navLinkActive : ''}`}
                >
                  ✅ Acciones Demostrables
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/prompts" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/prompts' ? styles.navLinkActive : ''}`}
                >
                  💬 Prompts
                </Link>
              </li>
              <li>
                <Link 
                  href="/paneladministracion/planes-anuales" 
                  className={`${styles.navLink} ${pathname === '/paneladministracion/planes-anuales' ? styles.navLinkActive : ''}`}
                >
                  📅 Planes Anuales
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href="/" className={styles.backLink}>
            ← Volver al Inicio
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  )
}

