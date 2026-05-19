/** Column keys to pin on the left or right edge, in display order. */
export interface FrozenColumns {
  left?: readonly string[]
  right?: readonly string[]
}

export interface ResolvedFreeze {
  left: number[]
  right: number[]
  leftWidth: number
  rightWidth: number
  leftSet: ReadonlySet<number>
  rightSet: ReadonlySet<number>
  /** Per-column X in the center scroll strip; `-1` when frozen. */
  scrollableLefts: number[]
  /** Total width of all non-frozen columns (packed, no gaps). */
  scrollableWidth: number
  /** Packed content width: left + scrollable + right. */
  layoutWidth: number
}
