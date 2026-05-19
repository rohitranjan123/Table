/** @internal Visible-bounds computation and renderer orchestration. */

import { computeVisibleBounds } from '../plugins'
import type { CellCoordinate, VisibleBounds } from '../types'
import type { GridRenderer, GridRendererContext } from './GridRenderer'
import { ScrollScheduler } from './ScrollScheduler'
import type { GridDomShell } from './dom-shell'
import type { ResolvedFreeze, RowMetrics } from '../plugins'

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
  getRowMetrics: () => RowMetrics
  getFreeze: () => ResolvedFreeze
  getColumnLefts: () => number[]
  getViewportSize: () => { width: number; height: number }
  isDestroyed: () => boolean
  isScrollActive: () => boolean
  onScrollActivity: () => void
}

export class PaintController {
  private readonly scheduler = new ScrollScheduler()
  private readonly deps: PaintControllerDeps

  private rowHint = 0
  private lastBounds: VisibleBounds = EMPTY_BOUNDS
  private lastScrollLeft = 0
  private lastScrollTop = 0
  private lastHoverKey: string | null = null
  private lastSelectedKey: string | null = null

  constructor(deps: PaintControllerDeps) {
    this.deps = deps
  }

  schedulePaint(force = false): void {
    if (force) {
      this.scheduler.cancel()
      this.syncInteractionKeys()
      this.paint(true)
      return
    }
    this.scheduler.schedule(() => this.paint(false))
  }

  /** Synchronous hover/selection update — skips RAF and full cell repaint when layout is stable. */
  scheduleInteractionPaint(): void {
    if (this.deps.isDestroyed()) return

    const options = this.deps.getOptions()
    const hoverKey = coordKey(options.hoverCell)
    const selectedKey = coordKey(options.selectedCell)

    if (
      hoverKey === this.lastHoverKey &&
      selectedKey === this.lastSelectedKey
    ) {
      return
    }

    this.lastHoverKey = hoverKey
    this.lastSelectedKey = selectedKey

    const { shell } = this.deps
    const scrollLeft = shell.scroller.scrollLeft
    const scrollTop = shell.scroller.scrollTop

    const layoutUnchanged =
      scrollLeft === this.lastScrollLeft &&
      scrollTop === this.lastScrollTop &&
      this.lastBounds.colEnd >= this.lastBounds.colStart

    if (layoutUnchanged) {
      this.deps.renderer.updateInteraction(
        options.hoverCell,
        options.selectedCell,
      )
      return
    }

    this.scheduler.cancel()
    this.paint(true)
  }

  private syncInteractionKeys(): void {
    const options = this.deps.getOptions()
    this.lastHoverKey = coordKey(options.hoverCell)
    this.lastSelectedKey = coordKey(options.selectedCell)
  }

  cancel(): void {
    this.scheduler.cancel()
  }

  resetBounds(): void {
    this.lastBounds = EMPTY_BOUNDS
    this.rowHint = 0
    this.lastHoverKey = null
    this.lastSelectedKey = null
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
    const rowMetrics = this.deps.getRowMetrics()
    const { bounds, rowHint } = computeVisibleBounds({
      scrollLeft,
      scrollTop,
      viewportWidth,
      viewportHeight,
      headerHeight: options.headerHeight,
      rowCount: options.rowCount,
      rowMetrics,
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
    this.syncInteractionKeys()

    this.deps.renderer.paint(bounds, {
      columns: options.columns,
      columnLefts: this.deps.getColumnLefts(),
      rowCount: options.rowCount,
      rowMetrics,
      headerHeight: options.headerHeight,
      freeze: this.deps.getFreeze(),
      scrollLeft,
      scrollTop,
      hoverCell: options.hoverCell,
      selectedCell: options.selectedCell,
      getCellContent: options.getCellContent,
      deferPrune: this.deps.isScrollActive(),
    })
  }

  notifyScroll(): void {
    this.deps.onScrollActivity()
    this.schedulePaint()
  }
}

function coordKey(cell: CellCoordinate | null): string | null {
  if (cell === null) return null
  return `${cell[0]},${cell[1]}`
}

export type { CellCoordinate }
