import { describe, expect, it } from 'vitest'
import type { ResolvedColumn } from '../../col-def'
import {
  computeEffectiveHeaderHeight,
  createWrapAwareRowMetrics,
} from './wrap-heights'

const columns: ResolvedColumn[] = [
  {
    field: 'id',
    title: 'ID',
    width: 60,
  },
  {
    field: 'notes',
    title: 'Long header title that should wrap',
    width: 80,
    headerTextOverflow: 'wrap',
    cellTextOverflow: 'wrap',
  },
]

describe('wrap-heights', () => {
  it('grows header height when a header uses wrap', () => {
    const height = computeEffectiveHeaderHeight({
      columns,
      rowCount: 0,
      rowHeight: 28,
      headerHeight: 32,
      headerTextOverflow: 'ellipsis',
      cellTextOverflow: 'ellipsis',
      getCellContent: () => ({ type: 'text', data: '' }),
    })
    expect(height).toBeGreaterThan(32)
  })

  it('grows row height for wrap columns with long content', () => {
    const metrics = createWrapAwareRowMetrics({
      columns,
      rowCount: 1,
      rowHeight: 28,
      headerHeight: 32,
      headerTextOverflow: 'ellipsis',
      cellTextOverflow: 'ellipsis',
      getCellContent: ([col]) =>
        col === 1
          ? {
              type: 'text',
              data: 'This is a long note that should wrap across multiple lines',
            }
          : { type: 'text', data: '1' },
    })
    expect(metrics.getRowHeight(0)).toBeGreaterThan(28)
  })

  it('uses fixed row metrics when no wrap columns', () => {
    const metrics = createWrapAwareRowMetrics({
      columns: [columns[0]!],
      rowCount: 3,
      rowHeight: 28,
      headerHeight: 32,
      headerTextOverflow: 'ellipsis',
      cellTextOverflow: 'ellipsis',
      getCellContent: () => ({ type: 'text', data: 'x' }),
    })
    expect(metrics.getRowHeight(0)).toBe(28)
    expect(metrics.getTotalBodyHeight()).toBe(84)
  })
})
