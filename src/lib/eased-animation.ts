export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export type AnimationController = {
  cancel: () => void
}

/** Interpola un número con easing; útil para scroll, carruseles, etc. */
export function animateValue(
  from: number,
  to: number,
  durationMs: number,
  onFrame: (value: number) => void,
  onComplete?: () => void
): AnimationController {
  let rafId: number | null = null
  let cancelled = false

  if (Math.abs(to - from) < 0.5) {
    onFrame(to)
    onComplete?.()
    return { cancel: () => {} }
  }

  const t0 = performance.now()

  const tick = (now: number) => {
    if (cancelled) return
    const progress = Math.min((now - t0) / durationMs, 1)
    onFrame(from + (to - from) * easeInOutCubic(progress))
    if (progress < 1) {
      rafId = requestAnimationFrame(tick)
    } else {
      rafId = null
      onComplete?.()
    }
  }

  rafId = requestAnimationFrame(tick)

  return {
    cancel: () => {
      cancelled = true
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }
}
