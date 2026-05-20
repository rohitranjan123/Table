import { describe, expect, it } from 'vitest'
import type { ResolvedColumn } from '../../col-def'
import {
  findScrollableColumnAtOffset,
  getScrollingColumnX,
  resolveFrozenColumns,
} from './index'

const columns: ResolvedColumn[] = [
  { field: 'id', title: 'ID', width: 72 },
  { field: 'name', title: 'Name', width: 140 },
  { field: 'a', title: 'A', width: 100 },
  { field: 'b', title: 'B', width: 100 },
  { field: 'c', title: 'C', width: 100 },
  { field: 'd', title: 'D', width: 100 },
  { field: 'e', title: 'E', width: 100 },
  { field: 'f', title: 'F', width: 100 },
  { field: 'g', title: 'G', width: 100 },
  { field: 'h', title: 'H', width: 100 },
  { field: 'i', title: 'I', width: 100 },
  { field: 'j', title: 'J', width: 100 },
  { field: 'k', title: 'K', width: 100 },
]

describe('getScrollingColumnX with non-contiguous freeze', () => {
  it('packs scrollable columns with no gap where a left-frozen column was removed', () => {
    const freeze = resolveFrozenColumns(columns, {
      left: ['name', 'k'],
      right: ['c', 'h'],
    })

    expect(freeze.scrollableLefts[1]).toBe(-1)
    expect(freeze.scrollableLefts[12]).toBe(-1)
    expect(freeze.scrollableLefts[2]).toBe(72)
    expect(getScrollingColumnX(2, 0, freeze)).toBe(72)
    expect(getScrollingColumnX(5, 0, freeze)).toBe(272)
    expect(getScrollingColumnX(9, 0, freeze)).toBe(
      freeze.scrollableLefts[9],
    )
  })

  it('places the first scrollable column at the scroll layer origin', () => {
    const freeze = resolveFrozenColumns(columns, {
      left: ['id', 'name'],
      right: ['g', 'h'],
    })

    expect(getScrollingColumnX(2, 0, freeze)).toBe(0)
    expect(getScrollingColumnX(3, 0, freeze)).toBe(100)
  })
})

describe('findScrollableColumnAtOffset', () => {
  it('skips frozen indices when mapping strip offset to column', () => {
    const freeze = resolveFrozenColumns(columns, {
      left: ['name', 'k'],
      right: ['c', 'h'],
    })

    expect(findScrollableColumnAtOffset(72, columns, freeze)).toBe(2)
    expect(findScrollableColumnAtOffset(271, columns, freeze)).toBe(3)
  })
})
