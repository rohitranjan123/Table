import type { ResolvedColumn } from '../../col-def'
import type { SpanCellSpec } from './types'

export function hasRowSpanning(columns: ResolvedColumn[]): boolean {
  return columns.some((col) => col.spanCell !== undefined)
}

export function getSpanningColumnIndices(columns: ResolvedColumn[]): number[] {
  const indices: number[] = []
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].spanCell !== undefined) indices.push(i)
  }
  return indices
}

export function isSpanCellSpec(value: unknown): value is SpanCellSpec {
  return typeof value === 'boolean' || typeof value === 'function'
}
