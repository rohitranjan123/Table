import {
  getScrollingColumnX,
  isFrozenColumn,
  leftPackedX,
  rightPackedX,
  type ResolvedFreeze,
} from '../plugins/freeze-columns'
import type { CellCoordinate, GridCell, GridColumn, RowHeightSpec, VisibleBounds } from '../types'
import { getRowHeight, getRowTop } from '../plugins/virtualization'
import { CellPool } from './CellPool'
import { applyCellDom, formatCellValue, type CellDomState } from './domCell'

export interface GridRendererLayers {
  headerScroll: CellPool
  headerFrozenLeft: CellPool
  headerFrozenRight: CellPool
  frozenBodyLeft: CellPool
  frozenBodyRight: CellPool
  body: CellPool
}

export interface GridRendererContext {
  columns: GridColumn[]
  columnLefts: number[]
  rowCount: number
  rowHeight: RowHeightSpec
  headerHeight: number
  freeze: ResolvedFreeze
  scrollLeft: number
  scrollTop: number
  hoverCell: CellCoordinate | null
  selectedCell: CellCoordinate | null
  getCellContent: (cell: CellCoordinate) => GridCell
}

export class GridRenderer {
  private readonly layers: GridRendererLayers

  constructor(layers: GridRendererLayers) {
    this.layers = layers
  }

  paint(bounds: VisibleBounds, ctx: GridRendererContext): void {
    const keepHeaderScroll = new Set<string>()
    const keepHeaderFrozenLeft = new Set<string>()
    const keepHeaderFrozenRight = new Set<string>()
    const keepFrozenBodyLeft = new Set<string>()
    const keepFrozenBodyRight = new Set<string>()
    const keepBody = new Set<string>()

    const { colStart, colEnd, rowStart, rowEnd } = bounds
    const { freeze } = ctx

    for (const c of freeze.left) {
      const key = `hfl:${c}`
      keepHeaderFrozenLeft.add(key)
      this.paintHeaderFrozenLeft(key, c, ctx)
    }

    for (const c of freeze.right) {
      const key = `hfr:${c}`
      keepHeaderFrozenRight.add(key)
      this.paintHeaderFrozenRight(key, c, ctx)
    }

    for (let c = colStart; c <= colEnd; c++) {
      if (isFrozenColumn(c, freeze)) continue
      const key = `hs:${c}`
      keepHeaderScroll.add(key)
      this.paintHeaderScroll(key, c, ctx)
    }

    for (const c of freeze.left) {
      for (let r = rowStart; r <= rowEnd; r++) {
        const key = `fl:${c}:${r}`
        keepFrozenBodyLeft.add(key)
        this.paintFrozenBodyLeft(key, c, r, ctx)
      }
    }

    for (const c of freeze.right) {
      for (let r = rowStart; r <= rowEnd; r++) {
        const key = `fr:${c}:${r}`
        keepFrozenBodyRight.add(key)
        this.paintFrozenBodyRight(key, c, r, ctx)
      }
    }

    for (let c = colStart; c <= colEnd; c++) {
      if (isFrozenColumn(c, freeze)) continue
      for (let r = rowStart; r <= rowEnd; r++) {
        const key = `b:${c}:${r}`
        keepBody.add(key)
        this.paintBody(key, c, r, ctx)
      }
    }

    this.layers.headerScroll.prune(keepHeaderScroll)
    this.layers.headerFrozenLeft.prune(keepHeaderFrozenLeft)
    this.layers.headerFrozenRight.prune(keepHeaderFrozenRight)
    this.layers.frozenBodyLeft.prune(keepFrozenBodyLeft)
    this.layers.frozenBodyRight.prune(keepFrozenBodyRight)
    this.layers.body.prune(keepBody)
  }

  clearPools(): void {
    this.layers.headerScroll.clear()
    this.layers.headerFrozenLeft.clear()
    this.layers.headerFrozenRight.clear()
    this.layers.frozenBodyLeft.clear()
    this.layers.frozenBodyRight.clear()
    this.layers.body.clear()
  }

  destroy(): void {
    this.clearPools()
  }

  private domState(
    col: number,
    row: number,
    isHeader: boolean,
    cellType: GridCell['type'],
    ctx: GridRendererContext,
    edge: 'left' | 'right' | false = false,
  ): CellDomState {
    return {
      isHeader,
      isAlt: !isHeader && row % 2 === 1,
      isHover: !isHeader && ctx.hoverCell?.[0] === col && ctx.hoverCell[1] === row,
      isSelected:
        !isHeader &&
        ctx.selectedCell?.[0] === col &&
        ctx.selectedCell[1] === row,
      isFrozenEdge: edge !== false,
      frozenEdgeSide: edge === false ? undefined : edge,
      cellType,
    }
  }

