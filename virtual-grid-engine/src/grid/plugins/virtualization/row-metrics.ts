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

  return rowMetricsFromTopsAndHeights(rowCount, tops, heights)
}

function findRowIndexAtOffset(
  rowCount: number,
  tops: Float64Array,
  offsetY: number,
): number {
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
}

function rowMetricsFromTopsAndHeights(
  rowCount: number,
  tops: Float64Array,
  heights: Float64Array | ((index: number) => number),
): RowMetrics {
  const getHeight =
    typeof heights === 'function'
      ? heights
      : (index: number) => heights[index]!

  return {
    rowCount,
    getRowTop: (index) => tops[index]!,
    getRowHeight: getHeight,
    findRowIndexAtOffset: (offsetY) =>
      findRowIndexAtOffset(rowCount, tops, offsetY),
    getTotalBodyHeight: () => tops[rowCount]!,
  }
}

/** Prefix-sum row tops from a height array (full or partial rebuild). */
export function rebuildRowTopsFromHeights(
  rowCount: number,
  heights: Float64Array,
  tops: Float64Array,
  fromRow = 0,
): void {
  let y = fromRow === 0 ? 0 : tops[fromRow]!
  for (let index = fromRow; index < rowCount; index++) {
    y += heights[index]!
    tops[index + 1] = y
  }
}

/** O(1) row offsets backed by shared height/tops arrays (for wrap DOM refine). */
export function createRowMetricsFromHeightArrays(
  rowCount: number,
  heights: Float64Array,
  tops: Float64Array,
): RowMetrics {
  rebuildRowTopsFromHeights(rowCount, heights, tops, 0)
  return rowMetricsFromTopsAndHeights(rowCount, tops, heights)
}
