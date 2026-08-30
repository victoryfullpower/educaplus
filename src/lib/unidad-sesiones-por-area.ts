/** Máximo de sesiones por unidad: 10 para todas las áreas. */
export function maxSesionesPorAreaDescripcion(_descripcion?: string): number {
  return 10
}

export function etiquetaDuracionSesiones(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? 'sesión' : 'sesiones'}`
}

/** Normaliza valor guardado (número, texto "N sesiones" o registros antiguos en semanas). */
export function normalizarNumeroSesionesCargado(
  numeroSesiones: string | null | undefined,
  duracion: string | null | undefined,
  cantidadSesionesGuardadas?: number
): string {
  const n = String(numeroSesiones ?? '').trim()
  if (/^\d+$/.test(n)) return n

  const texto = String(duracion ?? '')
  const matchSesiones = texto.match(/(\d+)\s*sesion/i)
  if (matchSesiones) return matchSesiones[1]

  if (cantidadSesionesGuardadas != null && cantidadSesionesGuardadas > 0) {
    return String(cantidadSesionesGuardadas)
  }

  return ''
}

/** Cantidad pedida en el formulario (prioriza el select numeroSesiones). */
export function resolverNumeroSesionesForm(formData: {
  numeroSesiones?: string | null
  sesiones?: unknown[] | null
}): number {
  const n = parseInt(String(formData.numeroSesiones ?? '').trim(), 10)
  if (!Number.isNaN(n) && n > 0) return n
  const arr = Array.isArray(formData.sesiones) ? formData.sesiones : []
  return arr.length > 0 ? arr.length : 0
}

export function normalizarTextoTablaCelda(texto: string): string {
  return String(texto ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/^[\s•\-*]+/, '')
    .replace(/\s+/g, ' ')
}

const ETIQUETAS_ENCABEZADO_TABLA = [
  'TITULOS',
  'TITULO',
  'CAMPO TEMATICO / CONOCIMIENTO',
  'CAMPO TEMATICO',
  'COMPETENCIA',
  'CAPACIDADES',
  'DESEMPENO PRECISADO',
  'EVIDENCIAS DE APRENDIZAJE',
  'EVIDENCIAS',
  'CRITERIOS',
  'INSTRUMENTO DE EVALUACION',
  'PROPOSITOS DE APRENDIZAJE',
  'EVALUACION',
]

function celdaEsEtiquetaEncabezado(norm: string): boolean {
  if (!norm) return false
  if (ETIQUETAS_ENCABEZADO_TABLA.includes(norm)) return true
  return ETIQUETAS_ENCABEZADO_TABLA.some(
    (e) => norm === e || (norm.startsWith(e) && norm.length <= e.length + 20)
  )
}

/** Detecta filas de encabezado o plantilla que GPT a veces repite como "Sesión 1". */
export function esFilaEncabezadoTablaDidactica(cols: string[]): boolean {
  if (cols.length < 2) return false

  const norms = cols.map(normalizarTextoTablaCelda)
  const tituloSinSesion = norms[0].replace(/^SESION\s*\d+\s*:?\s*/, '').trim()

  if (celdaEsEtiquetaEncabezado(norms[0]) || celdaEsEtiquetaEncabezado(tituloSinSesion)) {
    return true
  }

  let coincidencias = 0
  for (const n of norms) {
    if (n && celdaEsEtiquetaEncabezado(n)) coincidencias++
  }
  if (coincidencias >= 3) return true

  if (
    /^SESION\s*\d+\s*:?\s*(TITULO|TITULOS)?$/.test(norms[0]) &&
    coincidencias >= 2
  ) {
    return true
  }

  return false
}

export type SesionTablaDidactica = {
  titulo?: string
  campoTematico?: string
  competenciasSeleccionadas?: string[]
  capacidadesSeleccionadas?: string[]
  desempeniosSeleccionados?: string[]
  evidencias?: string
  criterios?: string
  instrumentoEvaluacion?: string
}

export function esSesionTablaPlaceholder(s: SesionTablaDidactica): boolean {
  const tituloNorm = normalizarTextoTablaCelda(s.titulo || '')
  if (!tituloNorm || tituloNorm === 'TITULO' || tituloNorm === 'TITULOS') return true

  const cols = [
    s.titulo,
    s.campoTematico,
    Array.isArray(s.competenciasSeleccionadas)
      ? s.competenciasSeleccionadas.join(' ')
      : '',
    Array.isArray(s.capacidadesSeleccionadas)
      ? s.capacidadesSeleccionadas.join(' ')
      : '',
    Array.isArray(s.desempeniosSeleccionados)
      ? s.desempeniosSeleccionados.join(' ')
      : '',
    s.evidencias,
    s.criterios,
    s.instrumentoEvaluacion,
  ].map((c) => normalizarTextoTablaCelda(String(c ?? '')))

  return esFilaEncabezadoTablaDidactica(cols)
}

export function filtrarSesionesTablaValidas<T extends SesionTablaDidactica>(
  sesiones: T[]
): T[] {
  return sesiones.filter((s) => !esSesionTablaPlaceholder(s))
}
