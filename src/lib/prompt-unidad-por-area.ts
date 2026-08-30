import fs from 'fs'
import path from 'path'

/** Carpeta de prompts Word por área (nombre del archivo ≈ nombre del área). */
export const PROMPTS_UA_DIR = path.join(process.cwd(), 'templates', 'prompstUA')

/** Fallback mientras no exista el .docx del área. */
export const PROMPT_UNIDAD_FALLBACK = path.join(
  process.cwd(),
  'templates',
  'PROMT_UNIDAD DE APRENDIZAJE.docx'
)

export function normalizarNombreAreaPrompt(valor: string): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\.(docx|doc)$/i, '')
    .replace(/[()[\]{}]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Extrae el nombre visible del área desde formData
 * (puede venir como "12|Comunicación" o solo "Comunicación").
 */
export function nombreAreaDesdeForm(formData: {
  area?: unknown
  areaNombre?: unknown
}): string {
  const raw = String(formData.areaNombre ?? formData.area ?? '').trim()
  if (!raw) return ''
  if (raw.includes('|')) {
    const partes = raw.split('|')
    return (partes[1] || partes[0] || '').trim()
  }
  return raw
}

function listarPromptsUa(): string[] {
  if (!fs.existsSync(PROMPTS_UA_DIR)) return []
  return fs
    .readdirSync(PROMPTS_UA_DIR)
    .filter((name) => name.toLowerCase().endsWith('.docx') && !name.startsWith('~$'))
}

/**
 * Resuelve el Word del prompt según el área.
 * Busca en templates/prompstUA un archivo cuyo nombre coincida con el área
 * (exacto, normalizado o por contención). Si no hay match, usa el prompt global.
 */
export function resolverPromptUnidadPorArea(areaNombre: string): {
  path: string
  matchedFile: string | null
  usedFallback: boolean
} {
  const areaNorm = normalizarNombreAreaPrompt(areaNombre)
  const files = listarPromptsUa()

  if (areaNorm && files.length > 0) {
    const exact = files.find(
      (f) => normalizarNombreAreaPrompt(f) === areaNorm
    )
    if (exact) {
      return {
        path: path.join(PROMPTS_UA_DIR, exact),
        matchedFile: exact,
        usedFallback: false
      }
    }

    // Contención: "Ciencias Sociales" ↔ "Ciencias Sociales (CCSS)"
    const porContencion = files.find((f) => {
      const fileNorm = normalizarNombreAreaPrompt(f)
      return fileNorm.includes(areaNorm) || areaNorm.includes(fileNorm)
    })
    if (porContencion) {
      return {
        path: path.join(PROMPTS_UA_DIR, porContencion),
        matchedFile: porContencion,
        usedFallback: false
      }
    }

    // Tokens significativos (≥3 chars) todos presentes en el nombre del archivo
    const tokens = areaNorm.split(' ').filter((t) => t.length >= 3)
    if (tokens.length > 0) {
      const porTokens = files.find((f) => {
        const fileNorm = normalizarNombreAreaPrompt(f)
        return tokens.every((t) => fileNorm.includes(t))
      })
      if (porTokens) {
        return {
          path: path.join(PROMPTS_UA_DIR, porTokens),
          matchedFile: porTokens,
          usedFallback: false
        }
      }
    }
  }

  if (fs.existsSync(PROMPT_UNIDAD_FALLBACK)) {
    return {
      path: PROMPT_UNIDAD_FALLBACK,
      matchedFile: null,
      usedFallback: true
    }
  }

  return { path: '', matchedFile: null, usedFallback: true }
}
