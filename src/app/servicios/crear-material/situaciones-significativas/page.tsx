'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import styles from './situaciones-significativas.module.css'

const AREAS = [
  'Arte',
  'Ciencias Sociales (CCSS)',
  'Comunicación',
  'Ciencia y Tecnología (CyT)',
  'Desarrollo Personal, Ciudadanía y Cívica (DPCC)',
  'Educación Física',
  'Inglés',
  'Matemática',
  'Quechua Chanka',
  'Religión',
  'Tutoría',
  'EPT – Emprendimiento',
  'EPT – Computación',
  'EPT – Agropecuaria'
]

const GRADOS = ['1°', '2°', '3°', '4°', '5°']
const ZONAS = ['Costa', 'Sierra', 'Selva']

export default function SituacionesSignificativasPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    area: '',
    grado: '',
    titulo: '',
    institucion: '',
    zona: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.area || !formData.grado || !formData.titulo) {
      setError('Por favor completa los campos obligatorios')
      return
    }

    setLoading(true)
    // Aquí se conectará con la API de IA
    // Por ahora solo mostramos un mensaje
    setTimeout(() => {
      setLoading(false)
      alert('Esta funcionalidad se conectará con la API de IA para generar las situaciones significativas según las pautas del maestro Livio.')
      // router.push('/servicios/crear-material')
    }, 1000)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR TU SITUACIONES SIGNIFICATIVAS</h1>
          <p className={styles.subtitle}>
            Crea situaciones significativas alineadas al MINEDU con el poder de la IA
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="area">Área <span className={styles.required}>*</span></label>
                <select
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecciona un área</option>
                  {AREAS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="grado">Grado <span className={styles.required}>*</span></label>
                <select
                  id="grado"
                  value={formData.grado}
                  onChange={(e) => setFormData({ ...formData, grado: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecciona un grado</option>
                  {GRADOS.map(grado => (
                    <option key={grado} value={grado}>{grado}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="titulo">Título de la situación significativa <span className={styles.required}>*</span></label>
                <input
                  id="titulo"
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Explotación de recursos naturales en mi región"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="institucion">Nombre de la Institución Educativa (I.E)</label>
                <input
                  id="institucion"
                  type="text"
                  value={formData.institucion}
                  onChange={(e) => setFormData({ ...formData, institucion: e.target.value })}
                  className={styles.input}
                  placeholder="Nombre de tu I.E."
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="zona">Zona <span className={styles.required}>*</span></label>
                <select
                  id="zona"
                  value={formData.zona}
                  onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecciona una zona</option>
                  {ZONAS.map(zona => (
                    <option key={zona} value={zona}>{zona}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.noteBox}>
              <p><strong>NOTA IMPORTANTE:</strong> El maestro Livio dará las pautas y características de cómo se elabora una situación significativa para que se elabore el prompt adecuado acorde a normativas y lineamientos del MINEDU.</p>
            </div>

            <div className={styles.buttonGroup}>
              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? 'Generando...' : 'Generar Situación Significativa con IA'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}

