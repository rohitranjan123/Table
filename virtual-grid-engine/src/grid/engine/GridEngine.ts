import {
  buildColumnLefts,
  computeTotalBodyHeight,
  computeVisibleBounds,
  resolveFrozenColumns,
  type ResolvedFreeze,
} from '../plugins'
import type { CellCoordinate, VisibleBounds } from '../types'
import { CellPool } from './CellPool'
import { GridRenderer } from './GridRenderer'
import { ScrollScheduler } from './ScrollScheduler'
import type { GridEngine, GridEngineOptions, GridScrollPosition } from './types'
import { resolveWheelDeltas } from './wheel'

type WheelAxis = 'x' | 'y'

const EMPTY_BOUNDS: VisibleBounds = {
  colStart: 0,
  colEnd: 0,
  rowStart: 0,
  rowEnd: 0,
}

export function createGrid(
  container: HTMLElement,
  initialOptions: GridEngineOptions,
): GridEngine {
  return new GridEngineImpl(container, initialOptions)
}

class GridEngineImpl implements GridEngine {
  private options: GridEngineOptions
  private destroyed = false

  private readonly root: HTMLDivElement
  private readonly scroller: HTMLDivElement
  private readonly spacer: HTMLDivElement
  private readonly viewport: HTMLDivElement
  private readonly layerHeaderScroll: HTMLDivElement
  private readonly layerHeaderFrozenLeft: HTMLDivElement
  private readonly layerHeaderFrozenRight: HTMLDivElement
  private readonly layerFrozenLeft: HTMLDivElement
  private readonly layerFrozenRight: HTMLDivElement
  private readonly layerBody: HTMLDivElement
  private readonly freezeDividerLeft: HTMLDivElement
  private readonly freezeDividerRight: HTMLDivElement

  private readonly scheduler = new ScrollScheduler()
  private readonly renderer: GridRenderer

  private columnLefts: number[] = []
  private freeze: ResolvedFreeze = resolveFrozenColumns([])
  private rowHint = 0
  private viewportWidth = 0
  private viewportHeight = 0
  private lastBounds: VisibleBounds = EMPTY_BOUNDS
  private lastScrollLeft = 0
  private lastScrollTop = 0
  private hoverCell: CellCoordinate | null = null
  private selectedCell: CellCoordinate | null = null

  private resizeObserver: ResizeObserver | null = null
  private wheelAxis: WheelAxis | null = null
  private wheelAxisTimer: number | null = null
  private layoutAnimationTimer: number | null = null
  private animatingCols = false
  private animatingRows = false
  private readonly onScrollerScroll = () => this.schedulePaint()
  private readonly onRootWheel = (e: WheelEvent) => this.handleWheel(e)
  private readonly onViewportPointerOver = (e: PointerEvent) =>
    this.handlePointerOver(e)
  private readonly onViewportPointerOut = (e: PointerEvent) =>
    this.handlePointerOut(e)
  private readonly onViewportClick = (e: MouseEvent) => this.handleClick(e)

