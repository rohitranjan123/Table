import type { GridColumn } from '../../types'

export function resolveSortColumnIndex(
  columns: GridColumn[],
  column: GridColumn | string,
): number {
  if (typeof column === 'string') {
    return columns.findIndex((col) => col.dataIndex === column)
  }
  const byRef = columns.indexOf(column)
  if (byRef !== -1) return byRef
  if (column.dataIndex) {
    return columns.findIndex((col) => col.dataIndex === column.dataIndex)
  }
  return -1
}

export function columnIdAtIndex(
  columns: GridColumn[],
  columnIndex: number,
): string | undefined {
  return columns[columnIndex]?.dataIndex
}
