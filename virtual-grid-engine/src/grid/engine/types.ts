import type {
  CellCoordinate,
  CellTextOverflow,
  FrozenColumns,
  GridCell,
  GridColumn,
  GridSize,
  RowHeightSpec,
  SortState,
} from '../types'

export interface GridEngineOptions {
  /** Unique instance id — scopes DOM (`data-vgrid-id`) and dev warnings. */
  gridId: string
  columns: GridColumn[]
  rowCount: number
  getCellContent: (cell: CellCoordinate) => GridCell
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
  /** Bump to recompute row-span metadata when `getCellContent` is stable. */
  rowSpanRevision?: number
  sortState?: SortState[]
  onSortStateChange?: (sortState: SortState[]) => void
}

export interface GridScrollPosition {
  left: number
  top: number
}

export interface GridEngine {
  destroy(): void
  updateOptions(options: Partial<GridEngineOptions>): void
  getScroll(): GridScrollPosition
  scrollTo(left: number, top: number): void
  /** Display row → original data row (identity when unsorted). */
  getOriginalRow(displayRow: number): number
}
