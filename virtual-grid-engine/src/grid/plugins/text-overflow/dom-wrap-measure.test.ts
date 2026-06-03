// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import { measureDisplayedWrapCellHeight } from './dom-wrap-measure'

describe('measureDisplayedWrapCellHeight', () => {
  it('returns 0 when label is missing', () => {
    const cell = document.createElement('div')
    expect(measureDisplayedWrapCellHeight(cell)).toBe(0)
  })

  it('reads label scrollHeight and adds vertical padding', () => {
    const cell = document.createElement('div')
    const label = document.createElement('span')
    label.className = 'vgrid__cell__label'
    cell.appendChild(label)
    Object.defineProperty(label, 'scrollHeight', { value: 32 })

    expect(measureDisplayedWrapCellHeight(cell)).toBe(40)
  })
})
