import { animateValue, type AnimationController } from '@/lib/eased-animation'

const DEFAULT_DURATION_MS = 2000

function setScrollTop(y: number) {
  const top = Math.max(0, Math.round(y))
  window.scrollTo(0, top)
  document.documentElement.scrollTop = top
  document.body.scrollTop = top
}

export type SlowScrollController = AnimationController

/**
 * Desplaza la ventana hasta `targetY` en `durationMs` (por defecto 2000ms).
 */
export function scrollWindowToSlow(
  targetY: number,
  durationMs = DEFAULT_DURATION_MS,
  onComplete?: () => void
): SlowScrollController {
  const startY = window.pageYOffset || document.documentElement.scrollTop || 0

  return animateValue(
    startY,
    targetY,
    durationMs,
    setScrollTop,
    onComplete
  )
}

export const SLOW_SCROLL_DURATION_MS = DEFAULT_DURATION_MS
