import { describe, expect, it } from 'vitest'
import { compareDefault, compareRaw, compareSmart } from './compare'

describe('compareSmart', () => {
  it('compares numeric strings as numbers', () => {
    expect(compareSmart('2', '10')).toBeLessThan(0)
    expect(compareSmart('10', '2')).toBeGreaterThan(0)
  })

  it('falls back to localeCompare for non-numeric strings', () => {
    expect(compareSmart('apple', 'banana')).toBeLessThan(0)
  })
})

describe('compareRaw', () => {
  it('uses lexicographic order', () => {
    expect(compareRaw('10', '2')).toBeLessThan(0)
  })
})

describe('compareDefault', () => {
  it('uses localeCompare', () => {
    expect(compareDefault('a', 'b')).toBeLessThan(0)
  })
})
