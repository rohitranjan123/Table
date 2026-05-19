import type { FrozenColumns } from './plugins/freeze-columns'

export type { FrozenColumns }

/** Column descriptor — width drives horizontal layout prefix sums. */
export interface GridColumn {
  dataIndex: string
  title: string
  width: number
}

/** Cell payload returned by `getCellContent`. */
export interface GridCell {
  type: 'text' | 'number'
  data: string | number
}

export type RowHeightSpec = number | ((index: number) => number)

export type CellCoordinate = [col: number, row: number]

/** Pixel value, fill parent (`100%`), or CSS `auto` (size from layout; use ResizeObserver). */
export type GridSize = number | '100%' | 'auto'

export interface VirtualizedGridProps {
  /**
   * Stable id for this grid instance (ARIA + `data-vgrid-id`).
   * Omit to use React `useId()` — required when multiple grids share a view.
   */
  gridId?: string
  columns: GridColumn[]
  rowCount: number
  getCellContent: (cell: CellCoordinate) => GridCell
  headerHeight: number
  rowHeight: RowHeightSpec
  /** Pin columns by `dataIndex` on the left and/or right, in display order. */
  frozenColumns?: FrozenColumns
  /**
   * When `false`, renders every row and column (no windowing).
   * Use only for small datasets.
   * @default true
   */
  virtualization?: boolean
  /**
   * Animate layout changes (freeze, column/row structure). Scroll stays instant.
   * @default true
   */
  animateTransitions?: boolean
  /** Duration for layout transitions in ms. @default 240 */
  transitionDurationMs?: number
  /**
   * Grid width. `number` = px; `'100%'` = fill host; `'auto'` = CSS auto (host must get size from layout).
   * @default '100%'
   */
  width?: GridSize
  /**
   * Grid height. Same semantics as `width`.
   * @default '100%'
   */
  height?: GridSize
  className?: string
  onCellHover?: (cell: CellCoordinate | null) => void
  onCellSelect?: (cell: CellCoordinate) => void
}

/** Visible index range inclusive, with overscan applied when virtualized. */
export interface VisibleBounds {
  colStart: number
  colEnd: number
  rowStart: number
  rowEnd: number
}
