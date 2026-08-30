import { respuestaPromptABloques } from '@/lib/respuesta-prompt-word'

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * HTML de la respuesta GPT tal cual: texto escapado sin reinterpretar markdown,
 * tablas detectadas como tablas HTML.
 */
export function promptRespuestaToHtml(markdown: string): string {
  const raw = String(markdown ?? '').replace(/\r\n/g, '\n').trim()
  if (!raw) return '<p><em>Sin contenido</em></p>'

  const bloques = respuestaPromptABloques(raw)
  const parts: string[] = []

  for (const bloque of bloques) {
    if (bloque.tipo === 'parrafo') {
      parts.push(`<p>${escapeHtml(bloque.texto)}</p>`)
      continue
    }

    const numCols = Math.max(...bloque.filas.map((f) => f.length), 1)
    const filasHtml = bloque.filas
      .map((fila, idx) => {
        const tag = idx === 0 ? 'th' : 'td'
        const celdas = Array.from({ length: numCols }, (_, i) => {
          return `<${tag}>${escapeHtml(fila[i] ?? '')}</${tag}>`
        }).join('')
        return `<tr>${celdas}</tr>`
      })
      .join('')

    parts.push(`<table><tbody>${filasHtml}</tbody></table>`)
  }

  return parts.join('\n')
}
