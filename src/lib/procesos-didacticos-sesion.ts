import { prisma } from '@/lib/prisma'

export function normalizarTextoCmp(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Descripciones de proceso didáctico de la competencia (área + competencia).
 * Misma lógica que el prompt dinámico `{{procesosdidacticos}}`.
 */
export async function listarDescripcionesProcesosDidacticos(
  areaId: string | number | null | undefined,
  competencia: string
): Promise<string[]> {
  const objetivo = normalizarTextoCmp(competencia)
  const areaIdNum =
    typeof areaId === 'number' ? areaId : parseInt(String(areaId ?? ''), 10)
  if (!objetivo || !(areaIdNum > 0)) return []

  try {
    const procesos = await prisma.procesoDidactico.findMany({
      where: { idarea: areaIdNum },
      orderBy: { idproceso: 'asc' }
    })

    const byCompetencia = new Map<string, string[]>()
    for (const p of procesos) {
      const comps = Array.isArray(p.competenciaProceso)
        ? (p.competenciaProceso as string[])
        : typeof p.competenciaProceso === 'string'
          ? [p.competenciaProceso]
          : []
      const desc = (p.descripcion || '').trim()
      if (!desc) continue
      for (const c of comps) {
        const comp = (typeof c === 'string' ? c : String(c)).trim()
        if (!comp) continue
        if (!byCompetencia.has(comp)) byCompetencia.set(comp, [])
        const list = byCompetencia.get(comp)!
        if (!list.includes(desc)) list.push(desc)
      }
    }

    let exactos: string[] | undefined
    let parciales: string[] | undefined
    for (const [comp, descripciones] of byCompetencia) {
      const n = normalizarTextoCmp(comp)
      if (n === objetivo) {
        exactos = descripciones
        break
      }
      if (!parciales && (n.includes(objetivo) || objetivo.includes(n))) {
        parciales = descripciones
      }
    }

    return exactos ?? parciales ?? []
  } catch (e) {
    console.error('[procesos-didacticos-sesion] Error al cargar procesos:', e)
    return []
  }
}

/** Formato del prompt: viñetas `• descripción`. */
export function formatearProcesosDidacticosPrompt(descripciones: string[]): string {
  if (!descripciones.length) return ''
  return descripciones.map((d) => `• ${d}`).join('\n')
}
