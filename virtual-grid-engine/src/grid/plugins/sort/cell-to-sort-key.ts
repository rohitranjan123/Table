import type { GridCell } from '../../types'

/** String sort key from a body cell (Glide `cellToSortData` for text/number). */
export function cellToSortKey(cell: GridCell): string {
  switch (cell.type) {
    case 'number':
      return cell.data?.toString() ?? ''
    case 'text':
      return String(cell.data ?? '')
  }
}
