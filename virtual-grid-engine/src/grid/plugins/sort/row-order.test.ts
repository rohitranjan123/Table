import { describe, expect, it } from 'vitest'
import type { ResolvedColumn } from '../../col-def'
import type { CellCoordinate, GridCell } from '../../types'
import { computeRowOrder } from './row-order'
import type { SortState } from './types'

const columns: ResolvedColumn[] = [
  { field: 'id', title: 'ID', width: 72 },
  { field: 'name', title: 'Name', width: 120 },
]

function makeGetCellContent(
  rows: Array<{ id: number; name: string }>,
): (cell: CellCoordinate) => GridCell {
  return ([col, row]) => {
    const record = rows[row]!
    if (col === 0) return { type: 'number', data: record.id }
    return { type: 'text', data: record.name }
  }
}

describe('computeRowOrder', () => {
  it('returns undefined when sort list is empty', () => {
    const order = computeRowOrder(3, columns, [], makeGetCellContent([]))
    expect(order).toBeUndefined()
  })

  it('sorts by column ascending with stable tie-break', () => {
    const data = [
      { id: 3, name: 'c' },
      { id: 1, name: 'a' },
      { id: 2, name: 'b' },
    ]
    const sort: SortState[] = [{ columnId: 'id', direction: 'asc' }]
    const order = computeRowOrder(
      data.length,
      columns,
      sort,
      makeGetCellContent(data),
    )!
    expect(order).toEqual([1, 2, 0])
  })

  it('reverses order for desc', () => {
    const data = [
      { id: 1, name: 'a' },
      { id: 3, name: 'c' },
      { id: 2, name: 'b' },
    ]
    const sort: SortState[] = [{ columnId: 'name', direction: 'desc' }]
    const order = computeRowOrder(
      data.length,
      columns,
      sort,
      makeGetCellContent(data),
    )!
    expect(order).toEqual([1, 2, 0])
  })
})
