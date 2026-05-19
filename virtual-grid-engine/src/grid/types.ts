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

export interface VirtualizedGridProps {
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
  width?: number
  height?: number
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
