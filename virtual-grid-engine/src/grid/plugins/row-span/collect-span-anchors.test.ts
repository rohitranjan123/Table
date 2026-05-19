import { describe, expect, it } from 'vitest'
import { createRowMetrics } from '../virtualization'
import type { GridColumn } from '../../types'
import { computeRowSpans } from './compute-row-spans'
import {
  collectSpanAnchorsForColumn,
  collectSpanAnchorsToPaint,
} from './collect-span-anchors'

function buildContext(rowCount: number) {
  const columns: GridColumn[] = [
    { dataIndex: 'g', title: 'G', width: 100, spanRows: true },
    { dataIndex: 'n', title: 'N', width: 100 },
  ]
  const values = ['a', 'a', 'a', 'b', 'b', 'c', 'c', 'c', 'c', 'c']
  return computeRowSpans({
    rowCount,
    columns,
    getCellContent: ([col, row]) => ({
      type: 'text',
      data: col === 0 ? (values[row] ?? '') : `n${row}`,
    }),
    rowMetrics: createRowMetrics(rowCount, 28),
  })!
}

describe('collectSpanAnchorsForColumn', () => {
  it('resolves child rows to anchor in visible range', () => {
    const ctx = buildContext(10)
    const anchors = collectSpanAnchorsForColumn(ctx, 0, {
      colStart: 0,
      colEnd: 1,
      rowStart: 1,
      rowEnd: 2,
    })
    expect(anchors.has(0)).toBe(true)
    expect(anchors.size).toBe(1)
  })

  it('includes anchor above viewport when span bleeds in', () => {
    const ctx = buildContext(10)
    const anchors = collectSpanAnchorsForColumn(ctx, 0, {
      colStart: 0,
      colEnd: 1,
      rowStart: 4,
      rowEnd: 5,
    })
    expect(anchors.has(3)).toBe(true)
  })

  it('does not include anchors fully above viewport', () => {
    const ctx = buildContext(10)
    const anchors = collectSpanAnchorsForColumn(ctx, 0, {
      colStart: 0,
      colEnd: 1,
      rowStart: 6,
      rowEnd: 9,
    })
    expect(anchors.has(0)).toBe(false)
    expect(anchors.has(3)).toBe(false)
    expect(anchors.has(5)).toBe(true)
  })
})

describe('collectSpanAnchorsToPaint', () => {
  it('only includes spanning columns in column range', () => {
    const ctx = buildContext(10)
    const map = collectSpanAnchorsToPaint(ctx, {
      colStart: 0,
      colEnd: 1,
      rowStart: 0,
      rowEnd: 2,
    })
    expect(map.has(0)).toBe(true)
    expect(map.has(1)).toBe(false)
  })
})
