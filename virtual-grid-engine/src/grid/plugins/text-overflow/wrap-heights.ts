import type { ResolvedColumn } from '../../col-def'
import type { CellCoordinate, GridCell, RowHeightSpec } from '../../types'
import { createRowMetrics, type RowMetrics } from '../virtualization/row-metrics'
import { resolveRowHeight } from '../virtualization/layout'
import {
  contentWidthForColumn,
  heightForWrappedLines,
  measureWrappedLineCount,
} from './text-measure'
import {
  gridHasCellWrap,
  gridHasHeaderWrap,
  resolveCellTextOverflow,
  resolveHeaderTextOverflow,
} from './resolve-overflow'
import type { CellTextOverflow } from './types'

export interface WrapMetricsInput {
  columns: ResolvedColumn[]
  rowCount: number
  rowHeight: RowHeightSpec
  headerHeight: number
  headerTextOverflow: CellTextOverflow
  cellTextOverflow: CellTextOverflow
  getCellContent: (cell: CellCoordinate) => GridCell
}

export function computeEffectiveHeaderHeight(
  input: WrapMetricsInput,
): number {
  if (!gridHasHeaderWrap(input.columns, input.headerTextOverflow)) {
    return input.headerHeight
  }

  let maxHeight = input.headerHeight
  for (const column of input.columns) {
    if (
      resolveHeaderTextOverflow(column, input.headerTextOverflow) !== 'wrap'
    ) {
      continue
    }
    const lines = measureWrappedLineCount(
      column.title,
      contentWidthForColumn(column.width),
      true,
    )
    maxHeight = Math.max(
      maxHeight,
      heightForWrappedLines(lines, input.headerHeight),
    )
  }
  return maxHeight
}

function wrapColumnIndicesFor(
  columns: ResolvedColumn[],
  cellTextOverflow: CellTextOverflow,
): number[] {
  const indices: number[] = []
  for (let col = 0; col < columns.length; col++) {
    if (
      resolveCellTextOverflow(columns[col]!, cellTextOverflow) === 'wrap'
    ) {
      indices.push(col)
    }
  }
  return indices
}

export function estimateWrapRowHeight(
  input: WrapMetricsInput,
  row: number,
  wrapColumnIndices: number[],
): number {
  let height = resolveRowHeight(input.rowHeight, row)
  const minRow = height
  for (const col of wrapColumnIndices) {
    const column = input.columns[col]!
    const cell = input.getCellContent([col, row])
    const label = String(cell.data)
    const lines = measureWrappedLineCount(
      label,
      contentWidthForColumn(column.width),
      false,
    )
    height = Math.max(height, heightForWrappedLines(lines, minRow))
  }
  return height
}

/** Canvas-estimated body row heights when any column uses wrap. */
export function buildWrapRowHeightsArray(input: WrapMetricsInput): Float64Array {
  const { rowCount } = input
  const heights = new Float64Array(rowCount)
  const wrapCols = wrapColumnIndicesFor(input.columns, input.cellTextOverflow)
  for (let row = 0; row < rowCount; row++) {
    heights[row] = estimateWrapRowHeight(input, row, wrapCols)
  }
  return heights
}

export function createWrapAwareRowMetrics(input: WrapMetricsInput): RowMetrics {
  if (!gridHasCellWrap(input.columns, input.cellTextOverflow)) {
    return createRowMetrics(input.rowCount, input.rowHeight)
  }
  const heights = buildWrapRowHeightsArray(input)
  return createRowMetrics(input.rowCount, (row) => heights[row]!)
}

export function createRowMetricsFromWrapHeights(
  rowCount: number,
  rowHeight: RowHeightSpec,
  heights: Float64Array,
): RowMetrics {
  return createRowMetrics(rowCount, (row) => {
    const measured = heights[row]
    if (measured !== undefined && measured > 0) return measured
    return resolveRowHeight(rowHeight, row)
  })
}
