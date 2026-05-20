import { resolveColumnWidths } from '../col-def'
import {
  buildColumnLefts,
  computeRowSpans,
  computeEffectiveHeaderHeight,
  createRowMetrics,
  createWrapAwareRowMetrics,
  gridHasTextOverflowVisible,
  hasRowSpanning,
  resolveFrozenColumns,
  rowOrderEqual,
  sortStateEqual,
  type ResolvedFreeze,
  type RowMetrics,
  type RowSpanContext,
} from '../plugins'
import type { CellTextOverflow } from '../types'
import { usesFluidSizing } from '../grid-size'
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
import { createSortAccess } from './sort-access'
import { setBodySortingActive } from './shell-layers'
import { attachScrollInput } from './scroll-input'
import type { GridEngine, GridEngineOptions, GridScrollPosition } from './types'
import { cycleSortState } from '../plugins'
import type { SortState } from '../types'
import {
  createPluginsRegistry,
  type GridPluginsRegistry,
} from './plugins-registry'
export function createGrid(
  container: HTMLElement,
  initialOptions: GridEngineOptions,
): GridEngine {
  return new GridEngineImpl(container, initialOptions)
}

class GridEngineImpl implements GridEngine {
  private options: GridEngineOptions
  private destroyed = false

  private readonly container: HTMLElement
  private readonly shell: ReturnType<typeof createGridDomShell>
  private readonly renderer: GridRenderer
  private readonly paintController: PaintController
  private scrollInput: ReturnType<typeof attachScrollInput> | null = null

  readonly plugins: GridPluginsRegistry

  private columnLefts: number[] = []
  private rowMetrics: RowMetrics = createRowMetrics(0, 28)
  private effectiveHeaderHeight = 0
  private spanContext: RowSpanContext | null = null
  private freeze: ResolvedFreeze = resolveFrozenColumns([])
  private viewportWidth = 0
  private viewportHeight = 0
  private hoverCell: CellCoordinate | null = null
  private selectedCell: CellCoordinate | null = null
  private lastLayoutViewportWidth = 0

  private scrollActive = false
  private scrollIdleTimer: number | null = null
  private resizeObserver: ResizeObserver | null = null
  private layoutAnimationTimer: number | null = null
  private animatingCols = false
  private animatingRows = false
  private readonly sortAccess = createSortAccess()
  private appliedSortState: SortState[] = []
  private sortBodyFrame: number | null = null

