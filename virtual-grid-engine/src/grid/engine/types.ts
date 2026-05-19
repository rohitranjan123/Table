import type {
  CellCoordinate,
  FrozenColumns,
  GridCell,
  GridColumn,
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
  width?: number
  height?: number
  className?: string
  onCellHover?: (cell: CellCoordinate | null) => void
  onCellSelect?: (cell: CellCoordinate) => void
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
