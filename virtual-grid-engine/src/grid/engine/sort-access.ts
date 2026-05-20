import {
  computeRowOrder,
  createSortKeyCache,
  wrapGetCellContentForSort,
  type SortKeyCache,
} from '../plugins'
import type { CellCoordinate, GridCell, GridColumn, SortState } from '../types'

export interface SortAccess {
  getCellContent: (cell: CellCoordinate) => GridCell
  getOriginalRow: (displayRow: number) => number
  rowOrder: readonly number[] | undefined
  cache: SortKeyCache
  rebuild(
    rowCount: number,
    columns: GridColumn[],
    sortState: SortState[],
    getCellContent: (cell: CellCoordinate) => GridCell,
    clearCache: boolean,
  ): void
}

export function createSortAccess(): SortAccess {
  const cache = createSortKeyCache()
  let wrapped = wrapGetCellContentForSort(
    () => ({ type: 'text', data: '' }),
    0,
    undefined,
  )

  return {
    get getCellContent() {
      return wrapped.getCellContent
    },
    get getOriginalRow() {
      return wrapped.getOriginalRow
    },
    get rowOrder() {
      return wrapped.rowOrder
    },
    cache,
    rebuild(rowCount, columns, sortState, getCellContent, clearCache) {
      if (clearCache) cache.clear()
      const rowOrder = computeRowOrder(
        rowCount,
        columns,
        sortState,
        getCellContent,
        cache,
      )
      wrapped = wrapGetCellContentForSort(
        getCellContent,
        rowCount,
        rowOrder,
      )
    },
  }
}
