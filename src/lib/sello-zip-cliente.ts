import JSZip from 'jszip'

export type AdjuntoPrecargado = {
  ruta: string
  buffer: ArrayBuffer
}

function rutaAdjuntoEnZip(archivo: File): string {
  const rel = (archivo as File & { webkitRelativePath?: string }).webkitRelativePath
  if (rel?.trim()) return rel.replace(/\\/g, '/')
  return archivo.name
}

export async function precargarAdjuntosSello(
  adjuntos: File[]
): Promise<AdjuntoPrecargado[]> {
  const out: AdjuntoPrecargado[] = []
  for (const archivo of adjuntos) {
    out.push({
      ruta: rutaAdjuntoEnZip(archivo),
      buffer: await archivo.arrayBuffer()
    })
  }
  return out
}

/** Fusiona el ZIP devuelto por el servidor con adjuntos locales (videos, etc.) sin subirlos. */
export async function fusionarZipConAdjuntos(
  zipSellado: Blob,
  adjuntos: File[]
): Promise<Blob> {
  if (adjuntos.length === 0) return zipSellado
  const precargados = await precargarAdjuntosSello(adjuntos)
  return fusionarZipConAdjuntosPrecargados(zipSellado, precargados)
}

async function fusionarZipConAdjuntosPrecargados(
  zipSellado: Blob,
  adjuntos: AdjuntoPrecargado[]
): Promise<Blob> {
  const zip = await JSZip.loadAsync(zipSellado)

  for (const { ruta, buffer } of adjuntos) {
    zip.file(ruta, buffer, { compression: 'STORE' })
  }

  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}

/** Añade adjuntos locales dentro de cada carpeta de código del ZIP masivo. */
export async function fusionarZipMasivoConAdjuntos(
  zipSellado: Blob,
  adjuntos: File[] | AdjuntoPrecargado[]
): Promise<Blob> {
  if (adjuntos.length === 0) return zipSellado

  const precargados =
    adjuntos[0] instanceof File
      ? await precargarAdjuntosSello(adjuntos as File[])
      : (adjuntos as AdjuntoPrecargado[])

  const zip = await JSZip.loadAsync(zipSellado)
  const carpetas = new Set<string>()

  zip.forEach((rutaRelativa) => {
    const partes = rutaRelativa.split('/').filter(Boolean)
    if (partes.length > 1) carpetas.add(partes[0])
  })

  for (const carpeta of carpetas) {
    for (const { ruta, buffer } of precargados) {
      zip.file(`${carpeta}/${ruta}`, buffer, { compression: 'STORE' })
    }
  }

  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
