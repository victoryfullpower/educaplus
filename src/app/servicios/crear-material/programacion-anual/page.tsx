'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './programacion-anual.module.css'

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

interface Unidad {
  situacionSignificativa: string
  tieneTitulo: boolean
  tituloUnidad: string
  tieneProducto: boolean
  producto: string
  camposTematicos: string
}

export default function ProgramacionAnualPage() {
  const [fase, setFase] = useState(1)
  const [formData, setFormData] = useState({
    area: '',
    grado: '',
    institucion: '',
    docente: ''
  })
  const [unidades, setUnidades] = useState<Unidad[]>(Array(9).fill(null).map(() => ({
    situacionSignificativa: '',
    tieneTitulo: false,
    tituloUnidad: '',
    tieneProducto: false,
    producto: '',
    camposTematicos: ''
  })))
  const [loading, setLoading] = useState(false)

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.area && formData.grado) {
      setFase(2)
    }
  }

  const handleUnidadChange = (index: number, field: keyof Unidad, value: string | boolean) => {
    const newUnidades = [...unidades]
    newUnidades[index] = { ...newUnidades[index], [field]: value }
    setUnidades(newUnidades)
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Conectar con API de IA
    setTimeout(() => {
      setLoading(false)
      alert('Esta funcionalidad se conectará con la API de IA para generar la programación anual según las pautas del maestro Livio.')
    }, 1000)
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR PROGRAMACIÓN ANUAL</h1>
          <p className={styles.subtitle}>
            Genera tu programación anual completa en 2 fases
          </p>

          {/* Progress Bar */}
          <div className={styles.progressBar}>
            <div className={`${styles.progressSegment} ${fase >= 1 ? styles.completed : ''}`}>
              Fase 1: Selección
            </div>
            <div className={`${styles.progressSegment} ${fase >= 2 ? styles.active : ''}`}>
              Fase 2: Personalización
            </div>
          </div>

          {fase === 1 && (
            <form onSubmit={handleFase1Submit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 1: Selección Personalizada</h2>
              <p className={styles.phaseDescription}>
                Define el contexto educativo para que la IA genere una planificación alineada a tu realidad.
              </p>

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
                  <label htmlFor="institucion">Nombre de la Institución Educativa (I.E) (Opcional)</label>
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
            <form onSubmit={handleFinalSubmit} className={styles.form}>
              <h2 className={styles.phaseTitle}>FASE 2: Personaliza tu material</h2>
              <p className={styles.phaseDescription}>
                Define las unidades que compondrán tu programación anual. Puedes escribir tus ideas o dejar que la IA las proponga.
              </p>

              <div className={styles.unidadesContainer}>
                {unidades.map((unidad, index) => (
                  <div key={index} className={styles.unidadCard}>
                    <h3 className={styles.unidadTitle}>
                      {index === 0 ? 'UNIDAD 0' : `UNIDAD ${index}`}
                    </h3>

                    <div className={styles.formGroup}>
                      <label>Situación Significativa {index}</label>
                      <input
                        type="text"
                        value={unidad.situacionSignificativa}
                        onChange={(e) => handleUnidadChange(index, 'situacionSignificativa', e.target.value)}
                        className={styles.input}
                        placeholder="Título de la situación significativa"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        <input
                          type="checkbox"
                          checked={unidad.tieneTitulo}
                          onChange={(e) => handleUnidadChange(index, 'tieneTitulo', e.target.checked)}
                          className={styles.checkbox}
                        />
                        ¿Deseas escribir el título de tu unidad?
                      </label>
                      {unidad.tieneTitulo && (
                        <input
                          type="text"
                          value={unidad.tituloUnidad}
                          onChange={(e) => handleUnidadChange(index, 'tituloUnidad', e.target.value)}
                          className={styles.input}
                          placeholder="Título de la unidad de aprendizaje"
                        />
                      )}
                      {!unidad.tieneTitulo && (
                        <p className={styles.helpText}>Los títulos serán generados por la IA</p>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label>Campos Temáticos (Mínimo 2, máximo 10 sesiones)</label>
                      <input
                        type="text"
                        value={unidad.camposTematicos}
                        onChange={(e) => handleUnidadChange(index, 'camposTematicos', e.target.value)}
                        className={styles.input}
                        placeholder="Ej: Ciencia y ambiente, ciudadanía, comunicación"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label>
                        <input
                          type="checkbox"
                          checked={unidad.tieneProducto}
                          onChange={(e) => handleUnidadChange(index, 'tieneProducto', e.target.checked)}
                          className={styles.checkbox}
                        />
                        ¿Deseas escribir el producto que deseas?
                      </label>
                      {unidad.tieneProducto && (
                        <input
                          type="text"
                          value={unidad.producto}
                          onChange={(e) => handleUnidadChange(index, 'producto', e.target.value)}
                          className={styles.input}
                          placeholder="Ej: Mural informativo, presentación oral, prototipo"
                        />
                      )}
                      {!unidad.tieneProducto && (
                        <p className={styles.helpText}>Los productos serán elegidos por la IA</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.noteBox}>
                <p><strong>NOTA IMPORTANTE:</strong> El maestro Livio dará las pautas y características de cómo se elabora la PROGRAMACIÓN ANUAL para que se elabore el prompt adecuado acorde a normativas y lineamientos del MINEDU.</p>
              </div>

              <div className={styles.buttonGroup}>
                <button
                  type="button"
                  onClick={() => setFase(1)}
                  className={styles.buttonSecondary}
                >
                  Volver a Fase 1
                </button>
                <button type="submit" className={styles.button} disabled={loading}>
                  {loading ? 'Generando...' : 'Generar mi PROGRAMACIÓN ANUAL con IA'}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </>
  )
}

