/**
 * Etiqueta guía del prompt actual:
 * "Título de la unidad de aprendizaje:" (+ título en la línea siguiente)
 */
const ETIQUETA_TITULO_LINEA =
  /^t[ií]tulo\s+de\s+la\s+unidad(?:\s+de\s+aprendizaje)?\s*:\s*(.*)$/i

/** Prefijos que la IA a veces repite en la línea del título; no van al documento. */
const PREFIJOS_TITULO_A_QUITAR = [
  /^t[ií]tulo\s+de\s+la\s+unidad(?:\s+de\s+aprendizaje)?\s*:\s*/i,
  /^unidad\s+de\s+aprendizaje\s*:\s*/i,
  /^t[ií]tulo\s*:\s*/i
]

function normalizarEspacios(texto: string): string {
  return texto
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function indiceSiguienteLineaConTexto(lineas: string[], desde: number): number {
  let i = desde
  while (i < lineas.length && !lineas[i].trim()) i++
  return i
}

/** Quita etiquetas tipo "Unidad de aprendizaje:" del texto del título. */
export function limpiarPrefijoTitulo(titulo: string): string {
  let t = titulo.trim()
  let cambio = true
  while (cambio) {
    cambio = false
    for (const prefijo of PREFIJOS_TITULO_A_QUITAR) {
      const sinPrefijo = t.replace(prefijo, '').trim()
      if (sinPrefijo !== t) {
        t = sinPrefijo
        cambio = true
      }
    }
  }
  return t
}

/**
 * Extrae título y situación significativa de la respuesta de la IA.
 *
 * Formato esperado:
 *   Título de la unidad de aprendizaje:
 *   [título en esta línea]
 *
 *   [situación significativa desde aquí...]
 */
export function parseTituloYSituacionDesdeRespuestaIA(
  respuestaIA: string,
  tituloFallback = 'Situación Significativa'
): { titulo: string; situacionSignificativa: string } {
  const raw = respuestaIA.trim()
  if (!raw) {
    return { titulo: tituloFallback, situacionSignificativa: '' }
  }

  const lineas = raw.split(/\r?\n/)

  for (let i = 0; i < lineas.length; i++) {
    const match = lineas[i].trim().match(ETIQUETA_TITULO_LINEA)
    if (!match) continue

    let titulo = (match[1] || '').trim()
    let idxCuerpo: number

    if (titulo) {
      idxCuerpo = indiceSiguienteLineaConTexto(lineas, i + 1)
    } else {
      const idxTitulo = indiceSiguienteLineaConTexto(lineas, i + 1)
      if (idxTitulo >= lineas.length) {
        continue
      }
      titulo = lineas[idxTitulo].trim()
      idxCuerpo = indiceSiguienteLineaConTexto(lineas, idxTitulo + 1)
    }

    const situacionSignificativa = normalizarEspacios(
      lineas
        .slice(idxCuerpo)
        .map((l) => l.trim())
        .filter(Boolean)
        .join(' ')
    )

    if (titulo) {
      return {
        titulo: limpiarPrefijoTitulo(titulo),
        situacionSignificativa
      }
    }
  }

  // Sin etiqueta: primera línea significativa como título, resto como situación
  const lineasSignificativas = lineas.map((l) => l.trim()).filter((l) => l.length > 0)
  if (lineasSignificativas.length > 0) {
    const primera = lineasSignificativas[0]
    if (!ETIQUETA_TITULO_LINEA.test(primera) && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(primera)) {
      return {
        titulo: limpiarPrefijoTitulo(primera.replace(/^["']|["']$/g, '').trim()),
        situacionSignificativa: normalizarEspacios(lineasSignificativas.slice(1).join('\n'))
      }
    }
  }

  return {
    titulo: tituloFallback,
    situacionSignificativa: normalizarEspacios(raw)
  }
}
