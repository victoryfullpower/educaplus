'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import styles from './sesiones-fichas.module.css'

interface Area {
  id: number
  descripcion: string
}

interface Grado {
  id: number
  descripcion: string | null
}

interface Competencia {
  id: number
  descripcion: string
  numeroCompetencia: number
}

interface Capacidad {
  id: number
  descripcion: string
  idcompetencia: number
  idstandar: number
  competencia?: {
    id: number
    descripcion: string
  }
  estandar?: {
    id: number
    descripcion: string
  }
}

interface Desempenio {
  id: number
  descripcion: string
  idcapacidad: number
  capacidad?: {
    id: number
    descripcion: string
    competencia?: {
      id: number
      descripcion: string
    }
  }
}

export default function SesionesFichasPage() {
  const [fase, setFase] = useState(1)
  const [formData, setFormData] = useState({
    area: '',
    areaId: '',
    grado: '',
    gradoId: '',
    institucion: '',
    docente: '',
    competenciaSeleccionada: '',
    capacidadSeleccionada: '',
    desempeniosSeleccionados: [] as string[],
    tituloSesion: '',
    continuarUnidad: false
  })
  const [loading, setLoading] = useState(false)
  const [tipoGenerar, setTipoGenerar] = useState('')
  const [areas, setAreas] = useState<Area[]>([])
  const [grados, setGrados] = useState<Grado[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [capacidades, setCapacidades] = useState<Capacidad[]>([])
  const [desempenios, setDesempenios] = useState<Desempenio[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadingCapacidades, setLoadingCapacidades] = useState(false)
  const [loadingDesempenios, setLoadingDesempenios] = useState(false)

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true)
        const [areasRes, gradosRes] = await Promise.all([
          fetch('/api/competencias/areas'),
          fetch('/api/competencias/grados')
        ])

        const areasData = await areasRes.json()
        const gradosData = await gradosRes.json()

        setAreas(areasData)
        setGrados(gradosData)
      } catch (error) {
        console.error('Error al cargar datos iniciales:', error)
      } finally {
        setLoadingData(false)
      }
    }

    loadInitialData()
  }, [])

  // Cargar competencias cuando cambien área y grado
  useEffect(() => {
    const loadCompetencias = async () => {
      if (formData.areaId && formData.gradoId) {
        try {
          const response = await fetch(
            `/api/competencias/competencias?idarea=${formData.areaId}&idgrado=${formData.gradoId}`
          )
          const data = await response.json()
          setCompetencias(data)
        } catch (error) {
          console.error('Error al cargar competencias:', error)
          setCompetencias([])
        }
      } else {
        setCompetencias([])
      }
    }

    loadCompetencias()
  }, [formData.areaId, formData.gradoId])

  // Estado para almacenar todos los desempeños disponibles (de todas las capacidades)
  const [todosLosDesempenios, setTodosLosDesempenios] = useState<Desempenio[]>([])

  // Cargar capacidades cuando se seleccione una competencia
  useEffect(() => {
    const loadCapacidades = async () => {
      if (formData.competenciaSeleccionada) {
        try {
          setLoadingCapacidades(true)
          const response = await fetch(
            `/api/competencias/capacidades?idcompetencia=${formData.competenciaSeleccionada}`
          )
          const data = await response.json()
          setCapacidades(data)
          // Limpiar capacidad seleccionada al cambiar competencia, pero mantener desempeños si no se ha alcanzado el límite
          setFormData(prev => ({ 
            ...prev, 
            capacidadSeleccionada: ''
          }))
          setDesempenios([])
          setTodosLosDesempenios([])
        } catch (error) {
          console.error('Error al cargar capacidades:', error)
          setCapacidades([])
        } finally {
          setLoadingCapacidades(false)
        }
      } else {
        setCapacidades([])
        setDesempenios([])
        setTodosLosDesempenios([])
      }
    }

    loadCapacidades()
  }, [formData.competenciaSeleccionada])

  // Cargar desempeños cuando se seleccione una capacidad y agregarlos a la lista total
  useEffect(() => {
    const loadDesempenios = async () => {
      if (formData.capacidadSeleccionada) {
        try {
          setLoadingDesempenios(true)
          const response = await fetch(
            `/api/competencias/desempenios?idcapacidad=${formData.capacidadSeleccionada}`
          )
          const data = await response.json()
          setDesempenios(data)
          
          // Agregar estos desempeños a la lista total (evitando duplicados)
          setTodosLosDesempenios(prev => {
            const nuevosIds = data.map((d: Desempenio) => d.id)
            const sinDuplicados = prev.filter(d => !nuevosIds.includes(d.id))
            return [...sinDuplicados, ...data]
          })
        } catch (error) {
          console.error('Error al cargar desempeños:', error)
          setDesempenios([])
        } finally {
          setLoadingDesempenios(false)
        }
      }
    }

    loadDesempenios()
  }, [formData.capacidadSeleccionada])

  const handleFase1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.areaId && formData.gradoId) {
      setFase(2)
    }
  }

  const handleFase2Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.continuarUnidad) {
      if (!formData.competenciaSeleccionada || !formData.capacidadSeleccionada) {
        alert('Por favor selecciona una competencia y una capacidad')
        return
      }
      if (formData.desempeniosSeleccionados.length === 0) {
        alert('Por favor selecciona al menos un desempeño')
        return
      }
    }
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
                    value={formData.areaId}
                    onChange={(e) => {
                      const selectedArea = areas.find(a => a.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        area: selectedArea?.descripcion || '', 
                        areaId: e.target.value 
                      })
                    }}
                    className={styles.select}
                    required
                    disabled={loadingData}
                  >
                    <option value="">Selecciona un área</option>
                    {areas.map(area => (
                      <option key={area.id} value={area.id}>{area.descripcion}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="grado">Grado Escolar <span className={styles.required}>*</span></label>
                  <select
                    id="grado"
                    value={formData.gradoId}
                    onChange={(e) => {
                      const selectedGrado = grados.find(g => g.id.toString() === e.target.value)
                      setFormData({ 
                        ...formData, 
                        grado: selectedGrado?.descripcion || '', 
                        gradoId: e.target.value 
                      })
                    }}
                    className={styles.select}
                    required
                    disabled={loadingData}
                  >
                    <option value="">Selecciona un grado</option>
                    {grados.map(grado => (
                      <option key={grado.id} value={grado.id}>
                        {grado.descripcion || `${grado.id}° grado`}
                      </option>
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
                  {/* Paso 1: Seleccionar Competencia */}
                  <div className={styles.formGroup}>
                    <label htmlFor="competencia">Seleccionar Competencia <span className={styles.required}>*</span></label>
                    <p className={styles.helpText}>Selecciona una competencia para comenzar.</p>
                    {competencias.length === 0 && formData.areaId && formData.gradoId ? (
                      <p className={styles.helpText} style={{ color: '#666', fontStyle: 'italic' }}>
                        Cargando competencias...
                      </p>
                    ) : competencias.length === 0 ? (
                      <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                        Por favor selecciona un área y grado en la Fase 1 primero
                      </p>
                    ) : null}
                    <select
                      id="competencia"
                      className={styles.select}
                      value={formData.competenciaSeleccionada}
                      onChange={(e) => {
                        setFormData({ 
                          ...formData, 
                          competenciaSeleccionada: e.target.value,
                          capacidadSeleccionada: '',
                          desempeniosSeleccionados: []
                        })
                      }}
                      required
                      disabled={competencias.length === 0}
                    >
                      <option value="">Selecciona una competencia</option>
                      {competencias.map(competencia => (
                        <option key={competencia.id} value={competencia.id.toString()}>
                          {competencia.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Paso 2: Seleccionar Capacidad */}
                  {formData.competenciaSeleccionada && (
                    <div className={styles.formGroup}>
                      <label htmlFor="capacidad">Seleccionar Capacidad <span className={styles.required}>*</span></label>
                      <p className={styles.helpText}>
                        {loadingCapacidades 
                          ? 'Cargando capacidades...'
                          : capacidades.length > 0
                          ? `Se encontraron ${capacidades.length} capacidades para esta competencia.`
                          : 'No se encontraron capacidades para esta competencia.'}
                      </p>
                      <select
                        id="capacidad"
                        className={styles.select}
                        value={formData.capacidadSeleccionada}
                        onChange={(e) => {
                          setFormData({ 
                            ...formData, 
                            capacidadSeleccionada: e.target.value,
                            desempeniosSeleccionados: []
                          })
                        }}
                        required
                        disabled={loadingCapacidades || capacidades.length === 0}
                      >
                        <option value="">Selecciona una capacidad</option>
                        {capacidades.map(capacidad => (
                          <option key={capacidad.id} value={capacidad.id.toString()}>
                            {capacidad.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Paso 3: Seleccionar Desempeños (hasta 3) */}
                  {formData.competenciaSeleccionada && (
                    <div className={styles.formGroup}>
                      <label htmlFor="desempenios">Seleccionar Desempeños <span className={styles.required}>*</span></label>
                      <p className={styles.helpText}>
                        {formData.capacidadSeleccionada && loadingDesempenios 
                          ? 'Cargando desempeños...'
                          : todosLosDesempenios.length > 0
                          ? `Hay ${todosLosDesempenios.length} desempeños disponibles. Puedes seleccionar hasta 3 desempeños de diferentes capacidades.`
                          : formData.capacidadSeleccionada
                          ? 'No se encontraron desempeños para esta capacidad.'
                          : 'Selecciona una capacidad para ver los desempeños disponibles.'}
                        {formData.desempeniosSeleccionados.length > 0 && (
                          <span style={{ display: 'block', marginTop: '5px', color: formData.desempeniosSeleccionados.length >= 3 ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>
                            {formData.desempeniosSeleccionados.length} de 3 desempeños seleccionados
                          </span>
                        )}
                      </p>
                      {todosLosDesempenios.length > 0 ? (
                        <>
                          <select
                            id="desempenios"
                            className={styles.select}
                            multiple
                            size={6}
                            value={formData.desempeniosSeleccionados}
                            onChange={(e) => {
                              const selected = Array.from(e.target.selectedOptions, option => option.value)
                              // Limitar a 3 desempeños
                              if (selected.length <= 3) {
                                setFormData({ ...formData, desempeniosSeleccionados: selected })
                              } else {
                                alert('Solo puedes seleccionar hasta 3 desempeños')
                                // Mantener solo los primeros 3
                                setFormData({ ...formData, desempeniosSeleccionados: selected.slice(0, 3) })
                              }
                            }}
                            required
                            disabled={todosLosDesempenios.length === 0}
                          >
                            {todosLosDesempenios.map(desempenio => {
                              const capacidad = capacidades.find(c => c.id === desempenio.idcapacidad)
                              const isSelected = formData.desempeniosSeleccionados.includes(desempenio.id.toString())
                              return (
                                <option 
                                  key={desempenio.id} 
                                  value={desempenio.id.toString()}
                                  style={{ 
                                    backgroundColor: isSelected ? '#dbeafe' : 'transparent',
                                    fontWeight: isSelected ? 600 : 'normal'
                                  }}
                                >
                                  {capacidad ? `[${capacidad.descripcion.substring(0, 30)}...] ` : ''}
                                  {desempenio.descripcion}
                                </option>
                              )
                            })}
                          </select>
                          <p className={styles.helpText}>
                            Mantén presionado Ctrl/Cmd para seleccionar múltiples. Máximo 3 desempeños. Puedes cambiar de capacidad para ver más opciones.
                          </p>
                        </>
                      ) : formData.capacidadSeleccionada ? (
                        <p className={styles.helpText} style={{ color: '#f59e0b' }}>
                          No hay desempeños disponibles para esta capacidad. Intenta seleccionar otra capacidad.
                        </p>
                      ) : null}
                      {formData.desempeniosSeleccionados.length > 0 && (
                        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                          <strong style={{ color: '#1e40af' }}>Desempeños seleccionados ({formData.desempeniosSeleccionados.length}/3):</strong>
                          <ul style={{ marginTop: '8px', paddingLeft: '20px', listStyle: 'disc' }}>
                            {formData.desempeniosSeleccionados.map(id => {
                              const desempenio = todosLosDesempenios.find(d => d.id.toString() === id)
                              const capacidad = desempenio ? capacidades.find(c => c.id === desempenio.idcapacidad) : null
                              return desempenio ? (
                                <li key={id} style={{ marginBottom: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                                  <strong style={{ color: '#3b82f6' }}>
                                    {capacidad ? `[${capacidad.descripcion}] ` : ''}
                                  </strong>
                                  {desempenio.descripcion}
                                </li>
                              ) : null
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Opción para cambiar de capacidad y seleccionar más desempeños */}
                  {formData.desempeniosSeleccionados.length > 0 && formData.desempeniosSeleccionados.length < 3 && (
                    <div className={styles.formGroup}>
                      <p className={styles.helpText} style={{ color: '#3b82f6', fontStyle: 'italic', padding: '10px', backgroundColor: '#eff6ff', borderRadius: '6px' }}>
                        💡 Puedes cambiar de capacidad arriba para seleccionar desempeños adicionales hasta completar 3. Los desempeños ya seleccionados se mantendrán.
                      </p>
                    </div>
                  )}

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

