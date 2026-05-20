import type { ColDef } from '../../types'

/** How cell values are compared when sorting. */
export type CompareMode = 'default' | 'raw' | 'smart'

export type SortDirection = 'asc' | 'desc'

/** Active sort on a column (`columnId` = `ColDef.field`). */
export interface SortState {
  columnId: string
  direction: SortDirection
  mode?: CompareMode
}

/** Glide-style sort descriptor keyed by column reference or field. */
export interface ColumnSort {
  column: ColDef | string
  direction?: SortDirection
  mode?: CompareMode
}

export interface SortKeyCache {
  get(columnId: string): readonly string[] | undefined
  set(columnId: string, keys: readonly string[]): void
  clear(): void
}
