'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './sesiones-fichas.module.css'

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

export default function SesionesFichasPage() {
  const [fase, setFase] = useState(1)
  const [formData, setFormData] = useState({
    area: '',
    grado: '',
    institucion: '',
    docente: '',
    competencias: [] as string[],
    desempenos: '',
    tituloSesion: '',
    continuarUnidad: false
  })
  const [loading, setLoading] = useState(false)
  const [tipoGenerar, setTipoGenerar] = useState('')

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.area && formData.grado) {
      setFase(2)
    }
  }

  const handleFase2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    setFase(3)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tipoGenerar) {
      alert('Por favor selecciona qué deseas generar')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert(`Generando ${tipoGenerar}... Esta funcionalidad se conectará con la API de IA.`)
    }, 1000)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR SESIONES, RÚBRICAS Y FICHAS</h1>
          <p className={styles.subtitle}>
            Genera sesiones completas con fichas y rúbricas en 3 fases
          </p>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${fase >= 1 ? styles.completed : ''}`}>
              Fase 1
            </div>
            <div className={`${styles.progressSegment} ${fase >= 2 ? (fase === 2 ? styles.active : styles.completed) : ''}`}>
              Fase 2
            </div>
            <div className={`${styles.progressSegment} ${fase >= 3 ? styles.active : ''}`}>
              Fase 3
            </div>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 1: Selección Personalizada</h2>
              <p className={styles.phaseDescription}>
                Define el contexto básico para que la IA genere materiales alineados a tu realidad.
              </p>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="area">Área Curricular <span className={styles.required}>*</span></label>
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
                  <label htmlFor="grado">Grado Escolar <span className={styles.required}>*</span></label>
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
                  <label htmlFor="institucion">Nombre de la Institución Educativa (Opcional)</label>
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
                  <label htmlFor="docente">Nombre del docente (Opcional)</label>
                  <input
                    id="docente"
                    type="text"
                    value={formData.docente}
                    onChange={(e) => setFormData({ ...formData, docente: e.target.value })}
                    className={styles.input}
                    placeholder="Tu nombre"
                  />
                </div>
              </div>

              <button type="submit" className={styles.button}>Continuar a Fase 2</button>
            </form>
          )}

          {fase === 2 && (
            <form onSubmit={handleFase2Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Personaliza tu sesión</h2>
              <p className={styles.phaseDescription}>
                Decide si deseas crear tu sesión desde cero o continuar con la secuencia de una unidad ya generada.
              </p>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.continuarUnidad}
                    onChange={(e) => setFormData({ ...formData, continuarUnidad: e.target.checked })}
                    className={styles.checkbox}
                  />
                  Continuar con secuencia de una unidad ya generada
                </label>
              </div>

              {!formData.continuarUnidad && (
                <>
                  <div className={styles.formGroup}>
                    <label htmlFor="competencias">Seleccionar Competencias <span className={styles.required}>*</span></label>
                    <p className={styles.helpText}>Debes seleccionar al menos una competencia para generar tu sesión.</p>
                    <select
                      id="competencias"
                      className={styles.select}
                      multiple
                      size={5}
                      onChange={(e) => {
                        const selected = Array.from(e.target.selectedOptions, option => option.value)
                        setFormData({ ...formData, competencias: selected })
                      }}
                      required
                    >
                      <option value="competencia1">Competencia 1 (ejemplo)</option>
                      <option value="competencia2">Competencia 2 (ejemplo)</option>
                      <option value="competencia3">Competencia 3 (ejemplo)</option>
                    </select>
                    <p className={styles.helpText}>Mantén presionado Ctrl/Cmd para seleccionar múltiples</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="tituloSesion">Título de la Sesión</label>
                    <input
                      id="tituloSesion"
                      type="text"
                      value={formData.tituloSesion}
                      onChange={(e) => setFormData({ ...formData, tituloSesion: e.target.value })}
                      className={styles.input}
                      placeholder="¿Deseas que la IA proponga el título de tu sesión? (Opcional)"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="desempenos">Desempeños</label>
                    <textarea
                      id="desempenos"
                      value={formData.desempenos}
                      onChange={(e) => setFormData({ ...formData, desempenos: e.target.value })}
                      className={styles.textarea}
                      placeholder="Puedes dejar este campo vacío y la IA lo completará"
                      rows={4}
                    />
                  </div>
                </>
              )}

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(1)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 1
                </button>
                <button type="submit" className={styles.button}>Continuar a Fase 3</button>
              </div>
            </form>
          )}

          {fase === 3 && (
            <form onSubmit={handleFinalSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 3: Generación</h2>
              <p className={styles.phaseDescription}>
                Selecciona qué deseas generar:
              </p>

              <div className={styles.generationOptions}>
                <button
                  type="button"
                  onClick={() => setTipoGenerar('sesion')}
                  className={`${styles.optionButton} ${tipoGenerar === 'sesion' ? styles.selected : ''}`}
                >
                  Generar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGenerar('ficha')}
                  className={`${styles.optionButton} ${tipoGenerar === 'ficha' ? styles.selected : ''}`}
                >
                  Generar Ficha
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGenerar('rubrica')}
                  className={`${styles.optionButton} ${tipoGenerar === 'rubrica' ? styles.selected : ''}`}
                >
                  Generar Rúbrica
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGenerar('ficha-refuerzo')}
                  className={`${styles.optionButton} ${tipoGenerar === 'ficha-refuerzo' ? styles.selected : ''}`}
                >
                  Generar Ficha de Refuerzo
                </button>
                <button
                  type="button"
                  onClick={() => setTipoGenerar('ficha-discapacidad')}
                  className={`${styles.optionButton} ${tipoGenerar === 'ficha-discapacidad' ? styles.selected : ''}`}
                >
                  Generar Ficha para Estudiantes con Discapacidad
                </button>
              </div>

              <div className={styles.noteBox}>
                <p>✨ <strong>¡Listo!</strong> Has completado las 3 fases. Tu sesión y sus recursos están listos para transformar tu aula.</p>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(2)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 2
                </button>
                <button type="submit" className={styles.button} disabled={loading || !tipoGenerar}>
                  {loading ? 'Generando...' : `Generar ${tipoGenerar || 'material'}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}

