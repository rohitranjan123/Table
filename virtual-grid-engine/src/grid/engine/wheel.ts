/** @internal Trackpad wheel delta normalization. */

export type WheelAxis = 'x' | 'y'

export interface WheelDeltaState {
  lockedAxis: WheelAxis | null
  lastDeltaX: number
  lastDeltaY: number
}

export function createWheelDeltaState(): WheelDeltaState {
  return { lockedAxis: null, lastDeltaX: 0, lastDeltaY: 0 }
}

/** Clear axis lock when the user reverses direction on the locked axis. */
export function clearWheelAxisOnReversal(
  state: WheelDeltaState,
  deltaX: number,
  deltaY: number,
): void {
  const { lockedAxis } = state
  if (
    lockedAxis === 'x' &&
    deltaX !== 0 &&
    state.lastDeltaX !== 0 &&
    Math.sign(deltaX) !== Math.sign(state.lastDeltaX)
  ) {
    state.lockedAxis = null
  }
  if (
    lockedAxis === 'y' &&
    deltaY !== 0 &&
    state.lastDeltaY !== 0 &&
    Math.sign(deltaY) !== Math.sign(state.lastDeltaY)
  ) {
    state.lockedAxis = null
  }
}

export function resolveWheelDeltas(
  event: WheelEvent,
  state: WheelDeltaState,
): { deltaX: number; deltaY: number; axis: WheelAxis | null } {
  let deltaX = event.deltaX
  let deltaY = event.deltaY

  if (event.shiftKey && Math.abs(deltaY) > Math.abs(deltaX)) {
    deltaX = deltaY
    deltaY = 0
  }

  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  if (absX < 1 && absY < 1) {
    return { deltaX: 0, deltaY: 0, axis: state.lockedAxis }
  }

  clearWheelAxisOnReversal(state, deltaX, deltaY)

  const ratio = 1.5
  if (absY > absX * ratio) {
    return { deltaX: 0, deltaY, axis: 'y' }
  }
  if (absX > absY * ratio) {
    return { deltaX, deltaY: 0, axis: 'x' }
  }
  if (state.lockedAxis === 'x') {
    return { deltaX, deltaY: 0, axis: 'x' }
  }
  if (state.lockedAxis === 'y') {
    return { deltaX: 0, deltaY, axis: 'y' }
  }

  return absY >= absX
    ? { deltaX: 0, deltaY, axis: 'y' }
    : { deltaX, deltaY: 0, axis: 'x' }
}

export function recordWheelDeltas(
  state: WheelDeltaState,
  deltaX: number,
  deltaY: number,
  axis: WheelAxis | null,
): void {
  if (deltaX !== 0) state.lastDeltaX = deltaX
  if (deltaY !== 0) state.lastDeltaY = deltaY
  if (axis !== null) state.lockedAxis = axis
}
