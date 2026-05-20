import type { FrozenColumns } from './plugins/freeze-columns'
import type { SpanMap, SpanMeta, SpanCellSpec } from './plugins/row-span'
import type {
  ColumnSort,
  CompareMode,
  SortDirection,
  SortState,
} from './plugins/sort'
import type { CellTextOverflow } from './plugins/text-overflow'
import type { GridModule } from './modules/grid-modules'

export type {
  CellTextOverflow,
  ColumnSort,
  CompareMode,
  FrozenColumns,
  SortDirection,
  SortState,
  SpanMap,
  SpanMeta,
  SpanCellSpec,
  GridModule,
}

/** AG Grid–aligned column definition. */
export interface ColDef {
  field: string
  headerName?: string
  width?: number
  flex?: number
  /**
   * When set, merges body cells vertically in this column.
   * `true` merges contiguous rows with equal cell values.
   */
  spanCell?: SpanCellSpec
  sort?: SortDirection
  sortable?: boolean
  pinned?: 'left' | 'right'
  headerTextOverflow?: CellTextOverflow
  cellTextOverflow?: CellTextOverflow
}

export type DefaultColDef = Partial<ColDef>

/** Cell payload returned by `getCellContent`. */
export interface GridCell {
  type: 'text' | 'number'
  data: string | number
}

export type RowHeightSpec = number | ((index: number) => number)

export type CellCoordinate = [col: number, row: number]

/** Pixel value, fill parent (`100%`), or CSS `auto` (size from layout; use ResizeObserver). */
export type GridSize = number | '100%' | 'auto'

export interface VirtualizedGridProps<T extends object = Record<string, unknown>> {
  gridId?: string
  columnDefs: ColDef[]
  defaultColDef?: DefaultColDef
  rowData?: readonly (T & Record<string, unknown>)[]
  loading?: boolean
  enableCellSpan?: boolean
  /** Kernel modules to attach after engine creation (AG Grid `modules` parity). */
  modules?: readonly GridModule[]
  headerHeight: number
  headerTextOverflow?: CellTextOverflow
  cellTextOverflow?: CellTextOverflow
  rowHeight: RowHeightSpec
  frozenColumns?: FrozenColumns
  virtualization?: boolean
  animateTransitions?: boolean
  transitionDurationMs?: number
  width?: GridSize
  height?: GridSize
  className?: string
  onCellHover?: (cell: CellCoordinate | null) => void
  onCellSelect?: (cell: CellCoordinate) => void
  rowSpanRevision?: number
  sortState?: SortState[]
  onSortStateChange?: (sortState: SortState[]) => void
}

export interface VisibleBounds {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}
