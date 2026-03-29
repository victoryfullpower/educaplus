'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Header from '@/components/Header'
import styles from './home.module.css'

export default function HomePage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRol, setUserRol] = useState<string | null>(null)
  const [planesAnuales, setPlanesAnuales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authResponse = await fetch('/api/auth/check')
        const authData = await authResponse.json()
        
        if (!authData.authenticated) {
          router.push('/login?redirect=/home')
          return
        }

        setUserRol(authData.user?.rol)
        setIsAuthenticated(true)

        // Si es Administrador, redirigir al panel
        if (authData.user?.rol === 'Administrador') {
          router.push('/paneladministracion')
          return
        }

        // Si es Usuario, cargar sus planes anuales
        if (authData.user?.rol === 'Usuario') {
          const planesResponse = await fetch('/api/plan-anual')
          if (planesResponse.ok) {
            const planesData = await planesResponse.json()
            setPlanesAnuales(planesData.planesAnuales || [])
          }
        }
      } catch (error) {
        console.error('Error al verificar autenticación:', error)
        router.push('/login?redirect=/home')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Agrupar planes por año
  const planesPorAnio = planesAnuales.reduce((acc: any, plan: any) => {
    const anio = plan.anio
    if (!acc[anio]) {
      acc[anio] = []
    }
    acc[anio].push(plan)
    return acc
  }, {})

  const anios = Object.keys(planesPorAnio).sort((a, b) => parseInt(b) - parseInt(a))

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.container}>
          <div className={styles.loading}>Cargando...</div>
        </div>
      </>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      <Header />
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Mis Documentos Generados</h1>
          <Link
            href="/servicios/crear-material/programacion-anual"
            className={styles.newPlanButton}
          >
            ➕ Nuevo plan anual
          </Link>
        </div>
        <div className={styles.content}>
          {anios.length === 0 ? (
            <div className={styles.card}>
              <h2>No hay documentos generados</h2>
              <p style={{ marginTop: '20px', color: '#666', lineHeight: '1.6' }}>
                Aún no has generado ningún plan anual.
              </p>
              <Link
                href="/servicios/crear-material/programacion-anual"
                className={styles.newPlanButtonCard}
              >
                ➕ Crear mi primer plan anual
              </Link>
            </div>
          ) : (
            anios.map((anio) => (
              <div key={anio} className={styles.card}>
                <h2 className={styles.yearTitle}>Año {anio}</h2>
                <div className={styles.documentsList}>
                  {planesPorAnio[anio].map((plan: any) => (
                    <div key={plan.id} className={styles.documentCard}>
                      <div className={styles.documentInfo}>
                        <h3 className={styles.documentTitle}>
                          Plan Anual {plan.area ? `- ${plan.area}` : ''} {plan.grado ? `- ${plan.grado}` : ''}
                        </h3>
                        <div className={styles.documentMeta}>
                          <span className={styles.metaItem}>
                            📅 {new Date(plan.fechaHora).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {plan.institucion && (
                            <span className={styles.metaItem}>
                              🏫 {plan.institucion}
                            </span>
                          )}
                          {plan.docente && (
                            <span className={styles.metaItem}>
                              👤 {plan.docente}
                            </span>
                          )}
                        </div>
                        {plan.unidades && Array.isArray(plan.unidades) && (
                          <div className={styles.unidadesCount}>
                            {plan.unidades.filter((u: any) => u.problemaPotencialidad || u.producto).length} unidad(es) configurada(s)
                          </div>
                        )}
                      </div>
                      <div className={styles.documentActions}>
                        <Link
                          href={`/servicios/crear-material/programacion-anual?planId=${plan.id}`}
                          className={styles.actionButton}
                        >
                          ✏️ Editar
                        </Link>
                        <button
                          onClick={async () => {
                            // Regenerar documento
                            try {
                              const response = await fetch('/api/generate-document', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  formData: {
                                    area: plan.area,
                                    grado: plan.grado,
                                    institucion: plan.institucion,
                                    docente: plan.docente,
                                    nivel: plan.nivel,
                                    departamento: plan.departamento,
                                    provincia: plan.provincia,
                                    distrito: plan.distrito
                                  },
                                  unidades: plan.unidades,
                                  modoGeneracion: 'regenerar',
                                  planAnualId: plan.id
                                })
                              })
                              if (response.ok) {
                                const blob = await response.blob()
                                const url = window.URL.createObjectURL(blob)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = `PLANIFICACION_ANUAL_${anio}.docx`
                                document.body.appendChild(a)
                                a.click()
                                window.URL.revokeObjectURL(url)
                                document.body.removeChild(a)
                              } else {
                                alert('Error al generar documento')
                              }
                            } catch (error) {
                              console.error('Error:', error)
                              alert('Error al generar documento')
                            }
                          }}
                          className={styles.actionButton}
                        >
                          📥 Descargar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

