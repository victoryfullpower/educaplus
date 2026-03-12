'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import styles from './ficha-aprendizaje.module.css'

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

export default function FichaAprendizajePage() {
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
  const [loading, setLoading] = useState(false)
  const [loadingPrompt, setLoadingPrompt] = useState(false)
  const [loadingRespuestaPrompt, setLoadingRespuestaPrompt] = useState(false)
  const [showModalGeneracion, setShowModalGeneracion] = useState(false)
  const [contenidoGuardado, setContenidoGuardado] = useState<{
    motivacion: string
    saberes: string
    problematizacion: string
    proposito: string
    desarrollo: string
    desarrolloantes: string
    desarrollodurante: string
    desarrollodespues: string
  } | null>(null)

  // Cargar programaciones anuales
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

  // Al elegir plan, cargar unidades de aprendizaje
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

  // Al elegir unidad, cargar sesiones (unidad con listaSesiones)
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

  const generarDocumento = async (usarContenidoBD: boolean) => {
    if (!unidadConSesiones || !sesionSeleccionada) return
    setShowModalGeneracion(false)
    setLoading(true)
    try {
      const competencias = Array.isArray(sesionSeleccionada.competenciasSeleccionadas)
        ? sesionSeleccionada.competenciasSeleccionadas
        : []
      const capacidades = Array.isArray(sesionSeleccionada.capacidadesSeleccionadas)
        ? sesionSeleccionada.capacidadesSeleccionadas
        : []
      const desempenios = Array.isArray(sesionSeleccionada.desempeniosSeleccionados)
        ? sesionSeleccionada.desempeniosSeleccionados
        : []

      const body: Record<string, unknown> = {
        formData: {
          institucion: unidadConSesiones.institucion ?? '',
          area: unidadConSesiones.area ?? '',
          grado: unidadConSesiones.grado ?? '',
          gradoId: unidadConSesiones.gradoId ?? '',
          areaId: unidadConSesiones.areaId ?? '',
          unidad: unidadConSesiones.unidad ?? '',
          ciclo: unidadConSesiones.ciclo ?? '',
          director: unidadConSesiones.director ?? '',
          docente: unidadConSesiones.docente ?? '',
          fecha: '',
          duracion: unidadConSesiones.duracion ?? '',
          tituloSesion: sesionSeleccionada.titulo ?? '',
          continuarUnidad: true
        },
        sesionData: {
          numeroSesion: String(sesionSeleccionada.numeroSesion),
          titulo: sesionSeleccionada.titulo ?? '',
          competenciasSeleccionadas: competencias,
          capacidadesSeleccionadas: capacidades,
          desempeniosSeleccionados: desempenios,
          campoTematico: sesionSeleccionada.campoTematico ?? '',
          evidencias: sesionSeleccionada.evidencias ?? '',
          criterios: sesionSeleccionada.criterios ?? ''
        },
        unidadData: {
          areaId: unidadConSesiones.areaId ?? '',
          gradoId: unidadConSesiones.gradoId ?? '',
          unidad: unidadConSesiones.unidad ?? ''
        }
      }
      if (usarContenidoBD && contenidoGuardado) {
        body.contenidoDesdeBD = contenidoGuardado
      }

      const response = await fetch('/api/sesiones-fichas/generate-document-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionSeleccionada.id })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al generar el documento')
      }
      const fromSaved = response.headers.get('X-Ficha-From') === 'saved'
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Ficha_Aprendizaje_${unidadConSesiones.area ?? 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
      if (fromSaved) {
        console.info('Documento generado desde datos guardados (sin consultar IA).')
      }
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Error al generar el documento.')
    } finally {
      setLoading(false)
    }
  }

  const getFormDataAndSesionData = () => {
    if (!unidadConSesiones || !sesionSeleccionada) return null
    const competencias = Array.isArray(sesionSeleccionada.competenciasSeleccionadas)
      ? sesionSeleccionada.competenciasSeleccionadas
      : []
    const capacidades = Array.isArray(sesionSeleccionada.capacidadesSeleccionadas)
      ? sesionSeleccionada.capacidadesSeleccionadas
      : []
    const desempenios = Array.isArray(sesionSeleccionada.desempeniosSeleccionados)
      ? sesionSeleccionada.desempeniosSeleccionados
      : []
    return {
      formData: {
        area: unidadConSesiones.area ?? '',
        grado: unidadConSesiones.grado ?? '',
        ciclo: unidadConSesiones.ciclo ?? '',
        duracion: unidadConSesiones.duracion ?? '',
        tituloSesion: sesionSeleccionada.titulo ?? '',
        areaId: unidadConSesiones.areaId ?? '',
        gradoId: unidadConSesiones.gradoId ?? '',
        unidad: unidadConSesiones.unidad ?? ''
      },
      sesionData: {
        numeroSesion: String(sesionSeleccionada.numeroSesion),
        titulo: sesionSeleccionada.titulo ?? '',
        competenciasSeleccionadas: competencias,
        capacidadesSeleccionadas: capacidades,
        desempeniosSeleccionados: desempenios
      }
    }
  }

  const handlePromptDinamico = async () => {
    if (!sesionSeleccionada) return
    setLoadingPrompt(true)
    try {
      const response = await fetch('/api/sesiones-fichas/generate-prompt-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionSeleccionada.id })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al generar el prompt')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Prompt_Ficha_${unidadConSesiones?.area ?? 'documento'}_${Date.now()}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Error al generar el documento de prompt.')
    } finally {
      setLoadingPrompt(false)
    }
  }

  const handleRespuestaPrompt = async () => {
    if (!sesionSeleccionada) return
    setLoadingRespuestaPrompt(true)
    try {
      const response = await fetch('/api/sesiones-fichas/respuesta-prompt-ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionId: sesionSeleccionada.id, includePreviewImage: true })
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Error al generar la respuesta del prompt')
      }
      const contentType = response.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        const data = await response.json()
        const ts = Date.now()
        const baseName = `Respuesta_Prompt_Ficha_${(unidadConSesiones?.area ?? 'documento').replace(/\s+/g, '_')}_${ts}`.replace(/[^a-zA-Z0-9_.-]/g, '')
        const docxName = data.fileNameDocx || `${baseName}.docx`
        const imageName = data.fileNameImage || `${baseName}_vista_previa.svg`
        const docxBuf = Uint8Array.from(atob(data.docxBase64), (c) => c.charCodeAt(0))
        const imageBuf = Uint8Array.from(atob(data.imageBase64), (c) => c.charCodeAt(0))
        const mimeImage = data.mimeImage || 'image/svg+xml'
        const blobDocx = new Blob([docxBuf], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const blobImage = new Blob([imageBuf], { type: mimeImage })
        const urlDocx = window.URL.createObjectURL(blobDocx)
        const urlImage = window.URL.createObjectURL(blobImage)
        const a1 = document.createElement('a')
        a1.href = urlDocx
        a1.download = docxName
        document.body.appendChild(a1)
        a1.click()
        document.body.removeChild(a1)
        window.URL.revokeObjectURL(urlDocx)
        const a2 = document.createElement('a')
        a2.href = urlImage
        a2.download = imageName
        document.body.appendChild(a2)
        a2.click()
        document.body.removeChild(a2)
        window.URL.revokeObjectURL(urlImage)
      } else {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Respuesta_Prompt_Ficha_${unidadConSesiones?.area ?? 'documento'}_${Date.now()}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : 'Error al generar la respuesta del prompt.')
    } finally {
      setLoadingRespuestaPrompt(false)
    }
  }

  const handleGenerarDocumento = async () => {
    if (!unidadConSesiones || !sesionSeleccionada) return
    try {
      const params = new URLSearchParams({
        areaId: String(unidadConSesiones.areaId ?? ''),
        gradoId: String(unidadConSesiones.gradoId ?? ''),
        unidad: String(unidadConSesiones.unidad ?? ''),
        numeroSesion: String(sesionSeleccionada.numeroSesion)
      })
      const checkRes = await fetch(`/api/sesiones-fichas/sesion-contenido?${params}`)
      if (checkRes.ok) {
        const data = await checkRes.json()
        if (data.existe && data.contenido) {
          setContenidoGuardado(data.contenido)
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
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>CREAR FICHA DE APRENDIZAJE</h1>
          <p className={styles.subtitle}>
            Elige una programación anual, luego la unidad y la sesión para generar la ficha.
          </p>

          <div className={`${styles.form} ${(loading || loadingPrompt || loadingRespuestaPrompt) ? styles.loading : ''}`}>
            <h2 className={styles.phaseTitle}>Fase 1: Selección</h2>
            <p className={styles.phaseDescription}>
              Selecciona la programación anual, la unidad de aprendizaje y la sesión. El botón &quot;Generar documento&quot; se activará al elegir la sesión.
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
                disabled={!puedeGenerar || loading}
                onClick={handleGenerarDocumento}
              >
                {loading ? 'Generando…' : 'Generar documento'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showModalGeneracion && (
        <div className={styles.modalOverlay} onClick={() => setShowModalGeneracion(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Esta sesión ya tiene contenido guardado</h3>
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
