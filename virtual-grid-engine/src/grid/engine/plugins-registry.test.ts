import { describe, expect, it } from 'vitest'
import { stripSpanCellWhenDisabled } from './plugins-registry'

describe('stripSpanCellWhenDisabled', () => {
  it('removes spanCell when cell-span module is off', () => {
    const cols = stripSpanCellWhenDisabled(
      [{ field: 'country', spanCell: true }, { field: 'age' }],
      false,
    )
    expect(cols[0]).toEqual({ field: 'country' })
    expect(cols[1]).toEqual({ field: 'age' })
  })

  it('keeps spanCell when enabled', () => {
    const cols = stripSpanCellWhenDisabled(
      [{ field: 'country', spanCell: true }],
      true,
    )
    expect(cols[0]!.spanCell).toBe(true)
  })
})
