import type { CellCoordinate, GridCell, GridColumn } from '../../types'
import { compareSortKeys } from './compare'
import { extractSortKeysForColumn } from './extract-sort-keys'
import { columnIdAtIndex } from './resolve-sort-column'
import type { SortKeyCache, SortState } from './types'

export interface ActiveSort {
  state: SortState
  columnIndex: number
  keys: readonly string[]
}

function resolveActiveSorts(
  columns: GridColumn[],
  sortStates: SortState[],
  rowCount: number,
  getCellContent: (cell: CellCoordinate) => GridCell,
  cache?: SortKeyCache,
): ActiveSort[] {
  const active: ActiveSort[] = []
  for (const state of sortStates) {
    const columnIndex = columns.findIndex(
      (col) => col.dataIndex === state.columnId,
    )
    if (columnIndex === -1) continue
    const keys = extractSortKeysForColumn(
      rowCount,
      columnIndex,
      getCellContent,
      cache,
      state.columnId,
    )
    active.push({ state, columnIndex, keys })
  }
  return active
}

/**
 * Permutation where `order[displayRow] = originalRow`.
 * Returns `undefined` when no active sorts apply.
 */
export function computeRowOrder(
  rowCount: number,
  columns: GridColumn[],
  sortStates: SortState[],
  getCellContent: (cell: CellCoordinate) => GridCell,
  cache?: SortKeyCache,
): number[] | undefined {
  const active = resolveActiveSorts(
    columns,
    sortStates,
    rowCount,
    getCellContent,
    cache,
  )
  if (active.length === 0) return undefined

  const indices = Array.from({ length: rowCount }, (_, index) => index)
  indices.sort((rowA, rowB) => {
    for (const { state, keys } of active) {
      const va = keys[rowA]!
      const vb = keys[rowB]!
      let cmp = compareSortKeys(va, vb, state.mode)
      if (cmp !== 0) {
        if (state.direction === 'desc') cmp = -cmp
        return cmp
      }
    }
    return rowA - rowB
  })

  return indices
}

export function sortStateForColumn(
  sortStates: SortState[] | undefined,
  columnId: string | undefined,
): SortState | undefined {
  if (!columnId || !sortStates?.length) return undefined
  return sortStates.find((state) => state.columnId === columnId)
}

export function sortDirectionForColumnIndex(
  columns: GridColumn[],
  sortStates: SortState[] | undefined,
  columnIndex: number,
): SortState['direction'] | undefined {
  const columnId = columnIdAtIndex(columns, columnIndex)
  return sortStateForColumn(sortStates, columnId)?.direction
}
