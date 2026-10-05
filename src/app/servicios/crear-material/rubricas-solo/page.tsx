'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import styles from './rubricas-solo.module.css'
import { errorDesdeResponse } from '@/lib/error-generacion-documento'
import { useAvisoModal } from '@/hooks/useAvisoModal'

type PlanAnual = {
  id: number
  anio?: number
  area?: string | null
  grado?: string | null
  institucion?: string | null
}

type SesionRow = {
  id: number
  numeroSesion: number
  titulo?: string | null
  campoTematico?: string | null
  criterios?: string | null
  evidencias?: string | null
  competenciasSeleccionadas?: unknown
  capacidadesSeleccionadas?: unknown
  desempeniosSeleccionados?: unknown
}

type UnidadAprendizaje = {
  id: number
  areaId?: string | null
  gradoId?: string | null
  unidad?: string | null
  area?: string | null
  grado?: string | null
  ciclo?: string | null
  institucion?: string | null
  director?: string | null
  docente?: string | null
  duracion?: string | null
  tituloUnidad?: string | null
  listaSesiones?: SesionRow[]
}

export default function RubricasSoloPage() {
  const { manejarErrorGeneracion, AvisoModalEl } = useAvisoModal(
    'EducaPlus · Rúbrica analítica'
  )
  const anio = new Date().getFullYear()
  const [planes, setPlanes] = useState<PlanAnual[]>([])
  const [unidades, setUnidades] = useState<UnidadAprendizaje[]>([])
  const [unidadConSesiones, setUnidadConSesiones] = useState<UnidadAprendizaje | null>(null)

  const [planId, setPlanId] = useState<string>('')
  const [unidadId, setUnidadId] = useState<string>('')
  const [sesionNumero, setSesionNumero] = useState<string>('')

  const [loadingPlanes, setLoadingPlanes] = useState(true)
  const [loadingUnidades, setLoadingUnidades] = useState(false)
  const [loadingUnidad, setLoadingUnidad] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [loadingRespuestaPrompt, setLoadingRespuestaPrompt] = useState(false)
  const [loadingDocument, setLoadingDocument] = useState(false)
  const [showModalGeneracion, setShowModalGeneracion] = useState(false)

  // Cargar programaciones anuales (mismo servicio que ficha)
  useEffect(() => {
    const load = async () => {
      setLoadingPlanes(true)
      try {
        const res = await fetch(`/api/plan-anual?anio=${anio}`)
        const data = await res.json()
        setPlanes(data.planesAnuales ?? [])
        if (!data.planesAnuales?.length) setPlanId('')
      } catch (e) {
        console.error(e)
        setPlanes([])
      } finally {
        setLoadingPlanes(false)
      }
    }
    load()
  }, [anio])

  // Al elegir plan, cargar unidades (mismo servicio que ficha)
  useEffect(() => {
    if (!planId) {
      setUnidades([])
      setUnidadId('')
      setUnidadConSesiones(null)
      setSesionNumero('')
      return
    }
    const load = async () => {
      setLoadingUnidades(true)
      setUnidadId('')
      setUnidadConSesiones(null)
      setSesionNumero('')
      try {
        const res = await fetch(`/api/unidad-aprendizaje?idplananual=${planId}&anio=${anio}`)
        const data = await res.json()
        setUnidades(data.unidadesAprendizaje ?? [])
      } catch (e) {
        console.error(e)
        setUnidades([])
      } finally {
        setLoadingUnidades(false)
      }
    }
    load()
  }, [planId, anio])

  // Al elegir unidad, cargar sesiones (mismo servicio que ficha)
  useEffect(() => {
    if (!unidadId) {
      setUnidadConSesiones(null)
      setSesionNumero('')
      return
    }
    const load = async () => {
      setLoadingUnidad(true)
      setSesionNumero('')
      try {
        const res = await fetch(`/api/unidad-aprendizaje?id=${unidadId}`)
        const data = await res.json()
        setUnidadConSesiones(data.unidadAprendizaje ?? null)
      } catch (e) {
        console.error(e)
        setUnidadConSesiones(null)
      } finally {
        setLoadingUnidad(false)
      }
    }
    load()
  }, [unidadId])

  const sesiones = unidadConSesiones?.listaSesiones ?? []
  const sesionSeleccionada = sesiones.find(
    (s) => String(s.numeroSesion) === sesionNumero
  )
  const puedeGenerar = Boolean(sesionNumero && sesionSeleccionada && unidadConSesiones)

  const handlePromptDinamico = async () => {
    if (!sesionSeleccionada) return
    setLoadingPrompt(true)
    try {
      const response = await fetch('/api/sesiones-fichas/generate-prompt-rubrica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionSeleccionada.id })
      })
      if (!response.ok) {
        throw await errorDesdeResponse(response, 'Error al generar el prompt')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Prompt_Rubrica_${unidadConSesiones?.area ?? 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      manejarErrorGeneracion(e)
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleRespuestaPrompt = async () => {
    if (!sesionSeleccionada) return
    setLoadingRespuestaPrompt(true)
    try {
      const response = await fetch('/api/sesiones-fichas/respuesta-prompt-rubrica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionSeleccionada.id })
      })
      if (!response.ok) {
        throw await errorDesdeResponse(response, 'Error al generar la respuesta del prompt')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Respuesta_Prompt_Rubrica_${unidadConSesiones?.area ?? 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      manejarErrorGeneracion(e)
    } finally {
      setLoadingRespuestaPrompt(false)
    }
  }

  const generarDocumento = async (usarGuardado: boolean) => {
    if (!sesionSeleccionada || !unidadConSesiones) return
    setShowModalGeneracion(false)
    setLoadingDocument(true)
    try {
      const response = await fetch('/api/sesiones-fichas/generate-document-rubrica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sesionId: sesionSeleccionada.id,
          forceRegenerate: !usarGuardado
        })
      })
      if (!response.ok) {
        throw await errorDesdeResponse(response, 'Error al generar el documento')
      }
      const fromSaved = response.headers.get('X-Rubrica-From') === 'saved'
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Rubrica_Analitica_${unidadConSesiones.area ?? 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      if (fromSaved) {
        console.info('Documento generado desde rúbrica guardada (sin consultar IA).')
      }
    } catch (e) {
      console.error(e)
      manejarErrorGeneracion(e)
    } finally {
      setLoadingDocument(false)
    }
  }

  const handleGenerarDocumento = async () => {
    if (!sesionSeleccionada) return
    try {
      const res = await fetch(
        `/api/sesiones-fichas/rubrica-existe?sesionId=${sesionSeleccionada.id}`
      )
      if (res.ok) {
        const data = await res.json()
        if (data.existe) {
          setShowModalGeneracion(true)
          return
        }
      }
    } catch (_) {
      // Si falla la consulta, generar con IA
    }
    generarDocumento(false)
  }

  return (
    <>
      {AvisoModalEl}
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR SOLO RÚBRICAS</h1>
          <p className={styles.subtitle}>
            Elige una programación anual, luego la unidad y la sesión para generar las rúbricas.
          </p>

          <div className={`${styles.form} ${(loadingPrompt || loadingRespuestaPrompt || loadingDocument) ? styles.loading : ''}`}>
            <h2 className={styles.phaseTitle}>Fase 1: Selección</h2>
            <p className={styles.phaseDescription}>
              Selecciona la programación anual, la unidad de aprendizaje y la sesión. Los botones se activarán al elegir la sesión.
            </p>

            <div className={styles.formGroup}>
              <label htmlFor="plan">Programación anual</label>
              <select
                id="plan"
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className={styles.select}
                disabled={loadingPlanes}
              >
                <option value="">Selecciona una programación anual</option>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {[p.area, p.grado].filter(Boolean).join(' - ') || `Plan ${p.id}`}
                    {p.anio ? ` (${p.anio})` : ''}
                  </option>
                ))}
              </select>
              {loadingPlanes && <p className={styles.helpText}>Cargando…</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="unidad">Unidad de aprendizaje</label>
              <select
                id="unidad"
                value={unidadId}
                onChange={(e) => setUnidadId(e.target.value)}
                className={styles.select}
                disabled={!planId || loadingUnidades}
              >
                <option value="">Selecciona una unidad de aprendizaje</option>
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.tituloUnidad || `Unidad ${u.unidad ?? u.id}`}
                    {u.area || u.grado ? ` (${[u.area, u.grado].filter(Boolean).join(' - ')})` : ''}
                  </option>
                ))}
              </select>
              {loadingUnidades && <p className={styles.helpText}>Cargando unidades…</p>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="sesion">Sesión</label>
              <select
                id="sesion"
                value={sesionNumero}
                onChange={(e) => setSesionNumero(e.target.value)}
                className={styles.select}
                disabled={!unidadId || loadingUnidad}
              >
                <option value="">Selecciona una sesión</option>
                {sesiones.map((s) => (
                  <option key={s.id} value={s.numeroSesion}>
                    Sesión {s.numeroSesion}: {s.titulo || 'Sin título'}
                  </option>
                ))}
              </select>
              {loadingUnidad && <p className={styles.helpText}>Cargando sesiones…</p>}
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={!puedeGenerar || loadingPrompt}
                onClick={handlePromptDinamico}
              >
                {loadingPrompt ? 'Generando…' : 'Prompt dinámico'}
              </button>
              <button
                type="button"
                className={styles.buttonSecondary}
                disabled={!puedeGenerar || loadingRespuestaPrompt}
                onClick={handleRespuestaPrompt}
              >
                {loadingRespuestaPrompt ? 'Generando…' : 'Respuesta prompt'}
              </button>
              <button
                type="button"
                className={styles.button}
                disabled={!puedeGenerar || loadingDocument}
                onClick={handleGenerarDocumento}
              >
                {loadingDocument ? 'Generando…' : 'Generar documento'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showModalGeneracion && (
        <div className={styles.modalOverlay} onClick={() => setShowModalGeneracion(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Esta sesión ya tiene rúbrica guardada</h3>
            <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
              Puedes generar el documento con lo guardado o volver a generar con la IA.
            </p>
            <div className={styles.modalButtons}>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                onClick={() => generarDocumento(true)}
              >
                Generar lo guardado
              </button>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                onClick={() => generarDocumento(false)}
              >
                Generar nuevamente (IA)
              </button>
              <button
                type="button"
                className={`${styles.modalBtn} ${styles.modalBtnCancel}`}
                onClick={() => setShowModalGeneracion(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
