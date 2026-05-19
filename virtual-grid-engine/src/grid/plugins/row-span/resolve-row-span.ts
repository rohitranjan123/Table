import type { GridColumn } from '../../types'
import type { SpanRowsSpec } from './types'

export function hasRowSpanning(columns: GridColumn[]): boolean {
  return columns.some((col) => col.spanRows !== undefined)
}

export function getSpanningColumnIndices(columns: GridColumn[]): number[] {
  const indices: number[] = []
  for (let i = 0; i < columns.length; i++) {
    if (columns[i].spanRows !== undefined) indices.push(i)
  }
  return indices
}

export function isSpanRowsSpec(value: unknown): value is SpanRowsSpec {
  return typeof value === 'boolean' || typeof value === 'function'
}
