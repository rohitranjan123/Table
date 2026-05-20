import type { GridColumn } from '../../types'

/** Columns are sortable unless `sortable: false`. */
export function isSortableColumn(column: GridColumn): boolean {
  return column.sortable !== false
}
