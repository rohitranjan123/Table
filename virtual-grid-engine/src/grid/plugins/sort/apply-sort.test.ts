import { describe, expect, it } from 'vitest'
import type { CellCoordinate, GridCell } from '../../types'
import { wrapGetCellContentForSort } from './apply-sort'

describe('wrapGetCellContentForSort', () => {
  const source: GridCell[] = [
    { type: 'text', data: 'a' },
    { type: 'text', data: 'b' },
    { type: 'text', data: 'c' },
  ]

  const getCellContent = ([, row]: CellCoordinate): GridCell => source[row]!

  it('passes through when row order is undefined', () => {
    const wrapped = wrapGetCellContentForSort(getCellContent, 3, undefined)
    expect(wrapped.getCellContent([0, 1])).toEqual({ type: 'text', data: 'b' })
    expect(wrapped.getOriginalRow(1)).toBe(1)
  })

  it('remaps display rows through permutation', () => {
    const rowOrder = [2, 0, 1]
    const wrapped = wrapGetCellContentForSort(getCellContent, 3, rowOrder)
    expect(wrapped.getCellContent([0, 0]).data).toBe('c')
    expect(wrapped.getOriginalRow(0)).toBe(2)
    expect(wrapped.getDisplayRow(2)).toBe(0)
  })
})
