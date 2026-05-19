import { describe, expect, it } from 'vitest'
import { createRowMetrics } from './row-metrics'

describe('createRowMetrics', () => {
  it('uses O(1) math for fixed row height', () => {
    const metrics = createRowMetrics(1000, 28)
    expect(metrics.getRowTop(10)).toBe(280)
    expect(metrics.getRowHeight(10)).toBe(28)
    expect(metrics.findRowIndexAtOffset(280, 0)).toBe(10)
    expect(metrics.getTotalBodyHeight()).toBe(28000)
  })

  it('prefix-sums variable row height', () => {
    const rowHeight = (index: number) => (index % 5 === 0 ? 36 : 28)
    const metrics = createRowMetrics(20, rowHeight)

    let expectedTop = 0
    for (let index = 0; index < 20; index++) {
      expect(metrics.getRowTop(index)).toBe(expectedTop)
      expect(metrics.getRowHeight(index)).toBe(rowHeight(index))
      expectedTop += rowHeight(index)
    }
    expect(metrics.getTotalBodyHeight()).toBe(expectedTop)
    expect(metrics.findRowIndexAtOffset(expectedTop - 1, 0)).toBe(19)
  })
})
