import type { CellCoordinate, ColDef, DefaultColDef, GridCell, SortState } from './types'
import type { SpanCellSpec } from './plugins/row-span'

const MIN_FLEX_WIDTH = 48

/** Column after merging `defaultColDef` and resolving layout width. */
export interface ResolvedColumn {
  field: string
  title: string
  width: number
  spanCell?: SpanCellSpec
  headerTextOverflow?: ColDef['headerTextOverflow']
  cellTextOverflow?: ColDef['cellTextOverflow']
  sortable?: boolean
}

export function mergeColDefs(
  columnDefs: readonly ColDef[],
  defaultColDef?: DefaultColDef,
): ResolvedColumn[] {
  return columnDefs.map((col) => {
    const merged = { ...defaultColDef, ...col }
    return {
      field: merged.field,
      title: merged.headerName ?? merged.field,
      width: merged.width ?? 0,
      spanCell: merged.spanCell,
      headerTextOverflow: merged.headerTextOverflow,
      cellTextOverflow: merged.cellTextOverflow,
      sortable: merged.sortable,
    }
  })
}

export function colDefsToSortState(columns: readonly ColDef[]): SortState[] {
  const states: SortState[] = []
  for (const col of columns) {
    if (col.sort === undefined) continue
    states.push({
      columnId: col.field,
      direction: col.sort,
      mode: 'smart',
    })
  }
  return states
}

/**
 * Assign pixel widths: fixed `width` columns first, then distribute remaining
 * viewport among `flex` columns (from merged defs).
 */
export function resolveColumnWidths(
  columnDefs: readonly ColDef[],
  defaultColDef: DefaultColDef | undefined,
  viewportWidth: number,
): ResolvedColumn[] {
  const merged = mergeColDefs(columnDefs, defaultColDef)
  if (merged.length === 0 || viewportWidth <= 0) return merged

  const flexIndices: number[] = []
  let fixedTotal = 0
  let flexSum = 0

  for (let i = 0; i < columnDefs.length; i++) {
    const col = { ...defaultColDef, ...columnDefs[i] }
    if (col.flex !== undefined && col.flex > 0) {
      flexIndices.push(i)
      flexSum += col.flex
    } else if (col.width !== undefined && col.width > 0) {
      merged[i]!.width = col.width
      fixedTotal += col.width
    } else if (merged[i]!.width > 0) {
      fixedTotal += merged[i]!.width
    } else {
      flexIndices.push(i)
      flexSum += 1
    }
  }

  const remaining = Math.max(0, viewportWidth - fixedTotal)
  if (flexIndices.length > 0 && flexSum > 0) {
    let assigned = 0
    for (let j = 0; j < flexIndices.length; j++) {
      const i = flexIndices[j]!
      const col = { ...defaultColDef, ...columnDefs[i] }
      const flex = col.flex !== undefined && col.flex > 0 ? col.flex : 1
      const isLast = j === flexIndices.length - 1
      const w = isLast
        ? Math.max(MIN_FLEX_WIDTH, remaining - assigned)
        : Math.max(
            MIN_FLEX_WIDTH,
            Math.floor((remaining * flex) / flexSum),
          )
      merged[i]!.width = w
      if (!isLast) assigned += w
    }
  } else if (flexIndices.length > 0) {
    const each = Math.max(MIN_FLEX_WIDTH, Math.floor(viewportWidth / merged.length))
    for (const i of flexIndices) {
      merged[i]!.width = each
    }
  }

  for (const col of merged) {
    if (col.width <= 0) col.width = MIN_FLEX_WIDTH
  }

  return merged
}

export function createGetCellContentFromRowData(
  rowData: readonly Record<string, unknown>[],
  columns: readonly ResolvedColumn[],
): (cell: CellCoordinate) => GridCell {
  const fieldByCol = columns.map((c) => c.field)
  return ([col, row]: CellCoordinate) => {
    const record = rowData[row]
    const field = fieldByCol[col]
    if (!record || !field) return { type: 'text', data: '' }
    const value = record[field]
    if (typeof value === 'number') return { type: 'number', data: value }
    if (value == null) return { type: 'text', data: '' }
    return { type: 'text', data: String(value) }
  }
}

export function pinnedToFrozenColumns(
  columnDefs: readonly ColDef[],
): { left?: string[]; right?: string[] } | undefined {
  const left: string[] = []
  const right: string[] = []
  for (const col of columnDefs) {
    if (col.pinned === 'left') left.push(col.field)
    if (col.pinned === 'right') right.push(col.field)
  }
  if (left.length === 0 && right.length === 0) return undefined
  return {
    ...(left.length > 0 ? { left } : {}),
    ...(right.length > 0 ? { right } : {}),
  }
}

/** Column field order — detects reorder for column-move animation. */
export function columnsOrderKey(columns: readonly ResolvedColumn[]): string {
  return columns.map((c) => c.field).join('\u0001')
}

/** Field + rounded width in column order (React sync / ordered layout fingerprint). */
export function columnsLayoutKey(columns: readonly ResolvedColumn[]): string {
  return columns.map((c) => `${c.field}:${Math.round(c.width)}`).join('\u0001')
}

/** Per-field widths, order-independent — distinguishes resize from reorder. */
export function columnsWidthsKey(columns: readonly ResolvedColumn[]): string {
  return columns
    .map((c) => `${c.field}:${Math.round(c.width)}`)
    .sort()
    .join('\u0001')
}

/** True when active sort columns keep the same column indices after a reorder. */
export function sortColumnIndicesUnchanged(
  prevColumns: readonly ResolvedColumn[],
  nextColumns: readonly ResolvedColumn[],
  sortState: readonly SortState[],
): boolean {
  for (const state of sortState) {
    const prevIdx = prevColumns.findIndex((c) => c.field === state.columnId)
    const nextIdx = nextColumns.findIndex((c) => c.field === state.columnId)
    if (prevIdx !== nextIdx) return false
  }
  return true
}
