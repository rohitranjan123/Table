import { mergeColDefs, type ResolvedColumn } from './col-def'
import type { ColDef } from './types'

/** Build resolved columns for unit tests (fixed width unless specified). */
export function testCols(defs: ColDef[]): ResolvedColumn[] {
  return mergeColDefs(
    defs.map((d) => ({ width: 100, headerName: d.field, ...d })),
  )
}
