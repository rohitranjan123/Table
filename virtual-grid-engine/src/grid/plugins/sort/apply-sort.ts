import type { CellCoordinate, GridCell } from '../../types'

export interface SortedGetCellContent {
  getCellContent: (cell: CellCoordinate) => GridCell
  /** Display row → underlying data row. Identity when unsorted. */
  getOriginalRow: (displayRow: number) => number
  /** Underlying data row → display row, or -1 if not visible in order. */
  getDisplayRow: (originalRow: number) => number
  /** `order[displayRow] = originalRow`; undefined when unsorted. */
  rowOrder: readonly number[] | undefined
}

export function wrapGetCellContentForSort(
  getCellContent: (cell: CellCoordinate) => GridCell,
  rowCount: number,
  rowOrder: readonly number[] | undefined,
): SortedGetCellContent {
  if (rowOrder === undefined || rowOrder.length !== rowCount) {
    return {
      getCellContent,
      getOriginalRow: (displayRow) => displayRow,
      getDisplayRow: (originalRow) => originalRow,
      rowOrder: undefined,
    }
  }

  const displayByOriginal = new Int32Array(rowCount)
  displayByOriginal.fill(-1)
  for (let displayRow = 0; displayRow < rowCount; displayRow++) {
    displayByOriginal[rowOrder[displayRow]!] = displayRow
  }

  return {
    rowOrder,
    getOriginalRow(displayRow) {
      return rowOrder[displayRow] ?? displayRow
    },
    getDisplayRow(originalRow) {
      return displayByOriginal[originalRow] ?? -1
    },
    getCellContent([col, displayRow]) {
      const originalRow = rowOrder[displayRow] ?? displayRow
      return getCellContent([col, originalRow])
    },
  }
}
