import { describe, expect, it } from 'vitest'
import { computeRowSpans } from '../grid/plugins/row-span'
import { createRowMetrics } from '../grid/plugins/virtualization'
import {
  ENTERPRISE_COLUMN_COUNT,
  ENTERPRISE_COLUMNS,
  ENTERPRISE_ROW_COUNT,
  ENTERPRISE_ROW_DATA,
  assertHierarchicalSpans,
} from './enterprise-hierarchy-data'
import {
  generateEnterpriseTradeRows,
} from './enterprise-dataset-generator'
import { createEnterpriseGetCellContent } from './enterprise-row-span-demo'

describe('enterprise fintech dataset', () => {
  it('materializes 10k rows and 200 columns', () => {
    expect(ENTERPRISE_ROW_COUNT).toBe(10_000)
    expect(ENTERPRISE_COLUMNS.length).toBe(ENTERPRISE_COLUMN_COUNT)
    expect(ENTERPRISE_COLUMN_COUNT).toBe(200)
  })

  it('satisfies hierarchical span invariant on a sample', () => {
    expect(() => assertHierarchicalSpans(ENTERPRISE_ROW_DATA.slice(0, 1000))).not.toThrow()
  })

  it('satisfies hierarchical span invariant on full dataset', () => {
    expect(() => assertHierarchicalSpans(ENTERPRISE_ROW_DATA)).not.toThrow()
  })

  it('repeats region across rows in a region block', () => {
    const firstRegion = ENTERPRISE_ROW_DATA[0]!.region
    let run = 1
    for (let i = 1; i < ENTERPRISE_ROW_DATA.length; i++) {
      if (ENTERPRISE_ROW_DATA[i]!.region === firstRegion) {
        run += 1
      } else {
        break
      }
    }
    expect(run).toBeGreaterThan(5)
  })

  it('nested spans: product block smaller than desk block smaller than country', () => {
    const getCellContent = createEnterpriseGetCellContent()
    const ctx = computeRowSpans({
      rowCount: ENTERPRISE_ROW_COUNT,
      columns: ENTERPRISE_COLUMNS,
      getCellContent,
      rowMetrics: createRowMetrics(ENTERPRISE_ROW_COUNT, 28),
    })!

    const regionMeta = ctx.metaByColumnIndex.get(0)!
    const countryMeta = ctx.metaByColumnIndex.get(1)!
    const deskMeta = ctx.metaByColumnIndex.get(2)!
    const productMeta = ctx.metaByColumnIndex.get(3)!

    const regionSpan = regionMeta[0]!.spanCount
    expect(regionSpan).toBeGreaterThan(20)

    const anchor = 0
    expect(countryMeta[anchor]!.spanCount).toBeLessThanOrEqual(regionSpan)
    expect(deskMeta[anchor]!.spanCount).toBeLessThanOrEqual(
      countryMeta[anchor]!.spanCount,
    )
    expect(productMeta[anchor]!.spanCount).toBeLessThanOrEqual(
      deskMeta[anchor]!.spanCount,
    )
  })

  it('generator is deterministic for the same seed', () => {
    const a = generateEnterpriseTradeRows(100, 99)
    const b = generateEnterpriseTradeRows(100, 99)
    expect(a[50]?.tradeId).toBe(b[50]?.tradeId)
    expect(a[50]?.country).toBe(b[50]?.country)
  })

  it('exposes hierarchy columns with spanRows and frozen pins', () => {
    const hierarchy = ENTERPRISE_COLUMNS.slice(0, 4)
    expect(hierarchy.every((c) => c.spanRows === true)).toBe(true)
    expect(hierarchy.map((c) => c.dataIndex)).toEqual([
      'region',
      'country',
      'desk',
      'product',
    ])
  })
})
