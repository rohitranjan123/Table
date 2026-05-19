import type { VisibleBounds } from '../../types'
import type { RowSpanContext } from './types'

/**
 * Which anchor rows to paint for a spanning column in the current viewport.
 * Implements look-ahead (child visible → paint anchor) and bleed-from-above.
 */
export function collectSpanAnchorsForColumn(
  spanContext: RowSpanContext,
  columnIndex: number,
  bounds: VisibleBounds,
): Set<number> {
  const anchors = new Set<number>()
  const meta = spanContext.metaByColumnIndex.get(columnIndex)
  if (!meta) return anchors

  const { rowStart, rowEnd } = bounds
  if (rowEnd < rowStart) return anchors

  for (let row = rowStart; row <= rowEnd; row++) {
    const entry = meta[row]
    if (!entry) continue
    const anchor = entry.isSpannedChild ? entry.startRowIndex : row
    anchors.add(anchor)
  }

  const segments = spanContext.segmentsByColumn.get(columnIndex)
  if (!segments) return anchors

  for (const segment of segments) {
    const { startRowIndex, spanCount } = segment
    if (startRowIndex >= rowStart) continue
    if (startRowIndex + spanCount > rowStart) {
      anchors.add(startRowIndex)
    }
  }

  return anchors
}

/** Collect anchors for all spanning columns in the visible column range. */
export function collectSpanAnchorsToPaint(
  spanContext: RowSpanContext,
  bounds: VisibleBounds,
): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>()
  const { colStart, colEnd } = bounds

  for (const columnIndex of spanContext.columnIndices) {
    if (columnIndex < colStart || columnIndex > colEnd) continue
    result.set(
      columnIndex,
      collectSpanAnchorsForColumn(spanContext, columnIndex, bounds),
    )
  }

  return result
}
