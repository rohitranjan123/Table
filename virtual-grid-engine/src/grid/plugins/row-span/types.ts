import type { CellCoordinate, GridCell } from '../../types'
import type { ResolvedColumn } from '../../col-def'

export interface SpanMeta {
  startRowIndex: number
  spanCount: number
  isSpannedChild: boolean
  totalHeight: number
}

export type SpanMap = Record<string, readonly SpanMeta[]>

export interface SpanSegment {
  startRowIndex: number
  spanCount: number
}

export type SpanCellCallback = (params: {
  rowIndex: number
  columnIndex: number
  columnId: string
  getCellContent: (cell: CellCoordinate) => GridCell
}) => boolean

export type SpanCellSpec = boolean | SpanCellCallback

export type SpanCellColumn = ResolvedColumn & { spanCell: SpanCellSpec }

export interface RowSpanContext {
  spanMap: SpanMap
  metaByColumnIndex: ReadonlyMap<number, readonly SpanMeta[]>
  segmentsByColumn: ReadonlyMap<number, readonly SpanSegment[]>
  columnIndices: readonly number[]
}

export interface ComputeRowSpansParams {
  rowCount: number
  columns: ResolvedColumn[]
  getCellContent: (cell: CellCoordinate) => GridCell
  rowMetrics: {
    getRowTop(index: number): number
  }
}
