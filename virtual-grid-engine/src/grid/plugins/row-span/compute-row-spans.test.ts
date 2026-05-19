import { describe, expect, it } from 'vitest'
import { createRowMetrics } from '../virtualization'
import type { GridCell, GridColumn } from '../../types'
import { computeRowSpans } from './compute-row-spans'

function cell(data: string | number): GridCell {
  return { type: 'text', data }
}

describe('computeRowSpans', () => {
  it('returns null when no column has spanRows', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'a', title: 'A', width: 100 },
    ]
    const result = computeRowSpans({
      rowCount: 10,
      columns,
      getCellContent: () => cell('x'),
      rowMetrics: createRowMetrics(10, 28),
    })
    expect(result).toBeNull()
  })

  it('merges contiguous equal values when spanRows is true', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'g', title: 'G', width: 100, spanRows: true },
    ]
    const values = ['a', 'a', 'a', 'b', 'b']
    const result = computeRowSpans({
      rowCount: 5,
      columns,
      getCellContent: ([, row]) => cell(values[row] ?? ''),
      rowMetrics: createRowMetrics(5, 28),
    })

    expect(result).not.toBeNull()
    const meta = result!.spanMap.g!
    expect(meta[0]).toMatchObject({
      startRowIndex: 0,
      spanCount: 3,
      isSpannedChild: false,
      totalHeight: 84,
    })
    expect(meta[1].isSpannedChild).toBe(true)
    expect(meta[2].isSpannedChild).toBe(true)
    expect(meta[3]).toMatchObject({
      startRowIndex: 3,
      spanCount: 2,
      isSpannedChild: false,
      totalHeight: 56,
    })
    expect(meta[4].isSpannedChild).toBe(true)
  })

  it('uses callback spanRows to extend runs', () => {
    const columns: GridColumn[] = [
      {
        dataIndex: 'g',
        title: 'G',
        width: 100,
        spanRows: ({ rowIndex }) => rowIndex % 2 === 1,
      },
    ]
    const result = computeRowSpans({
      rowCount: 6,
      columns,
      getCellContent: ([, row]) => cell(row),
      rowMetrics: createRowMetrics(6, 10),
    })

    const meta = result!.spanMap.g!
    expect(meta[0].spanCount).toBe(2)
    expect(meta[0].totalHeight).toBe(20)
    expect(meta[2].spanCount).toBe(2)
    expect(meta[4].spanCount).toBe(2)
  })

  it('computes totalHeight with variable rowHeight', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'g', title: 'G', width: 100, spanRows: true },
    ]
    const rowHeight = (i: number) => (i % 2 === 0 ? 40 : 20)
    const rowMetrics = createRowMetrics(4, rowHeight)
    const result = computeRowSpans({
      rowCount: 4,
      columns,
      getCellContent: () => cell('same'),
      rowMetrics,
    })

    const meta = result!.spanMap.g!
    expect(meta[0].totalHeight).toBe(
      rowMetrics.getRowTop(4) - rowMetrics.getRowTop(0),
    )
    expect(meta[0].totalHeight).toBe(120)
  })

  it('returns null for zero rowCount', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'g', title: 'G', width: 100, spanRows: true },
    ]
    const result = computeRowSpans({
      rowCount: 0,
      columns,
      getCellContent: () => cell('x'),
      rowMetrics: createRowMetrics(0, 28),
    })
    expect(result).toBeNull()
  })

  it('stores segments for bleed-from-above scans', () => {
    const columns: GridColumn[] = [
      { dataIndex: 'g', title: 'G', width: 100, spanRows: true },
    ]
    const result = computeRowSpans({
      rowCount: 5,
      columns,
      getCellContent: () => cell('x'),
      rowMetrics: createRowMetrics(5, 28),
    })
    const segments = result!.segmentsByColumn.get(0)
    expect(segments).toEqual([{ startRowIndex: 0, spanCount: 5 }])
  })
})
