'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import styles from './LogoutButton.module.css'

export default function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      className={styles.button}
      disabled={loading}
    >
      {loading ? 'Cerrando...' : 'Cerrar Sesión'}
    </button>
  )
}

