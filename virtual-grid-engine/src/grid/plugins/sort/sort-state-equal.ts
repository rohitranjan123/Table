import type { SortState } from './types'

export function sortStateEqual(a: SortState[], b: SortState[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) {
    const left = a[index]!
    const right = b[index]!
    if (
      left.columnId !== right.columnId ||
      left.direction !== right.direction ||
      left.mode !== right.mode
    ) {
      return false
    }
  }
  return true
}
