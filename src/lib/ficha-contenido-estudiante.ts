function normalizarLineaEncabezado(line: string): string {
  return line
    .trim()
    .replace(/^\*\*(.+)\*\*$/, '$1')
    .replace(/^#+\s*/, '')
    .trim()
}

/** Detecta inicio de sección solucionario (solo para docente). */
export function esInicioSeccionSolucionario(line: string): boolean {
  const t = normalizarLineaEncabezado(line)
  return (
    /^\[INICIO_SOLUCIONARIO\]$/i.test(t) ||
    /^FASE\s*\d+\s*:\s*SOLUCIONARIO\b/i.test(t) ||
    /^SOLUCIONARIO(\s+DE\s+FICHA|\s+DOCENTE)?\s*$/i.test(t) ||
    /^SOLUCIONARIO\s*:/i.test(t)
  )
}

/** Quita solucionario y marcadores que no van en la ficha del estudiante. */
export function contenidoFichaSinSolucionario(markdown: string): string {
  let texto = (markdown ?? '').replace(/\r\n/g, '\n').trim()
  if (!texto) return ''

  texto = texto.replace(/\[INICIO_SOLUCIONARIO\][\s\S]*?\[FIN_SOLUCIONARIO\]/gi, '')
  texto = texto.replace(/\[INICIO_SOLUCIONARIO\][\s\S]*/gi, '')

  const lineas: string[] = []
  for (const line of texto.split('\n')) {
    const t = normalizarLineaEncabezado(line)
    if (esInicioSeccionSolucionario(line)) break
    if (/^\[FIN_FICHA\]$/i.test(t)) break
    lineas.push(line)
  }

  return lineas.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Extrae solo el solucionario embebido en la respuesta de la ficha (si existe). */
export function extraerSolucionarioDeFicha(markdown: string): string {
  const texto = (markdown ?? '').replace(/\r\n/g, '\n')
  if (!texto.trim()) return ''

  const bloque = texto.match(
    /\[INICIO_SOLUCIONARIO\]([\s\S]*?)(?:\[FIN_SOLUCIONARIO\]|$)/i
  )
  if (bloque?.[1]?.trim()) {
    return limpiarEncabezadosSolucionario(bloque[1].trim())
  }

  const lineas = texto.split('\n')
  let inicio = -1
  for (let i = 0; i < lineas.length; i++) {
    if (esInicioSeccionSolucionario(lineas[i])) {
      inicio = i + 1
      break
    }
  }
  if (inicio < 0) return ''

  const out: string[] = []
  for (let i = inicio; i < lineas.length; i++) {
    const t = normalizarLineaEncabezado(lineas[i])
    if (/^\[FIN_SOLUCIONARIO\]$/i.test(t) || /^\[FIN_FICHA\]$/i.test(t)) break
    out.push(lineas[i])
  }

  return limpiarEncabezadosSolucionario(out.join('\n').replace(/\n{3,}/g, '\n\n').trim())
}

function limpiarEncabezadosSolucionario(texto: string): string {
  const lineas = texto.split('\n')
  const out: string[] = []
  let saltoInicial = true
  for (const line of lineas) {
    const t = normalizarLineaEncabezado(line)
    if (saltoInicial) {
      if (!t) continue
      if (esInicioSeccionSolucionario(line)) continue
      if (/^SOLUCIONARIO\b/i.test(t)) continue
      if (/^\(Gu[ií]a para el docente/i.test(t)) continue
      saltoInicial = false
    }
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
