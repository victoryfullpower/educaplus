'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Header from '@/components/Header'
import {
  generarSerieCodigos,
  MSG_FORMATO_CODIGO_CORRELATIVO
} from '@/lib/sello-codigo-correlativo'
import {
  esAdjuntoSello,
  esDocumentoSellable,
  MAX_ARCHIVOS_LOTE_SELLO,
  MAX_COPIAS_MASIVO_SELLO,
  MSG_CODIGO_SELLO_DUPLICADO
} from '@/lib/sello-documento-constants'
import { fusionarZipConAdjuntos } from '@/lib/sello-zip-cliente'
import { verificarSelloEnArchivo } from '@/lib/documento-sello-cliente'
import styles from './sello-documentos.module.css'

type Tab = 'sellar' | 'masivo' | 'verificar' | 'proteger' | 'registros'

type RegistroSelloItem = {
  id: number
  codigoeducaplus: string
  cantidadArchivos: number
  fecha: string
}

type RegistrosResponse = {
  items: RegistroSelloItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

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

function esperar(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

const MASIVO_STORAGE_KEY = 'educaplus-sello-masivo'

type MasivoPersistido = {
  sessionId: string
  codigoBase: string
  cantidadCopias: number
  archivosCount: number
  codigosCompletados: string[]
}

function leerMasivoPersistido(): MasivoPersistido | null {
  try {
    const raw = sessionStorage.getItem(MASIVO_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as MasivoPersistido) : null
  } catch {
    return null
  }
}

function guardarMasivoPersistido(data: MasivoPersistido) {
  sessionStorage.setItem(MASIVO_STORAGE_KEY, JSON.stringify(data))
}

function limpiarMasivoPersistido() {
  sessionStorage.removeItem(MASIVO_STORAGE_KEY)
}

type CopiaMasivoPreparada = {
  ok: boolean
  codigo?: string
  sellados?: number
  adjuntos?: number
  errores?: string[]
}

async function prepararCopiaMasivo(
  sessionId: string,
  codigo: string,
  intentos = 3
): Promise<{ res: Response; data: CopiaMasivoPreparada | null }> {
  let ultimoError: unknown = null

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const res = await fetch('/api/sello-documentos/masivo/copia/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, codigoeducaplus: codigo }),
        cache: 'no-store'
      })

      if (!res.ok) {
        return { res, data: null }
      }

      const data = (await res.json()) as CopiaMasivoPreparada
      return { res, data }
    } catch (error) {
      ultimoError = error
      if (intento < intentos) {
        await esperar(1000 * intento)
      }
    }
  }

  throw ultimoError instanceof Error
    ? ultimoError
    : new Error('No se pudo preparar la copia sellada')
}

