import { prisma } from '@/lib/prisma'
import type { PlanSuscripcionId } from '@/lib/planes-catalogo'
import { esPlanSuscripcionId } from '@/lib/planes-suscripcion'

export type CuotaDocumentoPlan = {
  limite: number | null
  usados: number
  restantes: number | null
  periodo: 'mensual' | 'anual' | 'trial' | 'sin_limite'
  puedeCrear: boolean
  mensaje: string | null
}

export type TipoDocumentoCuota =
  | 'plan_anual'
  | 'unidad'
  | 'sesion'
  | 'ficha'
  | 'lista_cotejo'
  | 'rubrica'

const ETIQUETA_TIPO: Record<TipoDocumentoCuota, string> = {
  plan_anual: 'programaciones anuales',
  unidad: 'unidades de aprendizaje',
  sesion: 'sesiones de aprendizaje',
  ficha: 'fichas de aprendizaje',
  lista_cotejo: 'listas de cotejo',
  rubrica: 'rúbricas'
}

const FALLBACK_LIMITES: Record<
  PlanSuscripcionId,
  Partial<Record<TipoDocumentoCuota, { mensual?: number; anual?: number }>>
> = {
  basico: {
    plan_anual: { mensual: 5 },
    unidad: { mensual: 5 },
    sesion: { mensual: 30 },
    ficha: { mensual: 30 },
    lista_cotejo: { mensual: 30 },
    rubrica: { mensual: 30 }
  },
  premium: {
    plan_anual: { mensual: 6 },
    unidad: { mensual: 6 },
    sesion: { mensual: 50 },
    ficha: { mensual: 50 },
    lista_cotejo: { mensual: 50 },
    rubrica: { mensual: 50 }
  },
  anual: {
    plan_anual: { anual: 12 },
    unidad: { anual: 12 },
    sesion: { mensual: 350, anual: 450 },
    ficha: { anual: 450 },
    lista_cotejo: { anual: 450 },
    rubrica: { anual: 450 }
  }
}

const TRIAL_LIMITE: Partial<Record<TipoDocumentoCuota, number>> = {
  plan_anual: 1,
  unidad: 1
}

function inicioMesActual(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

async function contarDocumentos(
  userId: number,
  tipo: TipoDocumentoCuota,
  desde?: Date
): Promise<number> {
  const where = {
    idusuario: userId,
    ...(desde ? { createdAt: { gte: desde } } : {})
  }

  switch (tipo) {
    case 'plan_anual':
      return prisma.planAnual.count({ where })
    case 'unidad':
      return prisma.unidadAprendizaje.count({ where })
    case 'sesion':
      return prisma.sesion.count({
        where: {
          unidadAprendizaje: { idusuario: userId },
          ...(desde ? { createdAt: { gte: desde } } : {})
        }
      })
    default:
      return 0
  }
}

export async function evaluarCuotaDocumento(
  userId: number,
  tipoDocumento: TipoDocumentoCuota
): Promise<CuotaDocumentoPlan> {
  const db = prisma as any
  const etiqueta = ETIQUETA_TIPO[tipoDocumento]

  const sus = await db.suscripcionUsuario.findFirst({
    where: {
      idusuario: userId,
      estado: 'activa',
      fechaInicio: { lte: new Date() },
      fechaFin: { gte: new Date() }
    },
    orderBy: { id: 'desc' },
    select: {
      planCodigo: true,
      fechaInicio: true,
      vigencia: true
    }
  })

  if (!sus?.planCodigo || !esPlanSuscripcionId(sus.planCodigo)) {
    const limiteTrial = TRIAL_LIMITE[tipoDocumento]
    if (limiteTrial == null) {
      return {
        limite: 0,
        usados: 0,
        restantes: 0,
        periodo: 'trial',
        puedeCrear: false,
        mensaje: `Activa un plan para generar ${etiqueta}.`
      }
    }
    const usados = await contarDocumentos(userId, tipoDocumento)
    const puedeCrear = usados < limiteTrial
    return {
      limite: limiteTrial,
      usados,
      restantes: Math.max(0, limiteTrial - usados),
      periodo: 'trial',
      puedeCrear,
      mensaje: puedeCrear
        ? null
        : tipoDocumento === 'unidad'
          ? 'En la prueba gratuita solo puedes generar 1 unidad de aprendizaje. Activa un plan para crear más.'
          : 'En la prueba gratuita solo puedes crear 1 programación anual. Activa un plan para crear más.'
    }
  }

  const planCodigo = sus.planCodigo as PlanSuscripcionId

  let limiteMensual: number | null = null
  let limiteAnual: number | null = null

  const planCat = await db.planCatalogo.findFirst({
    where: { codigo: planCodigo, estado: 'activo' },
    include: { limites: { where: { tipoDocumento } } }
  })
  const limDb = planCat?.limites?.[0]
  if (limDb) {
    limiteMensual = limDb.limiteMensual
    limiteAnual = limDb.limiteAnual
  } else {
    const fb = FALLBACK_LIMITES[planCodigo][tipoDocumento]
    limiteMensual = fb?.mensual ?? null
    limiteAnual = fb?.anual ?? null
  }

  const vigenciaSuscripcion = sus.vigencia === 'anual' ? 'anual' : 'mensual'

  let desde: Date | undefined
  let limite: number
  let periodo: CuotaDocumentoPlan['periodo']

  if (vigenciaSuscripcion === 'anual' && limiteAnual != null) {
    desde = new Date(sus.fechaInicio)
    limite = limiteAnual
    periodo = 'anual'
  } else if (limiteMensual != null) {
    desde = inicioMesActual()
    limite = limiteMensual
    periodo = 'mensual'
  } else if (limiteAnual != null) {
    desde = new Date(sus.fechaInicio)
    limite = limiteAnual
    periodo = 'anual'
  } else {
    return {
      limite: null,
      usados: 0,
      restantes: null,
      periodo: 'sin_limite',
      puedeCrear: true,
      mensaje: null
    }
  }

  const usados = await contarDocumentos(userId, tipoDocumento, desde)
  const restantes = Math.max(0, limite - usados)
  const puedeCrear = usados < limite
  const etiquetaPeriodo = periodo === 'mensual' ? 'este mes' : 'en tu vigencia anual'

  return {
    limite,
    usados,
    restantes,
    periodo,
    puedeCrear,
    mensaje: puedeCrear
      ? null
      : `Has usado ${usados} de ${limite} ${etiqueta} permitidas (${etiquetaPeriodo}).`
  }
}

export async function assertPuedeCrearDocumento(
  userId: number,
  tipoDocumento: TipoDocumentoCuota
): Promise<{ ok: true } | { ok: false; error: string; code: string }> {
  const cuota = await evaluarCuotaDocumento(userId, tipoDocumento)
  if (cuota.puedeCrear) return { ok: true }
  const code =
    tipoDocumento === 'plan_anual'
      ? 'LIMITE_PLAN_ANUAL'
      : tipoDocumento === 'unidad'
        ? 'LIMITE_UNIDAD_APRENDIZAJE'
        : `LIMITE_${tipoDocumento.toUpperCase()}`
  return {
    ok: false,
    error: cuota.mensaje ?? 'Has alcanzado el límite de tu plan.',
    code
  }
}
