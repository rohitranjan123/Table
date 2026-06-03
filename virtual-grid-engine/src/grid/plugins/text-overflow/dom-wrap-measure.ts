/** @internal Measure rendered wrap cell height from painted DOM. */

import { CELL_PADDING_Y } from './text-measure'

const LABEL_SELECTOR = '.vgrid__cell__label'

/** Content height for a wrap body cell (padding included). */
export function measureDisplayedWrapCellHeight(cell: HTMLElement): number {
  const label = cell.querySelector(LABEL_SELECTOR)
  if (!(label instanceof HTMLElement)) return 0
  const content = label.scrollHeight
  if (content <= 0) return 0
  return Math.ceil(content + CELL_PADDING_Y)
}
