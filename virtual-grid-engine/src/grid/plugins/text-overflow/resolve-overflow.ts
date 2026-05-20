import type { ResolvedColumn } from '../../col-def'
import type { CellTextOverflow } from './types'

export function resolveHeaderTextOverflow(
  column: ResolvedColumn,
  defaultOverflow: CellTextOverflow = 'ellipsis',
): CellTextOverflow {
  return column.headerTextOverflow ?? defaultOverflow
}

export function resolveCellTextOverflow(
  column: ResolvedColumn,
  defaultOverflow: CellTextOverflow = 'ellipsis',
): CellTextOverflow {
  return column.cellTextOverflow ?? defaultOverflow
}

export function gridHasHeaderWrap(
  columns: ResolvedColumn[],
  defaultOverflow: CellTextOverflow,
): boolean {
  return columns.some(
    (column) => resolveHeaderTextOverflow(column, defaultOverflow) === 'wrap',
  )
}

export function gridHasCellWrap(
  columns: ResolvedColumn[],
  defaultOverflow: CellTextOverflow,
): boolean {
  return columns.some(
    (column) => resolveCellTextOverflow(column, defaultOverflow) === 'wrap',
  )
}

export function gridHasTextOverflowVisible(
  columns: ResolvedColumn[],
  headerDefault: CellTextOverflow,
  cellDefault: CellTextOverflow,
): boolean {
  return columns.some((column) => {
    const header = resolveHeaderTextOverflow(column, headerDefault)
    const cell = resolveCellTextOverflow(column, cellDefault)
    return header === 'overflow' || cell === 'overflow'
  })
}
