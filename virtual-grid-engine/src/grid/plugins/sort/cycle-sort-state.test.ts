import { describe, expect, it } from 'vitest'
import type { GridColumn } from '../../types'
import { cycleSortState } from './cycle-sort-state'

const columns: GridColumn[] = [
  { dataIndex: 'a', title: 'A', width: 80 },
  { dataIndex: 'b', title: 'B', width: 80, sortable: false },
]

describe('cycleSortState', () => {
  it('cycles none → asc → desc → none', () => {
    expect(cycleSortState(columns, 0, [])).toEqual([
      { columnId: 'a', direction: 'asc' },
    ])
    expect(
      cycleSortState(columns, 0, [{ columnId: 'a', direction: 'asc' }]),
    ).toEqual([{ columnId: 'a', direction: 'desc' }])
    expect(
      cycleSortState(columns, 0, [{ columnId: 'a', direction: 'desc' }]),
    ).toEqual([])
  })

  it('ignores non-sortable columns', () => {
    expect(cycleSortState(columns, 1, [])).toEqual([])
  })
})
