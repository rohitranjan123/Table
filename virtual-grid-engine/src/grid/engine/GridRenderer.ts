/** @internal Paints visible cells into layered cell pools. */

import {
  collectSpanAnchorsForColumn,
  getScrollingColumnX,
  isFrozenColumn,
  leftPackedX,
  rightPackedX,
  type ResolvedFreeze,
  type RowSpanContext,
} from '../plugins'
import type { RowMetrics } from '../plugins'
import type { CellCoordinate, GridCell, GridColumn, VisibleBounds } from '../types'
import { CellPool } from './CellPool'
import {
  applyCellDom,
  applyCellInteraction,
  applyCellPosition,
  formatCellValue,
  type CellDomState,
  type CellLayout,
} from './domCell'

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
  rowMetrics: RowMetrics
  headerHeight: number
  freeze: ResolvedFreeze
  scrollLeft: number
  scrollTop: number
  hoverCell: CellCoordinate | null
  selectedCell: CellCoordinate | null
  getCellContent: (cell: CellCoordinate) => GridCell
  spanContext: RowSpanContext | null
  scrollActive?: boolean
  /** When true, skip trimming the free-cell pool this frame (scroll perf). */
  deferTrimFree?: boolean
}

type CellZone =
  | 'headerScroll'
  | 'headerFrozenLeft'
  | 'headerFrozenRight'
  | 'frozenBodyLeft'
  | 'frozenBodyRight'
  | 'body'

const ZONE_POOL: Record<CellZone, keyof GridRendererLayers> = {
  headerScroll: 'headerScroll',
  headerFrozenLeft: 'headerFrozenLeft',
  headerFrozenRight: 'headerFrozenRight',
  frozenBodyLeft: 'frozenBodyLeft',
  frozenBodyRight: 'frozenBodyRight',
  body: 'body',
}

const ZONE_KEY_PREFIX: Record<CellZone, string> = {
  headerScroll: 'hs',
  headerFrozenLeft: 'hfl',
  headerFrozenRight: 'hfr',
  frozenBodyLeft: 'fl',
  frozenBodyRight: 'fr',
  body: 'b',
}

export class GridRenderer {
  private readonly layers: GridRendererLayers
  private readonly spanningColumns = new Set<number>()

  constructor(layers: GridRendererLayers) {
    this.layers = layers
  }

  paint(bounds: VisibleBounds, context: GridRendererContext): void {
    this.syncSpanningColumns(context.spanContext)

    const keepSets: Record<CellZone, Set<string>> = {
      headerScroll: new Set(),
      headerFrozenLeft: new Set(),
      headerFrozenRight: new Set(),
      frozenBodyLeft: new Set(),
      frozenBodyRight: new Set(),
      body: new Set(),
    }

    const { colStart, colEnd } = bounds
    const { freeze } = context

    for (const column of freeze.left) {
      const key = this.cellKey('headerFrozenLeft', column, -1)
      keepSets.headerFrozenLeft.add(key)
      this.paintCell('headerFrozenLeft', key, column, -1, context)
    }

    for (const column of freeze.right) {
      const key = this.cellKey('headerFrozenRight', column, -1)
      keepSets.headerFrozenRight.add(key)
      this.paintCell('headerFrozenRight', key, column, -1, context)
    }

    for (let column = colStart; column <= colEnd; column++) {
      if (isFrozenColumn(column, freeze)) continue
      const key = this.cellKey('headerScroll', column, -1)
      keepSets.headerScroll.add(key)
      this.paintCell('headerScroll', key, column, -1, context)
    }

    this.paintBodyZone(
      'frozenBodyLeft',
      freeze.left,
      bounds,
      context,
      keepSets.frozenBodyLeft,
    )
    this.paintBodyZone(
      'frozenBodyRight',
      freeze.right,
      bounds,
      context,
      keepSets.frozenBodyRight,
    )

    for (let column = colStart; column <= colEnd; column++) {
      if (isFrozenColumn(column, freeze)) continue
      this.paintBodyColumn(
        'body',
        column,
        bounds,
        context,
        keepSets.body,
      )
    }

    const trimFree = context.deferTrimFree !== true
    for (const zone of Object.keys(keepSets) as CellZone[]) {
      this.layers[ZONE_POOL[zone]].prune(keepSets[zone], trimFree)
    }
  }

  clearPools(): void {
    for (const pool of Object.values(this.layers)) {
      pool.clear()
    }
  }

  destroy(): void {
    this.clearPools()
  }

