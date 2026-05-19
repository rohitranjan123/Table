import {
  buildColumnLefts,
  resolveFrozenColumns,
  type ResolvedFreeze,
} from '../plugins'
import type { CellCoordinate } from '../types'
import { CellPool } from './CellPool'
import { createGridDomShell } from './dom-shell'
import { GridRenderer } from './GridRenderer'
import {
  applyContainerSize,
  applyTransitionStyle,
  measureViewport,
  syncAriaCounts,
  syncRootClassName,
  syncSpacerAndLayers,
} from './layout-sync'
import { PaintController } from './paint-controller'
import { attachScrollInput } from './scroll-input'
import type { GridEngine, GridEngineOptions, GridScrollPosition } from './types'

export function createGrid(
  container: HTMLElement,
  initialOptions: GridEngineOptions,
): GridEngine {
  return new GridEngineImpl(container, initialOptions)
}

class GridEngineImpl implements GridEngine {
  private options: GridEngineOptions
  private destroyed = false

  private readonly shell: ReturnType<typeof createGridDomShell>
  private readonly renderer: GridRenderer
  private readonly paintController: PaintController
  private scrollInput: ReturnType<typeof attachScrollInput> | null = null

  private columnLefts: number[] = []
  private freeze: ResolvedFreeze = resolveFrozenColumns([])
  private viewportWidth = 0
  private viewportHeight = 0
  private hoverCell: CellCoordinate | null = null
  private selectedCell: CellCoordinate | null = null

  private resizeObserver: ResizeObserver | null = null
  private layoutAnimationTimer: number | null = null
  private animatingCols = false
  private animatingRows = false

  constructor(container: HTMLElement, options: GridEngineOptions) {
    this.options = options
    this.shell = createGridDomShell(container, options.className)
    this.freeze = resolveFrozenColumns(options.columns, options.frozenColumns)

    this.renderer = new GridRenderer({
      headerScroll: new CellPool(this.shell.layerHeaderScroll),
      headerFrozenLeft: new CellPool(this.shell.layerHeaderFrozenLeft),
      headerFrozenRight: new CellPool(this.shell.layerHeaderFrozenRight),
      frozenBodyLeft: new CellPool(this.shell.layerFrozenLeft),
      frozenBodyRight: new CellPool(this.shell.layerFrozenRight),
      body: new CellPool(this.shell.layerBody),
    })

    this.paintController = new PaintController({
      shell: this.shell,
      renderer: this.renderer,
      getOptions: () => ({
        columns: this.options.columns,
        columnLefts: this.columnLefts,
        rowCount: this.options.rowCount,
        rowHeight: this.options.rowHeight,
        headerHeight: this.options.headerHeight,
        freeze: this.freeze,
        scrollLeft: this.shell.scroller.scrollLeft,
        scrollTop: this.shell.scroller.scrollTop,
        hoverCell: this.hoverCell,
        selectedCell: this.selectedCell,
        getCellContent: this.options.getCellContent,
        virtualization: this.virtualization,
      }),
      getFreeze: () => this.freeze,
      getColumnLefts: () => this.columnLefts,
      getViewportSize: () => ({
        width: this.viewportWidth,
        height: this.viewportHeight,
      }),
      isDestroyed: () => this.destroyed,
    })

    this.columnLefts = buildColumnLefts(options.columns)
    this.applyChrome()
    this.syncLayout()
    this.bindInput()

    if (options.width === undefined || options.height === undefined) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.destroyed) return
        this.syncLayout()
        this.paintController.schedulePaint(true)
      })
      this.resizeObserver.observe(this.shell.root)
    }

    this.paintController.schedulePaint(true)
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
      this.freeze = resolveFrozenColumns(
        this.options.columns,
        this.options.frozenColumns,
      )
    }
    if (needsPoolReset) {
      this.renderer.clearPools()
      this.paintController.resetBounds()
    }
    this.applyChrome()
    if (layoutAnimation) this.triggerLayoutAnimation(layoutAnimation)
    this.syncLayout()
    if (layoutAnimation) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.paintController.schedulePaint(true))
      })
    } else {
      this.paintController.schedulePaint(true)
    }
  }

  getScroll(): GridScrollPosition {
    return {
      left: this.shell.scroller.scrollLeft,
      top: this.shell.scroller.scrollTop,
    }
  }

  scrollTo(left: number, top: number): void {
    this.shell.scroller.scrollLeft = left
    this.shell.scroller.scrollTop = top
    this.paintController.schedulePaint(true)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.paintController.cancel()
    this.resizeObserver?.disconnect()
    this.scrollInput?.destroy()
    this.scrollInput = null
    if (this.layoutAnimationTimer !== null) {
      window.clearTimeout(this.layoutAnimationTimer)
      this.layoutAnimationTimer = null
    }
    this.hoverCell = null
    this.selectedCell = null
    this.renderer.destroy()
    this.shell.root.remove()
  }

  private get virtualization(): boolean {
    return this.options.virtualization !== false
  }

  private applyChrome(): void {
    applyContainerSize(
      this.shell.root,
      this.options.width,
      this.options.height,
    )
    applyTransitionStyle(this.shell.root, this.options.transitionDurationMs)
    syncRootClassName(
      this.shell.root,
      this.options.className,
      this.animatingCols,
      this.animatingRows,
    )
    syncAriaCounts(
      this.shell.root,
      this.options.rowCount,
      this.options.columns.length,
    )
  }

  private syncLayout(): void {
    const size = measureViewport(this.shell, this.options)
    this.viewportWidth = size.width
    this.viewportHeight = size.height
    syncSpacerAndLayers({
      shell: this.shell,
      options: this.options,
      freeze: this.freeze,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
    })
  }

  private bindInput(): void {
    this.scrollInput = attachScrollInput(
      this.shell,
      {
        onSchedulePaint: (force) => this.paintController.schedulePaint(force),
        onCellHover: (cell) => this.options.onCellHover?.(cell),
        onCellSelect: (cell) => this.options.onCellSelect?.(cell),
      },
      () => this.hoverCell,
      (cell) => {
        this.hoverCell = cell
      },
      (cell) => {
        this.selectedCell = cell
      },
    )
  }

  private triggerLayoutAnimation(axis: 'col' | 'row' | 'both'): void {
    if (this.options.animateTransitions === false) return

    const duration = this.options.transitionDurationMs ?? 240
    if (axis === 'col' || axis === 'both') this.animatingCols = true
    if (axis === 'row' || axis === 'both') this.animatingRows = true
    syncRootClassName(
      this.shell.root,
      this.options.className,
      this.animatingCols,
      this.animatingRows,
    )

    if (this.layoutAnimationTimer !== null) {
      window.clearTimeout(this.layoutAnimationTimer)
    }
    this.layoutAnimationTimer = window.setTimeout(() => {
      this.animatingCols = false
      this.animatingRows = false
      syncRootClassName(
        this.shell.root,
        this.options.className,
        this.animatingCols,
        this.animatingRows,
      )
      this.layoutAnimationTimer = null
    }, duration + 32)
  }
}
