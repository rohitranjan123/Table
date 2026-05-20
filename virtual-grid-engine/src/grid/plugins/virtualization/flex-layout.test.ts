import { describe, expect, it } from 'vitest'
import { resolveColumnWidths } from '../../col-def'

describe('resolveColumnWidths flex', () => {
  it('distributes remaining viewport equally when flex: 1', () => {
    const columns = resolveColumnWidths(
      [
        { field: 'a', flex: 1 },
        { field: 'b', flex: 1 },
        { field: 'c', flex: 1 },
      ],
      undefined,
      300,
    )
    expect(columns.map((c) => c.width)).toEqual([100, 100, 100])
  })

  it('allocates fixed width before flex', () => {
    const columns = resolveColumnWidths(
      [
        { field: 'id', width: 60 },
        { field: 'name', flex: 2 },
        { field: 'note', flex: 1 },
      ],
      undefined,
      360,
    )
    expect(columns[0]!.width).toBe(60)
    expect(columns[1]!.width).toBe(200)
    expect(columns[2]!.width).toBe(100)
  })
})
