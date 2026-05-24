/** Clave de pestaña en /home (nombre de área o fallback por id). */
export function claveAreaTab(area?: string | null, areaId?: string | null): string {
  const nombre = area?.trim()
  if (nombre) return nombre
  if (areaId) return `Área #${areaId}`
  return 'Sin área'
}

export function linkHomeConAreaTab(area?: string | null, areaId?: string | null): string {
  const clave = claveAreaTab(area, areaId)
  return `/home?area=${encodeURIComponent(clave)}`
}
