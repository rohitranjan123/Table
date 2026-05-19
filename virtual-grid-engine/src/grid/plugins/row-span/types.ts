import type { CellCoordinate, GridCell, GridColumn } from '../../types'

export interface SpanMeta {
  startRowIndex: number
  spanCount: number
  isSpannedChild: boolean
  totalHeight: number
}

export type SpanMap = Record<string, readonly SpanMeta[]>

/** Compact anchor segments for bleed-from-above scans without O(n) per frame. */
export interface SpanSegment {
  startRowIndex: number
  spanCount: number
}

export type SpanRowsCallback = (params: {
  rowIndex: number
  columnIndex: number
  columnId: string
  getCellContent: (cell: CellCoordinate) => GridCell
}) => boolean

export type SpanRowsSpec = boolean | SpanRowsCallback

export type SpanRowsColumn = GridColumn & { spanRows: SpanRowsSpec }

export interface RowSpanContext {
  spanMap: SpanMap
  metaByColumnIndex: ReadonlyMap<number, readonly SpanMeta[]>
  segmentsByColumn: ReadonlyMap<number, readonly SpanSegment[]>
  columnIndices: readonly number[]
}

export interface ComputeRowSpansParams {
  rowCount: number
  columns: GridColumn[]
  getCellContent: (cell: CellCoordinate) => GridCell
  rowMetrics: {
    getRowTop(index: number): number
  }
}