  /** Fast path when only hover/selection changed — no layout or content work. */
  updateInteraction(
    hoverCell: CellCoordinate | null,
    selectedCell: CellCoordinate | null,
  ): void {
    for (const pool of Object.values(this.layers)) {
      pool.forEachActive((element: HTMLDivElement) => {
        if (element.dataset.header === '1') return
        const col = Number(element.dataset.col)
        const row = Number(element.dataset.row)
        if (Number.isNaN(col) || Number.isNaN(row)) return
        applyCellInteraction(element, {
          isAlt: row % 2 === 1,
          isHover: hoverCell?.[0] === col && hoverCell[1] === row,
          isSelected:
            selectedCell?.[0] === col && selectedCell[1] === row,
        })
      })
    }
  }

  private syncSpanningColumns(spanContext: RowSpanContext | null): void {
    this.spanningColumns.clear()
    if (!spanContext) return
    for (const index of spanContext.columnIndices) {
      this.spanningColumns.add(index)
    }
  }

  private isSpanColumn(col: number): boolean {
    return this.spanningColumns.has(col)
  }

  private paintBodyZone(
    zone: 'frozenBodyLeft' | 'frozenBodyRight' | 'body',
    columns: number[],
    bounds: VisibleBounds,
    context: GridRendererContext,
    keepSet: Set<string>,
  ): void {
    for (const column of columns) {
      this.paintBodyColumn(zone, column, bounds, context, keepSet)
    }
  }

  private paintBodyColumn(
    zone: 'frozenBodyLeft' | 'frozenBodyRight' | 'body',
    column: number,
    bounds: VisibleBounds,
    context: GridRendererContext,
    keepSet: Set<string>,
  ): void {
    const { rowStart, rowEnd } = bounds

    if (context.spanContext && this.isSpanColumn(column)) {
      const anchors = collectSpanAnchorsForColumn(
        context.spanContext,
        column,
        bounds,
      )
      for (const anchor of anchors) {
        const key = this.spanCellKey(zone, column, anchor)
        keepSet.add(key)
        this.paintSpanCell(zone, key, column, anchor, context)
      }
      return
    }

    for (let row = rowStart; row <= rowEnd; row++) {
      const key = this.cellKey(zone, column, row)
      keepSet.add(key)
      this.paintCell(zone, key, column, row, context)
    }
  }

  private cellKey(zone: CellZone, col: number, row: number): string {
    const prefix = ZONE_KEY_PREFIX[zone]
    return row < 0 ? `${prefix}:${col}` : `${prefix}:${col}:${row}`
  }

  private spanCellKey(zone: CellZone, col: number, anchorRow: number): string {
    const prefix = ZONE_KEY_PREFIX[zone]
    return `${prefix}:${col}:span@${anchorRow}`
  }

  private domState(
    col: number,
    row: number,
    isHeader: boolean,
    cellType: GridCell['type'],
    context: GridRendererContext,
    edge: 'left' | 'right' | false = false,
    isRowSpan = false,
  ): CellDomState {
    return {
      isHeader,
      isAlt: !isHeader && row % 2 === 1,
      isHover:
        !isHeader &&
        context.hoverCell?.[0] === col &&
        context.hoverCell[1] === row,
      isSelected:
        !isHeader &&
        context.selectedCell?.[0] === col &&
        context.selectedCell[1] === row,
      isFrozenEdge: edge !== false,
      frozenEdgeSide: edge === false ? undefined : edge,
      cellType,
      isRowSpan,
    }
  }

  private frozenEdgeForZone(
    zone: CellZone,
    col: number,
    freeze: ResolvedFreeze,
  ): 'left' | 'right' | false {
    if (zone === 'headerFrozenLeft' || zone === 'frozenBodyLeft') {
      const lastLeft = freeze.left[freeze.left.length - 1]
      return col === lastLeft ? 'left' : false
    }
    if (zone === 'headerFrozenRight' || zone === 'frozenBodyRight') {
      const firstRight = freeze.right[0]
      return col === firstRight ? 'right' : false
    }
    return false
  }

  private columnLeft(
    zone: CellZone,
    col: number,
    context: GridRendererContext,
  ): number {
    const { freeze, columns, scrollLeft } = context
    if (zone === 'body' || zone === 'headerScroll') {
      return getScrollingColumnX(col, scrollLeft, freeze)
    }
    if (zone === 'frozenBodyLeft' || zone === 'headerFrozenLeft') {
      return leftPackedX(col, columns, freeze)
    }
    if (zone === 'frozenBodyRight' || zone === 'headerFrozenRight') {
      return rightPackedX(col, columns, freeze)
    }
    return 0
  }

