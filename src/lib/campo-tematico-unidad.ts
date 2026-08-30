/** Texto de campo temático desde una unidad del plan anual (string o lista). */
export function textoCampoTematicoDesdeUnidadPlan(unidad: {
  campoTematico?: unknown
  camposTematicos?: unknown
} | null | undefined): string {
  if (!unidad) return ''

  if (Array.isArray(unidad.camposTematicos) && unidad.camposTematicos.length > 0) {
    return unidad.camposTematicos
      .map((t) => String(t).trim())
      .filter(Boolean)
      .map((t) => (t.startsWith('-') ? t : `- ${t}`))
      .join('\n')
  }

  return String(unidad.campoTematico ?? '').trim()
}
