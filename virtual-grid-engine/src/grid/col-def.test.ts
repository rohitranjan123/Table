import { describe, expect, it } from 'vitest'
import type { ResolvedColumn } from './col-def'
import {
  columnsLayoutKey,
  columnsWidthsKey,
  sortColumnIndicesUnchanged,
} from './col-def'

const cols = (fields: string[]): ResolvedColumn[] =>
  fields.map((field) => ({ field, title: field, width: 120 }))

describe('columnsWidthsKey', () => {
  it('is unchanged when only column order changes', () => {
    const a = cols(['country', 'year', 'age', 'total'])
    const b = cols(['country', 'year', 'total', 'age'])
    expect(columnsLayoutKey(a)).not.toBe(columnsLayoutKey(b))
    expect(columnsWidthsKey(a)).toBe(columnsWidthsKey(b))
  })

  it('detects when sort column indices change vs reorder only', () => {
    const a = cols(['country', 'year', 'age', 'total'])
    const b = cols(['country', 'year', 'total', 'age'])
    const sort = [{ columnId: 'country', direction: 'asc' as const, mode: 'smart' as const }]
    expect(sortColumnIndicesUnchanged(a, b, sort)).toBe(true)
    const c = cols(['year', 'country', 'age', 'total'])
    expect(sortColumnIndicesUnchanged(a, c, sort)).toBe(false)
  })

  it('changes when a column width changes', () => {
    const a = cols(['age', 'total'])
    const b: ResolvedColumn[] = [
      { field: 'age', title: 'age', width: 120 },
      { field: 'total', title: 'total', width: 200 },
    ]
    expect(columnsWidthsKey(a)).not.toBe(columnsWidthsKey(b))
  })
})
