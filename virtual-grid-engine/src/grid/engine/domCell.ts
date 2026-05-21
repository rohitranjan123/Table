/** @internal Cell DOM creation and class/style application. */

import { flashCellElement } from './cell-flash'
import type { CellTextOverflow, GridCell, SortDirection } from '../types'

export interface CellDomState {
  isHeader: boolean
  isAlt: boolean
  isHover: boolean
  isSelected: boolean
  isFrozenEdge: boolean
  frozenEdgeSide?: 'left' | 'right'
  cellType: GridCell['type']
  isRowSpan?: boolean
  textOverflow: CellTextOverflow
  sortDirection?: SortDirection
  sortable?: boolean
}

export interface CellLayout {
  left: number
  top: number
  width: number
  height: number
  zIndex: number
  col: number
  row: number
  field?: string
  sourceRow?: number
  useTransform?: boolean
}

const BASE = 'vgrid__cell'
const LABEL_CLASS = 'vgrid__cell__label'

const OVERFLOW_CLASS: Record<CellTextOverflow, string> = {
  ellipsis: 'vgrid__cell--to-ellipsis',
  overflow: 'vgrid__cell--to-overflow',
  wrap: 'vgrid__cell--to-wrap',
}

function overflowClass(mode: CellTextOverflow | undefined): string {
  return OVERFLOW_CLASS[mode ?? 'ellipsis']
}

function setCellLabel(el: HTMLDivElement, label: string): void {
  let labelEl = el.firstElementChild
  if (
    labelEl?.nodeType !== Node.ELEMENT_NODE ||
    !(labelEl as HTMLElement).classList.contains(LABEL_CLASS)
  ) {
    el.replaceChildren()
    labelEl = document.createElement('span')
    labelEl.className = LABEL_CLASS
    el.appendChild(labelEl)
  }
  if (labelEl.textContent !== label) labelEl.textContent = label
}

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
  layout: Pick<
    CellLayout,
    | 'left'
    | 'top'
    | 'width'
    | 'height'
    | 'zIndex'
    | 'useTransform'
    | 'field'
    | 'row'
    | 'sourceRow'
  >,
): void {
  applyCellGeometry(element, layout)
  if (layout.field !== undefined) element.dataset.field = layout.field
  if (layout.sourceRow !== undefined) {
    element.dataset.sourceRow = String(layout.sourceRow)
  }
}

/** Header-only: update sort indicator classes without layout or title churn. */
export function applyHeaderSortState(
  el: HTMLDivElement,
  state: Pick<CellDomState, 'sortDirection' | 'sortable'>,
): void {
  const sortDir = state.sortDirection ?? ''
  if (el.dataset.sort === sortDir && el.dataset.sortable === (state.sortable ? '1' : '0')) {
    return
  }

  el.classList.toggle('vgrid__cell--sortable', state.sortable === true)
  el.classList.toggle('vgrid__cell--sort-asc', sortDir === 'asc')
  el.classList.toggle('vgrid__cell--sort-desc', sortDir === 'desc')
  el.dataset.sort = sortDir
  el.dataset.sortable = state.sortable ? '1' : '0'
}

/** Body-only: refresh label and number alignment when row data changed in place. */
export function applyCellContent(
  element: HTMLDivElement,
  label: string,
  cellType: GridCell['type'],
  options?: { flashOnChange?: boolean },
): void {
  const isNumber = cellType === 'number'
  element.classList.toggle('vgrid__cell--number', isNumber)
  element.dataset.cellType = cellType
  const prev = element.dataset.content
  if (prev === label) return
  element.dataset.content = label
  setCellLabel(element, label)
  if (options?.flashOnChange && prev !== undefined && prev !== '') {
    flashCellElement(element)
  }
}

/** Row-stagger reveal: set CSS delay from display row index. */
export function applyCellReveal(
  element: HTMLDivElement,
  displayRow: number,
  active: boolean,
): void {
  if (!active) {
    element.style.removeProperty('--vgrid-reveal-row')
    return
  }
  const cappedRow = Math.min(displayRow, 40)
  element.style.setProperty('--vgrid-reveal-row', String(cappedRow))
}

export function applyCellDom(
  el: HTMLDivElement,
  state: CellDomState,
  layout: CellLayout,
  label: string,
  options?: { flashOnChange?: boolean },
): void {
  const cls = [
    BASE,
    state.isHeader ? 'vgrid__cell--header' : '',
    !state.isHeader && state.isAlt ? 'vgrid__cell--alt' : '',
    state.isHover ? 'vgrid__cell--hover' : '',
    state.isSelected ? 'vgrid__cell--selected' : '',
    state.cellType === 'number' ? 'vgrid__cell--number' : '',
    state.isRowSpan ? 'vgrid__cell--row-span' : '',
    overflowClass(state.textOverflow),
    state.isFrozenEdge && state.frozenEdgeSide === 'left'
      ? 'vgrid__cell--frozen-edge-left'
      : '',
    state.isFrozenEdge && state.frozenEdgeSide === 'right'
      ? 'vgrid__cell--frozen-edge-right'
      : '',
    state.isHeader && state.sortable ? 'vgrid__cell--sortable' : '',
    state.isHeader && state.sortDirection === 'asc'
      ? 'vgrid__cell--sort-asc'
      : '',
    state.isHeader && state.sortDirection === 'desc'
      ? 'vgrid__cell--sort-desc'
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
  el.dataset.field = layout.field ?? ''
  el.dataset.row = state.isHeader ? '' : String(layout.row)
  if (!state.isHeader && layout.sourceRow !== undefined) {
    el.dataset.sourceRow = String(layout.sourceRow)
  }
  el.dataset.header = state.isHeader ? '1' : '0'
  el.dataset.span = state.isRowSpan ? '1' : '0'
  el.dataset.textOverflow = state.textOverflow ?? 'ellipsis'
  if (state.isHeader) {
    el.dataset.sort = state.sortDirection ?? ''
    el.dataset.sortable = state.sortable ? '1' : '0'
  }

  if (!state.isHeader) {
    const prev = el.dataset.content
    setCellLabel(el, label)
    el.dataset.content = label
    el.dataset.cellType = state.cellType
    if (
      options?.flashOnChange &&
      prev !== undefined &&
      prev !== '' &&
      prev !== label
    ) {
      flashCellElement(el)
    }
  } else {
    setCellLabel(el, label)
  }
}

export function hideCellElement(el: HTMLDivElement): void {
  el.style.display = 'none'
}

export function formatCellValue(cell: GridCell): string {
  return String(cell.data)
}
