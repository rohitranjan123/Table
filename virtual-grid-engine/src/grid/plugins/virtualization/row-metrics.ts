import type { RowHeightSpec } from '../../types'

/** O(1) row offsets — built once per rowCount/rowHeight change. */
export interface RowMetrics {
  readonly rowCount: number
  getRowTop(index: number): number
  getRowHeight(index: number): number
  findRowIndexAtOffset(offsetY: number, hintRow: number): number
  getTotalBodyHeight(): number
}

export function createRowMetrics(
  rowCount: number,
  rowHeight: RowHeightSpec,
): RowMetrics {
  if (rowCount <= 0) {
    return {
      rowCount: 0,
      getRowTop: () => 0,
      getRowHeight: () => 0,
      findRowIndexAtOffset: () => 0,
      getTotalBodyHeight: () => 0,
    }
  }

  if (typeof rowHeight === 'number') {
    const fixed = rowHeight
    return {
      rowCount,
      getRowTop: (index) => index * fixed,
      getRowHeight: () => fixed,
      findRowIndexAtOffset: (offsetY) => {
        if (offsetY <= 0) return 0
        const index = Math.floor(offsetY / fixed)
        return Math.min(rowCount - 1, Math.max(0, index))
      },
      getTotalBodyHeight: () => rowCount * fixed,
    }
  }

  const tops = new Float64Array(rowCount + 1)
  for (let index = 0; index < rowCount; index++) {
    tops[index + 1] = tops[index] + rowHeight(index)
  }

  const heights = rowHeight

  return {
    rowCount,
    getRowTop: (index) => tops[index]!,
    getRowHeight: (index) => heights(index),
    findRowIndexAtOffset: (offsetY, _hintRow) => {
      if (offsetY <= 0) return 0

      let low = 0
      let high = rowCount - 1
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2)
        if (tops[mid]! <= offsetY) low = mid
        else high = mid - 1
      }

      if (tops[low + 1]! > offsetY) return low
      return Math.min(rowCount - 1, low + 1)
    },
    getTotalBodyHeight: () => tops[rowCount]!,
  }
}
