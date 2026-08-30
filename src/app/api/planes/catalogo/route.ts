import { NextRequest, NextResponse } from 'next/server'
import {
  listarPlanesCatalogoActivos,
  obtenerNotaUsoJustoAnualDesdeDb,
  obtenerPlanCatalogoPorCodigo,
  obtenerConfigPlanDesdeDb
} from '@/lib/planes-catalogo-db'
import { PLANES_SUSCRIPCION, NOTA_USO_JUSTO_ANUAL } from '@/lib/planes-catalogo'
import {
  PLAN_SUSCRIPCION_CONFIG,
  esPlanSuscripcionId
} from '@/lib/planes-suscripcion'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const codigo = request.nextUrl.searchParams.get('codigo')

    if (codigo) {
      const plan = await obtenerPlanCatalogoPorCodigo(codigo)
      if (!plan) {
        const fallback = PLANES_SUSCRIPCION.find((p) => p.id === codigo)
        if (!fallback) {
          return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
        }
        const config =
          esPlanSuscripcionId(codigo) ? PLAN_SUSCRIPCION_CONFIG[codigo] : null
        return NextResponse.json({ plan: fallback, config, limites: [] })
      }
      const { limites, ...catalogo } = plan
      const config = esPlanSuscripcionId(codigo)
        ? (await obtenerConfigPlanDesdeDb(codigo)) ?? PLAN_SUSCRIPCION_CONFIG[codigo]
        : null
      return NextResponse.json({ plan: catalogo, config, limites })
    }

    const planes = await listarPlanesCatalogoActivos()
    const notaUsoJustoAnual = await obtenerNotaUsoJustoAnualDesdeDb()

    return NextResponse.json({
      planes: planes.length > 0 ? planes : PLANES_SUSCRIPCION,
      notaUsoJustoAnual: notaUsoJustoAnual || NOTA_USO_JUSTO_ANUAL
    })
  } catch (error) {
    console.error('planes/catalogo:', error)
    return NextResponse.json({
      planes: PLANES_SUSCRIPCION,
      notaUsoJustoAnual: NOTA_USO_JUSTO_ANUAL
    })
  }
}
