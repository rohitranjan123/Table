import { describe, expect, it } from 'vitest'
import {
  clearWheelAxisOnReversal,
  createWheelDeltaState,
  resolveWheelDeltas,
} from './wheel'

describe('wheel axis lock', () => {
  it('clears lock when horizontal direction reverses', () => {
    const state = createWheelDeltaState()
    state.lockedAxis = 'x'
    state.lastDeltaX = 40

    clearWheelAxisOnReversal(state, -30, 0)
    expect(state.lockedAxis).toBeNull()
  })

  it('clears lock when vertical direction reverses', () => {
    const state = createWheelDeltaState()
    state.lockedAxis = 'y'
    state.lastDeltaY = 25

    clearWheelAxisOnReversal(state, 0, -20)
    expect(state.lockedAxis).toBeNull()
  })
})

describe('resolveWheelDeltas', () => {
  it('picks horizontal axis for dominant deltaX', () => {
    const state = createWheelDeltaState()
    const event = { deltaX: 50, deltaY: 2, shiftKey: false } as WheelEvent
    const result = resolveWheelDeltas(event, state)
    expect(result.deltaX).toBe(50)
    expect(result.deltaY).toBe(0)
    expect(result.axis).toBe('x')
  })
})
