import { prisma } from '@/lib/prisma'
import type {
  PlanSuscripcionCatalogo,
  PlanSuscripcionId
} from '@/lib/planes-catalogo'
import { NOTA_USO_JUSTO_ANUAL } from '@/lib/planes-catalogo'
import type { PlanSuscripcionConfig } from '@/lib/planes-suscripcion'
import { esPlanSuscripcionId } from '@/lib/planes-suscripcion'

export type PlanCatalogoLimiteRow = {
  tipoDocumento: string
  limiteMensual: number | null
  limiteAnual: number | null
}

type PlanConRelaciones = {
  codigo: string
  nombre: string
  precio: { toNumber(): number } | number
  periodo: string
  vigencia: string
  sesionesPorUnidad: number
  creditosRegeneracion: number
  creditosEtiqueta: string
  maxParesAreaGrado: number
  generacionTitulo: string
  destacado: string | null
  etiqueta: string | null
  cta: string
  tema: string
  notaUsoJusto: string | null
  items: { tipo: string; texto: string; orden: number }[]
  limites: {
    tipoDocumento: string
    limiteMensual: number | null
    limiteAnual: number | null
  }[]
}

const planInclude = {
  items: { orderBy: { orden: 'asc' as const } },
  limites: true
}

function precioNumero(precio: PlanConRelaciones['precio']): number {
  return typeof precio === 'number' ? precio : precio.toNumber()
}

function mapPlanCatalogo(plan: PlanConRelaciones): PlanSuscripcionCatalogo {
  const generacion = plan.items.filter((i) => i.tipo === 'generacion').map((i) => i.texto)
  const beneficios = plan.items.filter((i) => i.tipo === 'beneficio').map((i) => i.texto)
  const periodo = plan.periodo === 'anual' ? 'anual' : 'mes'

  return {
    id: plan.codigo as PlanSuscripcionId,
    nombre: plan.nombre,
    precio: precioNumero(plan.precio),
    periodo,
    creditos: plan.creditosEtiqueta,
    destacado: plan.destacado ?? undefined,
    etiqueta: plan.etiqueta ?? undefined,
    generacionTitulo: plan.generacionTitulo,
    generacion,
    beneficios,
    cta: plan.cta,
    tema: (plan.tema === 'verde' || plan.tema === 'naranja' || plan.tema === 'azul'
      ? plan.tema
      : 'azul') as PlanSuscripcionCatalogo['tema']
  }
}

export function mapPlanConfig(plan: PlanConRelaciones): PlanSuscripcionConfig {
  const sesiones = plan.sesionesPorUnidad === 10 ? 10 : 5
  return {
    id: plan.codigo as PlanSuscripcionId,
    vigencia: plan.vigencia === 'anual' ? 'anual' : 'mensual',
    sesionesPorUnidad: sesiones,
    cantidadGradosLegacy: plan.maxParesAreaGrado,
    maxParesAreaGrado: plan.maxParesAreaGrado,
    creditosRegeneracion: plan.creditosRegeneracion
  }
}

export function mapLimites(plan: PlanConRelaciones): PlanCatalogoLimiteRow[] {
  return plan.limites.map((l) => ({
    tipoDocumento: l.tipoDocumento,
    limiteMensual: l.limiteMensual,
    limiteAnual: l.limiteAnual
  }))
}

async function cargarPlanPorCodigo(codigo: string): Promise<PlanConRelaciones | null> {
  const db = prisma as any
  const plan = await db.planCatalogo.findFirst({
    where: { codigo, estado: 'activo' },
    include: planInclude
  })
  return plan ?? null
}

export async function listarPlanesCatalogoActivos(): Promise<PlanSuscripcionCatalogo[]> {
  const db = prisma as any
  const rows = (await db.planCatalogo.findMany({
    where: { estado: 'activo' },
    include: planInclude,
    orderBy: { orden: 'asc' }
  })) as PlanConRelaciones[]
  return rows.map(mapPlanCatalogo)
}

export async function obtenerPlanCatalogoPorCodigo(
  codigo: string
): Promise<(PlanSuscripcionCatalogo & { limites: PlanCatalogoLimiteRow[] }) | null> {
  if (!esPlanSuscripcionId(codigo)) return null
  const plan = await cargarPlanPorCodigo(codigo)
  if (!plan) return null
  return { ...mapPlanCatalogo(plan), limites: mapLimites(plan) }
}

export async function obtenerConfigPlanDesdeDb(
  codigo: PlanSuscripcionId
): Promise<PlanSuscripcionConfig | null> {
  const plan = await cargarPlanPorCodigo(codigo)
  if (!plan) return null
  return mapPlanConfig(plan)
}

export async function precioPlanDesdeDb(codigo: PlanSuscripcionId): Promise<number | null> {
  const plan = await cargarPlanPorCodigo(codigo)
  if (!plan) return null
  return precioNumero(plan.precio)
}

export async function obtenerNotaUsoJustoAnualDesdeDb(): Promise<string> {
  const db = prisma as any
  const plan = await db.planCatalogo.findFirst({
    where: { codigo: 'anual', estado: 'activo' },
    select: { notaUsoJusto: true }
  })
  return plan?.notaUsoJusto ?? NOTA_USO_JUSTO_ANUAL
}
