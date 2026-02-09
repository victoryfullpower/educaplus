'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './login.module.css'

// Versión estática del login (sin conexión a API)
export default function LoginPageStatic() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // En versión estática, solo mostramos un mensaje
    setTimeout(() => {
      setLoading(false)
      setError('Esta es una versión de demostración. El login requiere un servidor con base de datos.')
    }, 1000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Iniciar Sesión</h1>
        <div style={{ 
          background: '#fff3cd', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #ffc107'
        }}>
          <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
            ⚠️ Versión de demostración: El login no está disponible en esta versión estática.
          </p>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              disabled
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled
            />
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <button type="submit" className={styles.button} disabled={loading || true}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión (No disponible)'}
          </button>
        </form>
        <p className={styles.registerLink}>
          ¿No tienes cuenta?{' '}
          <a href="/register">Regístrate aquí</a>
        </p>
      </div>
    </div>
  )
}

