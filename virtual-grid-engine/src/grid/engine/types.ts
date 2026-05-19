import type {
  CellCoordinate,
  FrozenColumns,
  GridCell,
  GridColumn,
  GridSize,
  RowHeightSpec,
} from '../types'

export interface GridEngineOptions {
  /** Unique instance id — scopes DOM (`data-vgrid-id`) and dev warnings. */
  gridId: string
  columns: GridColumn[]
  rowCount: number
  getCellContent: (cell: CellCoordinate) => GridCell
  headerHeight: number
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
}
