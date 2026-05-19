/** @internal Paints visible cells into layered cell pools. */

import {
  getScrollingColumnX,
  isFrozenColumn,
  leftPackedX,
  rightPackedX,
  type ResolvedFreeze,
} from '../plugins'
import type { CellCoordinate, GridCell, GridColumn, RowHeightSpec, VisibleBounds } from '../types'
import { getRowHeight, getRowTop } from '../plugins'
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

  constructor(layers: GridRendererLayers) {
    this.layers = layers
  }

  paint(bounds: VisibleBounds, context: GridRendererContext): void {
    const keepSets: Record<CellZone, Set<string>> = {
      headerScroll: new Set(),
      headerFrozenLeft: new Set(),
      headerFrozenRight: new Set(),
      frozenBodyLeft: new Set(),
      frozenBodyRight: new Set(),
      body: new Set(),
    }

    const { colStart, colEnd, rowStart, rowEnd } = bounds
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

    for (const column of freeze.left) {
      for (let row = rowStart; row <= rowEnd; row++) {
        const key = this.cellKey('frozenBodyLeft', column, row)
        keepSets.frozenBodyLeft.add(key)
        this.paintCell('frozenBodyLeft', key, column, row, context)
      }
    }

    for (const column of freeze.right) {
      for (let row = rowStart; row <= rowEnd; row++) {
        const key = this.cellKey('frozenBodyRight', column, row)
        keepSets.frozenBodyRight.add(key)
        this.paintCell('frozenBodyRight', key, column, row, context)
      }
    }

    for (let column = colStart; column <= colEnd; column++) {
      if (isFrozenColumn(column, freeze)) continue
      for (let row = rowStart; row <= rowEnd; row++) {
        const key = this.cellKey('body', column, row)
        keepSets.body.add(key)
        this.paintCell('body', key, column, row, context)
      }
    }

    for (const zone of Object.keys(keepSets) as CellZone[]) {
      this.layers[ZONE_POOL[zone]].prune(keepSets[zone])
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

  private cellKey(zone: CellZone, col: number, row: number): string {
    const prefix = ZONE_KEY_PREFIX[zone]
    return row < 0 ? `${prefix}:${col}` : `${prefix}:${col}:${row}`
  }

  private domState(
    col: number,
    row: number,
    isHeader: boolean,
    cellType: GridCell['type'],
    context: GridRendererContext,
    edge: 'left' | 'right' | false = false,
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
    }
  }

  private paintCell(
    zone: CellZone,
    key: string,
    col: number,
    row: number,
    context: GridRendererContext,
  ): void {
    const isHeader = row < 0
    const { freeze, columns, headerHeight, rowHeight, scrollLeft, scrollTop } =
      context

    let frozenEdge: 'left' | 'right' | false = false
    if (zone === 'headerFrozenLeft' || zone === 'frozenBodyLeft') {
      const lastLeft = freeze.left[freeze.left.length - 1]
      frozenEdge = col === lastLeft ? 'left' : false
    } else if (zone === 'headerFrozenRight' || zone === 'frozenBodyRight') {
      const firstRight = freeze.right[0]
      frozenEdge = col === firstRight ? 'right' : false
    }

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
      if (zone === 'headerScroll') {
        left = getScrollingColumnX(col, scrollLeft, freeze)
      } else if (zone === 'headerFrozenLeft') {
        left = leftPackedX(col, columns, freeze)
      } else if (zone === 'headerFrozenRight') {
        left = rightPackedX(col, columns, freeze)
      } else {
        left = 0
      }
    } else {
      const rowHeightPx = getRowHeight(rowHeight, row)
      height = rowHeightPx
      top = getRowTop(rowHeight, row) - scrollTop
      zIndex = zone === 'body' ? 1 : 3
      if (zone === 'body') {
        left = getScrollingColumnX(col, scrollLeft, freeze)
      } else if (zone === 'frozenBodyLeft') {
        left = leftPackedX(col, columns, freeze)
      } else if (zone === 'frozenBodyRight') {
        left = rightPackedX(col, columns, freeze)
      } else {
        left = 0
      }
    }

    const pool = this.layers[ZONE_POOL[zone]]
    const element = pool.acquire(key)
    applyCellDom(
      element,
      this.domState(col, row, isHeader, cellType, context, frozenEdge),
      {
        left,
        top,
        width: columns[col].width,
        height,
        zIndex,
        col,
        row,
      },
      label,
    )
  }
}
