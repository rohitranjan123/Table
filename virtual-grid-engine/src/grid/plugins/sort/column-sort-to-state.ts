import type { ResolvedColumn } from '../../col-def'
import { resolveSortColumnIndex } from './resolve-sort-column'
import type { ColumnSort, SortState } from './types'

export function columnSortsToSortState(
  columns: ResolvedColumn[],
  sorts: ColumnSort | ColumnSort[] | undefined,
): SortState[] {
  if (sorts === undefined) return []
  const list = Array.isArray(sorts) ? sorts : [sorts]
  const states: SortState[] = []
  for (const sort of list) {
    const columnIndex = resolveSortColumnIndex(columns, sort.column)
    if (columnIndex === -1) continue
    const columnId = columns[columnIndex]!.field
    states.push({
      columnId,
      direction: sort.direction ?? 'asc',
      mode: sort.mode,
    })
  }
  return states
}
