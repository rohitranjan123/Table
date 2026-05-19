/** @internal Trackpad wheel delta normalization. */

type WheelAxis = 'x' | 'y'

export function resolveWheelDeltas(
  e: WheelEvent,
  lockedAxis: WheelAxis | null,
): { deltaX: number; deltaY: number; axis: WheelAxis | null } {
  let deltaX = e.deltaX
  let deltaY = e.deltaY

  if (e.shiftKey && Math.abs(deltaY) > Math.abs(deltaX)) {
    deltaX = deltaY
    deltaY = 0
  }

  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  if (absX < 1 && absY < 1) {
    return { deltaX: 0, deltaY: 0, axis: lockedAxis }
  }

  const ratio = 1.5
  if (absY > absX * ratio) return { deltaX: 0, deltaY, axis: 'y' }
  if (absX > absY * ratio) return { deltaX, deltaY: 0, axis: 'x' }
  if (lockedAxis === 'x') return { deltaX, deltaY: 0, axis: 'x' }
  if (lockedAxis === 'y') return { deltaX: 0, deltaY, axis: 'y' }

  return absY >= absX
    ? { deltaX: 0, deltaY, axis: 'y' }
    : { deltaX, deltaY: 0, axis: 'x' }
}
