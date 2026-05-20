import type { ResolvedColumn } from '../../col-def'

/** Columns are sortable unless `sortable: false`. */
export function isSortableColumn(column: ResolvedColumn): boolean {
  return column.sortable !== false
}
