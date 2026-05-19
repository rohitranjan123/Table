/** CSS or pixel sizing for the grid host and root. */
export type GridSize = number | '100%' | 'auto'

export function toCssSize(
  value: GridSize | undefined,
  fallback: GridSize = '100%',
): string {
  if (value === undefined) {
    return typeof fallback === 'number' ? `${fallback}px` : fallback
  }
  if (typeof value === 'number') return `${value}px`
  return value
}

/** True when at least one axis is not a fixed pixel value — needs ResizeObserver. */
export function usesFluidSizing(
  width: GridSize | undefined,
  height: GridSize | undefined,
): boolean {
  return typeof width !== 'number' || typeof height !== 'number'
}
