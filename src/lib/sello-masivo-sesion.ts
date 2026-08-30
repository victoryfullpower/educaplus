import { randomUUID } from 'crypto'

export type ArchivoSesionMasivo = {
  nombre: string
  buffer: Buffer
}

export type CopiaSelladaSesion = {
  zipBuffer: Buffer
  sellados: number
  adjuntos: number
  registroId: number
  errores: string[]
}

type SesionMasivo = {
  archivos: ArchivoSesionMasivo[]
  adjuntos: ArchivoSesionMasivo[]
  createdAt: number
}

const TTL_MS = 30 * 60 * 1000
const sesiones = new Map<string, SesionMasivo>()
const descargasCopias = new Map<
  string,
  { copia: CopiaSelladaSesion; createdAt: number }
>()

function claveCodigo(codigo: string): string {
  return codigo.trim().toLowerCase()
}

function claveDescarga(sessionId: string, codigo: string): string {
  return `${sessionId}::${claveCodigo(codigo)}`
}

function limpiarExpiradas(): void {
  const ahora = Date.now()
  for (const [id, sesion] of sesiones) {
    if (ahora - sesion.createdAt > TTL_MS) sesiones.delete(id)
  }
  for (const [clave, item] of descargasCopias) {
    if (ahora - item.createdAt > TTL_MS) descargasCopias.delete(clave)
  }
}

export function crearSesionMasivo(
  archivos: ArchivoSesionMasivo[],
  adjuntos: ArchivoSesionMasivo[] = []
): string {
  limpiarExpiradas()
  const id = randomUUID()
  sesiones.set(id, { archivos, adjuntos, createdAt: Date.now() })
  return id
}

export function obtenerSesionMasivo(id: string): SesionMasivo | null {
  limpiarExpiradas()
  const sesion = sesiones.get(id)
  if (!sesion) return null
  if (Date.now() - sesion.createdAt > TTL_MS) {
    sesiones.delete(id)
    return null
  }
  return sesion
}

export function obtenerCopiaSelladaSesion(
  sessionId: string,
  codigo: string
): CopiaSelladaSesion | null {
  limpiarExpiradas()
  const item = descargasCopias.get(claveDescarga(sessionId, codigo))
  if (!item) return null
  if (Date.now() - item.createdAt > TTL_MS) {
    descargasCopias.delete(claveDescarga(sessionId, codigo))
    return null
  }
  return item.copia
}

export function guardarCopiaSelladaSesion(
  sessionId: string,
  codigo: string,
  copia: CopiaSelladaSesion
): void {
  descargasCopias.set(claveDescarga(sessionId, codigo), {
    copia,
    createdAt: Date.now()
  })
}

/** Libera buffers de subida; las copias ya selladas siguen disponibles para descarga. */
export function eliminarSesionMasivo(id: string): void {
  sesiones.delete(id)
}
