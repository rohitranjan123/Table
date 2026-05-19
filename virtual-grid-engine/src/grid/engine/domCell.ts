import type { GridCell } from '../types'

export interface CellDomState {
  isHeader: boolean
  isAlt: boolean
  isHover: boolean
  isSelected: boolean
  isFrozenEdge: boolean
  frozenEdgeSide?: 'left' | 'right'
  cellType: GridCell['type']
}

const BASE = 'vgrid__cell'

export function createCellElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = BASE
  return el
}

export function applyCellDom(
  el: HTMLDivElement,
  state: CellDomState,
  layout: {
    left: number
    top: number
    width: number
    height: number
    zIndex: number
    col: number
    row: number
  },
  label: string,
): void {
  const cls = [
    BASE,
    state.isHeader ? 'vgrid__cell--header' : '',
    !state.isHeader && state.isAlt ? 'vgrid__cell--alt' : '',
    state.isHover ? 'vgrid__cell--hover' : '',
    state.isSelected ? 'vgrid__cell--selected' : '',
    state.cellType === 'number' ? 'vgrid__cell--number' : '',
    state.isFrozenEdge && state.frozenEdgeSide === 'left'
      ? 'vgrid__cell--frozen-edge-left'
      : '',
    state.isFrozenEdge && state.frozenEdgeSide === 'right'
      ? 'vgrid__cell--frozen-edge-right'
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (el.className !== cls) el.className = cls

  el.style.left = `${layout.left}px`
  el.style.top = `${layout.top}px`
  el.style.width = `${layout.width}px`
  el.style.height = `${layout.height}px`
  el.style.zIndex = String(layout.zIndex)
  el.style.display = ''

  el.setAttribute('role', state.isHeader ? 'columnheader' : 'gridcell')
  el.setAttribute('aria-colindex', String(layout.col + 1))
  el.setAttribute('aria-rowindex', state.isHeader ? '1' : String(layout.row + 2))
  el.dataset.col = String(layout.col)
  el.dataset.row = state.isHeader ? '' : String(layout.row)
  el.dataset.header = state.isHeader ? '1' : '0'

  if (el.textContent !== label) el.textContent = label
}

export function hideCellElement(el: HTMLDivElement): void {
  el.style.display = 'none'
}

export function formatCellValue(cell: GridCell): string {
  return String(cell.data)
}
