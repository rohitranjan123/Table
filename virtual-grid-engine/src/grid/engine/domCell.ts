/** @internal Cell DOM creation and class/style application. */

import type { GridCell } from '../types'

export interface CellDomState {
  isHeader: boolean
  isAlt: boolean
  isHover: boolean
  isSelected: boolean
  isFrozenEdge: boolean
  frozenEdgeSide?: 'left' | 'right'
  cellType: GridCell['type']
  isRowSpan?: boolean
}

export interface CellLayout {
  left: number
  top: number
  width: number
  height: number
  zIndex: number
  col: number
  row: number
  useTransform?: boolean
}

const BASE = 'vgrid__cell'

export function createCellElement(): HTMLDivElement {
  const el = document.createElement('div')
  el.className = BASE
  return el
}

/** Update position/size only — used during scroll when cell content is unchanged. */
/** Toggle hover/selection/zebra classes without touching layout or content. */
export function applyCellInteraction(
  element: HTMLDivElement,
  state: Pick<CellDomState, 'isAlt' | 'isHover' | 'isSelected'>,
): void {
  element.classList.toggle('vgrid__cell--alt', state.isAlt)
  element.classList.toggle('vgrid__cell--hover', state.isHover)
  element.classList.toggle('vgrid__cell--selected', state.isSelected)
}

function applyCellGeometry(
  element: HTMLDivElement,
  layout: Pick<CellLayout, 'left' | 'top' | 'width' | 'height' | 'zIndex' | 'useTransform'>,
): void {
  element.style.width = `${layout.width}px`
  element.style.height = `${layout.height}px`
  element.style.zIndex = String(layout.zIndex)
  element.style.display = ''

  if (layout.useTransform) {
    element.style.left = '0'
    element.style.top = '0'
    element.style.transform = `translate3d(${layout.left}px, ${layout.top}px, 0)`
  } else {
    element.style.left = `${layout.left}px`
    element.style.top = `${layout.top}px`
    element.style.transform = ''
  }
}

export function applyCellPosition(
  element: HTMLDivElement,
  layout: Pick<CellLayout, 'left' | 'top' | 'width' | 'height' | 'zIndex' | 'useTransform'>,
): void {
  applyCellGeometry(element, layout)
}

export function applyCellDom(
  el: HTMLDivElement,
  state: CellDomState,
  layout: CellLayout,
  label: string,
): void {
  const cls = [
    BASE,
    state.isHeader ? 'vgrid__cell--header' : '',
    !state.isHeader && state.isAlt ? 'vgrid__cell--alt' : '',
    state.isHover ? 'vgrid__cell--hover' : '',
    state.isSelected ? 'vgrid__cell--selected' : '',
    state.cellType === 'number' ? 'vgrid__cell--number' : '',
    state.isRowSpan ? 'vgrid__cell--row-span' : '',
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

  applyCellGeometry(el, layout)

  el.setAttribute('role', state.isHeader ? 'columnheader' : 'gridcell')
  el.setAttribute('aria-colindex', String(layout.col + 1))
  el.setAttribute('aria-rowindex', state.isHeader ? '1' : String(layout.row + 2))
  el.dataset.col = String(layout.col)
  el.dataset.row = state.isHeader ? '' : String(layout.row)
  el.dataset.header = state.isHeader ? '1' : '0'
  el.dataset.span = state.isRowSpan ? '1' : '0'

  if (el.textContent !== label) el.textContent = label
}

export function hideCellElement(el: HTMLDivElement): void {
  el.style.display = 'none'
}

export function formatCellValue(cell: GridCell): string {
  return String(cell.data)
}
