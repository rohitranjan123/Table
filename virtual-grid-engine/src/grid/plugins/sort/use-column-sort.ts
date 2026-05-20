import * as React from 'react'
import type { CellCoordinate, GridCell, GridColumn } from '../../types'
import { wrapGetCellContentForSort } from './apply-sort'
import { columnSortsToSortState } from './column-sort-to-state'
import { computeRowOrder } from './row-order'
import type { ColumnSort } from './types'

export interface UseColumnSortParams {
  columns: GridColumn[]
  rowCount: number
  getCellContent: (cell: CellCoordinate) => GridCell
  sort?: ColumnSort | ColumnSort[]
}

export interface UseColumnSortResult {
  getCellContent: (cell: CellCoordinate) => GridCell
  /** Map display row index → original data row index. */
  getOriginalRow: (displayRow: number) => number
}

/**
 * React hook — Glide `useColumnSort` pattern: reorder rows by extracting sort keys
 * from `getCellContent` without mutating underlying data.
 */
export function useColumnSort(params: UseColumnSortParams): UseColumnSortResult {
  const { columns, rowCount, getCellContent: getCellContentIn, sort } = params

  const sortStates = React.useMemo(
    () => columnSortsToSortState(columns, sort),
    [columns, sort],
  )

  const rowOrder = React.useMemo(
    () =>
      computeRowOrder(rowCount, columns, sortStates, getCellContentIn),
    [rowCount, columns, sortStates, getCellContentIn],
  )

  const wrapped = React.useMemo(
    () => wrapGetCellContentForSort(getCellContentIn, rowCount, rowOrder),
    [getCellContentIn, rowCount, rowOrder],
  )

  const getOriginalRow = React.useCallback(
    (displayRow: number) => wrapped.getOriginalRow(displayRow),
    [wrapped],
  )

  const getCellContent = React.useCallback(
    (cell: CellCoordinate) => wrapped.getCellContent(cell),
    [wrapped],
  )

  return { getCellContent, getOriginalRow }
}
