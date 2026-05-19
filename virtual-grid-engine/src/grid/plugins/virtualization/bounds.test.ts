import { describe, expect, it } from 'vitest'
import { resolveFrozenColumns } from '../freeze-columns'
import {
  computeVisibleBounds,
  isVirtualizationEnabled,
  MAX_NON_VIRTUAL_CELLS,
  OVERSCAN_COLS,
  resetVirtualizationWarningForTests,
} from './index'
import type { GridColumn } from '../../types'

function demoColumns(count: number): GridColumn[] {
  const cols: GridColumn[] = []
  for (let i = 0; i < count; i++) {
    cols.push({ dataIndex: `c${i}`, title: `C${i}`, width: 100 })
  }
  return cols
}

describe('computeVisibleBounds', () => {
  it('keeps a narrow window when scrolled far right with frozen columns', () => {
    const columns = demoColumns(1250)
    const scrollLeft = 50_000
    const viewportWidth = 900
    const freeze = resolveFrozenColumns(columns, { left: ['c0', 'c1'] })
    const scrollW = viewportWidth - freeze.leftWidth

    const { bounds } = computeVisibleBounds({
      scrollLeft,
      scrollTop: 0,
      viewportWidth,
      viewportHeight: 480,
      headerHeight: 36,
      rowCount: 100,
      rowHeight: 28,
      columns,
      freeze,
      rowHint: 0,
      virtualization: true,
    })

    const contentLeft = scrollLeft
    const expectedStart = Math.floor(contentLeft / 100)
    expect(bounds.colStart).toBeGreaterThanOrEqual(expectedStart - OVERSCAN_COLS)
    expect(bounds.colStart).toBeGreaterThan(1)
    expect(bounds.colEnd - bounds.colStart).toBeLessThan(30)
    expect(bounds.colEnd).toBeLessThanOrEqual(
      Math.ceil((contentLeft + scrollW) / 100) + OVERSCAN_COLS + 2,
    )
  })

  it('returns full range when virtualization is disabled', () => {
    const columns = demoColumns(20)
    const freeze = resolveFrozenColumns(columns, { left: ['c0'] })

    const { bounds } = computeVisibleBounds({
      scrollLeft: 0,
      scrollTop: 0,
      viewportWidth: 400,
      viewportHeight: 200,
      headerHeight: 36,
      rowCount: 50,
      rowHeight: 28,
      columns,
      freeze,
      rowHint: 0,
      virtualization: false,
    })

    expect(bounds).toEqual({
      colStart: 0,
      colEnd: 19,
      rowStart: 0,
      rowEnd: 49,
    })
  })
})

describe('isVirtualizationEnabled', () => {
  it('forces windowing when the grid is too large for full paint', () => {
    resetVirtualizationWarningForTests()
    expect(isVirtualizationEnabled(false, 100_000, 1250)).toBe(true)
    expect(isVirtualizationEnabled(false, 100, 100)).toBe(false)
    expect(100 * 100).toBeLessThanOrEqual(MAX_NON_VIRTUAL_CELLS)
  })
})

describe('resolveFrozenColumns', () => {
  it('resolves dataIndex keys to column indices in order', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'id', title: 'ID', width: 72 },
      { dataIndex: 'name', title: 'Name', width: 140 },
      { dataIndex: 'extra', title: 'Extra', width: 100 },
    ]
    const freeze = resolveFrozenColumns(columns, {
      left: ['name', 'id'],
      right: ['extra'],
    })
    expect(freeze.left).toEqual([1, 0])
    expect(freeze.right).toEqual([2])
    expect(freeze.leftWidth).toBe(212)
    expect(freeze.rightWidth).toBe(100)
  })
})
