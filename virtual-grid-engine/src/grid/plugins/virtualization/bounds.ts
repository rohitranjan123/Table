import {
  findScrollableColumnAtOffset,
  type ResolvedFreeze,
} from '../freeze-columns'
import type { GridColumn, VisibleBounds } from '../../types'
import { OVERSCAN_COLS, OVERSCAN_ROWS } from './constants'
import { isVirtualizationEnabled } from './effective-virtualization'
import type { RowMetrics } from './row-metrics'

export interface ComputeVisibleBoundsParams {
  scrollLeft: number
  scrollTop: number
  viewportWidth: number
  viewportHeight: number
  headerHeight: number
  rowCount: number
  rowMetrics: RowMetrics
  columns: GridColumn[]
  freeze: ResolvedFreeze
  rowHint: number
  virtualization: boolean
}

export function computeVisibleBounds(
  params: ComputeVisibleBoundsParams,
): { bounds: VisibleBounds; rowHint: number } {
  const {
    scrollLeft,
    scrollTop,
    viewportWidth,
    viewportHeight,
    headerHeight,
    rowCount,
    rowMetrics,
    columns,
    freeze,
    rowHint,
    virtualization,
  } = params

  const colCount = columns.length
  if (colCount === 0 || rowCount === 0) {
    return {
      bounds: { colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 0 },
      rowHint: 0,
    }
  }

  if (!isVirtualizationEnabled(virtualization, rowCount, colCount)) {
    return {
      bounds: {
        colStart: 0,
        colEnd: colCount - 1,
        rowStart: 0,
        rowEnd: rowCount - 1,
      },
      rowHint: 0,
    }
  }

  const scrollW = Math.max(
    0,
    viewportWidth - freeze.leftWidth - freeze.rightWidth,
  )

  const contentLeft = scrollLeft
  const contentRight = scrollLeft + scrollW

  let colStart = findScrollableColumnAtOffset(contentLeft, columns, freeze)
  let colEnd = findScrollableColumnAtOffset(contentRight, columns, freeze)

  colStart = Math.max(0, colStart - OVERSCAN_COLS)
  colEnd = Math.min(colCount - 1, colEnd + OVERSCAN_COLS)

  const bodyOffsetY = Math.max(0, scrollTop)
  const bodyOffsetYEnd = scrollTop + Math.max(0, viewportHeight - headerHeight)

  let rowStart = rowMetrics.findRowIndexAtOffset(bodyOffsetY, rowHint)
  let rowEnd = rowMetrics.findRowIndexAtOffset(bodyOffsetYEnd, rowStart)

  rowStart = Math.max(0, rowStart - OVERSCAN_ROWS)
  rowEnd = Math.min(rowCount - 1, rowEnd + OVERSCAN_ROWS)

  return {
    bounds: { colStart, colEnd, rowStart, rowEnd },
    rowHint: rowStart,
  }
}
