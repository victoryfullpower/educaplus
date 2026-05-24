'use client'

import { useRef, useState } from 'react'
import Header from '@/components/Header'
import styles from './sello-documentos.module.css'

type Tab = 'sellar' | 'verificar'

type VerifyResult = {
  archivo: string
  formato: string
  tieneSello: boolean
  metadatos: Record<string, string>
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

type AccionCargando = 'sellar' | 'verificar' | null

function BtnLoader({ label }: { label: string }) {
  return (
    <span className={styles.btnPrimaryContent}>
      <span className={styles.btnSpinner} aria-hidden />
      {label}
    </span>
  )
}

export default function SelloDocumentosPage() {
  const [tab, setTab] = useState<Tab>('sellar')
  const [codigo, setCodigo] = useState('')
  const [archivos, setArchivos] = useState<File[]>([])
  const [archivoVerificar, setArchivoVerificar] = useState<File | null>(null)
  const [accionCargando, setAccionCargando] = useState<AccionCargando>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [mensajeTipo, setMensajeTipo] = useState<'ok' | 'error' | 'warn'>('ok')
  const [resultado, setResultado] = useState<VerifyResult | null>(null)

  const inputArchivosRef = useRef<HTMLInputElement>(null)
  const inputCarpetaRef = useRef<HTMLInputElement>(null)
  const inputVerificarRef = useRef<HTMLInputElement>(null)

  const agregarArchivos = (lista: FileList | null) => {
    if (!lista?.length) return
    const validos: File[] = []
    const rechazados: string[] = []
    for (const f of Array.from(lista)) {
      const n = f.name.toLowerCase()
      if (n.endsWith('.docx') || n.endsWith('.pdf')) validos.push(f)
      else rechazados.push(f.name)
    }
    if (rechazados.length) {
      setMensaje(`Se omitieron archivos no válidos: ${rechazados.slice(0, 3).join(', ')}${rechazados.length > 3 ? '…' : ''}`)
      setMensajeTipo('warn')
    }
    if (validos.length) {
      setArchivos((prev) => {
        const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]))
        for (const f of validos) map.set(`${f.name}-${f.size}`, f)
        return [...map.values()]
      })
    }
  }

  const limpiarArchivos = () => {
    setArchivos([])
    if (inputArchivosRef.current) inputArchivosRef.current.value = ''
    if (inputCarpetaRef.current) inputCarpetaRef.current.value = ''
  }

  const sellarYDescargar = async () => {
    setMensaje(null)
    setResultado(null)
    if (!codigo.trim()) {
      setMensaje('El código EducaPlus es obligatorio')
      setMensajeTipo('error')
      return
    }
    if (archivos.length === 0) {
      setMensaje('Selecciona al menos un archivo Word (.docx) o PDF')
      setMensajeTipo('error')
      return
    }

    setAccionCargando('sellar')
    try {
      const form = new FormData()
      form.set('codigoeducaplus', codigo.trim())
      for (const f of archivos) form.append('archivos', f)

      const res = await fetch('/api/sello-documentos/batch', {
        method: 'POST',
        body: form
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const det = Array.isArray(err.detalles)
          ? `\n${(err.detalles as string[]).join('\n')}`
          : ''
        throw new Error((err.error as string) || 'No se pudo sellar los archivos' + det)
      }

      const blob = await res.blob()
      const codigoSlug = codigo.trim().replace(/[^\w-]+/g, '_')
      descargarBlob(blob, `documentos_sellados_${codigoSlug}.zip`)

      const sellados = res.headers.get('X-Sellados-Count') ?? String(archivos.length)
      const errHeader = res.headers.get('X-Sello-Errores')
      let texto = `Listo: ${sellados} archivo(s) sellado(s) y descargados en ZIP.`
      if (errHeader) {
        const errs = decodeURIComponent(errHeader).split(';;')
        texto += ` Algunos no se procesaron: ${errs.join('; ')}`
        setMensajeTipo('warn')
      } else {
        setMensajeTipo('ok')
      }
      setMensaje(texto)
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al sellar')
      setMensajeTipo('error')
    } finally {
      setAccionCargando(null)
    }
  }

  const verificarArchivo = async () => {
    setMensaje(null)
    setResultado(null)
    if (!archivoVerificar) {
      setMensaje('Selecciona un archivo para verificar')
      setMensajeTipo('error')
      return
    }

    setAccionCargando('verificar')
    try {
      const form = new FormData()
      form.append('archivo', archivoVerificar)

      const res = await fetch('/api/sello-documentos/verify', {
        method: 'POST',
        body: form
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al verificar')

      setResultado(data as VerifyResult)
      if (data.tieneSello) {
        setMensaje('Se encontró sello EducaPlus en el documento.')
        setMensajeTipo('ok')
      } else {
        setMensaje('No se encontró el código EducaPlus en las propiedades del archivo.')
        setMensajeTipo('warn')
      }
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al verificar')
      setMensajeTipo('error')
    } finally {
      setAccionCargando(null)
    }
  }

  const sellando = accionCargando === 'sellar'
  const verificando = accionCargando === 'verificar'
  const procesando = accionCargando !== null

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1>Sello de documentos EducaPlus</h1>
            <p>
              Incrusta el código EducaPlus en archivos Word y PDF. No requiere iniciar sesión.
            </p>
          </div>

          <div className={styles.card}>
            <div className={styles.tabs} role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'sellar'}
                className={`${styles.tab} ${tab === 'sellar' ? styles.tabActive : ''}`}
                onClick={() => {
                  if (procesando) return
                  setTab('sellar')
                  setMensaje(null)
                }}
                disabled={procesando}
              >
                Sellar y descargar
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'verificar'}
                className={`${styles.tab} ${tab === 'verificar' ? styles.tabActive : ''}`}
                onClick={() => {
                  if (procesando) return
                  setTab('verificar')
                  setMensaje(null)
                }}
                disabled={procesando}
              >
                Verificar sello
              </button>
            </div>

            {tab === 'sellar' ? (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Ingresa el código, sube uno o varios archivos (.docx / .pdf) o una carpeta
                  entera. Recibirás un ZIP con los documentos sellados.
                </p>

                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label} htmlFor="codigo">
                      Código EducaPlus *
                    </label>
                    <input
                      id="codigo"
                      className={styles.input}
                      placeholder="Ej. 123"
                      value={codigo}
                      onChange={(e) => setCodigo(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.dropzone}>
                  <p>Arrastra archivos aquí o elige desde tu equipo</p>
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => inputArchivosRef.current?.click()}
                    >
                      Elegir archivos
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => inputCarpetaRef.current?.click()}
                    >
                      Elegir carpeta
                    </button>
                    {archivos.length > 0 && (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={limpiarArchivos}
                      >
                        Limpiar lista
                      </button>
                    )}
                  </div>
                  <input
                    ref={inputArchivosRef}
                    type="file"
                    className={styles.fileInput}
                    accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    onChange={(e) => agregarArchivos(e.target.files)}
                  />
                  <input
                    ref={inputCarpetaRef}
                    type="file"
                    className={styles.fileInput}
                    multiple
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => agregarArchivos(e.target.files)}
                  />
                </div>

                {archivos.length > 0 && (
                  <ul className={styles.fileList}>
                    {archivos.map((f) => (
                      <li key={`${f.name}-${f.size}`}>
                        <span>{f.name}</span>
                        <span>{formatBytes(f.size)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className={`${styles.btnPrimary} ${sellando ? styles.btnPrimaryLoading : ''}`}
                  disabled={procesando}
                  aria-busy={sellando}
                  onClick={() => void sellarYDescargar()}
                >
                  {sellando ? (
                    <BtnLoader label="Sellando documentos…" />
                  ) : (
                    'Sellar documentos y descargar ZIP'
                  )}
                </button>
              </div>
            ) : (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Sube un solo archivo para comprobar si contiene el sello EducaPlus en sus
                  propiedades (no visible en el texto del documento).
                </p>

                <div className={styles.dropzone}>
                  <p>
                    {archivoVerificar
                      ? archivoVerificar.name
                      : 'Selecciona un .docx o .pdf'}
                  </p>
                  <button
                    type="button"
                    className={styles.btnSecondary}
                    onClick={() => inputVerificarRef.current?.click()}
                  >
                    Elegir archivo
                  </button>
                  <input
                    ref={inputVerificarRef}
                    type="file"
                    className={styles.fileInput}
                    accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      setArchivoVerificar(f)
                      setResultado(null)
                      setMensaje(null)
                    }}
                  />
                </div>

                <button
                  type="button"
                  className={`${styles.btnPrimary} ${styles.btnVerify} ${verificando ? styles.btnPrimaryLoading : ''}`}
                  disabled={procesando || !archivoVerificar}
                  aria-busy={verificando}
                  onClick={() => void verificarArchivo()}
                >
                  {verificando ? (
                    <BtnLoader label="Verificando…" />
                  ) : (
                    'Verificar metadatos'
                  )}
                </button>

                {resultado && (
                  <div className={styles.resultCard}>
                    <h3>
                      Resultado{' '}
                      <span
                        className={`${styles.badge} ${
                          resultado.tieneSello ? styles.badgeOk : styles.badgeNo
                        }`}
                      >
                        {resultado.tieneSello ? 'Con sello' : 'Sin sello'}
                      </span>
                    </h3>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Archivo</span>
                      <span className={styles.metaVal}>{resultado.archivo}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Formato</span>
                      <span className={styles.metaVal}>{resultado.formato.toUpperCase()}</span>
                    </div>
                    <div className={styles.metaRow}>
                      <span className={styles.metaKey}>Código EducaPlus</span>
                      <span className={styles.metaVal}>
                        {resultado.metadatos.codigoeducaplus?.trim() || '—'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mensaje && (
              <div
                className={`${styles.alert} ${
                  mensajeTipo === 'ok'
                    ? styles.alertOk
                    : mensajeTipo === 'warn'
                      ? styles.alertWarn
                      : styles.alertError
                }`}
                style={{ margin: '0 28px 24px' }}
              >
                {mensaje}
              </div>
            )}
          </div>
        </div>
      </main>

      {procesando && (
        <div
          className={styles.loadingOverlay}
          role="alertdialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="sello-loading-title"
        >
          <div className={styles.loadingCard}>
            <div className={styles.loadingSpinner} aria-hidden />
            <h2 id="sello-loading-title" className={styles.loadingTitle}>
              {sellando ? 'Sellando documentos…' : 'Verificando sello…'}
            </h2>
            <p className={styles.loadingText}>
              {sellando
                ? `Procesando ${archivos.length} archivo(s). Se descargará el ZIP al terminar.`
                : 'Leyendo las propiedades del archivo. Un momento…'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
