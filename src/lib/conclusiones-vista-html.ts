import { respuestaPromptABloques } from '@/lib/respuesta-prompt-word'

export type EstandarCompetencia = {
  competencia: string
  estandar: string
}

export type ConclusionesVistaData = {
  unidadAprendizajeId: number
  numunidad1?: string
  numunidad2?: string
  area?: string
  grado?: string
  ciclo?: string
  estandares?: EstandarCompetencia[]
  respuestaprompt: string
}

type NivelLogro = {
  etiqueta: string
  variantes: string[]
}

type CompetenciaTabla = {
  competencia: string
  estandar: string
  niveles: NivelLogro[]
}

const NIVELES_ORDEN = [
  { clave: 'DESTACADO', etiqueta: 'DESTACADO (AD)' },
  { clave: 'LOGRO ESPERADO', etiqueta: 'LOGRO ESPERADO (A)' },
  { clave: 'EN PROCESO', etiqueta: 'EN PROCESO (B)' },
  { clave: 'EN INICIO', etiqueta: 'EN INICIO (C)' }
] as const

function escapeHtml(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Normaliza para comparar etiquetas: sin acentos, mayúsculas, sin espacios extra. */
function normalizar(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resalta las etiquetas Logro/Dificultad/Sugerencia dentro de una variante. */
function resaltarLDS(texto: string): string {
  const esc = escapeHtml(texto)
  return esc.replace(
    /(^|\s)(Logro|Dificultad|Sugerencia)\s*:/gi,
    (_m, pre, palabra) =>
      `${pre}<strong class="conclusiones-doc-lds">${palabra}:</strong>`
  )
}

function dividirVariantes(celda: string): string[] {
  return celda
    .split(/<br\s*\/?>|\r?\n/gi)
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

/** ¿Este bloque de tabla corresponde a una competencia (formato fila-clave)? */
function esTablaCompetencia(filas: string[][]): boolean {
  return filas.some((f) => normalizar(f[0] ?? '').startsWith('COMPETENCIA'))
}

/** Divide las filas en grupos, uno por cada fila que inicia con COMPETENCIA. */
function agruparPorCompetencia(filas: string[][]): string[][][] {
  const grupos: string[][][] = []
  let actual: string[][] | null = null
  for (const fila of filas) {
    if (normalizar(fila[0] ?? '').startsWith('COMPETENCIA')) {
      actual = [fila]
      grupos.push(actual)
    } else if (actual) {
      actual.push(fila)
    }
  }
  return grupos
}

function parsearCompetencia(filas: string[][]): CompetenciaTabla {
  const comp: CompetenciaTabla = { competencia: '', estandar: '', niveles: [] }
  const nivelesMap = new Map<string, NivelLogro>()
  let nivelActual: NivelLogro | null = null

  for (const fila of filas) {
    const etiqueta = normalizar(fila[0] ?? '')
    const valor = (fila[1] ?? '').trim()

    if (etiqueta.startsWith('COMPETENCIA')) {
      comp.competencia = valor
      nivelActual = null
      continue
    }
    if (etiqueta.startsWith('ESTANDAR')) {
      comp.estandar = valor
      nivelActual = null
      continue
    }
    if (etiqueta.startsWith('NIVELES DE LOGRO') || etiqueta.startsWith('NIVEL DE LOGRO')) {
      nivelActual = null
      continue
    }

    const nivelDef = NIVELES_ORDEN.find((n) => etiqueta.startsWith(n.clave))
    if (nivelDef) {
      let nivel = nivelesMap.get(nivelDef.clave)
      if (!nivel) {
        nivel = { etiqueta: nivelDef.etiqueta, variantes: [] }
        nivelesMap.set(nivelDef.clave, nivel)
        comp.niveles.push(nivel)
      }
      nivel.variantes.push(...dividirVariantes(valor))
      nivelActual = nivel
      continue
    }

    // Fila sin etiqueta reconocida: continuación (2ª variante) del nivel actual.
    if (etiqueta === '' && nivelActual && valor) {
      nivelActual.variantes.push(...dividirVariantes(valor))
    }
  }

  return comp
}

function renderNivel(nivel: NivelLogro): string {
  const variantes = nivel.variantes.length > 0 ? nivel.variantes : ['']
  return variantes
    .map((variante, idx) => {
      const celdaEtiqueta =
        idx === 0
          ? `<th class="conclusiones-doc-nivel-label" rowspan="${variantes.length}">${escapeHtml(
              nivel.etiqueta
            )}</th>`
          : ''
      const claseVar = idx % 2 === 1 ? ' conclusiones-doc-var-alt' : ''
      return `<tr>${celdaEtiqueta}<td class="conclusiones-doc-var${claseVar}">${resaltarLDS(
        variante
      )}</td></tr>`
    })
    .join('')
}

function renderTablaCompetencia(
  comp: CompetenciaTabla,
  area: string,
  grado: string,
  indice: number,
  estandarBD: string
): string {
  const estandarFinal = estandarBD.trim() || comp.estandar.trim()
  const tituloTabla = grado
    ? `CONCLUSIONES DESCRIPTIVAS - ${grado}`
    : 'CONCLUSIONES DESCRIPTIVAS'
  const niveles =
    comp.niveles.length > 0
      ? comp.niveles
      : NIVELES_ORDEN.map((n) => ({ etiqueta: n.etiqueta, variantes: [''] }))

  return `
    <section class="conclusiones-doc-card" aria-label="Competencia ${indice}">
      <table class="conclusiones-doc-tabla">
        <colgroup>
          <col class="conclusiones-doc-col-label" />
          <col class="conclusiones-doc-col-valor" />
        </colgroup>
        <tbody>
          <tr class="conclusiones-doc-titulo-row">
            <td colspan="2">${escapeHtml(tituloTabla)}</td>
          </tr>
          <tr>
            <th class="conclusiones-doc-label">ÁREA</th>
            <td class="conclusiones-doc-valor">${escapeHtml(area)}</td>
          </tr>
          <tr class="conclusiones-doc-competencia-row">
            <th class="conclusiones-doc-label">COMPETENCIA</th>
            <td class="conclusiones-doc-competencia-valor">${escapeHtml(comp.competencia)}</td>
          </tr>
          <tr>
            <th class="conclusiones-doc-label">ESTÁNDAR</th>
            <td class="conclusiones-doc-valor">${escapeHtml(estandarFinal.replace(/\s+/g, ' ').trim())}</td>
          </tr>
          <tr class="conclusiones-doc-niveles-row">
            <th class="conclusiones-doc-label">NIVELES DE LOGRO</th>
            <td class="conclusiones-doc-niveles-valor">CONCLUSIONES DESCRIPTIVAS</td>
          </tr>
          ${niveles.map((n) => renderNivel(n)).join('')}
        </tbody>
      </table>
    </section>`
}

export function tituloConclusionesVisible(datos: ConclusionesVistaData): string {
  const u1 = datos.numunidad1
  const u2 = datos.numunidad2
  if (u1 && u2) return `Conclusiones descriptivas · Unidades ${u1} y ${u2}`
  return 'Conclusiones descriptivas'
}

/** Busca el estándar de la BD por nombre de competencia; si no, por orden. */
function resolverEstandar(
  estandares: EstandarCompetencia[] | undefined,
  nombreCompetencia: string,
  indiceCero: number
): string {
  if (!estandares || estandares.length === 0) return ''
  const objetivo = normalizar(nombreCompetencia)
  if (objetivo) {
    const porNombre = estandares.find((e) => {
      const n = normalizar(e.competencia)
      return n === objetivo || n.includes(objetivo) || objetivo.includes(n)
    })
    if (porNombre) return porNombre.estandar
  }
  return estandares[indiceCero]?.estandar ?? ''
}

export function conclusionesDocumentoToHtml(datos: ConclusionesVistaData): string {
  const bloques = respuestaPromptABloques(datos.respuestaprompt)
  const area = (datos.area ?? '').trim()
  const grado = (datos.grado ?? '').trim()

  const partes: string[] = []
  let indice = 0

  for (const bloque of bloques) {
    if (bloque.tipo === 'tabla' && esTablaCompetencia(bloque.filas)) {
      for (const grupo of agruparPorCompetencia(bloque.filas)) {
        const comp = parsearCompetencia(grupo)
        const estandarBD = resolverEstandar(datos.estandares, comp.competencia, indice)
        indice += 1
        partes.push(renderTablaCompetencia(comp, area, grado, indice, estandarBD))
      }
    }
  }

  if (partes.length === 0) {
    return `<div class="conclusiones-doc-vacio"><p>No se pudieron identificar competencias en la respuesta de la IA.</p></div>`
  }

  return `<div class="conclusiones-doc">${partes.join('')}</div>`
}
