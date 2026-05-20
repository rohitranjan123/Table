import type { ResolvedColumn } from '../../col-def'
import type { RowHeightSpec } from '../../types'

export function resolveRowHeight(spec: RowHeightSpec, index: number): number {
  return typeof spec === 'number' ? spec : spec(index)
}

export function buildColumnLefts(columns: ResolvedColumn[]): number[] {
  const lefts: number[] = []
  let x = 0
  for (let i = 0; i < columns.length; i++) {
    lefts.push(x)
    x += columns[i].width
  }
  return lefts
}

export function sumColumnWidths(columns: ResolvedColumn[]): number {
  return columns.reduce((sum, col) => sum + col.width, 0)
}

export function computeTotalBodyHeight(
  rowCount: number,
  rowHeight: RowHeightSpec,
): number {
  if (typeof rowHeight === 'number') return rowCount * rowHeight
  let h = 0
  for (let i = 0; i < rowCount; i++) h += rowHeight(i)
  return h
}

export function getRowTop(rowHeight: RowHeightSpec, index: number): number {
  if (typeof rowHeight === 'number') return index * rowHeight
  let y = 0
  for (let i = 0; i < index; i++) y += rowHeight(i)
  return y
}

export function getRowHeight(rowHeight: RowHeightSpec, index: number): number {
  return resolveRowHeight(rowHeight, index)
}

export function findRowIndexAtOffset(
  rowHeight: RowHeightSpec,
  rowCount: number,
  offsetY: number,
  hintRow: number,
): number {
  if (rowCount === 0) return 0
  if (offsetY <= 0) return 0

  if (typeof rowHeight === 'number') {
    const idx = Math.floor(offsetY / rowHeight)
    return Math.min(rowCount - 1, Math.max(0, idx))
  }

  let i = Math.min(Math.max(0, hintRow), rowCount - 1)

  let top = getRowTop(rowHeight, i)
  while (i > 0 && top > offsetY) {
    i -= 1
    top = getRowTop(rowHeight, i)
  }
  while (i < rowCount - 1) {
    const h = rowHeight(i)
    if (top + h > offsetY) break
    top += h
    i += 1
  }
  return i
}

export function findColumnIndexAtOffset(
  columnLefts: number[],
  columns: ResolvedColumn[],
  offsetX: number,
): number {
  const n = columns.length
  if (n === 0) return 0
  if (offsetX <= 0) return 0

  let lo = 0
  let hi = n - 1
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2)
    if (columnLefts[mid] <= offsetX) lo = mid
    else hi = mid - 1
  }

  const right = columnLefts[lo] + columns[lo].width
  if (offsetX >= right && lo < n - 1) return lo + 1
  return lo
}
