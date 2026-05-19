import { describe, expect, it } from 'vitest'
import { toCssSize, usesFluidSizing } from './grid-size'

describe('grid size helpers', () => {
  it('converts pixel numbers to px strings', () => {
    expect(toCssSize(440)).toBe('440px')
  })

  it('passes through percent and auto', () => {
    expect(toCssSize('100%')).toBe('100%')
    expect(toCssSize('auto')).toBe('auto')
  })

  it('defaults undefined to 100%', () => {
    expect(toCssSize(undefined)).toBe('100%')
  })

  it('detects fluid sizing', () => {
    expect(usesFluidSizing(400, 300)).toBe(false)
    expect(usesFluidSizing('100%', 300)).toBe(true)
    expect(usesFluidSizing(400, 'auto')).toBe(true)
  })
})
