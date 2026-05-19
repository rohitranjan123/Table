import type { GridColumn } from '../../types'
import type { CellTextOverflow } from './types'

export function resolveHeaderTextOverflow(
  column: GridColumn,
  defaultOverflow: CellTextOverflow = 'ellipsis',
): CellTextOverflow {
  return column.headerTextOverflow ?? defaultOverflow
}

export function resolveCellTextOverflow(
  column: GridColumn,
  defaultOverflow: CellTextOverflow = 'ellipsis',
): CellTextOverflow {
  return column.cellTextOverflow ?? defaultOverflow
}

export function gridHasHeaderWrap(
  columns: GridColumn[],
  defaultOverflow: CellTextOverflow,
): boolean {
  return columns.some(
    (column) => resolveHeaderTextOverflow(column, defaultOverflow) === 'wrap',
  )
}

export function gridHasCellWrap(
  columns: GridColumn[],
  defaultOverflow: CellTextOverflow,
): boolean {
  return columns.some(
    (column) => resolveCellTextOverflow(column, defaultOverflow) === 'wrap',
  )
}

export function gridHasTextOverflowVisible(
  columns: GridColumn[],
  headerDefault: CellTextOverflow,
  cellDefault: CellTextOverflow,
): boolean {
  return columns.some((column) => {
    const header = resolveHeaderTextOverflow(column, headerDefault)
    const cell = resolveCellTextOverflow(column, cellDefault)
    return header === 'overflow' || cell === 'overflow'
  })
}