  private paintSpanCell(
    zone: 'frozenBodyLeft' | 'frozenBodyRight' | 'body',
    key: string,
    col: number,
    anchorRow: number,
    context: GridRendererContext,
  ): void {
    const { columns, rowMetrics, scrollTop, spanContext } = context
    const meta = spanContext?.metaByColumnIndex.get(col)?.[anchorRow]
    if (!meta || meta.isSpannedChild) return

    const bodyCell = context.getCellContent([col, anchorRow])
    const frozenEdge = this.frozenEdgeForZone(zone, col, context.freeze)
    const left = this.columnLeft(zone, col, context)
    const top = rowMetrics.getRowTop(anchorRow) - scrollTop
    const height = meta.totalHeight
    const zIndex = zone === 'body' ? 1 : 3

    const layout: CellLayout = {
      left,
      top,
      width: columns[col].width,
      height,
      zIndex,
      col,
      row: anchorRow,
      useTransform: true,
    }

    const pool = this.layers[ZONE_POOL[zone]]
    const element = pool.acquire(key)
    const label = formatCellValue(bodyCell)

    if (
      this.canUsePositionOnly(element, col, anchorRow, false, context, true)
    ) {
      applyCellPosition(element, layout)
      if (
        !this.interactionMatches(
          element,
          col,
          anchorRow,
          false,
          context,
        )
      ) {
        applyCellInteraction(
          element,
          this.interactionState(col, anchorRow, false, context),
        )
      }
      return
    }

    applyCellDom(
      element,
      this.domState(
        col,
        anchorRow,
        false,
        bodyCell.type,
        context,
        frozenEdge,
        true,
      ),
      layout,
      label,
    )
  }

  private paintCell(
    zone: CellZone,
    key: string,
    col: number,
    row: number,
    context: GridRendererContext,
  ): void {
    const isHeader = row < 0
    const { freeze, columns, headerHeight, rowMetrics, scrollTop } = context
    const frozenEdge = this.frozenEdgeForZone(zone, col, freeze)

    const bodyCell = isHeader ? null : context.getCellContent([col, row])
    const cellType: GridCell['type'] = isHeader ? 'text' : bodyCell!.type
    const label = isHeader ? columns[col].title : formatCellValue(bodyCell!)

    let left: number
    let top: number
    let height: number
    let zIndex: number

    if (isHeader) {
      top = 0
      height = headerHeight
      zIndex = zone === 'headerScroll' ? 2 : 4
      left = this.columnLeft(zone, col, context)
    } else {
      height = rowMetrics.getRowHeight(row)
      top = rowMetrics.getRowTop(row) - scrollTop
      zIndex = zone === 'body' ? 1 : 3
      left = this.columnLeft(zone, col, context)
    }

    const layout: CellLayout = {
      left,
      top,
      width: columns[col].width,
      height,
      zIndex,
      col,
      row,
    }

    const pool = this.layers[ZONE_POOL[zone]]
    const element = pool.acquire(key)

    if (this.canUsePositionOnly(element, col, row, isHeader, context, false)) {
      applyCellPosition(element, layout)
      if (!this.interactionMatches(element, col, row, isHeader, context)) {
        applyCellInteraction(
          element,
          this.interactionState(col, row, isHeader, context),
        )
      }
      return
    }

    applyCellDom(
      element,
      this.domState(col, row, isHeader, cellType, context, frozenEdge),
      layout,
      label,
    )
  }

  private canUsePositionOnly(
    element: HTMLDivElement,
    col: number,
    row: number,
    isHeader: boolean,
    _context: GridRendererContext,
    isRowSpan: boolean,
  ): boolean {
    if (element.dataset.col !== String(col)) return false
    if (isHeader) {
      return element.dataset.header === '1' && element.dataset.span !== '1'
    }
    if (element.dataset.header !== '0' || element.dataset.row !== String(row)) {
      return false
    }
    const spanFlag = isRowSpan ? '1' : '0'
    return element.dataset.span === spanFlag
  }

  private interactionState(
    col: number,
    row: number,
    isHeader: boolean,
    context: GridRendererContext,
  ): Pick<CellDomState, 'isAlt' | 'isHover' | 'isSelected'> {
    return {
      isAlt: !isHeader && row % 2 === 1,
      isHover:
        !isHeader &&
        context.hoverCell?.[0] === col &&
        context.hoverCell[1] === row,
      isSelected:
        !isHeader &&
        context.selectedCell?.[0] === col &&
        context.selectedCell[1] === row,
    }
  }

  private interactionMatches(
    element: HTMLDivElement,
    col: number,
    row: number,
    isHeader: boolean,
    context: GridRendererContext,
  ): boolean {
    if (isHeader) return true
    const expected = this.interactionState(col, row, isHeader, context)
    return (
      element.classList.contains('vgrid__cell--hover') === expected.isHover &&
      element.classList.contains('vgrid__cell--selected') ===
        expected.isSelected &&
      element.classList.contains('vgrid__cell--alt') === expected.isAlt
    )
  }
}
