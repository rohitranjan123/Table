import type { ResolvedColumn } from '../col-def'
import type { GridModule } from '../modules/grid-modules'
import type { GridPluginsRegistry } from './plugins-registry'
import type {
  CellCoordinate,
  CellTextOverflow,
  FrozenColumns,
  GridCell,
  GridSize,
  RowHeightSpec,
  SortState,
} from '../types'

export interface GridEngineOptions {
  gridId: string
  columns: ResolvedColumn[]
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
  rowSpanRevision?: number
  sortState?: SortState[]
  onSortStateChange?: (sortState: SortState[]) => void
  /** Viewport width for flex column resolution; updated on resize. */
  viewportWidth?: number
  columnDefs?: import('../types').ColDef[]
  defaultColDef?: import('../types').DefaultColDef
  /** Attached before first paint when provided at construction. */
  modules?: readonly GridModule[]
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
  getOriginalRow(displayRow: number): number
  readonly plugins: GridPluginsRegistry
}
