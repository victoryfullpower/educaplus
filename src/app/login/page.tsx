'use client'

import Link from 'next/link'
import EducaPlusLogo from '@/components/EducaPlusLogo'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { NavIcon } from '@/components/icons/NavIcons'
import { validateAuthEmail, validateAuthPassword } from '@/lib/auth-form-validation'
import styles from './login.module.css'

type FieldErrors = {
  email?: string
  password?: string
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mostrarPassword, setMostrarPassword] = useState(false)

  const validateField = (field: keyof FieldErrors, values = { email, password }) => {
    if (field === 'email') {
      return validateAuthEmail(values.email)
    }
    return validateAuthPassword(values.password)
  }

  const validateForm = (values = { email, password }) => {
    const next: FieldErrors = {}
    const emailError = validateField('email', values)
    const passwordError = validateField('password', values)
    if (emailError) next.email = emailError
    if (passwordError) next.password = passwordError
    return next
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const nextErrors = validateForm()
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión')
        setLoading(false)
        return
      }

      let redirectUrl = searchParams.get('redirect') || '/home'
      if (data.user?.rol === 'Administrador') {
        redirectUrl = '/paneladministracion'
      }

      router.push(redirectUrl)
      router.refresh()
    } catch {
      setError('Error de conexión. Por favor, intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <aside className={styles.aside} aria-hidden>
        <div className={styles.asideGlow} />
        <p className={styles.asideEyebrow}>EducaPlus</p>
        <h2 className={styles.asideTitle}>Tu aula, más simple y alineada al MINEDU</h2>
        <ul className={styles.asideList}>
          <li>Genera material con IA</li>
          <li>Descarga en Word editable</li>
          <li>Planes flexibles por créditos</li>
        </ul>
      </aside>

      <div className={styles.main}>
        <div className={styles.card}>
          <Link href="/" className={styles.backLink}>
            ← Volver al inicio
          </Link>

          <div className={styles.logoLink}>
            <EducaPlusLogo
              href="/"
              linkClassName={styles.logoLinkInner}
              imageClassName={styles.logo}
              priority
            />
          </div>

          <div className={styles.cardHeader}>
            <span className={styles.cardIcon} aria-hidden>
              <NavIcon name="login" size={22} />
            </span>
            <h1 className={styles.title}>Iniciar sesión</h1>
            <p className={styles.subtitle}>Ingresa con tu cuenta para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) {
                    setFieldErrors((prev) => ({ ...prev, email: undefined }))
                  }
                }}
                onBlur={() => {
                  const message = validateField('email')
                  setFieldErrors((prev) => ({ ...prev, email: message ?? undefined }))
                }}
                placeholder="tu@email.com"
                autoComplete="email"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={fieldErrors.email ? styles.inputInvalid : undefined}
              />
              {fieldErrors.email && (
                <p id="email-error" className={styles.fieldError} role="alert">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="password">Contraseña</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) {
                      setFieldErrors((prev) => ({ ...prev, password: undefined }))
                    }
                  }}
                  onBlur={() => {
                    const message = validateField('password')
                    setFieldErrors((prev) => ({ ...prev, password: message ?? undefined }))
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={fieldErrors.password ? styles.inputInvalid : undefined}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M3 3l18 18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10.58 10.58A3 3 0 0 0 12 15a3 3 0 0 0 2.42-1.18M9.88 5.09A10.94 10.94 0 0 1 12 5c6 0 10 7 10 7a18.45 18.45 0 0 1-2.16 3.19"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M6.61 6.61A18.48 18.48 0 0 0 2 12s4 7 10 7a10.66 10.66 0 0 0 2.06-.2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="password-error" className={styles.fieldError} role="alert">
                  {fieldErrors.password}
                </p>
              )}
            </div>
            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}
            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? 'Iniciando sesión…' : 'Entrar a mi cuenta'}
            </button>
          </form>

          <p className={styles.registerLink}>
            ¿No tienes cuenta?{' '}
            <Link href="/register">Crear cuenta gratis</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <div className={styles.main}>
            <div className={styles.card}>
              <p className={styles.subtitle}>Cargando…</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
