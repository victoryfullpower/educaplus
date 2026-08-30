'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { promptRespuestaToHtml } from '@/lib/prompt-respuesta-html'
import styles from './probar-prompt.module.css'

type ModeloOpcion = 'gpt-4o-mini' | 'gpt-5-mini'

const MODELOS: { id: ModeloOpcion; label: string }[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini' }
]

function descargarDocxBase64(docxBase64: string, fileName: string): void {
  const bytes = Uint8Array.from(atob(docxBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}

export default function ProbarPromptPage() {
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [modeloSeleccionado, setModeloSeleccionado] = useState<ModeloOpcion>('gpt-4o-mini')
  const [prompt, setPrompt] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [respuestaHtml, setRespuestaHtml] = useState('')
  const [respuestaTexto, setRespuestaTexto] = useState('')
  const [modeloRespuesta, setModeloRespuesta] = useState('gpt-4o-mini')
  const [wordDoc, setWordDoc] = useState<{ docxBase64: string; fileName: string } | null>(
    null
  )

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check')
        const data = await response.json()
        setIsAuthenticated(Boolean(data.authenticated))
      } catch {
        setIsAuthenticated(false)
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!modalAbierto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalAbierto(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [modalAbierto])

  const enviar = async () => {
    const texto = prompt.trim()
    if (!texto) {
      setError('Pega tu prompt antes de enviar.')
      return
    }
    if (!isAuthenticated) {
      setError('Debes iniciar sesión para usar esta herramienta.')
      return
    }

    setEnviando(true)
    setError(null)

    try {
      const res = await fetch('/api/probar-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: texto, modelo: modeloSeleccionado })
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo obtener la respuesta')
      }

      const textoResp = String(data.respuesta || '')
      setRespuestaTexto(textoResp)
      setRespuestaHtml(promptRespuestaToHtml(textoResp))
      setModeloRespuesta(String(data.modelo || modeloSeleccionado))

      const word =
        data.word?.docxBase64 && data.word?.fileName
          ? {
              docxBase64: String(data.word.docxBase64),
              fileName: String(data.word.fileName)
            }
          : null
      setWordDoc(word)
      if (word) {
        descargarDocxBase64(word.docxBase64, word.fileName)
      }

      setModalAbierto(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar el prompt')
    } finally {
      setEnviando(false)
    }
  }

  const copiarRespuesta = async () => {
    try {
      await navigator.clipboard.writeText(respuestaTexto)
    } catch {
      // ignore
    }
  }

  const labelModelo =
    MODELOS.find((m) => m.id === modeloSeleccionado)?.label || modeloSeleccionado

  return (
    <>
      <Header />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <Link href="/servicios/crear-material" className={styles.backLink}>
              ← Volver a crear material
            </Link>
            <span className={styles.badge}>Modelo: {labelModelo}</span>
            <h1 className={styles.title}>Probar prompt</h1>
            <p className={styles.subtitle}>
              Pega tu prompt, elige el modelo, ve la respuesta tal cual en un modal HTML y
              descarga el Word de esa misma respuesta.
            </p>
          </div>
        </section>

        <section className={styles.panel}>
          {authLoading ? (
            <p className={styles.hint}>Verificando sesión…</p>
          ) : !isAuthenticated ? (
            <p className={styles.warn}>
              Debes{' '}
              <Link href="/login" className={styles.link}>
                iniciar sesión
              </Link>{' '}
              para usar esta página.
            </p>
          ) : null}

          <div className={styles.tabs} role="tablist" aria-label="Modelo de IA">
            {MODELOS.map((m) => {
              const activo = modeloSeleccionado === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  className={activo ? styles.tabActive : styles.tab}
                  onClick={() => setModeloSeleccionado(m.id)}
                  disabled={enviando}
                >
                  {m.label}
                </button>
              )
            })}
          </div>

          <label className={styles.label} htmlFor="prompt-textarea">
            Tu prompt
          </label>
          <textarea
            id="prompt-textarea"
            className={styles.textarea}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Pega aquí tu prompt completo…"
            rows={16}
            disabled={enviando || authLoading}
          />

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => {
                setPrompt('')
                setError(null)
              }}
              disabled={enviando || !prompt}
            >
              Limpiar
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={enviar}
              disabled={enviando || authLoading || !isAuthenticated || !prompt.trim()}
            >
              {enviando ? `Enviando a ${labelModelo}…` : `Enviar a ${labelModelo}`}
            </button>
          </div>
        </section>
      </main>

      {modalAbierto ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="respuesta-titulo"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalAbierto(false)
          }}
        >
          <div className={styles.modal}>
            <header className={styles.modalHeader}>
              <div>
                <h2 id="respuesta-titulo" className={styles.modalTitle}>
                  Respuesta
                </h2>
                <p className={styles.modalMeta}>Modelo: {modeloRespuesta}</p>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSecondary} onClick={copiarRespuesta}>
                  Copiar texto
                </button>
                {wordDoc ? (
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => descargarDocxBase64(wordDoc.docxBase64, wordDoc.fileName)}
                  >
                    Descargar Word
                  </button>
                ) : null}
                <button
                  type="button"
                  className={styles.btnClose}
                  onClick={() => setModalAbierto(false)}
                  aria-label="Cerrar"
                >
                  ✕
                </button>
              </div>
            </header>
            <div
              className={styles.modalBody}
              dangerouslySetInnerHTML={{ __html: respuestaHtml }}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
