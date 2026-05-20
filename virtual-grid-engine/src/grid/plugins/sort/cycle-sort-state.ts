import type { ResolvedColumn } from '../../col-def'
import { isSortableColumn } from './is-sortable'
import { columnIdAtIndex } from './resolve-sort-column'
import type { SortState } from './types'

/**
 * Cycle sort for one column: none → asc → desc → none.
 * Without `multi`, replaces the whole sort list (AG Grid default click).
 * With `multi` (shift-click), toggles that column in the sort list.
 */
export function cycleSortState(
  columns: ResolvedColumn[],
  columnIndex: number,
  current: SortState[],
  multi = false,
): SortState[] {
  const column = columns[columnIndex]
  if (!column || !isSortableColumn(column)) return current

  const columnId = column.field
  const existingIndex = current.findIndex((state) => state.columnId === columnId)

  if (existingIndex === -1) {
    const next: SortState = { columnId, direction: 'asc' }
    return multi ? [...current, next] : [next]
  }

  const existing = current[existingIndex]!
  if (existing.direction === 'asc') {
    const updated: SortState = { ...existing, direction: 'desc' }
    if (multi) {
      const copy = [...current]
      copy[existingIndex] = updated
      return copy
    }
    return [updated]
  }

  if (multi) {
    return current.filter((_, index) => index !== existingIndex)
  }
  return []
}

export function sortStateFromColumnIndex(
  columns: ResolvedColumn[],
  columnIndex: number,
): SortState | undefined {
  const columnId = columnIdAtIndex(columns, columnIndex)
  if (!columnId) return undefined
  const column = columns[columnIndex]
  if (!column || !isSortableColumn(column)) return undefined
  return { columnId, direction: 'asc' }
}
