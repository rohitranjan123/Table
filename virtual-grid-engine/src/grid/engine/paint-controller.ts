/** @internal Visible-bounds computation and renderer orchestration. */

import { computeVisibleBounds } from '../plugins'
import type { CellCoordinate, VisibleBounds } from '../types'
import type { GridRenderer, GridRendererContext } from './GridRenderer'
import { ScrollScheduler } from './ScrollScheduler'
import type { GridDomShell } from './dom-shell'
import type { ResolvedFreeze } from '../plugins/freeze-columns'

const EMPTY_BOUNDS: VisibleBounds = {
  colStart: 0,
  colEnd: 0,
  rowStart: 0,
  rowEnd: 0,
}

export interface PaintControllerDeps {
  shell: GridDomShell
  renderer: GridRenderer
  getOptions: () => GridRendererContext & {
    virtualization: boolean
    rowCount: number
  }
  getFreeze: () => ResolvedFreeze
  getColumnLefts: () => number[]
  getViewportSize: () => { width: number; height: number }
  isDestroyed: () => boolean
}

export class PaintController {
  private readonly scheduler = new ScrollScheduler()
  private readonly deps: PaintControllerDeps

  private rowHint = 0
  private lastBounds: VisibleBounds = EMPTY_BOUNDS
  private lastScrollLeft = 0
  private lastScrollTop = 0

  constructor(deps: PaintControllerDeps) {
    this.deps = deps
  }

  schedulePaint(force = false): void {
    this.scheduler.schedule(() => this.paint(force))
  }

  cancel(): void {
    this.scheduler.cancel()
  }

  resetBounds(): void {
    this.lastBounds = EMPTY_BOUNDS
    this.rowHint = 0
  }

  paint(force = false): void {
    if (this.deps.isDestroyed()) return

    const { shell } = this.deps
    const scrollLeft = shell.scroller.scrollLeft
    const scrollTop = shell.scroller.scrollTop
    const { width: viewportWidth, height: viewportHeight } =
      this.deps.getViewportSize()

    if (viewportWidth <= 0 || viewportHeight <= 0) return

    const options = this.deps.getOptions()
    const { bounds, rowHint } = computeVisibleBounds({
      scrollLeft,
      scrollTop,
      viewportWidth,
      viewportHeight,
      headerHeight: options.headerHeight,
      rowCount: options.rowCount,
      rowHeight: options.rowHeight,
      columns: options.columns,
      freeze: this.deps.getFreeze(),
      rowHint: this.rowHint,
      virtualization: options.virtualization,
    })
    this.rowHint = rowHint

    const unchanged =
      !force &&
      bounds.colStart === this.lastBounds.colStart &&
      bounds.colEnd === this.lastBounds.colEnd &&
      bounds.rowStart === this.lastBounds.rowStart &&
      bounds.rowEnd === this.lastBounds.rowEnd &&
      scrollLeft === this.lastScrollLeft &&
      scrollTop === this.lastScrollTop

    if (unchanged) return

    this.lastBounds = bounds
    this.lastScrollLeft = scrollLeft
    this.lastScrollTop = scrollTop

    this.deps.renderer.paint(bounds, {
      columns: options.columns,
      columnLefts: this.deps.getColumnLefts(),
      rowCount: options.rowCount,
      rowHeight: options.rowHeight,
      headerHeight: options.headerHeight,
      freeze: this.deps.getFreeze(),
      scrollLeft,
      scrollTop,
      hoverCell: options.hoverCell,
      selectedCell: options.selectedCell,
      getCellContent: options.getCellContent,
    })
  }
}

export type { CellCoordinate }