  constructor(container: HTMLElement, options: GridEngineOptions) {
    this.options = options
    this.container = container
    this.plugins = createPluginsRegistry(() => {
      this.rebuildSpanContext()
    })

    this.shell = createGridDomShell(
      container,
      options.gridId,
      options.className,
    )
    this.freeze = resolveFrozenColumns(options.columns, options.frozenColumns)
    this.rebuildSortAccess(true)
    this.appliedSortState = this.cloneSortState(this.sortState)
    this.rebuildLayoutMetrics()

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
        rowMetrics: this.rowMetrics,
        headerHeight: this.effectiveHeaderHeight,
        headerTextOverflow: this.headerTextOverflow,
        cellTextOverflow: this.cellTextOverflow,
        freeze: this.freeze,
        scrollLeft: this.shell.scroller.scrollLeft,
        scrollTop: this.shell.scroller.scrollTop,
        hoverCell: this.hoverCell,
        selectedCell: this.selectedCell,
        getCellContent: this.sortAccess.getCellContent,
        sortState: this.sortState,
        sortHeadersEnabled: this.sortHeadersEnabled,
        spanContext: this.spanContext,
        virtualization: this.virtualization,
        scrollActive: this.scrollActive,
      }),
      getRowMetrics: () => this.rowMetrics,
      getFreeze: () => this.freeze,
      getColumnLefts: () => this.columnLefts,
      getViewportSize: () => ({
        width: this.viewportWidth,
        height: this.viewportHeight,
      }),
      isDestroyed: () => this.destroyed,
      isScrollActive: () => this.scrollActive,
      onScrollActivity: () => this.markScrollActive(),
      getGridId: () => this.options.gridId,
    })

    this.rebuildColumnLayout(0)
    this.applyChrome()
    this.syncLayout()
    this.bindInput()

    this.syncResizeObserver()

    if (options.modules?.length) {
      this.plugins.attach(options.modules)
    } else {
      this.rebuildSpanContext()
    }

    this.paintController.schedulePaint(true)
  }

  updateOptions(partial: Partial<GridEngineOptions>): void {
    if (this.destroyed) return

    const needsSortRebuild =
      partial.columns !== undefined ||
      partial.rowCount !== undefined ||
      partial.getCellContent !== undefined ||
      partial.sortState !== undefined

    const needsSpanRebuild =
      needsSortRebuild ||
      partial.rowHeight !== undefined ||
      partial.rowSpanRevision !== undefined

    const needsLayoutMetricsRebuild =
      needsSpanRebuild ||
      partial.headerTextOverflow !== undefined ||
      partial.cellTextOverflow !== undefined ||
      partial.headerHeight !== undefined

    const needsPoolReset =
      needsLayoutMetricsRebuild ||
      partial.virtualization !== undefined

    let layoutAnimation: 'col' | 'row' | 'both' | null = null
    if (partial.frozenColumns !== undefined) layoutAnimation = 'col'
    if (
      partial.rowHeight !== undefined ||
      partial.rowCount !== undefined ||
      partial.headerTextOverflow !== undefined ||
      partial.cellTextOverflow !== undefined ||
      partial.headerHeight !== undefined
    ) {
      layoutAnimation = layoutAnimation === 'col' ? 'both' : 'row'
    }
    if (partial.columns !== undefined || partial.columnDefs !== undefined) {
      layoutAnimation = 'both'
    }

    const sortOnly =
      partial.sortState !== undefined &&
      !needsLayoutMetricsRebuild &&
      partial.columns === undefined &&
      partial.columnDefs === undefined &&
      partial.frozenColumns === undefined &&
      partial.virtualization === undefined &&
      partial.width === undefined &&
      partial.height === undefined

    this.options = { ...this.options, ...partial }

    if (partial.sortState !== undefined) {
      const applied = this.applySortState(partial.sortState)
      if (applied && sortOnly) {
        return
      }
    }

    // Rebuild when rowData/rowCount changes even if sortState is unchanged
    // (applySortState short-circuits on equal sort and skips sort access rebuild).
    if (needsSortRebuild) {
      this.rebuildSortAccess(
        partial.getCellContent !== undefined ||
          partial.columns !== undefined ||
          partial.rowCount !== undefined,
      )
    }

    if (needsLayoutMetricsRebuild) {
      this.rebuildLayoutMetrics()
    }
    if (needsSpanRebuild) {
      this.rebuildSpanContext()
    }
    if (
      partial.columns ||
      partial.columnDefs ||
      partial.frozenColumns ||
      partial.virtualization !== undefined
    ) {
      this.rebuildColumnLayout(this.viewportWidth)
      this.freeze = resolveFrozenColumns(
        this.options.columns,
        this.options.frozenColumns,
      )
    }
    if (needsPoolReset) {
      this.renderer.clearPools()
      this.paintController.resetBounds()
    }
    if (partial.width !== undefined || partial.height !== undefined) {
      this.syncResizeObserver()
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

  getOriginalRow(displayRow: number): number {
    return this.sortAccess.getOriginalRow(displayRow)
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.paintController.cancel()
    this.resizeObserver?.disconnect()
    this.scrollInput?.destroy()
    this.scrollInput = null
    if (this.scrollIdleTimer !== null) {
      window.clearTimeout(this.scrollIdleTimer)
      this.scrollIdleTimer = null
    }
    if (this.layoutAnimationTimer !== null) {
      window.clearTimeout(this.layoutAnimationTimer)
      this.layoutAnimationTimer = null
    }
    if (this.sortBodyFrame !== null) {
      cancelAnimationFrame(this.sortBodyFrame)
      this.sortBodyFrame = null
    }
    setBodySortingActive(this.shell, false)
    this.hoverCell = null
    this.selectedCell = null
    this.renderer.destroy()
    this.shell.root.remove()
  }

  private get virtualization(): boolean {
    if (!this.plugins.has('virtualization')) return false
    return this.options.virtualization !== false
  }

  private get sortHeadersEnabled(): boolean {
    return (
      this.plugins.has('column-sort') &&
      this.options.onSortStateChange !== undefined
    )
  }

  private get headerTextOverflow(): CellTextOverflow {
    return this.options.headerTextOverflow ?? 'ellipsis'
  }

  private get cellTextOverflow(): CellTextOverflow {
    return this.options.cellTextOverflow ?? 'ellipsis'
  }

  private wrapMetricsInput() {
    return {
      columns: this.options.columns,
      rowCount: this.options.rowCount,
      rowHeight: this.options.rowHeight,
      headerHeight: this.options.headerHeight,
      headerTextOverflow: this.headerTextOverflow,
      cellTextOverflow: this.cellTextOverflow,
      getCellContent: this.sortAccess.getCellContent,
    }
  }

  private get sortState(): SortState[] {
    if (!this.plugins.has('column-sort')) return []
    return this.options.sortState ?? []
  }

  private rebuildSortAccess(clearCache: boolean): void {
    this.sortAccess.rebuild(
      this.options.rowCount,
      this.options.columns,
      this.sortState,
      this.options.getCellContent,
      clearCache,
    )
  }

  private rebuildLayoutMetrics(): void {
    const input = this.wrapMetricsInput()
    this.effectiveHeaderHeight = computeEffectiveHeaderHeight(input)
    this.rowMetrics = createWrapAwareRowMetrics(input)
    this.syncTextOverflowVisibleClass()
  }

  private syncTextOverflowVisibleClass(): void {
    const visible = gridHasTextOverflowVisible(
      this.options.columns,
      this.headerTextOverflow,
      this.cellTextOverflow,
    )
    this.shell.root.classList.toggle('vgrid--text-overflow-visible', visible)
  }

  private rebuildSpanContext(): void {
    if (!this.plugins.has('cell-span')) {
      this.spanContext = null
      return
    }
    this.spanContext = computeRowSpans({
      rowCount: this.options.rowCount,
      columns: this.options.columns,
      getCellContent: this.sortAccess.getCellContent,
      rowMetrics: this.rowMetrics,
    })
  }

  private rebuildColumnLayout(viewportWidth: number): void {
    if (this.options.columnDefs && viewportWidth > 0) {
      this.options.columns = resolveColumnWidths(
        this.options.columnDefs,
        this.options.defaultColDef,
        viewportWidth,
      )
    }
    this.columnLefts = buildColumnLefts(this.options.columns)
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
    const widthChanged =
      size.width !== this.viewportWidth &&
      Math.abs(size.width - this.lastLayoutViewportWidth) > 0.5
    this.viewportWidth = size.width
    this.viewportHeight = size.height

    if (widthChanged && this.options.columnDefs) {
      this.lastLayoutViewportWidth = size.width
      this.rebuildColumnLayout(size.width)
      this.freeze = resolveFrozenColumns(
        this.options.columns,
        this.options.frozenColumns,
      )
    }

    syncSpacerAndLayers({
      shell: this.shell,
      options: this.options,
      layoutHeaderHeight: this.effectiveHeaderHeight,
      freeze: this.freeze,
      rowMetrics: this.rowMetrics,
      viewportWidth: this.viewportWidth,
      viewportHeight: this.viewportHeight,
    })
  }

  private syncResizeObserver(): void {
    const needsObserver = usesFluidSizing(
      this.options.width,
      this.options.height,
    )

    if (needsObserver && !this.resizeObserver) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.destroyed) return
        this.syncLayout()
        this.paintController.schedulePaint(true)
      })
      this.resizeObserver.observe(this.container)
    } else if (!needsObserver && this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
  }

  private markScrollActive(): void {
    this.scrollActive = true
    this.shell.root.classList.add('vgrid--scroll-active')
    if (this.scrollIdleTimer !== null) {
      window.clearTimeout(this.scrollIdleTimer)
    }
    this.scrollIdleTimer = window.setTimeout(() => {
      this.scrollActive = false
      this.scrollIdleTimer = null
      this.shell.root.classList.remove('vgrid--scroll-active')
      this.paintController.schedulePaint(true)
    }, 50)
  }

  private bindInput(): void {
    this.scrollInput = attachScrollInput(
      this.shell,
      {
        onSchedulePaint: (force) => {
          if (!force) this.markScrollActive()
          this.paintController.schedulePaint(force)
        },
        onScheduleScrollPaint: () => {
          this.markScrollActive()
          this.paintController.scheduleScrollPaint()
        },
        onScheduleInteractionPaint: () =>
          this.paintController.scheduleInteractionPaint(),
        onCellHover: (cell) => this.options.onCellHover?.(cell),
        onCellSelect: (cell) => this.options.onCellSelect?.(cell),
        onHeaderClick: (columnIndex, multi) =>
          this.handleHeaderSort(columnIndex, multi),
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

  private handleHeaderSort(columnIndex: number, multi: boolean): void {
    if (!this.sortHeadersEnabled || !this.options.onSortStateChange) return
    const next = cycleSortState(
      this.options.columns,
      columnIndex,
      this.sortState,
      multi,
    )
    this.applySortState(next)
    this.options.onSortStateChange(next)
  }

  private applySortState(next: SortState[]): boolean {
    if (sortStateEqual(this.appliedSortState, next)) {
      return true
    }

    const prevOrder = this.sortAccess.rowOrder
    this.options = { ...this.options, sortState: next }
    this.appliedSortState = this.cloneSortState(next)
    this.rebuildSortAccess(false)

    this.renderer.updateSortHeaders({
      columns: this.options.columns,
      sortState: next,
      sortHeadersEnabled: this.sortHeadersEnabled,
      headerTextOverflow: this.headerTextOverflow,
    })

    if (rowOrderEqual(prevOrder, this.sortAccess.rowOrder)) {
      return true
    }

    this.queueSortBodyRepaint()
    return true
  }

  private queueSortBodyRepaint(): void {
    if (this.sortBodyFrame !== null) {
      cancelAnimationFrame(this.sortBodyFrame)
    }
    this.sortBodyFrame = requestAnimationFrame(() => {
      this.sortBodyFrame = null
      if (this.destroyed) return

      setBodySortingActive(this.shell, true)
      if (hasRowSpanning(this.options.columns)) {
        this.rebuildSpanContext()
      }
      this.paintController.scheduleSortBodyPaint()
      setBodySortingActive(this.shell, false)
    })
  }

  private cloneSortState(state: SortState[]): SortState[] {
    return state.map((entry) => ({ ...entry }))
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
