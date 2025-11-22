'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './unidades-aprendizaje.module.css'

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

export default function UnidadesAprendizajePage() {
  const [fase, setFase] = useState(1)
  const [formData, setFormData] = useState({
    area: '',
    grado: '',
    institucion: '',
    docente: '',
    situacionSignificativa: '',
    tieneTitulo: false,
    tituloUnidad: '',
    producto: '',
    competencias: [] as string[],
    campoTematico: '',
    numeroSesiones: '',
    instrumentoEvaluacion: ''
  })
  const [loading, setLoading] = useState(false)

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
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      alert('Esta funcionalidad se conectará con la API de IA para generar la unidad de aprendizaje.')
    }, 1000)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR UNIDADES DE APRENDIZAJE</h1>
          <p className={styles.subtitle}>
            Crea unidades de aprendizaje personalizadas en 3 fases
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
              <h2 className={styles.phaseTitle}>FASE 1: Personaliza tu Unidad</h2>
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
              <h2 className={styles.phaseTitle}>FASE 2: Define tu unidad de aprendizaje</h2>
              <p className={styles.phaseDescription}>
                Aquí decides qué aportar o qué dejar en manos de la IA.
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="situacion">Situación Significativa</label>
                <input
                  id="situacion"
                  type="text"
                  value={formData.situacionSignificativa}
                  onChange={(e) => setFormData({ ...formData, situacionSignificativa: e.target.value })}
                  className={styles.input}
                  placeholder="Título de la situación significativa (opcional - la IA lo genera si no lo escribes)"
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.tieneTitulo}
                    onChange={(e) => setFormData({ ...formData, tieneTitulo: e.target.checked })}
                    className={styles.checkbox}
                  />
                  ¿Deseas escribir el título de tu unidad?
                </label>
                {formData.tieneTitulo && (
                  <input
                    type="text"
                    value={formData.tituloUnidad}
                    onChange={(e) => setFormData({ ...formData, tituloUnidad: e.target.value })}
                    className={styles.input}
                    placeholder="Título de la unidad"
                  />
                )}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="producto">Producto Final Esperado (Opcional)</label>
                <input
                  id="producto"
                  type="text"
                  value={formData.producto}
                  onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                  className={styles.input}
                  placeholder="Ej: Mural informativo, presentación oral, prototipo"
                />
                <p className={styles.helpText}>Si no se llena, la IA lo propone.</p>
              </div>

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
              <h2 className={styles.phaseTitle}>FASE 3: Detalles técnicos y pedagógicos</h2>
              <p className={styles.phaseDescription}>
                Define los elementos curriculares clave para que la IA genere una unidad completa y coherente.
              </p>

              <div className={styles.formGroup}>
                <label>Seleccionar Competencias <span className={styles.required}>*</span></label>
                <p className={styles.helpText}>Las competencias se cargarán según el área seleccionada (base de datos proporcionada por EDUCAPLUS y maestro Livio)</p>
                <select
                  className={styles.select}
                  multiple
                  size={5}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setFormData({ ...formData, competencias: selected })
                  }}
                >
                  <option value="competencia1">Competencia 1 (ejemplo)</option>
                  <option value="competencia2">Competencia 2 (ejemplo)</option>
                  <option value="competencia3">Competencia 3 (ejemplo)</option>
                </select>
                <p className={styles.helpText}>Mantén presionado Ctrl/Cmd para seleccionar múltiples</p>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="campoTematico">Campo Temático (Opcional)</label>
                <input
                  id="campoTematico"
                  type="text"
                  value={formData.campoTematico}
                  onChange={(e) => setFormData({ ...formData, campoTematico: e.target.value })}
                  className={styles.input}
                  placeholder="Si no se llena, la IA lo propone"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="numeroSesiones">Número de Sesiones por Unidad <span className={styles.required}>*</span></label>
                <select
                  id="numeroSesiones"
                  value={formData.numeroSesiones}
                  onChange={(e) => setFormData({ ...formData, numeroSesiones: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecciona número de sesiones</option>
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <option key={num} value={num}>{num} sesiones</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="instrumento">Instrumento de Evaluación <span className={styles.required}>*</span></label>
                <select
                  id="instrumento"
                  value={formData.instrumentoEvaluacion}
                  onChange={(e) => setFormData({ ...formData, instrumentoEvaluacion: e.target.value })}
                  className={styles.select}
                  required
                >
                  <option value="">Selecciona instrumento</option>
                  <option value="rubrica">Rúbrica</option>
                  <option value="lista-cotejo">Lista de cotejo</option>
                </select>
              </div>

              <div className={styles.noteBox}>
                <p>✨ <strong>¡Listo!</strong> Has completado las 3 fases. Tu unidad está a punto de cobrar vida con el poder de la IA.</p>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(2)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 2
                </button>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Generando...' : 'Generar mi unidad con IA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}

