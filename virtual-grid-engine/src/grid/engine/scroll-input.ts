/** @internal Wheel routing and pointer interaction for cell hover/select. */

import type { CellCoordinate } from '../types'
import type { GridDomShell } from './dom-shell'
import { resolveWheelDeltas } from './wheel'

type WheelAxis = 'x' | 'y'

export interface ScrollInputCallbacks {
  onSchedulePaint: (force?: boolean) => void
  onScheduleInteractionPaint: () => void
  onCellHover: (cell: CellCoordinate | null) => void
  onCellSelect: (cell: CellCoordinate) => void
}

export interface ScrollInputHandle {
  destroy(): void
  clearWheelAxis(): void
}

function cellFromTarget(target: EventTarget | null): CellCoordinate | null {
  if (!(target instanceof HTMLElement)) return null
  const cell = target.closest('.vgrid__cell')
  if (!(cell instanceof HTMLElement)) return null
  if (cell.dataset.header === '1') return null
  const col = Number(cell.dataset.col)
  const row = Number(cell.dataset.row)
  if (Number.isNaN(col) || Number.isNaN(row)) return null
  return [col, row]
}

function sameCell(
  a: CellCoordinate | null,
  b: CellCoordinate | null,
): boolean {
  if (a === null || b === null) return a === b
  return a[0] === b[0] && a[1] === b[1]
}

export function attachScrollInput(
  shell: GridDomShell,
  callbacks: ScrollInputCallbacks,
  getHoverCell: () => CellCoordinate | null,
  setHoverCell: (cell: CellCoordinate | null) => void,
  setSelectedCell: (cell: CellCoordinate) => void,
): ScrollInputHandle {
  let wheelAxis: WheelAxis | null = null
  let wheelAxisTimer: number | null = null

  const onScrollerScroll = () => callbacks.onSchedulePaint()

  const onRootWheel = (event: WheelEvent) => {
    const { scroller } = shell
    const maxTop = scroller.scrollHeight - scroller.clientHeight
    const maxLeft = scroller.scrollWidth - scroller.clientWidth
    if (maxTop <= 0 && maxLeft <= 0) return

    const { deltaX, deltaY, axis } = resolveWheelDeltas(event, wheelAxis)
    if (deltaX === 0 && deltaY === 0) return

    if (axis !== null) {
      wheelAxis = axis
      if (wheelAxisTimer !== null) {
        window.clearTimeout(wheelAxisTimer)
      }
      wheelAxisTimer = window.setTimeout(() => {
        wheelAxis = null
        wheelAxisTimer = null
      }, 120)
    }

    let nextTop = scroller.scrollTop
    let nextLeft = scroller.scrollLeft

    if (deltaY !== 0) {
      nextTop = Math.max(0, Math.min(maxTop, scroller.scrollTop + deltaY))
    }
    if (deltaX !== 0) {
      nextLeft = Math.max(0, Math.min(maxLeft, scroller.scrollLeft + deltaX))
    }

    if (nextTop === scroller.scrollTop && nextLeft === scroller.scrollLeft) {
      return
    }

    event.preventDefault()
    if (deltaY !== 0) scroller.scrollTop = nextTop
    if (deltaX !== 0) scroller.scrollLeft = nextLeft
    callbacks.onSchedulePaint(false)
  }

  const setHover = (coord: CellCoordinate | null) => {
    if (sameCell(getHoverCell(), coord)) return
    setHoverCell(coord)
    callbacks.onCellHover(coord)
    callbacks.onScheduleInteractionPaint()
  }

  const onViewportPointerMove = (event: PointerEvent) => {
    setHover(cellFromTarget(event.target))
  }

  const onViewportPointerLeave = () => {
    setHover(null)
  }

  const onViewportClick = (event: MouseEvent) => {
    const coord = cellFromTarget(event.target)
    if (!coord) return
    setSelectedCell(coord)
    callbacks.onCellSelect(coord)
    callbacks.onSchedulePaint(true)
  }

  shell.scroller.addEventListener('scroll', onScrollerScroll, { passive: true })
  shell.root.addEventListener('wheel', onRootWheel, {
    passive: false,
    capture: true,
  })
  shell.viewport.addEventListener('pointermove', onViewportPointerMove)
  shell.viewport.addEventListener('pointerleave', onViewportPointerLeave)
  shell.viewport.addEventListener('click', onViewportClick)

  return {
    destroy() {
      shell.scroller.removeEventListener('scroll', onScrollerScroll)
      shell.root.removeEventListener('wheel', onRootWheel, { capture: true })
      shell.viewport.removeEventListener('pointermove', onViewportPointerMove)
      shell.viewport.removeEventListener('pointerleave', onViewportPointerLeave)
      shell.viewport.removeEventListener('click', onViewportClick)
      if (wheelAxisTimer !== null) {
        window.clearTimeout(wheelAxisTimer)
        wheelAxisTimer = null
      }
      wheelAxis = null
    },
    clearWheelAxis() {
      wheelAxis = null
    },
  }
}