  constructor(container: HTMLElement, options: GridEngineOptions) {
    this.options = options
    this.freeze = this.resolveFreeze()

    this.root = document.createElement('div')
    this.root.className = ['vgrid', options.className].filter(Boolean).join(' ')
    this.root.setAttribute('role', 'grid')
    this.applyContainerSize()

    this.scroller = document.createElement('div')
    this.scroller.className = 'vgrid__scroll'

    this.spacer = document.createElement('div')
    this.spacer.className = 'vgrid__spacer'

    this.viewport = document.createElement('div')
    this.viewport.className = 'vgrid__viewport'

    this.layerHeaderScroll = this.createLayer()
    this.layerHeaderFrozenLeft = this.createLayer()
    this.layerHeaderFrozenRight = this.createLayer()
    this.layerFrozenLeft = this.createLayer()
    this.layerFrozenRight = this.createLayer()
    this.layerBody = this.createLayer()

    this.freezeDividerLeft = document.createElement('div')
    this.freezeDividerLeft.className =
      'vgrid__freeze-divider vgrid__freeze-divider--left'
    this.freezeDividerLeft.setAttribute('aria-hidden', 'true')

    this.freezeDividerRight = document.createElement('div')
    this.freezeDividerRight.className =
      'vgrid__freeze-divider vgrid__freeze-divider--right'
    this.freezeDividerRight.setAttribute('aria-hidden', 'true')

    this.scroller.appendChild(this.spacer)
    this.root.appendChild(this.scroller)
    this.root.appendChild(this.viewport)

    this.viewport.appendChild(this.freezeDividerLeft)
    this.viewport.appendChild(this.freezeDividerRight)
    this.viewport.appendChild(this.layerHeaderScroll)
    this.viewport.appendChild(this.layerHeaderFrozenLeft)
    this.viewport.appendChild(this.layerHeaderFrozenRight)
    this.viewport.appendChild(this.layerFrozenLeft)
    this.viewport.appendChild(this.layerFrozenRight)
    this.viewport.appendChild(this.layerBody)

    container.appendChild(this.root)

    this.renderer = new GridRenderer({
      headerScroll: new CellPool(this.layerHeaderScroll),
      headerFrozenLeft: new CellPool(this.layerHeaderFrozenLeft),
      headerFrozenRight: new CellPool(this.layerHeaderFrozenRight),
      frozenBodyLeft: new CellPool(this.layerFrozenLeft),
      frozenBodyRight: new CellPool(this.layerFrozenRight),
      body: new CellPool(this.layerBody),
    })

    this.columnLefts = buildColumnLefts(options.columns)
    this.applyTransitionStyle()
    this.syncRootClassName()
    this.syncAriaCounts()
    this.syncSpacerAndLayers()
    this.scroller.addEventListener('scroll', this.onScrollerScroll, {
      passive: true,
    })
    this.root.addEventListener('wheel', this.onRootWheel, {
      passive: false,
      capture: true,
    })
    this.viewport.addEventListener('pointerover', this.onViewportPointerOver)
    this.viewport.addEventListener('pointerout', this.onViewportPointerOut)
    this.viewport.addEventListener('click', this.onViewportClick)

    this.measureViewport()
    if (options.width === undefined || options.height === undefined) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.destroyed) return
        this.syncSpacerAndLayers()
        this.syncScrollbarGutter()
        this.measureViewport()
        this.schedulePaint(true)
      })
      this.resizeObserver.observe(this.root)
    }

    this.schedulePaint(true)
  }

  updateOptions(partial: Partial<GridEngineOptions>): void {
    if (this.destroyed) return

    const needsPoolReset =
      partial.columns !== undefined ||
      partial.rowCount !== undefined ||
      partial.virtualization !== undefined

    let layoutAnimation: 'col' | 'row' | 'both' | null = null
    if (partial.frozenColumns !== undefined) layoutAnimation = 'col'
    if (partial.rowHeight !== undefined || partial.rowCount !== undefined) {
      layoutAnimation = layoutAnimation === 'col' ? 'both' : 'row'
    }
    if (partial.columns !== undefined) layoutAnimation = 'both'

    this.options = { ...this.options, ...partial }
    if (
      partial.columns ||
      partial.frozenColumns ||
      partial.virtualization !== undefined
    ) {
      this.columnLefts = buildColumnLefts(this.options.columns)
      this.freeze = this.resolveFreeze()
    }
    if (needsPoolReset) {
      this.renderer.clearPools()
      this.lastBounds = EMPTY_BOUNDS
      this.rowHint = 0
    }
    this.applyTransitionStyle()
    this.syncRootClassName()
    if (layoutAnimation) this.triggerLayoutAnimation(layoutAnimation)
    this.applyContainerSize()
    this.syncAriaCounts()
    this.syncSpacerAndLayers()
    this.measureViewport()
    if (layoutAnimation) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.schedulePaint(true))
      })
    } else {
      this.schedulePaint(true)
    }
  }

  getScroll(): GridScrollPosition {
    return { left: this.scroller.scrollLeft, top: this.scroller.scrollTop }
  }

  scrollTo(left: number, top: number): void {
    this.scroller.scrollLeft = left
    this.scroller.scrollTop = top
    this.schedulePaint(true)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.scheduler.cancel()
    this.resizeObserver?.disconnect()
    this.scroller.removeEventListener('scroll', this.onScrollerScroll)
    this.root.removeEventListener('wheel', this.onRootWheel, { capture: true })
    if (this.wheelAxisTimer !== null) {
      window.clearTimeout(this.wheelAxisTimer)
      this.wheelAxisTimer = null
    }
    if (this.layoutAnimationTimer !== null) {
      window.clearTimeout(this.layoutAnimationTimer)
      this.layoutAnimationTimer = null
    }
    this.wheelAxis = null
    this.hoverCell = null
    this.selectedCell = null
    this.viewport.removeEventListener('pointerover', this.onViewportPointerOver)
    this.viewport.removeEventListener('pointerout', this.onViewportPointerOut)
    this.viewport.removeEventListener('click', this.onViewportClick)
    this.renderer.destroy()
    this.root.remove()
  }

  private resolveFreeze(): ResolvedFreeze {
    return resolveFrozenColumns(this.options.columns, this.options.frozenColumns)
  }

  private get virtualization(): boolean {
    return this.options.virtualization !== false
  }

  private createLayer(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'vgrid__layer'
    return el
  }

  private applyContainerSize(): void {
    const { width, height } = this.options
    this.root.style.width = width !== undefined ? `${width}px` : '100%'
    this.root.style.height = height !== undefined ? `${height}px` : '100%'
  }

  private applyTransitionStyle(): void {
    const ms = this.options.transitionDurationMs ?? 240
    this.root.style.setProperty('--vgrid-transition-duration', `${ms}ms`)
  }

  private syncRootClassName(): void {
    const parts = ['vgrid', this.options.className].filter(Boolean)
    if (this.animatingCols) parts.push('vgrid--animate-cols')
    if (this.animatingRows) parts.push('vgrid--animate-rows')
    this.root.className = parts.join(' ')
  }

  /** Enable CSS transitions briefly for structural layout changes (not scroll). */
  private triggerLayoutAnimation(axis: 'col' | 'row' | 'both'): void {
    if (this.options.animateTransitions === false) return

    const duration = this.options.transitionDurationMs ?? 240
    if (axis === 'col' || axis === 'both') this.animatingCols = true
    if (axis === 'row' || axis === 'both') this.animatingRows = true
    this.syncRootClassName()

    if (this.layoutAnimationTimer !== null) {
      window.clearTimeout(this.layoutAnimationTimer)
    }
    this.layoutAnimationTimer = window.setTimeout(() => {
      this.animatingCols = false
      this.animatingRows = false
      this.syncRootClassName()
      this.layoutAnimationTimer = null
    }, duration + 32)
  }

  private syncAriaCounts(): void {
    this.root.setAttribute('aria-rowcount', String(this.options.rowCount))
    this.root.setAttribute('aria-colcount', String(this.options.columns.length))
  }

  private measureViewport(): void {
    const w = this.viewport.clientWidth
    const h = this.viewport.clientHeight
    if (w > 0 && h > 0) {
      this.viewportWidth = w
      this.viewportHeight = h
      return
    }
    const { width, height } = this.options
    this.viewportWidth = width ?? this.root.clientWidth
    this.viewportHeight = height ?? this.root.clientHeight
  }

  private syncScrollbarGutter(): void {
    let w = this.scroller.offsetWidth - this.scroller.clientWidth
    let h = this.scroller.offsetHeight - this.scroller.clientHeight
    const canScrollX = this.scroller.scrollWidth > this.scroller.clientWidth
    const canScrollY = this.scroller.scrollHeight > this.scroller.clientHeight
    const fallback = 12
    if (w === 0 && canScrollY) w = fallback
    if (h === 0 && canScrollX) h = fallback
    this.root.style.setProperty('--vgrid-scrollbar-w', `${w}px`)
    this.root.style.setProperty('--vgrid-scrollbar-h', `${h}px`)
  }

  private syncSpacerAndLayers(): void {
    const { rowCount, rowHeight, headerHeight } = this.options
    const totalWidth = this.freeze.layoutWidth
    const totalBodyHeight = computeTotalBodyHeight(rowCount, rowHeight)
    const totalHeight = headerHeight + totalBodyHeight
    const { leftWidth, rightWidth } = this.freeze

    this.spacer.style.width = `${totalWidth}px`
    this.spacer.style.height = `${totalHeight}px`
    this.spacer.style.minWidth = `${totalWidth}px`
    this.spacer.style.minHeight = `${totalHeight}px`

    const headerW = Math.max(0, this.viewportWidth - leftWidth - rightWidth)
    const bodyH = Math.max(0, this.viewportHeight - headerHeight)

    this.setLayerStyle(this.layerHeaderScroll, leftWidth, 0, headerW, headerHeight)
    this.setLayerStyle(this.layerHeaderFrozenLeft, 0, 0, leftWidth, headerHeight)
    this.setLayerStyle(
      this.layerHeaderFrozenRight,
      Math.max(0, this.viewportWidth - rightWidth),
      0,
      rightWidth,
      headerHeight,
    )
    this.setLayerStyle(this.layerFrozenLeft, 0, headerHeight, leftWidth, bodyH)
    this.setLayerStyle(
      this.layerFrozenRight,
      Math.max(0, this.viewportWidth - rightWidth),
      headerHeight,
      rightWidth,
      bodyH,
    )
    this.setLayerStyle(this.layerBody, leftWidth, headerHeight, headerW, bodyH)

    this.freezeDividerLeft.style.left = `${leftWidth - 1}px`
    this.freezeDividerLeft.style.display = leftWidth > 0 ? '' : 'none'

    this.freezeDividerRight.style.left = `${Math.max(0, this.viewportWidth - rightWidth - 1)}px`
    this.freezeDividerRight.style.display = rightWidth > 0 ? '' : 'none'

    this.syncScrollbarGutter()
  }

  private setLayerStyle(
    el: HTMLElement,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    el.style.left = `${left}px`
    el.style.top = `${top}px`
    el.style.width = `${width}px`
    el.style.height = `${height}px`
  }

  private handleWheel(e: WheelEvent): void {
    const maxTop = this.scroller.scrollHeight - this.scroller.clientHeight
    const maxLeft = this.scroller.scrollWidth - this.scroller.clientWidth
    if (maxTop <= 0 && maxLeft <= 0) return

    const { deltaX, deltaY, axis } = resolveWheelDeltas(e, this.wheelAxis)
    if (deltaX === 0 && deltaY === 0) return

    if (axis !== null) {
      this.wheelAxis = axis
      if (this.wheelAxisTimer !== null) {
        window.clearTimeout(this.wheelAxisTimer)
      }
      this.wheelAxisTimer = window.setTimeout(() => {
        this.wheelAxis = null
        this.wheelAxisTimer = null
      }, 120)
    }

    let nextTop = this.scroller.scrollTop
    let nextLeft = this.scroller.scrollLeft

    if (deltaY !== 0) {
      nextTop = Math.max(0, Math.min(maxTop, this.scroller.scrollTop + deltaY))
    }
    if (deltaX !== 0) {
      nextLeft = Math.max(0, Math.min(maxLeft, this.scroller.scrollLeft + deltaX))
    }

    if (
      nextTop === this.scroller.scrollTop &&
      nextLeft === this.scroller.scrollLeft
    ) {
      return
    }

    e.preventDefault()
    if (deltaY !== 0) this.scroller.scrollTop = nextTop
    if (deltaX !== 0) this.scroller.scrollLeft = nextLeft
    this.schedulePaint()
  }

  private schedulePaint(force = false): void {
    this.scheduler.schedule(() => this.paint(force))
  }

  private paint(force = false): void {
    if (this.destroyed) return

    const scrollLeft = this.scroller.scrollLeft
    const scrollTop = this.scroller.scrollTop

    if (this.viewportWidth <= 0 || this.viewportHeight <= 0) return

    const { bounds, rowHint } = computeVisibleBounds({
      scrollLeft,
      scrollTop,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
      headerHeight: this.options.headerHeight,
      rowCount: this.options.rowCount,
      rowHeight: this.options.rowHeight,
      columns: this.options.columns,
      freeze: this.freeze,
      rowHint: this.rowHint,
      virtualization: this.virtualization,
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

    this.renderer.paint(bounds, {
      columns: this.options.columns,
      columnLefts: this.columnLefts,
      rowCount: this.options.rowCount,
      rowHeight: this.options.rowHeight,
      headerHeight: this.options.headerHeight,
      freeze: this.freeze,
      scrollLeft,
      scrollTop,
      hoverCell: this.hoverCell,
      selectedCell: this.selectedCell,
      getCellContent: this.options.getCellContent,
    })
  }

  private cellFromTarget(target: EventTarget | null): CellCoordinate | null {
    if (!(target instanceof HTMLElement)) return null
    const cell = target.closest('.vgrid__cell')
    if (!(cell instanceof HTMLElement)) return null
    if (cell.dataset.header === '1') return null
    const col = Number(cell.dataset.col)
    const row = Number(cell.dataset.row)
    if (Number.isNaN(col) || Number.isNaN(row)) return null
    return [col, row]
  }

  private handlePointerOver(e: PointerEvent): void {
    const coord = this.cellFromTarget(e.target)
    if (!coord) return
    if (
      this.hoverCell?.[0] === coord[0] &&
      this.hoverCell[1] === coord[1]
    ) {
      return
    }
    this.hoverCell = coord
    this.options.onCellHover?.(coord)
    this.schedulePaint(true)
  }

  private handlePointerOut(e: PointerEvent): void {
    const related = e.relatedTarget
    if (related instanceof Node && this.viewport.contains(related)) {
      const nested = this.cellFromTarget(related)
      if (nested) return
    }
    if (this.hoverCell === null) return
    this.hoverCell = null
    this.options.onCellHover?.(null)
    this.schedulePaint(true)
  }

  private handleClick(e: MouseEvent): void {
    const coord = this.cellFromTarget(e.target)
    if (!coord) return
    this.selectedCell = coord
    this.options.onCellSelect?.(coord)
    this.schedulePaint(true)
  }
}
