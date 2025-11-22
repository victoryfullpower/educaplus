'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import styles from './materiales-listos.module.css'

const AREAS = [
  'Arte y Cultura',
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

const GRADOS_1_5 = ['1°', '2°', '3°', '4°', '5°']
const CICLOS_VI = ['CICLO VI (1° 2°)']
const CICLOS_VII = ['CICLO VII (3° 4°)']
const CICLOS_VIII = ['CICLO VIII (5°)']

export default function MaterialesListosPage() {
  const [areaSeleccionada, setAreaSeleccionada] = useState('')
  const [gradoSeleccionado, setGradoSeleccionado] = useState('')

  const getGradosByArea = () => {
    if (!areaSeleccionada) return []
    
    const areasConCiclos = [
      'Arte y Cultura',
      'Quechua Chanka',
      'Religión',
      'Tutoría',
      'EPT – Emprendimiento',
      'EPT – Agropecuaria'
    ]
    
    if (areasConCiclos.includes(areaSeleccionada)) {
      return [...CICLOS_VI, ...CICLOS_VII, ...CICLOS_VIII]
    }
    
    return GRADOS_1_5
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>VER MATERIALES LISTOS</h1>
          <p className={styles.subtitle}>
            Descarga en segundos lo que necesitas para enseñar con confianza.
          </p>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <label htmlFor="area">Área:</label>
              <select
                id="area"
                value={areaSeleccionada}
                onChange={(e) => {
                  setAreaSeleccionada(e.target.value)
                  setGradoSeleccionado('')
                }}
                className={styles.select}
              >
                <option value="">Selecciona un área</option>
                {AREAS.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            {areaSeleccionada && (
              <div className={styles.filterGroup}>
                <label htmlFor="grado">Grado/Ciclo:</label>
                <select
                  id="grado"
                  value={gradoSeleccionado}
                  onChange={(e) => setGradoSeleccionado(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Selecciona grado/ciclo</option>
                  {getGradosByArea().map(grado => (
                    <option key={grado} value={grado}>{grado}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {areaSeleccionada && gradoSeleccionado && (
            <div className={styles.materialsSection}>
              <h2 className={styles.sectionTitle}>
                Planes EducaPlus – {areaSeleccionada} - {gradoSeleccionado}
              </h2>
              
              <div className={styles.kitsGrid}>
                <div className={styles.kitCard}>
                  <h3>KIT BÁSICO</h3>
                  <p className={styles.price}>💸 S/ 20.00 por ciclo</p>
                  <p className={styles.price}>💸 S/ 50.00 del 1° al 5° grado</p>
                  <div className={styles.includes}>
                    <p className={styles.includesTitle}>📦 Incluye:</p>
                    <ul>
                      <li>Programación curricular 2025 (actualizada)</li>
                      <li>Unidad de Aprendizaje</li>
                      <li>4 sesiones de aprendizaje</li>
                      <li>4 fichas / actividades</li>
                      <li>4 listas de cotejo</li>
                    </ul>
                  </div>
                  <button className={styles.button}>Comprar ahora</button>
                </div>

                <div className={styles.kitCard}>
                  <h3>KIT PREMIUM</h3>
                  <p className={styles.price}>💸 S/ 25.00 por ciclo</p>
                  <p className={styles.price}>💸 S/ 60.00 del 1° al 5° grado</p>
                  <div className={styles.includes}>
                    <p className={styles.includesTitle}>📦 Incluye:</p>
                    <ul>
                      <li>Programación curricular 2025</li>
                      <li>Unidad de aprendizaje</li>
                      <li>Matriz de propósitos</li>
                      <li>4 sesiones completas (con procesos pedagógicos)</li>
                      <li>4 fichas / actividades</li>
                      <li>4 rúbricas analíticas</li>
                      <li>4 listas de cotejo</li>
                      <li>Videos y PDFs</li>
                      <li>Registros de asistencia</li>
                      <li>Registros auxiliares</li>
                    </ul>
                  </div>
                  <button className={styles.button}>Comprar ahora</button>
                </div>

                <div className={styles.kitCard}>
                  <h3>KIT ANUAL</h3>
                  <div className={styles.includes}>
                    <p className={styles.includesTitle}>📦 Incluye:</p>
                    <p>Aquí se adjuntará información del flyer de los KIT ANUALES que te enviaremos por cada área.</p>
                    <p className={styles.contactNote}>
                      Para más información sobre el Kit Anual, contáctanos.
                    </p>
                  </div>
                  <button className={styles.buttonSecondary}>Solicitar información</button>
                </div>
              </div>
            </div>
          )}

          {!areaSeleccionada && (
            <div className={styles.emptyState}>
              <p>Selecciona un área para ver los materiales disponibles</p>
            </div>
          )}
        </div>
      </main>
    </>
  )
}

