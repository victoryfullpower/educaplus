'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import EducaPlusLogo from '@/components/EducaPlusLogo'
import { NavIcon, type NavIconName } from '@/components/icons/NavIcons'
import styles from './Header.module.css'

const NAV_MAIN: {
  href: string
  hrefAuth?: string
  label: string
  icon: NavIconName
}[] = [
  { href: '/', hrefAuth: '/home', label: 'Inicio', icon: 'home' },
  { href: '/nosotros', label: 'Nosotros', icon: 'users' },
  { href: '/planes', label: 'Planes', icon: 'plans' }
]

const SERVICIOS_ITEMS: { href: string; label: string; icon: NavIconName }[] = [
  { href: '/servicios/crear-material', label: 'Crear material con IA', icon: 'sparkles' },
  { href: '/servicios/cursos', label: 'Cursos y capacitación', icon: 'graduation' }
]

function navHref(item: (typeof NAV_MAIN)[number], isAuthenticated: boolean): string {
  const base = isAuthenticated && item.hrefAuth ? item.hrefAuth : item.href
  if (base === '/' || base === '/home') {
    return isAuthenticated ? '/home' : '/'
  }
  return base
}

function isNavActive(href: string, pathname: string) {
  if (href === '/' || href === '/home') {
    return pathname === '/' || pathname === '/home'
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [servicesOpen, setServicesOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<{ name?: string | null; email?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        setIsAuthenticated(data.authenticated || false)
        setUser(data.authenticated ? data.user ?? null : null)
      } catch {
        setIsAuthenticated(false)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setMobileOpen(false)
    setServicesOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      setIsAuthenticated(false)
      setUser(null)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  const openServices = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setServicesOpen(true)
  }

  const closeServices = () => {
    timeoutRef.current = setTimeout(() => setServicesOpen(false), 180)
  }

  const serviciosActive =
    pathname === '/servicios' || pathname.startsWith('/servicios/')

  const linkClass = (active: boolean) =>
    `${styles.navLink} ${active ? styles.navLinkActive : ''}`

  const renderNavLinks = (mobile = false) => (
    <>
      {NAV_MAIN.map((item) => {
        const href = navHref(item, isAuthenticated)
        const active = isNavActive(href, pathname)
        return (
          <Link
            key={item.label}
            href={href}
            className={linkClass(active)}
            onClick={() => mobile && setMobileOpen(false)}
          >
            <span className={styles.navIcon}>
              <NavIcon name={item.icon} />
            </span>
            <span>{item.label}</span>
          </Link>
        )
      })}

      <div
        ref={mobile ? undefined : dropdownRef}
        className={styles.dropdown}
        onMouseEnter={mobile ? undefined : openServices}
        onMouseLeave={mobile ? undefined : closeServices}
      >
        <Link
          href="/servicios"
          className={linkClass(serviciosActive)}
          onClick={(e) => {
            if (mobile) {
              e.preventDefault()
              setServicesOpen((o) => !o)
            } else {
              setMobileOpen(false)
            }
          }}
          aria-expanded={servicesOpen}
          aria-haspopup="true"
        >
          <span className={styles.navIcon}>
            <NavIcon name="services" />
          </span>
          <span>Servicios</span>
          <span
            className={`${styles.chevron} ${servicesOpen ? styles.chevronOpen : ''}`}
            aria-hidden
          />
        </Link>
        <div
          className={`${styles.dropdownMenu} ${servicesOpen ? styles.dropdownMenuOpen : ''}`}
          onMouseEnter={mobile ? undefined : openServices}
          onMouseLeave={mobile ? undefined : closeServices}
        >
          {SERVICIOS_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.dropdownItem} ${
                pathname === item.href || pathname.startsWith(`${item.href}/`)
                  ? styles.dropdownItemActive
                  : ''
              }`}
              onClick={() => {
                setMobileOpen(false)
                setServicesOpen(false)
              }}
            >
              <span className={styles.dropdownIcon}>
                <NavIcon name={item.icon} size={16} />
              </span>
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <Link
        href="/servicios/cursos"
        className={linkClass(
          pathname === '/servicios/cursos' || pathname.startsWith('/servicios/cursos/')
        )}
        onClick={() => mobile && setMobileOpen(false)}
      >
        <span className={styles.navIcon}>
          <NavIcon name="graduation" />
        </span>
        <span>Cursos</span>
      </Link>

      {!loading &&
        (isAuthenticated ? (
          <>
            <div className={styles.userInfo} title={user?.email || undefined}>
              <span className={styles.userAvatar} aria-hidden>
                {(user?.name || user?.email || 'U').trim().charAt(0).toUpperCase()}
              </span>
              <span className={styles.userMeta}>
                <span className={styles.userName}>{user?.name || 'Usuario'}</span>
                {user?.email && <span className={styles.userEmail}>{user.email}</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                handleLogout()
              }}
              className={styles.navLinkGhost}
            >
              <span className={styles.navIcon}>
                <NavIcon name="logout" />
              </span>
              <span>Cerrar sesión</span>
            </button>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className={linkClass(pathname === '/login')}
              onClick={() => mobile && setMobileOpen(false)}
            >
              <span className={styles.navIcon}>
                <NavIcon name="login" />
              </span>
              <span>Iniciar sesión</span>
            </Link>
            <Link
              href="/register"
              className={styles.navButton}
              onClick={() => mobile && setMobileOpen(false)}
            >
              <NavIcon name="userPlus" size={16} className={styles.navButtonIcon} />
              Crear cuenta
            </Link>
          </>
        ))}
    </>
  )

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <EducaPlusLogo
          href={isAuthenticated ? '/home' : '/'}
          linkClassName={styles.logo}
          imageClassName={styles.logoImage}
          priority
          onLinkClick={() => setMobileOpen(false)}
        />

        <nav className={styles.navDesktop} aria-label="Principal">
          {renderNavLinks()}
        </nav>

        <button
          type="button"
          className={`${styles.menuToggle} ${mobileOpen ? styles.menuToggleOpen : ''}`}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`${styles.mobileBackdrop} ${mobileOpen ? styles.mobileBackdropOpen : ''}`}
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
      />
      <nav
        className={`${styles.navMobile} ${mobileOpen ? styles.navMobileOpen : ''}`}
        aria-label="Menú móvil"
        aria-hidden={!mobileOpen}
      >
        {renderNavLinks(true)}
      </nav>
    </header>
  )
}
