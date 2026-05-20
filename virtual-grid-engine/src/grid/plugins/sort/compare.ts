import type { CompareMode } from './types'

function tryParse(val: string | number): number | string {
  if (typeof val === 'number') return val
  if (val.length > 0) {
    const parsed = Number(val)
    if (!Number.isNaN(parsed)) return parsed
  }
  return val
}

/** Locale-aware string compare; numeric strings become numbers (Glide default). */
export function compareDefault(a: string, b: string): number {
  return a.localeCompare(b)
}

/** Coerce numeric strings; compare numbers numerically, strings with localeCompare. */
export function compareSmart(a: string, b: string): number {
  const left = tryParse(a)
  const right = tryParse(b)
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right)
  }
  if (typeof left === 'number' && typeof right === 'number') {
    if (left === right) return 0
    return left > right ? 1 : -1
  }
  if (left === right) return 0
  return left > right ? 1 : -1
}

/** Lexicographic / raw ordering (Glide `compareRaw`). */
export function compareRaw(a: string, b: string): number {
  if (a > b) return 1
  if (a === b) return 0
  return -1
}

export function compareSortKeys(
  a: string,
  b: string,
  mode: CompareMode | undefined,
): number {
  if (mode === 'raw') return compareRaw(a, b)
  if (mode === 'smart') return compareSmart(a, b)
  return compareDefault(a, b)
}
