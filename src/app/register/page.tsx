'use client'

import Link from 'next/link'
import EducaPlusLogo from '@/components/EducaPlusLogo'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NavIcon } from '@/components/icons/NavIcons'
import { validateAuthEmail, validateAuthPassword } from '@/lib/auth-form-validation'
import styles from './register.module.css'

type FieldErrors = {
  email?: string
  password?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validateField = (field: keyof FieldErrors, values = { email, password }) => {
    if (field === 'email') {
      return validateAuthEmail(values.email)
    }
    return validateAuthPassword(values.password, { minLength: 6 })
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al registrar usuario')
        setLoading(false)
        return
      }

      router.push('/home')
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
        <p className={styles.asideEyebrow}>Comunidad EducaPlus</p>
        <h2 className={styles.asideTitle}>Empieza a crear material pedagógico hoy</h2>
        <ul className={styles.asideList}>
          <li>Registro rápido en minutos</li>
          <li>Material alineado al MINEDU</li>
          <li>Planes con créditos de IA</li>
        </ul>
        <Link href="/planes" className={styles.asideLink}>
          Conocer planes →
        </Link>
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
              <NavIcon name="userPlus" size={22} />
            </span>
            <h1 className={styles.title}>Crear cuenta</h1>
            <p className={styles.subtitle}>
              Regístrate gratis y accede a las herramientas de generación con IA
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="name">Nombre (opcional)</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
                disabled={loading}
              />
            </div>
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
              <input
                id="password"
                type="password"
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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={loading}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                className={fieldErrors.password ? styles.inputInvalid : undefined}
              />
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
              {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
            </button>
          </form>

          <p className={styles.loginLink}>
            ¿Ya tienes cuenta? <Link href="/login">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
