import { claveAreaTab } from '@/lib/plan-area-tab'

export type ModalReturnPaso = 'sesiones' | 'unidad' | 'planAnual'

export type ModalReturnState = {
  planId: number
  paso: ModalReturnPaso
  unidad?: string | null
  area?: string | null
  areaId?: string | null
}

const STORAGE_KEY = 'educaplus_modal_return'

export function guardarRetornoModal(state: ModalReturnState): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function leerRetornoModal(): ModalReturnState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as ModalReturnState
    if (!data?.planId || !data?.paso) return null
    return data
  } catch {
    return null
  }
}

export function limpiarRetornoModal(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

export function linkHomeConModalRetorno(state: ModalReturnState): string {
  const params = new URLSearchParams()
  params.set('area', claveAreaTab(state.area, state.areaId))
  params.set('modal', state.paso)
  params.set('planId', String(state.planId))
  if (state.unidad != null && String(state.unidad).trim() !== '') {
    params.set('unidad', String(state.unidad))
  }
  return `/home?${params.toString()}`
}

export function parsearRetornoDesdeSearchParams(
  searchParams: URLSearchParams
): ModalReturnState | null {
  const modal = searchParams.get('modal')
  const planId = searchParams.get('planId')
  if (modal !== 'sesiones' && modal !== 'unidad' && modal !== 'planAnual') return null
  if (!planId) return null
  const id = parseInt(planId, 10)
  if (Number.isNaN(id)) return null
  const unidad = searchParams.get('unidad')
  return {
    planId: id,
    paso: modal,
    unidad: unidad || null
  }
}
