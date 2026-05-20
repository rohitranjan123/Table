import type { ResolvedColumn } from '../../col-def'
import type { ColDef } from '../../types'

export function resolveSortColumnIndex(
  columns: ResolvedColumn[],
  column: ColDef | ResolvedColumn | string,
): number {
  if (typeof column === 'string') {
    return columns.findIndex((col) => col.field === column)
  }
  const byRef = columns.indexOf(column as ResolvedColumn)
  if (byRef !== -1) return byRef
  const field = 'field' in column ? column.field : undefined
  if (field) {
    return columns.findIndex((col) => col.field === field)
  }
  return -1
}

export function columnIdAtIndex(
  columns: ResolvedColumn[],
  columnIndex: number,
): string | undefined {
  return columns[columnIndex]?.field
}
