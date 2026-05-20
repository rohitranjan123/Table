import type { CellCoordinate, GridCell } from '../../types'
import { cellToSortKey } from './cell-to-sort-key'
import type { SortKeyCache } from './types'

export function extractSortKeysForColumn(
  rowCount: number,
  columnIndex: number,
  getCellContent: (cell: CellCoordinate) => GridCell,
  cache?: SortKeyCache,
  columnId?: string,
): string[] {
  if (cache && columnId) {
    const cached = cache.get(columnId)
    if (cached && cached.length === rowCount) {
      return cached as string[]
    }
  }

  const keys = new Array<string>(rowCount)
  for (let row = 0; row < rowCount; row++) {
    keys[row] = cellToSortKey(getCellContent([columnIndex, row]))
  }

  if (cache && columnId) {
    cache.set(columnId, keys)
  }
  return keys
}