function descargarCopiaMasivoDesdeServidor(
  sessionId: string,
  codigo: string,
  nombreArchivo: string
) {
  const url = `/api/sello-documentos/masivo/copia/?sessionId=${encodeURIComponent(sessionId)}&codigo=${encodeURIComponent(codigo)}`
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function calcularProgresoMasivoPct(progreso: ProgresoMasivo): number {
  if (progreso.fase === 'subiendo') return 8
  const avancePorCopia =
    progreso.fase === 'sellando'
      ? 0.35
      : progreso.fase === 'empaquetando'
        ? 0.65
        : 0.95
  return Math.min(
    100,
    Math.round(
      ((progreso.copiasCompletadas + avancePorCopia) / progreso.totalCopias) * 100
    )
  )
}

type AccionCargando = 'sellar' | 'masivo' | 'verificar' | 'proteger' | null

type FaseMasivo = 'subiendo' | 'sellando' | 'empaquetando' | 'descargando'

type ProgresoMasivo = {
  fase: FaseMasivo
  copiaActual: number
  totalCopias: number
  codigoActual: string
  copiasCompletadas: number
}

type ModalAvisoTipo = 'error' | 'warn' | 'info'

type ModalAviso = {
  titulo: string
  mensaje: string
  tipo: ModalAvisoTipo
}

function formatFechaRegistro(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  } catch {
    return iso
  }
}

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
  const [codigoMasivo, setCodigoMasivo] = useState('')
  const [cantidadCopias, setCantidadCopias] = useState(2)
  const [archivos, setArchivos] = useState<File[]>([])
  const [adjuntos, setAdjuntos] = useState<File[]>([])
  const [archivosMasivo, setArchivosMasivo] = useState<File[]>([])
  const [adjuntosMasivo, setAdjuntosMasivo] = useState<File[]>([])
  const [pdfsProteger, setPdfsProteger] = useState<File[]>([])
  const [archivoVerificar, setArchivoVerificar] = useState<File | null>(null)
  const [accionCargando, setAccionCargando] = useState<AccionCargando>(null)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [mensajeTipo, setMensajeTipo] = useState<'ok' | 'error' | 'warn'>('ok')
  const [resultado, setResultado] = useState<VerifyResult | null>(null)

  const [registros, setRegistros] = useState<RegistroSelloItem[]>([])
  const [registrosTotal, setRegistrosTotal] = useState(0)
  const [registrosPage, setRegistrosPage] = useState(1)
  const [registrosTotalPages, setRegistrosTotalPages] = useState(1)
  const [cargandoRegistros, setCargandoRegistros] = useState(false)
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')
  const [modalAviso, setModalAviso] = useState<ModalAviso | null>(null)
  const [progresoMasivo, setProgresoMasivo] = useState<ProgresoMasivo | null>(null)

  const inputArchivosRef = useRef<HTMLInputElement>(null)
  const inputArchivosMasivoRef = useRef<HTMLInputElement>(null)
  const modalCerrarRef = useRef<HTMLButtonElement>(null)
  const inputCarpetaRef = useRef<HTMLInputElement>(null)
  const inputCarpetaMasivoRef = useRef<HTMLInputElement>(null)
  const inputProtegerRef = useRef<HTMLInputElement>(null)
  const inputProtegerCarpetaRef = useRef<HTMLInputElement>(null)
  const inputVerificarRef = useRef<HTMLInputElement>(null)

  const limpiarInputsArchivos = () => {
    if (inputArchivosRef.current) inputArchivosRef.current.value = ''
    if (inputCarpetaRef.current) inputCarpetaRef.current.value = ''
  }

  const abrirModalAviso = useCallback(
    (opts: { titulo?: string; mensaje: string; tipo?: ModalAvisoTipo }) => {
      setModalAviso({
        titulo: opts.titulo ?? 'Aviso',
        mensaje: opts.mensaje,
        tipo: opts.tipo ?? 'info'
      })
    },
    []
  )

  const cerrarModalAviso = useCallback(() => setModalAviso(null), [])

  useEffect(() => {
    if (!modalAviso) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cerrarModalAviso()
    }
    document.addEventListener('keydown', onKey)
    modalCerrarRef.current?.focus()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [modalAviso, cerrarModalAviso])

  const mostrarCodigoDuplicado = useCallback(
    (msg?: string) => {
      const text = msg || MSG_CODIGO_SELLO_DUPLICADO
      setMensaje(text)
      setMensajeTipo('error')
      abrirModalAviso({
        titulo: 'Código ya registrado',
        mensaje: text,
        tipo: 'error'
      })
    },
    [abrirModalAviso]
  )

  const codigoEstaDuplicado = useCallback(async (codigoTrim: string): Promise<boolean> => {
    const verRes = await fetch(
      `/api/sello-documentos/registros?verificarCodigo=${encodeURIComponent(codigoTrim)}`
    )
    const verData = (await verRes.json()) as { existe?: boolean }
    if (!verRes.ok) return false
    return Boolean(verData.existe)
  }, [])

  const validarCodigoAntesDeArchivos = useCallback(
    async (codigoTrim: string): Promise<boolean> => {
      if (!codigoTrim) return true
      if (await codigoEstaDuplicado(codigoTrim)) {
        mostrarCodigoDuplicado()
        limpiarInputsArchivos()
        return false
      }
      return true
    },
    [codigoEstaDuplicado, mostrarCodigoDuplicado]
  )

  const abrirSelectorArchivos = async (input: HTMLInputElement | null) => {
    if (!input || accionCargando !== null) return
    const codigoTrim = codigo.trim()
    if (codigoTrim && !(await validarCodigoAntesDeArchivos(codigoTrim))) return
    input.click()
  }

  const agregarArchivos = async (lista: FileList | null) => {
    if (!lista?.length) return

    const codigoTrim = codigo.trim()
    if (!(await validarCodigoAntesDeArchivos(codigoTrim))) return

    const documentos: File[] = []
    const videos: File[] = []
    const rechazados: string[] = []
    for (const f of Array.from(lista)) {
      if (esDocumentoSellable(f.name)) documentos.push(f)
      else if (esAdjuntoSello(f.name)) videos.push(f)
      else rechazados.push(f.name)
    }
    if (rechazados.length) {
      setMensaje(
        `Se omitieron archivos no admitidos: ${rechazados.slice(0, 3).join(', ')}${rechazados.length > 3 ? '…' : ''}`
      )
      setMensajeTipo('warn')
    }
    if (documentos.length) {
      setArchivos((prev) => {
        const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]))
        for (const f of documentos) map.set(`${f.name}-${f.size}`, f)
        const merged = [...map.values()]
        if (merged.length > MAX_ARCHIVOS_LOTE_SELLO) {
          setMensaje(
            `Máximo ${MAX_ARCHIVOS_LOTE_SELLO} documentos por lote. Se mantienen los primeros ${MAX_ARCHIVOS_LOTE_SELLO}.`
          )
          setMensajeTipo('warn')
          return merged.slice(0, MAX_ARCHIVOS_LOTE_SELLO)
        }
        return merged
      })
    }
    if (videos.length) {
      setAdjuntos((prev) => {
        const map = new Map(
          prev.map((f) => {
            const rel =
              (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
            return [`${rel}-${f.size}`, f]
          })
        )
        for (const f of videos) {
          const rel =
            (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
          map.set(`${rel}-${f.size}`, f)
        }
        return [...map.values()]
      })
    }
    limpiarInputsArchivos()
  }

  const limpiarArchivos = () => {
    setArchivos([])
    setAdjuntos([])
    if (inputArchivosRef.current) inputArchivosRef.current.value = ''
    if (inputCarpetaRef.current) inputCarpetaRef.current.value = ''
  }

  const limpiarInputsArchivosMasivo = () => {
    if (inputArchivosMasivoRef.current) inputArchivosMasivoRef.current.value = ''
    if (inputCarpetaMasivoRef.current) inputCarpetaMasivoRef.current.value = ''
  }

  const validarSerieMasivo = useCallback(
    async (codigoBase: string, copias: number): Promise<boolean> => {
      const base = codigoBase.trim()
      if (!base) return true

      let codigos: string[]
      try {
        codigos = generarSerieCodigos(base, copias)
      } catch {
        setMensaje(MSG_FORMATO_CODIGO_CORRELATIVO)
        setMensajeTipo('error')
        return false
      }

      for (const c of codigos) {
        if (await codigoEstaDuplicado(c)) {
          mostrarCodigoDuplicado(`El código «${c}» ya está registrado. Usa otro correlativo inicial.`)
          limpiarInputsArchivosMasivo()
          return false
        }
      }
      return true
    },
    [codigoEstaDuplicado, mostrarCodigoDuplicado]
  )

  const abrirSelectorArchivosMasivo = async (input: HTMLInputElement | null) => {
    if (!input || accionCargando !== null) return
    const base = codigoMasivo.trim()
    if (!base) {
      setMensaje('Ingresa el código inicial antes de elegir archivos')
      setMensajeTipo('error')
      return
    }
    if (!(await validarSerieMasivo(base, cantidadCopias))) return
    input.click()
  }

  const agregarArchivosMasivo = async (lista: FileList | null) => {
    if (!lista?.length) return

    const base = codigoMasivo.trim()
    if (!(await validarSerieMasivo(base, cantidadCopias))) return

    const documentos: File[] = []
    const videos: File[] = []
    const rechazados: string[] = []
    for (const f of Array.from(lista)) {
      if (esDocumentoSellable(f.name)) documentos.push(f)
      else if (esAdjuntoSello(f.name)) videos.push(f)
      else rechazados.push(f.name)
    }
    if (rechazados.length) {
      setMensaje(
        `Se omitieron archivos no admitidos: ${rechazados.slice(0, 3).join(', ')}${rechazados.length > 3 ? '…' : ''}`
      )
      setMensajeTipo('warn')
    }
    if (documentos.length) {
      setArchivosMasivo((prev) => {
        const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]))
        for (const f of documentos) map.set(`${f.name}-${f.size}`, f)
        const merged = [...map.values()]
        if (merged.length > MAX_ARCHIVOS_LOTE_SELLO) {
          setMensaje(
            `Máximo ${MAX_ARCHIVOS_LOTE_SELLO} documentos por carpeta. Se mantienen los primeros ${MAX_ARCHIVOS_LOTE_SELLO}.`
          )
          setMensajeTipo('warn')
          return merged.slice(0, MAX_ARCHIVOS_LOTE_SELLO)
        }
        return merged
      })
    }
    if (videos.length) {
      setAdjuntosMasivo((prev) => {
        const map = new Map(
          prev.map((f) => {
            const rel =
              (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
            return [`${rel}-${f.size}`, f]
          })
        )
        for (const f of videos) {
          const rel =
            (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name
          map.set(`${rel}-${f.size}`, f)
        }
        return [...map.values()]
      })
    }
    limpiarInputsArchivosMasivo()
  }

  const limpiarArchivosMasivo = () => {
    setArchivosMasivo([])
    setAdjuntosMasivo([])
    limpiarInputsArchivosMasivo()
  }

  const agregarPdfsProteger = (lista: FileList | null) => {
    if (!lista?.length) return
    const validos: File[] = []
    const rechazados: string[] = []
    for (const f of Array.from(lista)) {
      if (f.name.toLowerCase().endsWith('.pdf')) validos.push(f)
      else rechazados.push(f.name)
    }
    if (rechazados.length) {
      setMensaje(
        `Solo PDF: se omitieron ${rechazados.slice(0, 3).join(', ')}${rechazados.length > 3 ? '…' : ''}`
      )
      setMensajeTipo('warn')
    }
    if (validos.length) {
      setPdfsProteger((prev) => {
        const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]))
        for (const f of validos) map.set(`${f.name}-${f.size}`, f)
        return [...map.values()]
      })
    }
    if (inputProtegerRef.current) inputProtegerRef.current.value = ''
    if (inputProtegerCarpetaRef.current) inputProtegerCarpetaRef.current.value = ''
  }

  const limpiarPdfsProteger = () => {
    setPdfsProteger([])
    if (inputProtegerRef.current) inputProtegerRef.current.value = ''
    if (inputProtegerCarpetaRef.current) inputProtegerCarpetaRef.current.value = ''
  }

  const protegerYDescargar = async () => {
    setMensaje(null)
    setResultado(null)
    if (pdfsProteger.length === 0) {
      setMensaje('Selecciona al menos un archivo PDF')
      setMensajeTipo('error')
      return
    }

    setAccionCargando('proteger')
    try {
      const form = new FormData()
      for (const f of pdfsProteger) form.append('archivos', f)

      const res = await fetch('/api/sello-documentos/proteger-pdf', {
        method: 'POST',
        body: form
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const det = Array.isArray(err.detalles)
          ? `\n${(err.detalles as string[]).join('\n')}`
          : ''
        throw new Error((err.error as string) || 'No se pudo proteger los PDF' + det)
      }

      const blob = await res.blob()
      const count = parseInt(res.headers.get('X-Protegidos-Count') ?? '1', 10)
      const contentType = res.headers.get('Content-Type') ?? ''
      const nombre =
        count === 1 && pdfsProteger.length === 1
          ? `${pdfsProteger[0].name.replace(/\.pdf$/i, '')}_protegido.pdf`
          : 'pdfs_protegidos.zip'
      descargarBlob(blob, nombre)

      const errHeader = res.headers.get('X-Proteger-Errores')
      let texto =
        count === 1 && contentType.includes('pdf')
          ? 'PDF protegido y descargado. Copia de texto restringida; impresión permitida.'
          : `Listo: ${count} PDF protegido(s) en ZIP. Copia de texto restringida; impresión permitida.`
      if (errHeader) {
        const errs = decodeURIComponent(errHeader).split(';;')
        texto += ` Algunos no se procesaron: ${errs.join('; ')}`
        setMensajeTipo('warn')
      } else {
        setMensajeTipo('ok')
      }
      setMensaje(texto)
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al proteger')
      setMensajeTipo('error')
    } finally {
      setAccionCargando(null)
    }
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
    if (archivos.length > MAX_ARCHIVOS_LOTE_SELLO) {
      setMensaje(`Máximo ${MAX_ARCHIVOS_LOTE_SELLO} archivos por lote`)
      setMensajeTipo('error')
      return
    }

    setAccionCargando('sellar')
    try {
      const codigoTrim = codigo.trim()

      if (!(await validarCodigoAntesDeArchivos(codigoTrim))) return

      const form = new FormData()
      form.set('codigoeducaplus', codigoTrim)
      for (const f of archivos) form.append('archivos', f)

      const res = await fetch('/api/sello-documentos/batch', {
        method: 'POST',
        body: form
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        if (res.status === 409 || err.codigoDuplicado) {
          mostrarCodigoDuplicado(err.error as string | undefined)
          return
        }
        const det = Array.isArray(err.detalles)
          ? `\n${(err.detalles as string[]).join('\n')}`
          : ''
        throw new Error((err.error as string) || 'No se pudo sellar los archivos' + det)
      }

      const zipSellado = await res.blob()
      const zipFinal =
        adjuntos.length > 0
          ? await fusionarZipConAdjuntos(zipSellado, adjuntos)
          : zipSellado
      const codigoSlug = codigo.trim().replace(/[^\w-]+/g, '_')
      descargarBlob(zipFinal, `documentos_sellados_${codigoSlug}.zip`)

      const sellados = parseInt(
        res.headers.get('X-Sellados-Count') ?? String(archivos.length),
        10
      )
      const codigoGuardar = codigo.trim()
      let registroOk = Boolean(res.headers.get('X-Registro-Sello-Id'))

      if (!registroOk) {
        const regRes = await fetch('/api/sello-documentos/registros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigoeducaplus: codigoGuardar,
            cantidadArchivos: sellados
          })
        })
        if (regRes.status === 409) {
          const regErr = await regRes.json().catch(() => ({}))
          mostrarCodigoDuplicado(regErr.error as string | undefined)
          return
        }
        registroOk = regRes.ok
      }

      const errHeader = res.headers.get('X-Sello-Errores')
      let texto = `Listo: ${sellados} documento(s) sellado(s) en el ZIP.`
      if (adjuntos.length > 0) {
        texto += ` Se incluyeron ${adjuntos.length} video(s) desde tu equipo (no se subieron al servidor).`
      }
      if (registroOk) {
        texto += ` El código «${codigoGuardar}» quedó registrado en el historial.`
      } else {
        texto += ' No se pudo guardar el código en el historial; intenta de nuevo.'
      }
      if (errHeader) {
        const errs = decodeURIComponent(errHeader).split(';;')
        texto += ` Algunos no se procesaron: ${errs.join('; ')}`
        setMensajeTipo(registroOk ? 'warn' : 'error')
      } else {
        setMensajeTipo(registroOk ? 'ok' : 'error')
      }
      setMensaje(texto)

      if (registroOk) {
        setRegistrosPage(1)
      }
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al sellar')
      setMensajeTipo('error')
    } finally {
      setAccionCargando(null)
    }
  }

  const sellarMasivoYDescargar = async () => {
    setMensaje(null)
    setResultado(null)

    const codigoBase = codigoMasivo.trim()
    if (!codigoBase) {
      setMensaje('El código inicial es obligatorio')
      setMensajeTipo('error')
      return
    }
    if (!Number.isFinite(cantidadCopias) || cantidadCopias < 1) {
      setMensaje('Indica cuántas copias correlativas necesitas')
      setMensajeTipo('error')
      return
    }
    if (cantidadCopias > MAX_COPIAS_MASIVO_SELLO) {
      setMensaje(`Máximo ${MAX_COPIAS_MASIVO_SELLO} copias por operación`)
      setMensajeTipo('error')
      return
    }
    if (archivosMasivo.length === 0) {
      setMensaje('Selecciona al menos un archivo Word (.docx) o PDF')
      setMensajeTipo('error')
      return
    }

    let codigos: string[]
    try {
      codigos = generarSerieCodigos(codigoBase, cantidadCopias)
    } catch {
      setMensaje(MSG_FORMATO_CODIGO_CORRELATIVO)
      setMensajeTipo('error')
      return
    }

    setAccionCargando('masivo')
    setProgresoMasivo({
      fase: 'subiendo',
      copiaActual: 0,
      totalCopias: codigos.length,
      codigoActual: '',
      copiasCompletadas: 0
    })

    let sessionId: string | null = null
    const erroresAcumulados: string[] = []
    let selladosTotal = 0
    let copiasDescargadas = 0

    try {
      const persistido = leerMasivoPersistido()
      const puedeReanudar = Boolean(
        persistido &&
          persistido.codigoBase === codigoBase &&
          persistido.cantidadCopias === cantidadCopias &&
          persistido.archivosCount === archivosMasivo.length
      )

      if (!puedeReanudar && !(await validarSerieMasivo(codigoBase, cantidadCopias))) return

      let inicioIdx = 0

      if (puedeReanudar && persistido) {
        sessionId = persistido.sessionId
        copiasDescargadas = persistido.codigosCompletados.length
        inicioIdx = codigos.findIndex((c) => !persistido.codigosCompletados.includes(c))
        if (inicioIdx < 0) inicioIdx = codigos.length
        if (inicioIdx > 0) {
          setMensaje(
            `Reanudando desde la copia ${inicioIdx + 1} de ${codigos.length}. Las ${inicioIdx} primeras ya se descargaron.`
          )
          setMensajeTipo('warn')
        }
      } else {
        limpiarMasivoPersistido()

        const formSesion = new FormData()
        for (const f of archivosMasivo) formSesion.append('archivos', f)
        for (const f of adjuntosMasivo) formSesion.append('adjuntos', f)

        const sesRes = await fetch('/api/sello-documentos/masivo/sesion/', {
          method: 'POST',
          body: formSesion,
          cache: 'no-store'
        })
        if (!sesRes.ok) {
          const err = await sesRes.json().catch(() => ({}))
          const det = Array.isArray(err.detalles)
            ? `\n${(err.detalles as string[]).join('\n')}`
            : ''
          throw new Error((err.error as string) || 'No se pudo preparar la carpeta' + det)
        }

        const sesData = (await sesRes.json()) as { sessionId?: string }
        sessionId = sesData.sessionId ?? null
        if (!sessionId) throw new Error('No se pudo iniciar la sesión de sellado')

        guardarMasivoPersistido({
          sessionId,
          codigoBase,
          cantidadCopias,
          archivosCount: archivosMasivo.length,
          codigosCompletados: []
        })
      }

      for (let i = inicioIdx; i < codigos.length; i++) {
        const codigo = codigos[i]
        const copiaNum = i + 1

        setProgresoMasivo({
          fase: 'sellando',
          copiaActual: copiaNum,
          totalCopias: codigos.length,
          codigoActual: codigo,
          copiasCompletadas: i
        })

        const { res: copiaRes, data: copiaData } = await prepararCopiaMasivo(
          sessionId,
          codigo
        )

        if (!copiaRes.ok) {
          const err = await copiaRes.json().catch(() => ({}))
          if (copiaRes.status === 409 || err.codigoDuplicado) {
            mostrarCodigoDuplicado(
              (err.error as string | undefined) ??
                `El código «${codigo}» ya está registrado.`
            )
            return
          }
          if (copiaRes.status === 410) {
            throw new Error('La sesión expiró. Vuelve a intentar el sellado masivo.')
          }
          const det = Array.isArray(err.detalles)
            ? `\n${(err.detalles as string[]).join('\n')}`
            : ''
          throw new Error(
            (err.error as string) || `No se pudo sellar la copia ${codigo}` + det
          )
        }

        setProgresoMasivo({
          fase: 'descargando',
          copiaActual: copiaNum,
          totalCopias: codigos.length,
          codigoActual: codigo,
          copiasCompletadas: i
        })

        const codigoSlug = codigo.replace(/[^\w-]+/g, '_')
        descargarCopiaMasivoDesdeServidor(
          sessionId,
          codigo,
          `sellado_${codigoSlug}.zip`
        )
        copiasDescargadas++
        await esperar(2500)

        if (sessionId) {
          const base = leerMasivoPersistido()
          guardarMasivoPersistido({
            sessionId,
            codigoBase,
            cantidadCopias,
            archivosCount: archivosMasivo.length,
            codigosCompletados: [
              ...new Set([...(base?.codigosCompletados ?? []), codigo])
            ]
          })
        }

        selladosTotal += copiaData?.sellados ?? archivosMasivo.length

        if (copiaData?.errores?.length) {
          erroresAcumulados.push(...copiaData.errores)
        }

        setProgresoMasivo({
          fase: 'descargando',
          copiaActual: copiaNum,
          totalCopias: codigos.length,
          codigoActual: codigo,
          copiasCompletadas: copiaNum
        })
      }

      let texto = `Listo: ${codigos.length} copia(s) descargada(s) (${codigos[0]} → ${codigos[codigos.length - 1]}). ${selladosTotal} documento(s) sellado(s) en total.`
      if (adjuntosMasivo.length > 0) {
        texto += ` Cada ZIP incluye ${adjuntosMasivo.length} video(s) empaquetado(s) en el servidor.`
      }
      texto += ' Todos los códigos quedaron registrados en el historial.'

      if (erroresAcumulados.length > 0) {
        texto += ` Algunos archivos no se procesaron: ${erroresAcumulados.slice(0, 5).join('; ')}`
        if (erroresAcumulados.length > 5) texto += '…'
        setMensajeTipo('warn')
      } else {
        setMensajeTipo('ok')
      }
      setMensaje(texto)
      setRegistrosPage(1)
      limpiarMasivoPersistido()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error en sellado masivo'
      if (msg === 'Failed to fetch' || msg.includes('fetch')) {
        setMensaje(
          copiasDescargadas > 0
            ? `Error de conexión al recibir la copia ${copiasDescargadas + 1}. Ya se descargaron ${copiasDescargadas} copia(s). Vuelve a pulsar «Sellar masivo» con los mismos datos (misma carpeta y código inicial): continuará desde donde quedó.`
            : 'Error de conexión con el servidor al recibir el ZIP. Comprueba tu red e inténtalo de nuevo.'
        )
      } else {
        setMensaje(
          copiasDescargadas > 0
            ? `${msg} Se descargaron ${copiasDescargadas} copia(s) antes del fallo.`
            : msg
        )
      }
      setMensajeTipo('error')
    } finally {
      if (sessionId && copiasDescargadas === codigos.length) {
        try {
          await fetch(
            `/api/sello-documentos/masivo/sesion/?sessionId=${encodeURIComponent(sessionId)}`,
            { method: 'DELETE' }
          )
        } catch {
          /* ignorar: las copias selladas siguen en caché de descarga 30 min */
        }
      }
      setProgresoMasivo(null)
      setAccionCargando(null)
    }
  }

  const cargarRegistros = useCallback(async () => {
    setCargandoRegistros(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(registrosPage))
      if (filtroCodigo.trim()) params.set('codigo', filtroCodigo.trim())
      if (filtroFechaDesde) params.set('fechaDesde', filtroFechaDesde)
      if (filtroFechaHasta) params.set('fechaHasta', filtroFechaHasta)

      const res = await fetch(`/api/sello-documentos/registros?${params}`)
      const data = (await res.json()) as RegistrosResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Error al cargar registros')

      setRegistros(data.items)
      setRegistrosTotal(data.total)
      setRegistrosTotalPages(data.totalPages)
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'Error al cargar registros')
      setMensajeTipo('error')
    } finally {
      setCargandoRegistros(false)
    }
  }, [registrosPage, filtroCodigo, filtroFechaDesde, filtroFechaHasta])

  useEffect(() => {
    if (tab !== 'registros') return
    const t = setTimeout(() => {
      void cargarRegistros()
    }, 350)
    return () => clearTimeout(t)
  }, [tab, cargarRegistros])

  const limpiarFiltrosRegistros = () => {
    setFiltroCodigo('')
    setFiltroFechaDesde('')
    setFiltroFechaHasta('')
    setRegistrosPage(1)
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
      const data = await verificarSelloEnArchivo(archivoVerificar)

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
  const sellandoMasivo = accionCargando === 'masivo'
  const verificando = accionCargando === 'verificar'
  const protegiendo = accionCargando === 'proteger'
  const procesando = accionCargando !== null

  let previewCodigosMasivo: string[] | null = null
  try {
    if (codigoMasivo.trim() && cantidadCopias >= 1) {
      previewCodigosMasivo = generarSerieCodigos(codigoMasivo.trim(), cantidadCopias)
    }
  } catch {
    previewCodigosMasivo = null
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div
          className={`${styles.container} ${tab === 'registros' ? styles.containerWide : ''}`}
        >
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
                aria-selected={tab === 'masivo'}
                className={`${styles.tab} ${tab === 'masivo' ? styles.tabActive : ''}`}
                onClick={() => {
                  if (procesando) return
                  setTab('masivo')
                  setMensaje(null)
                }}
                disabled={procesando}
              >
                Sellar masivo
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
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'proteger'}
                className={`${styles.tab} ${tab === 'proteger' ? styles.tabActive : ''}`}
                onClick={() => {
                  if (procesando) return
                  setTab('proteger')
                  setMensaje(null)
                }}
                disabled={procesando}
              >
                Proteger PDF
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === 'registros'}
                className={`${styles.tab} ${tab === 'registros' ? styles.tabActive : ''}`}
                onClick={() => {
                  if (procesando) return
                  setTab('registros')
                  setMensaje(null)
                }}
                disabled={procesando}
              >
                Registro de códigos
              </button>
            </div>

            {tab === 'sellar' ? (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Ingresa el código, sube documentos (.docx / .pdf) o una carpeta entera (máximo{' '}
                  {MAX_ARCHIVOS_LOTE_SELLO} documentos por lote). Los videos (.mp4, etc.) de la
                  misma carpeta se incluyen en el ZIP final desde tu equipo, sin subirlos al
                  servidor.
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
                      onClick={() => void abrirSelectorArchivos(inputArchivosRef.current)}
                    >
                      Elegir archivos
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => void abrirSelectorArchivos(inputCarpetaRef.current)}
                    >
                      Elegir carpeta
                    </button>
                    {(archivos.length > 0 || adjuntos.length > 0) && (
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
                    accept=".docx,.pdf,.mp4,.mov,.avi,.mkv,.webm,.m4v,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*"
                    multiple
                    onChange={(e) => void agregarArchivos(e.target.files)}
                  />
                  <input
                    ref={inputCarpetaRef}
                    type="file"
                    className={styles.fileInput}
                    multiple
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => void agregarArchivos(e.target.files)}
                  />
                </div>

                {archivos.length > 0 && (
                  <>
                    <p className={styles.fileListTitle}>
                      Documentos a sellar ({archivos.length})
                    </p>
                    <ul className={styles.fileList}>
                      {archivos.map((f) => (
                        <li key={`${f.name}-${f.size}`}>
                          <span className={styles.fileName}>{f.name}</span>
                          <span>{formatBytes(f.size)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {adjuntos.length > 0 && (
                  <>
                    <p className={styles.fileListTitle}>
                      Videos incluidos localmente ({adjuntos.length})
                    </p>
                    <ul className={`${styles.fileList} ${styles.fileListAdjuntos}`}>
                      {adjuntos.map((f) => {
                        const rel =
                          (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
                          f.name
                        return (
                          <li key={`${rel}-${f.size}`}>
                            <span className={styles.fileName}>{rel}</span>
                            <span>{formatBytes(f.size)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </>
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
            ) : tab === 'masivo' ? (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Sube la carpeta una sola vez e indica cuántas copias correlativas necesitas. El
                  servidor sellará con códigos incrementales (ej. <strong>E26-65COM-U4</strong>,{' '}
                  <strong>E26-66COM-U4</strong>…). Cada copia se descarga en un ZIP aparte en cuanto
                  esté lista. Máximo {MAX_COPIAS_MASIVO_SELLO} copias. Los videos se suben una sola
                  vez y el servidor los incluye en cada copia.
                </p>

                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label} htmlFor="codigo-masivo">
                      Código inicial (con correlativo) *
                    </label>
                    <input
                      id="codigo-masivo"
                      className={styles.input}
                      placeholder="Ej. E26-65COM-U4"
                      value={codigoMasivo}
                      onChange={(e) => setCodigoMasivo(e.target.value)}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="cantidad-copias">
                      Cantidad de copias *
                    </label>
                    <input
                      id="cantidad-copias"
                      className={styles.input}
                      type="number"
                      min={1}
                      max={MAX_COPIAS_MASIVO_SELLO}
                      value={cantidadCopias}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10)
                        setCantidadCopias(Number.isFinite(n) ? n : 1)
                      }}
                    />
                  </div>
                </div>

                {previewCodigosMasivo && previewCodigosMasivo.length > 0 && (
                  <p className={styles.previewCodigos}>
                    Se generarán:{' '}
                    {previewCodigosMasivo.length <= 4
                      ? previewCodigosMasivo.join(', ')
                      : `${previewCodigosMasivo.slice(0, 2).join(', ')} … ${previewCodigosMasivo[previewCodigosMasivo.length - 1]} (${previewCodigosMasivo.length} códigos)`}
                  </p>
                )}

                <div className={styles.dropzone}>
                  <p>Arrastra la carpeta o archivos aquí</p>
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => void abrirSelectorArchivosMasivo(inputArchivosMasivoRef.current)}
                    >
                      Elegir archivos
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => void abrirSelectorArchivosMasivo(inputCarpetaMasivoRef.current)}
                    >
                      Elegir carpeta
                    </button>
                    {(archivosMasivo.length > 0 || adjuntosMasivo.length > 0) && (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={limpiarArchivosMasivo}
                      >
                        Limpiar lista
                      </button>
                    )}
                  </div>
                  <input
                    ref={inputArchivosMasivoRef}
                    type="file"
                    className={styles.fileInput}
                    accept=".docx,.pdf,.mp4,.mov,.avi,.mkv,.webm,.m4v,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/*"
                    multiple
                    onChange={(e) => void agregarArchivosMasivo(e.target.files)}
                  />
                  <input
                    ref={inputCarpetaMasivoRef}
                    type="file"
                    className={styles.fileInput}
                    multiple
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => void agregarArchivosMasivo(e.target.files)}
                  />
                </div>

                {archivosMasivo.length > 0 && (
                  <>
                    <p className={styles.fileListTitle}>
                      Documentos a sellar ({archivosMasivo.length})
                    </p>
                    <ul className={styles.fileList}>
                      {archivosMasivo.map((f) => (
                        <li key={`${f.name}-${f.size}`}>
                          <span className={styles.fileName}>{f.name}</span>
                          <span>{formatBytes(f.size)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {adjuntosMasivo.length > 0 && (
                  <>
                    <p className={styles.fileListTitle}>
                      Videos en cada copia ({adjuntosMasivo.length})
                    </p>
                    <ul className={`${styles.fileList} ${styles.fileListAdjuntos}`}>
                      {adjuntosMasivo.map((f) => {
                        const rel =
                          (f as File & { webkitRelativePath?: string }).webkitRelativePath ||
                          f.name
                        return (
                          <li key={`${rel}-${f.size}`}>
                            <span className={styles.fileName}>{rel}</span>
                            <span>{formatBytes(f.size)}</span>
                          </li>
                        )
                      })}
                    </ul>
                  </>
                )}

                <button
                  type="button"
                  className={`${styles.btnPrimary} ${sellandoMasivo ? styles.btnPrimaryLoading : ''}`}
                  disabled={procesando}
                  aria-busy={sellandoMasivo}
                  onClick={() => void sellarMasivoYDescargar()}
                >
                  {sellandoMasivo ? (
                    <BtnLoader label="Sellando copias correlativas…" />
                  ) : (
                    'Sellar masivo y descargar ZIP'
                  )}
                </button>
              </div>
            ) : tab === 'verificar' ? (
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
            ) : tab === 'proteger' ? (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Cada página se convierte en imagen y el PDF queda con permisos que bloquean copiar
                  y extraer texto (sin contraseña al abrir). La impresión sigue permitida. Algunos
                  programas muy avanzados u OCR pueden intentar recuperar contenido; para uso
                  habitual en Chrome y Word suele ser suficiente.
                </p>

                <div className={styles.dropzone}>
                  <p>Sube uno o varios PDF, o una carpeta con PDF</p>
                  <div className={styles.fileActions}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => inputProtegerRef.current?.click()}
                      disabled={procesando}
                    >
                      Elegir PDF
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => inputProtegerCarpetaRef.current?.click()}
                      disabled={procesando}
                    >
                      Elegir carpeta
                    </button>
                    {pdfsProteger.length > 0 && (
                      <button
                        type="button"
                        className={styles.btnSecondary}
                        onClick={limpiarPdfsProteger}
                        disabled={procesando}
                      >
                        Limpiar lista
                      </button>
                    )}
                  </div>
                  <input
                    ref={inputProtegerRef}
                    type="file"
                    className={styles.fileInput}
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={(e) => agregarPdfsProteger(e.target.files)}
                  />
                  <input
                    ref={inputProtegerCarpetaRef}
                    type="file"
                    className={styles.fileInput}
                    multiple
                    {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                    onChange={(e) => agregarPdfsProteger(e.target.files)}
                  />
                </div>

                {pdfsProteger.length > 0 && (
                  <ul className={styles.fileList}>
                    {pdfsProteger.map((f) => (
                      <li key={`${f.name}-${f.size}`}>
                        <span>{f.name}</span>
                        <span>{formatBytes(f.size)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className={`${styles.btnPrimary} ${styles.btnProtect} ${protegiendo ? styles.btnPrimaryLoading : ''}`}
                  disabled={procesando || pdfsProteger.length === 0}
                  aria-busy={protegiendo}
                  onClick={() => void protegerYDescargar()}
                >
                  {protegiendo ? (
                    <BtnLoader label="Protegiendo PDF…" />
                  ) : (
                    'Proteger y descargar'
                  )}
                </button>
              </div>
            ) : (
              <div className={styles.panel} role="tabpanel">
                <p className={styles.hint}>
                  Historial de códigos sellados con fecha y hora. Cada vez que se sella un lote
                  exitosamente se guarda un registro en la base de datos.
                </p>

                <div className={styles.filtersRow}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="filtro-codigo">
                      Buscar código
                    </label>
                    <input
                      id="filtro-codigo"
                      className={styles.input}
                      placeholder="Ej. 123 o parte del código"
                      value={filtroCodigo}
                      onChange={(e) => {
                        setFiltroCodigo(e.target.value)
                        setRegistrosPage(1)
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="filtro-desde">
                      Desde
                    </label>
                    <input
                      id="filtro-desde"
                      type="date"
                      className={styles.input}
                      value={filtroFechaDesde}
                      onChange={(e) => {
                        setFiltroFechaDesde(e.target.value)
                        setRegistrosPage(1)
                      }}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="filtro-hasta">
                      Hasta
                    </label>
                    <input
                      id="filtro-hasta"
                      type="date"
                      className={styles.input}
                      value={filtroFechaHasta}
                      min={filtroFechaDesde || undefined}
                      onChange={(e) => {
                        setFiltroFechaHasta(e.target.value)
                        setRegistrosPage(1)
                      }}
                    />
                  </div>
                  <div className={styles.filtersActions}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => void cargarRegistros()}
                      disabled={cargandoRegistros}
                    >
                      {cargandoRegistros ? 'Cargando…' : 'Actualizar'}
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={limpiarFiltrosRegistros}
                      disabled={cargandoRegistros}
                    >
                      Limpiar filtros
                    </button>
                  </div>
                </div>

                <div className={styles.tableWrap}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Código EducaPlus</th>
                        <th>Fecha y hora</th>
                        <th>Archivos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cargandoRegistros && registros.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyState}>
                            Cargando registros…
                          </td>
                        </tr>
                      ) : registros.length === 0 ? (
                        <tr>
                          <td colSpan={4} className={styles.emptyState}>
                            No hay registros con los filtros actuales.
                          </td>
                        </tr>
                      ) : (
                        registros.map((r, i) => (
                          <tr key={r.id}>
                            <td>{(registrosPage - 1) * 20 + i + 1}</td>
                            <td className={styles.codigoCell}>{r.codigoeducaplus}</td>
                            <td>{formatFechaRegistro(r.fecha)}</td>
                            <td>{r.cantidadArchivos}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <span className={styles.paginationInfo}>
                    {registrosTotal === 0
                      ? 'Sin resultados'
                      : `${registrosTotal} registro(s) · página ${registrosPage} de ${registrosTotalPages}`}
                  </span>
                  <div className={styles.paginationBtns}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      disabled={cargandoRegistros || registrosPage <= 1}
                      onClick={() => setRegistrosPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      disabled={
                        cargandoRegistros ||
                        registrosPage >= registrosTotalPages ||
                        registrosTotal === 0
                      }
                      onClick={() => setRegistrosPage((p) => p + 1)}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
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

      {modalAviso && (
        <div
          className={styles.modalOverlay}
          role="presentation"
          onClick={cerrarModalAviso}
        >
          <div
            className={styles.modalDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sello-modal-title"
            aria-describedby="sello-modal-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div
                className={`${styles.modalIcon} ${
                  modalAviso.tipo === 'error'
                    ? styles.modalIconError
                    : modalAviso.tipo === 'warn'
                      ? styles.modalIconWarn
                      : styles.modalIconInfo
                }`}
                aria-hidden
              >
                {modalAviso.tipo === 'error' ? '!' : modalAviso.tipo === 'warn' ? '⚠' : 'i'}
              </div>
              <div className={styles.modalTitles}>
                <h2 id="sello-modal-title" className={styles.modalTitle}>
                  {modalAviso.titulo}
                </h2>
                <p className={styles.modalSubtitle}>EducaPlus · Sello de documentos</p>
              </div>
            </div>
            <div className={styles.modalBody}>
              <p id="sello-modal-desc" className={styles.modalMessage}>
                {modalAviso.mensaje}
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                ref={modalCerrarRef}
                type="button"
                className={`${styles.modalBtnPrimary} ${
                  modalAviso.tipo === 'error' ? styles.modalBtnDanger : ''
                }`}
                onClick={cerrarModalAviso}
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

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
              {sellando
                ? 'Sellando documentos…'
                : sellandoMasivo
                  ? 'Sellado masivo en curso…'
                  : protegiendo
                    ? 'Protegiendo PDF…'
                    : 'Verificando sello…'}
            </h2>
            <p className={styles.loadingText}>
              {sellando
                ? adjuntos.length > 0
                  ? `Sellando ${archivos.length} documento(s) y empaquetando ${adjuntos.length} video(s) localmente…`
                  : `Procesando ${archivos.length} documento(s). Se descargará el ZIP al terminar.`
                : sellandoMasivo && progresoMasivo
                  ? progresoMasivo.fase === 'subiendo'
                    ? `Subiendo ${archivosMasivo.length} documento(s) al servidor (una sola vez)…`
                    : progresoMasivo.fase === 'sellando'
                      ? `Copia ${progresoMasivo.copiaActual} de ${progresoMasivo.totalCopias}: sellando «${progresoMasivo.codigoActual}» (${archivosMasivo.length} archivos)…`
                      : `Copia ${progresoMasivo.copiaActual} de ${progresoMasivo.totalCopias}: descargando «${progresoMasivo.codigoActual}»…`
                  : sellandoMasivo
                    ? `Procesando sellado masivo de ${cantidadCopias} copia(s)…`
                    : protegiendo
                      ? `Rasterizando ${pdfsProteger.length} PDF. Puede tardar según el tamaño.`
                      : 'Leyendo las propiedades del archivo. Un momento…'}
            </p>
            {sellandoMasivo && progresoMasivo && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar} aria-hidden>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${calcularProgresoMasivoPct(progresoMasivo)}%` }}
                  />
                </div>
                <p className={styles.progressLabel}>
                  {progresoMasivo.copiasCompletadas} de {progresoMasivo.totalCopias} copias
                  completadas ({calcularProgresoMasivoPct(progresoMasivo)}%)
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