  private paintHeaderScroll(key: string, col: number, ctx: GridRendererContext): void {
    const el = this.layers.headerScroll.acquire(key)
    applyCellDom(
      el,
      this.domState(col, -1, true, 'text', ctx),
      {
        left: getScrollingColumnX(col, ctx.scrollLeft, ctx.freeze),
        top: 0,
        width: ctx.columns[col].width,
        height: ctx.headerHeight,
        zIndex: 2,
        col,
        row: -1,
      },
      ctx.columns[col].title,
    )
  }

  private paintHeaderFrozenLeft(key: string, col: number, ctx: GridRendererContext): void {
    const el = this.layers.headerFrozenLeft.acquire(key)
    const lastLeft = ctx.freeze.left[ctx.freeze.left.length - 1]
    applyCellDom(
      el,
      this.domState(col, -1, true, 'text', ctx, col === lastLeft ? 'left' : false),
      {
        left: leftPackedX(col, ctx.columns, ctx.freeze),
        top: 0,
        width: ctx.columns[col].width,
        height: ctx.headerHeight,
        zIndex: 4,
        col,
        row: -1,
      },
      ctx.columns[col].title,
    )
  }

  private paintHeaderFrozenRight(key: string, col: number, ctx: GridRendererContext): void {
    const el = this.layers.headerFrozenRight.acquire(key)
    const firstRight = ctx.freeze.right[0]
    applyCellDom(
      el,
      this.domState(col, -1, true, 'text', ctx, col === firstRight ? 'right' : false),
      {
        left: rightPackedX(col, ctx.columns, ctx.freeze),
        top: 0,
        width: ctx.columns[col].width,
        height: ctx.headerHeight,
        zIndex: 4,
        col,
        row: -1,
      },
      ctx.columns[col].title,
    )
  }

  private paintFrozenBodyLeft(
    key: string,
    col: number,
    row: number,
    ctx: GridRendererContext,
  ): void {
    const cell = ctx.getCellContent([col, row])
    const rh = getRowHeight(ctx.rowHeight, row)
    const lastLeft = ctx.freeze.left[ctx.freeze.left.length - 1]
    const el = this.layers.frozenBodyLeft.acquire(key)
    applyCellDom(
      el,
      this.domState(col, row, false, cell.type, ctx, col === lastLeft ? 'left' : false),
      {
        left: leftPackedX(col, ctx.columns, ctx.freeze),
        top: getRowTop(ctx.rowHeight, row) - ctx.scrollTop,
        width: ctx.columns[col].width,
        height: rh,
        zIndex: 3,
        col,
        row,
      },
      formatCellValue(cell),
    )
  }

  private paintFrozenBodyRight(
    key: string,
    col: number,
    row: number,
    ctx: GridRendererContext,
  ): void {
    const cell = ctx.getCellContent([col, row])
    const rh = getRowHeight(ctx.rowHeight, row)
    const firstRight = ctx.freeze.right[0]
    const el = this.layers.frozenBodyRight.acquire(key)
    applyCellDom(
      el,
      this.domState(col, row, false, cell.type, ctx, col === firstRight ? 'right' : false),
      {
        left: rightPackedX(col, ctx.columns, ctx.freeze),
        top: getRowTop(ctx.rowHeight, row) - ctx.scrollTop,
        width: ctx.columns[col].width,
        height: rh,
        zIndex: 3,
        col,
        row,
      },
      formatCellValue(cell),
    )
  }

  private paintBody(key: string, col: number, row: number, ctx: GridRendererContext): void {
    const cell = ctx.getCellContent([col, row])
    const rh = getRowHeight(ctx.rowHeight, row)
    const el = this.layers.body.acquire(key)
    applyCellDom(
      el,
      this.domState(col, row, false, cell.type, ctx),
      {
        left: getScrollingColumnX(col, ctx.scrollLeft, ctx.freeze),
        top: getRowTop(ctx.rowHeight, row) - ctx.scrollTop,
        width: ctx.columns[col].width,
        height: rh,
        zIndex: 1,
        col,
        row,
      },
      formatCellValue(cell),
    )
  }
}
