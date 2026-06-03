// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest'
import {
  bodyCellKey,
  cancelFlipAnimations,
  captureCellRects,
  playFlip,
} from './layout-motion'

describe('layout-motion', () => {
  it('playFlip runs animation when position changes', () => {
    const host = document.createElement('div')
    const cell = document.createElement('div')
    cell.className = 'vgrid__cell'
    cell.dataset.field = 'a'
    cell.dataset.sourceRow = '0'
    cell.style.position = 'absolute'
    cell.style.left = '0'
    cell.style.top = '0'
    cell.style.width = '80px'
    cell.style.height = '24px'
    host.appendChild(cell)
    document.body.appendChild(host)

    const before = captureCellRects(host, '.vgrid__cell', () => 'a:0')
    cell.style.top = '80px'
    expect(() => playFlip(before, 200)).not.toThrow()

    host.remove()
  })

  it('restores translate3d when FLIP left stranded left/top on span cells', () => {
    const cell = document.createElement('div')
    cell.className = 'vgrid__cell vgrid__cell--row-span'
    cell.style.transform = ''
    cell.style.left = '99px'
    cell.style.top = '88px'
    const host = document.createElement('div')
    host.appendChild(cell)
    cancelFlipAnimations(host)
    expect(cell.style.transform).toBe('translate3d(99px, 88px, 0)')
    expect(cell.style.left).toBe('0px')
    host.remove()
  })

  it('does not strip translate3d from healthy span cells on scroll cleanup', () => {
    const cell = document.createElement('div')
    cell.className = 'vgrid__cell vgrid__cell--row-span'
    cell.style.transform = 'translate3d(10px, 20px, 0)'
    cell.style.left = '0'
    cell.style.top = '0'
    const host = document.createElement('div')
    host.appendChild(cell)
    cancelFlipAnimations(host)
    expect(cell.style.transform).toBe('translate3d(10px, 20px, 0)')
    host.remove()
  })

  it('playFlip skips cells when shouldAnimate returns false', () => {
    const host = document.createElement('div')
    const moving = document.createElement('div')
    moving.className = 'vgrid__cell'
    moving.dataset.field = 'age'
    moving.style.position = 'absolute'
    moving.style.left = '0'
    moving.style.top = '0'
    moving.style.width = '80px'
    moving.style.height = '24px'

    const still = document.createElement('div')
    still.className = 'vgrid__cell vgrid__cell--row-span'
    still.dataset.field = 'country'
    still.style.transform = 'translate3d(0px, 40px, 0)'
    still.style.width = '80px'
    still.style.height = '80px'

    host.append(moving, still)
    document.body.appendChild(host)

    const before = captureCellRects(host, '.vgrid__cell', (el) =>
      el.dataset.field === 'age' ? 'age:0' : 'country:0',
    )
    moving.style.left = '120px'
    still.style.transform = 'translate3d(50px, 40px, 0)'

    playFlip(
      before,
      200,
      undefined,
      (el) => el.dataset.field === 'age',
    )

    expect(still.style.transform).toBe('translate3d(50px, 40px, 0)')
    expect(still.style.left).toBe('')

    host.remove()
  })

  it('bodyCellKey uses display row when sourceRow is absent', () => {
    const cell = document.createElement('div')
    cell.dataset.field = 'country'
    cell.dataset.row = '3'
    expect(bodyCellKey(cell)).toBe('country:3')
  })
})
