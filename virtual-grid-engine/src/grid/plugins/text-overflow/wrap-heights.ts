import type { CellCoordinate, GridCell, GridColumn, RowHeightSpec } from '../../types'
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
  columns: GridColumn[]
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

export function createWrapAwareRowMetrics(input: WrapMetricsInput): RowMetrics {
  if (!gridHasCellWrap(input.columns, input.cellTextOverflow)) {
    return createRowMetrics(input.rowCount, input.rowHeight)
  }

  const wrapColumnIndices: number[] = []
  for (let col = 0; col < input.columns.length; col++) {
    if (
      resolveCellTextOverflow(
        input.columns[col]!,
        input.cellTextOverflow,
      ) === 'wrap'
    ) {
      wrapColumnIndices.push(col)
    }
  }

  const rowHeightForIndex = (row: number): number => {
    let height = resolveRowHeight(input.rowHeight, row)
    for (const col of wrapColumnIndices) {
      const column = input.columns[col]!
      const cell = input.getCellContent([col, row])
      const label = String(cell.data)
      const lines = measureWrappedLineCount(
        label,
        contentWidthForColumn(column.width),
        false,
      )
      height = Math.max(
        height,
        heightForWrappedLines(lines, resolveRowHeight(input.rowHeight, row)),
      )
    }
    return height
  }

  return createRowMetrics(input.rowCount, rowHeightForIndex)
}
