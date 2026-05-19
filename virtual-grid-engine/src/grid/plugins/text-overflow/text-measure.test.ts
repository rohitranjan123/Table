import { describe, expect, it } from 'vitest'
import {
  contentWidthForColumn,
  measureWrappedLineCount,
} from './text-measure'

describe('measureWrappedLineCount', () => {
  it('returns 1 for empty text', () => {
    expect(measureWrappedLineCount('', 100, false)).toBe(1)
  })

  it('wraps long unbroken tokens across lines', () => {
    const lines = measureWrappedLineCount(
      'abcdefghijklmnopqrstuvwxyz',
      40,
      false,
    )
    expect(lines).toBeGreaterThan(1)
  })

  it('counts explicit newlines', () => {
    const lines = measureWrappedLineCount('a\nb\nc', 200, false)
    expect(lines).toBe(3)
  })
})

describe('contentWidthForColumn', () => {
  it('subtracts horizontal padding from column width', () => {
    expect(contentWidthForColumn(100)).toBe(84)
  })
})
