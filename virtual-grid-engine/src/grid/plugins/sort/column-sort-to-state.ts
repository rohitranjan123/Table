import type { GridColumn } from '../../types'
import { resolveSortColumnIndex } from './resolve-sort-column'
import type { ColumnSort, SortState } from './types'

export function columnSortsToSortState(
  columns: GridColumn[],
  sorts: ColumnSort | ColumnSort[] | undefined,
): SortState[] {
  if (sorts === undefined) return []
  const list = Array.isArray(sorts) ? sorts : [sorts]
  const states: SortState[] = []
  for (const sort of list) {
    const columnIndex = resolveSortColumnIndex(columns, sort.column)
    if (columnIndex === -1) continue
    const columnId = columns[columnIndex]!.dataIndex
    states.push({
      columnId,
      direction: sort.direction ?? 'asc',
      mode: sort.mode,
    })
  }
  return states
}
