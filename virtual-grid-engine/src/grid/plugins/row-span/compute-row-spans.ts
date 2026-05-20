import type { ResolvedColumn } from '../../col-def'
import type { CellCoordinate, GridCell } from '../../types'
import { getSpanningColumnIndices, hasRowSpanning } from './resolve-row-span'
import type {
  ComputeRowSpansParams,
  RowSpanContext,
  SpanMeta,
  SpanCellSpec,
  SpanSegment,
} from './types'

function cellDataEqual(a: GridCell, b: GridCell): boolean {
  return Object.is(a.data, b.data)
}

function shouldMergeWithPrevious(
  spec: SpanCellSpec,
  columnIndex: number,
  columnId: string,
  anchorRow: number,
  rowIndex: number,
  getCellContent: (cell: CellCoordinate) => GridCell,
): boolean {
  if (rowIndex <= anchorRow) return false

  if (spec === true) {
    const prev = getCellContent([columnIndex, rowIndex - 1])
    const curr = getCellContent([columnIndex, rowIndex])
    return cellDataEqual(prev, curr)
  }

  if (typeof spec === 'function') {
    return spec({
      rowIndex,
      columnIndex,
      columnId,
      getCellContent,
    })
  }

  return false
}

function spanHeight(
  rowMetrics: ComputeRowSpansParams['rowMetrics'],
  anchor: number,
  spanCount: number,
): number {
  return rowMetrics.getRowTop(anchor + spanCount) - rowMetrics.getRowTop(anchor)
}

function buildColumnSpan(
  columnIndex: number,
  column: ResolvedColumn,
  rowCount: number,
  getCellContent: (cell: CellCoordinate) => GridCell,
  rowMetrics: ComputeRowSpansParams['rowMetrics'],
): { meta: SpanMeta[]; segments: SpanSegment[] } {
  const spec = column.spanCell
  if (spec === undefined) {
    return { meta: [], segments: [] }
  }

  const meta: SpanMeta[] = new Array(rowCount)
  const segments: SpanSegment[] = []
  const columnId = column.field

  for (let row = 0; row < rowCount; ) {
    const anchor = row
    let count = 1
    while (
      row + count < rowCount &&
      shouldMergeWithPrevious(
        spec,
        columnIndex,
        columnId,
        anchor,
        row + count,
        getCellContent,
      )
    ) {
      count += 1
    }

    const totalHeight = spanHeight(rowMetrics, anchor, count)
    segments.push({ startRowIndex: anchor, spanCount: count })

    meta[anchor] = {
      startRowIndex: anchor,
      spanCount: count,
      isSpannedChild: false,
      totalHeight,
    }

    for (let child = anchor + 1; child < anchor + count; child++) {
      meta[child] = {
        startRowIndex: anchor,
        spanCount: 0,
        isSpannedChild: true,
        totalHeight: 0,
      }
    }

    row = anchor + count
  }

  return { meta, segments }
}

export function computeRowSpans(
  params: ComputeRowSpansParams,
): RowSpanContext | null {
  const { rowCount, columns, getCellContent, rowMetrics } = params

  if (!hasRowSpanning(columns) || rowCount <= 0) {
    return null
  }

  const columnIndices = getSpanningColumnIndices(columns)
  const spanMap: Record<string, readonly SpanMeta[]> = {}
  const metaByColumnIndex = new Map<number, readonly SpanMeta[]>()
  const segmentsByColumn = new Map<number, readonly SpanSegment[]>()

  for (const columnIndex of columnIndices) {
    const column = columns[columnIndex]
    const { meta, segments } = buildColumnSpan(
      columnIndex,
      column,
      rowCount,
      getCellContent,
      rowMetrics,
    )
    spanMap[column.field] = meta
    metaByColumnIndex.set(columnIndex, meta)
    segmentsByColumn.set(columnIndex, segments)
  }

  return { spanMap, metaByColumnIndex, segmentsByColumn, columnIndices }
}
