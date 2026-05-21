/** @internal FLIP-style motion using Web Animations API (avoids fighting cell transform positioning). */

export interface CellRectSnapshot {
  el: HTMLElement
  rect: DOMRect
}

function usesTranslatePosition(el: HTMLElement): boolean {
  return (
    el.classList.contains('vgrid__cell--row-span') ||
    (el.style.transform.includes('translate3d') &&
      el.style.transform !== 'translate3d(0px, 0px, 0)')
  )
}

/**
 * Row-span cells use translate3d for position. WAAPI transform animations overwrite
 * that and leave cells stranded — use left/top for the FLIP, then restore.
 */
function materializeBoxPosition(el: HTMLElement): { restore: () => void } {
  const t = el.style.transform
  const match = t.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/)
  const left = match ? parseFloat(match[1]!) : parseFloat(el.style.left) || 0
  const top = match ? parseFloat(match[2]!) : parseFloat(el.style.top) || 0
  el.style.left = `${left}px`
  el.style.top = `${top}px`
  el.style.transform = ''
  return {
    restore: () => {
      el.style.left = '0'
      el.style.top = '0'
      el.style.transform = `translate3d(${left}px, ${top}px, 0)`
    },
  }
}

function cancelElementAnimations(el: HTMLElement): void {
  if (typeof el.getAnimations === 'function') {
    el.getAnimations().forEach((a) => a.cancel())
  }
}

/** Cancel in-flight FLIP animations and repair stranded layout only — never touch healthy cells. */
export function cancelFlipAnimations(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('.vgrid__cell').forEach((el) => {
    const hasAnimation =
      typeof el.getAnimations === 'function' && el.getAnimations().length > 0
    const left = parseFloat(el.style.left) || 0
    const top = parseFloat(el.style.top) || 0
    const translatePos = usesTranslatePosition(el)
    const strandedMaterialize =
      translatePos && (Math.abs(left) > 0.5 || Math.abs(top) > 0.5)

    if (!hasAnimation && !strandedMaterialize) return

    if (hasAnimation) cancelElementAnimations(el)

    if (strandedMaterialize) {
      el.style.left = '0'
      el.style.top = '0'
      el.style.transform = `translate3d(${left}px, ${top}px, 0)`
      return
    }

    if (!translatePos) {
      el.style.removeProperty('transform')
    }
  })
}

export function captureCellRects(
  root: HTMLElement,
  selector: string,
  keyFor: (el: HTMLElement) => string | null,
): Map<string, CellRectSnapshot> {
  const map = new Map<string, CellRectSnapshot>()
  root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
    if (el.style.display === 'none') return
    const key = keyFor(el)
    if (!key) return
    map.set(key, { el, rect: el.getBoundingClientRect() })
  })
  return map
}

export function playFlip(
  before: Map<string, CellRectSnapshot>,
  durationMs: number,
  onComplete?: () => void,
): void {
  const easing = 'cubic-bezier(0.4, 0, 0.2, 1)'
  const pending: Promise<Animation>[] = []

  for (const { el, rect: start } of before.values()) {
    if (!el.isConnected) continue

    const restore = usesTranslatePosition(el)
      ? materializeBoxPosition(el).restore
      : undefined

    const end = el.getBoundingClientRect()
    const dx = start.left - end.left
    const dy = start.top - end.top
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      restore?.()
      continue
    }

    cancelElementAnimations(el)

    const done = (): void => {
      if (restore) restore()
      else el.style.removeProperty('transform')
    }

    if (typeof el.animate !== 'function') {
      done()
      continue
    }

    const anim = el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' },
      ],
      { duration: durationMs, easing, fill: 'none' },
    )

    anim.onfinish = done
    anim.oncancel = done
    pending.push(anim.finished.catch(() => undefined) as Promise<Animation>)
  }

  if (onComplete) {
    void Promise.all(pending).then(onComplete)
  }
}

export const BODY_CELL_SELECTOR = '.vgrid__cell[data-row]'

export const HEADER_CELL_SELECTOR = '.vgrid__layer--header .vgrid__cell--header'

/** Stable per-column cell id for FLIP (uses source row when row-motion is on). */
export function bodyCellKey(el: HTMLElement): string | null {
  const field = el.dataset.field
  if (!field) return null
  const row = el.dataset.sourceRow ?? el.dataset.row
  if (row === undefined || row === '') return null
  return `${field}:${row}`
}

export function headerCellKey(el: HTMLElement): string | null {
  const field = el.dataset.field
  if (!field) return null
  return field
}
