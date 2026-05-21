/** @internal Timed cell flash/fade classes (AG Grid CellFlashService analogue). */

const FLASH_MS = 500
const FADE_MS = 1000

const timers = new WeakMap<HTMLDivElement, number>()

export function flashCellElement(
  element: HTMLDivElement,
  flashMs = FLASH_MS,
  fadeMs = FADE_MS,
): void {
  const existing = timers.get(element)
  if (existing !== undefined) window.clearTimeout(existing)

  element.classList.remove(
    'vgrid__cell--data-changed',
    'vgrid__cell--data-changed-animation',
  )
  element.classList.add('vgrid__cell--data-changed')

  requestAnimationFrame(() => {
    element.classList.remove('vgrid__cell--data-changed')
    element.classList.add('vgrid__cell--data-changed-animation')
    const total = flashMs + fadeMs
    const timer = window.setTimeout(() => {
      element.classList.remove('vgrid__cell--data-changed-animation')
      timers.delete(element)
    }, total)
    timers.set(element, timer)
  })
}
