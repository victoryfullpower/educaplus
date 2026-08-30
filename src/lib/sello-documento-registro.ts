import { prisma } from '@/lib/prisma'
import { MSG_CODIGO_SELLO_DUPLICADO } from '@/lib/sello-documento-constants'

export { MSG_CODIGO_SELLO_DUPLICADO }
export const REGISTROS_SELLO_PAGE_SIZE = 20

export async function codigoSelloYaRegistrado(codigoeducaplus: string): Promise<boolean> {
  const codigo = codigoeducaplus.trim()
  if (!codigo) return false

  const count = await prisma.registroSelloDocumento.count({
    where: {
      codigoeducaplus: { equals: codigo, mode: 'insensitive' }
    }
  })
  return count > 0
}

export async function codigosSelloYaRegistrados(codigos: string[]): Promise<string[]> {
  const unicos = [...new Set(codigos.map((c) => c.trim()).filter(Boolean))]
  if (unicos.length === 0) return []

  const encontrados = await prisma.registroSelloDocumento.findMany({
    where: {
      OR: unicos.map((codigo) => ({
        codigoeducaplus: { equals: codigo, mode: 'insensitive' as const }
      }))
    },
    select: { codigoeducaplus: true }
  })

  return encontrados.map((r) => r.codigoeducaplus)
}

export async function registrarSelloDocumento(
  codigoeducaplus: string,
  cantidadArchivos: number
) {
  if (await codigoSelloYaRegistrado(codigoeducaplus)) {
    throw new Error('CODIGO_SELLO_DUPLICADO')
  }

  return prisma.registroSelloDocumento.create({
    data: {
      codigoeducaplus: codigoeducaplus.trim(),
      cantidadArchivos: Math.max(1, cantidadArchivos)
    }
  })
}

export type FiltrosRegistroSello = {
  page?: number
  codigo?: string
  fechaDesde?: string
  fechaHasta?: string
}

export async function listarRegistrosSelloDocumento(filtros: FiltrosRegistroSello) {
  const page = Math.max(1, filtros.page ?? 1)
  const skip = (page - 1) * REGISTROS_SELLO_PAGE_SIZE

  const codigo = filtros.codigo?.trim()
  const where: {
    codigoeducaplus?: { contains: string; mode: 'insensitive' }
    createdAt?: { gte?: Date; lte?: Date }
  } = {}

  if (codigo) {
    where.codigoeducaplus = { contains: codigo, mode: 'insensitive' }
  }

  if (filtros.fechaDesde || filtros.fechaHasta) {
    where.createdAt = {}
    if (filtros.fechaDesde) {
      where.createdAt.gte = new Date(`${filtros.fechaDesde}T00:00:00`)
    }
    if (filtros.fechaHasta) {
      where.createdAt.lte = new Date(`${filtros.fechaHasta}T23:59:59.999`)
    }
  }

  const [total, items] = await Promise.all([
    prisma.registroSelloDocumento.count({ where }),
    prisma.registroSelloDocumento.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: REGISTROS_SELLO_PAGE_SIZE,
      select: {
        id: true,
        codigoeducaplus: true,
        cantidadArchivos: true,
        createdAt: true
      }
    })
  ])

  return {
    items,
    total,
    page,
    pageSize: REGISTROS_SELLO_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / REGISTROS_SELLO_PAGE_SIZE))
  }
}
