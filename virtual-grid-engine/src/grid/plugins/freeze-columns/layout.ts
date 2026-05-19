import type { GridColumn } from '../../types'
import type { ResolvedFreeze } from './types'

export function isFrozenColumn(
  col: number,
  freeze: ResolvedFreeze,
): 'left' | 'right' | null {
  if (freeze.leftSet.has(col)) return 'left'
  if (freeze.rightSet.has(col)) return 'right'
  return null
}

export function leftPackedX(
  col: number,
  columns: GridColumn[],
  freeze: ResolvedFreeze,
): number {
  let x = 0
  for (const i of freeze.left) {
    if (i === col) return x
    x += columns[i].width
  }
  return 0
}

export function rightPackedX(
  col: number,
  columns: GridColumn[],
  freeze: ResolvedFreeze,
): number {
  let x = 0
  for (const i of freeze.right) {
    if (i === col) return x
    x += columns[i].width
  }
  return 0
}

/**
 * X within the scroll layer — uses packed scrollable coords (frozen cols removed).
 */
export function getScrollingColumnX(
  col: number,
  scrollLeft: number,
  freeze: ResolvedFreeze,
): number {
  return freeze.scrollableLefts[col] - scrollLeft
}

/** Map viewport X in the center scroll band to scrollable-strip offset. */
export function scrollBandToScrollableX(
  localX: number,
  scrollLeft: number,
  freeze: ResolvedFreeze,
): number {
  return scrollLeft + (localX - freeze.leftWidth)
}

export function hitTestColumn(
  localX: number,
  viewportWidth: number,
  scrollLeft: number,
  columns: GridColumn[],
  freeze: ResolvedFreeze,
): number {
  if (localX < freeze.leftWidth) {
    return hitTestPackedColumn(localX, columns, freeze.left)
  }
  if (localX >= viewportWidth - freeze.rightWidth) {
    return hitTestPackedColumn(
      localX - (viewportWidth - freeze.rightWidth),
      columns,
      freeze.right,
    )
  }

  const offsetX = scrollBandToScrollableX(localX, scrollLeft, freeze)
  return findScrollableColumnAtOffset(offsetX, columns, freeze)
}

/** Largest scrollable column whose strip offset is <= `offsetX`. */
export function findScrollableColumnAtOffset(
  offsetX: number,
  columns: GridColumn[],
  freeze: ResolvedFreeze,
): number {
  const n = columns.length
  if (n === 0) return 0

  if (offsetX <= 0) {
    for (let i = 0; i < n; i++) {
      if (freeze.scrollableLefts[i] >= 0) return i
    }
    return 0
  }

  let col = 0
  for (let i = 0; i < n; i++) {
    const left = freeze.scrollableLefts[i]
    if (left < 0) continue
    if (left <= offsetX) col = i
    else break
  }

  if (freeze.scrollableLefts[col] < 0) {
    for (let i = 0; i < n; i++) {
      if (freeze.scrollableLefts[i] >= 0) return i
    }
    return 0
  }

  const right = freeze.scrollableLefts[col] + columns[col].width
  if (offsetX < right) return col

  for (let j = col + 1; j < n; j++) {
    if (freeze.scrollableLefts[j] >= 0) return j
  }
  return col
}

function hitTestPackedColumn(
  x: number,
  columns: GridColumn[],
  indices: number[],
): number {
  let edge = 0
  for (const i of indices) {
    edge += columns[i].width
    if (x < edge) return i
  }
  return indices[indices.length - 1] ?? 0
}
