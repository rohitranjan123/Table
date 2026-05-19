/** Max cells to paint when virtualization is off; above this we window anyway. */
export const MAX_NON_VIRTUAL_CELLS = 20_000

const warnedInstances = new Set<string>()

export function isVirtualizationEnabled(
  requested: boolean,
  rowCount: number,
  colCount: number,
  gridId = 'default',
): boolean {
  if (requested) return true
  const total = rowCount * colCount
  if (total <= MAX_NON_VIRTUAL_CELLS) return false

  if (import.meta.env.DEV && !warnedInstances.has(gridId)) {
    warnedInstances.add(gridId)
    console.warn(
      `[VirtualizedGrid:${gridId}] virtualization={false} ignored for ${rowCount.toLocaleString()}×${colCount} cells ` +
        `(${total.toLocaleString()} total). Windowing stays enabled above ${MAX_NON_VIRTUAL_CELLS.toLocaleString()} cells.`,
    )
  }
  return true
}

/** @internal test helper */
export function resetVirtualizationWarningForTests(): void {
  warnedInstances.clear()
}
