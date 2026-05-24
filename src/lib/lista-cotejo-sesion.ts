import { prisma } from '@/lib/prisma'

export type DatosListaCotejo = {
  area: string
  grado: string
  docente: string
  ciclo: string
  titulosesion: string
  proposito: string
  competencia: string
  capacidades: string
  evidencia: string
  criterio1: string
  criterio2: string
  criterio3: string
  criterio4: string
}

const limpiarBr = (s: string) =>
  (s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<BR\s*\/?>/gi, '\n').trim()

const sinPrefijoProposito = (s: string) =>
  (s || '').replace(/^\s*Propósito\s*:\s*/i, '').trim()

/** Divide el texto de criterios de sesión en hasta 4 líneas para la plantilla. */
export function dividirCriteriosEnCuatro(texto: string): [string, string, string, string] {
  const limpio = limpiarBr(texto)
  const lineas = limpio
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•\-–—]+/, '').trim())
    .filter(Boolean)
  return [lineas[0] ?? '', lineas[1] ?? '', lineas[2] ?? '', lineas[3] ?? '']
}

async function textoCompetenciaDesdeSesion(
  competenciasSeleccionadas: unknown
): Promise<string> {
  const arr = Array.isArray(competenciasSeleccionadas)
    ? (competenciasSeleccionadas as unknown[])
    : []
  if (arr.length === 0) return ''
  const first = String(arr[0]).trim()
  const id = parseInt(first, 10)
  if (!Number.isNaN(id) && String(id) === first) {
    const c = await prisma.competencia.findUnique({ where: { id } })
    return (c?.descripcion ?? first).trim()
  }
  return first
}

function textoCapacidadesDesdeSesion(capacidadesSeleccionadas: unknown): string {
  const arr = Array.isArray(capacidadesSeleccionadas)
    ? (capacidadesSeleccionadas as unknown[])
    : []
  return arr
    .map((c) => String(c).trim())
    .filter(Boolean)
    .map((c) => {
      const id = parseInt(c, 10)
      if (!Number.isNaN(id) && String(id) === c) return c
      return limpiarBr(c).startsWith('-') ? limpiarBr(c) : `- ${limpiarBr(c)}`
    })
    .join('\n')
}

type SesionConUnidad = {
  titulo: string | null
  proposito: string | null
  criterios: string | null
  evidencias: string | null
  area: string | null
  grado: string | null
  docente: string | null
  ciclo: string | null
  competenciasSeleccionadas: unknown
  capacidadesSeleccionadas: unknown
  unidadAprendizaje: {
    area: string | null
    grado: string | null
    docente: string | null
    ciclo: string | null
  }
}

/** Arma el payload de lista de cotejo desde los datos actuales de la sesión. */
export async function datosListaCotejoDesdeSesion(
  sesion: SesionConUnidad
): Promise<DatosListaCotejo> {
  const u = sesion.unidadAprendizaje
  const [criterio1, criterio2, criterio3, criterio4] = dividirCriteriosEnCuatro(
    sesion.criterios ?? ''
  )
  const competencia = await textoCompetenciaDesdeSesion(sesion.competenciasSeleccionadas)

  return {
    area: (sesion.area ?? u.area ?? '').trim(),
    grado: (sesion.grado ?? u.grado ?? '').trim(),
    docente: (sesion.docente ?? u.docente ?? '').trim(),
    ciclo: (sesion.ciclo ?? u.ciclo ?? '').trim(),
    titulosesion: (sesion.titulo ?? '').trim(),
    proposito: sinPrefijoProposito(sesion.proposito ?? ''),
    competencia,
    capacidades: textoCapacidadesDesdeSesion(sesion.capacidadesSeleccionadas),
    evidencia: limpiarBr(sesion.evidencias ?? ''),
    criterio1,
    criterio2,
    criterio3,
    criterio4
  }
}
