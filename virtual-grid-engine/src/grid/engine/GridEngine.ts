import {
  columnsLayoutKey,
  columnsOrderKey,
  resolveColumnWidths,
} from '../col-def'
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
  type RootAnimationFlags,
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
import {
  BODY_CELL_SELECTOR,
  HEADER_CELL_SELECTOR,
  bodyCellKey,
  cancelFlipAnimations,
  captureCellRects,
  headerCellKey,
  playFlip,
} from './layout-motion'
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
  private cellRevealActive = false
  private cellRevealTimer: number | null = null
  private delayRenderReady = false
  private delayRenderTimer: number | null = null
  private delayRenderRevealTimer: number | null = null
  private readonly sortAccess = createSortAccess()
  private appliedSortState: SortState[] = []
  private sortBodyFrame: number | null = null
  private lastColumnOrderKey = ''
  private lastColumnLayoutKey = ''

  constructor(container: HTMLElement, options: GridEngineOptions) {
    this.options = options
    this.lastColumnOrderKey = columnsOrderKey(options.columns)
    this.lastColumnLayoutKey = columnsLayoutKey(options.columns)
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
        cellRevealPass: this.cellRevealActive && !this.scrollActive,
        cellFlashEnabled: this.plugins.has('cell-flash'),
        rowKeyBySource: this.plugins.has('row-motion'),
        columnKeyByField:
          this.plugins.has('column-move') || this.plugins.has('column-resize'),
        getOriginalRow: (displayRow: number) =>
          this.sortAccess.getOriginalRow(displayRow),
      }),
      onAfterPaint: () => this.completeDelayRenderIfNeeded(),
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

    if (this.plugins.has('delay-render')) {
      this.delayRenderReady = false
      this.applyChrome()
    }
    if (this.options.rowCount > 0) {
      this.maybeArmCellReveal(0, this.options.rowCount)
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

    const prevRowCount = this.options.rowCount

    let columnsOrderChanged = false
    let columnsLayoutChanged = false
    if (partial.columns !== undefined) {
      const orderKey = columnsOrderKey(partial.columns)
      const layoutKey = columnsLayoutKey(partial.columns)
      columnsOrderChanged = orderKey !== this.lastColumnOrderKey
      columnsLayoutChanged = layoutKey !== this.lastColumnLayoutKey
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

    if (partial.rowCount !== undefined) {
      this.maybeArmCellReveal(prevRowCount, this.options.rowCount)
    }

    if (partial.rowCount !== undefined && this.plugins.has('delay-render')) {
      this.delayRenderReady = false
      if (this.delayRenderRevealTimer !== null) {
        window.clearTimeout(this.delayRenderRevealTimer)
        this.delayRenderRevealTimer = null
      }
      this.applyChrome()
    }

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
      partial.columns !== undefined ||
      partial.columnDefs !== undefined ||
      partial.frozenColumns !== undefined ||
      partial.virtualization !== undefined
    ) {
      if (
        partial.columns === undefined ||
        columnsOrderChanged ||
        columnsLayoutChanged
      ) {
        this.rebuildColumnLayout(this.viewportWidth)
      }
      this.freeze = resolveFrozenColumns(
        this.options.columns,
        this.options.frozenColumns,
      )
      if (partial.columns !== undefined) {
        this.lastColumnOrderKey = columnsOrderKey(this.options.columns)
        this.lastColumnLayoutKey = columnsLayoutKey(this.options.columns)
      }
    }
    const dataFlashOnly =
      partial.getCellContent !== undefined &&
      partial.columns === undefined &&
      partial.columnDefs === undefined &&
      partial.rowCount === undefined &&
      partial.rowHeight === undefined &&
      partial.headerHeight === undefined &&
      partial.headerTextOverflow === undefined &&
      partial.cellTextOverflow === undefined &&
      partial.virtualization === undefined

    const columnStructureChange =
      partial.columns !== undefined || partial.columnDefs !== undefined
    const rowStructureChange =
      partial.rowCount !== undefined ||
      partial.rowHeight !== undefined ||
      partial.virtualization !== undefined
    const skipPoolClearForColumnMotion =
      columnStructureChange &&
      !rowStructureChange &&
      (this.plugins.has('column-move') || this.plugins.has('column-resize'))

    if (
      needsPoolReset &&
      !(dataFlashOnly && this.plugins.has('cell-flash')) &&
      !skipPoolClearForColumnMotion
    ) {
      this.renderer.clearPools()
      this.paintController.resetBounds()
    }
    if (partial.width !== undefined || partial.height !== undefined) {
      this.syncResizeObserver()
    }
    this.applyChrome()
    this.syncLayout()

    const motionDuration = this.options.transitionDurationMs ?? 400
    const runColumnMoveFlip =
      columnsOrderChanged && this.plugins.has('column-move')
    const runColumnResizeCss =
      columnsLayoutChanged &&
      !columnsOrderChanged &&
      this.plugins.has('column-resize')

    if (runColumnMoveFlip) {
      const headerBefore = captureCellRects(
        this.shell.root,
        HEADER_CELL_SELECTOR,
        headerCellKey,
      )
      const bodyBefore = captureCellRects(
        this.shell.root,
        BODY_CELL_SELECTOR,
        bodyCellKey,
      )
      this.paintController.schedulePaint(true)
      const snapshots = new Map([...headerBefore, ...bodyBefore])
      playFlip(snapshots, motionDuration, () => {
        cancelFlipAnimations(this.shell.root)
        this.paintController.schedulePaint(true)
      })
      return
    }

    if (runColumnResizeCss) {
      this.triggerLayoutAnimation('col')
      this.paintController.schedulePaint(true)
      return
    }

    this.paintController.schedulePaint(true)
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
    if (this.cellRevealTimer !== null) {
      window.clearTimeout(this.cellRevealTimer)
      this.cellRevealTimer = null
    }
    if (this.delayRenderTimer !== null) {
      cancelAnimationFrame(this.delayRenderTimer)
      this.delayRenderTimer = null
    }
    if (this.delayRenderRevealTimer !== null) {
      window.clearTimeout(this.delayRenderRevealTimer)
      this.delayRenderRevealTimer = null
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
      this.rootAnimationFlags(),
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
      if (
        this.plugins.has('column-resize') &&
        columnsLayoutKey(this.options.columns) !== this.lastColumnLayoutKey
      ) {
        this.lastColumnLayoutKey = columnsLayoutKey(this.options.columns)
        this.triggerLayoutAnimation('col')
      }
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
    cancelFlipAnimations(this.shell.root)
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

    this.queueSortBodyRepaint(this.plugins.has('row-motion'))
    return true
  }

  private queueSortBodyRepaint(animateRows: boolean): void {
    if (this.sortBodyFrame !== null) {
      cancelAnimationFrame(this.sortBodyFrame)
    }

    const runPaint = (): void => {
      this.sortBodyFrame = null
      if (this.destroyed) return

      if (!animateRows) {
        setBodySortingActive(this.shell, true)
      }
      if (hasRowSpanning(this.options.columns)) {
        this.rebuildSpanContext()
      }
      this.paintController.scheduleSortBodyPaint()
      if (!animateRows) {
        setBodySortingActive(this.shell, false)
      }
    }

    if (animateRows) {
      const bodyBefore = captureCellRects(
        this.shell.root,
        BODY_CELL_SELECTOR,
        bodyCellKey,
      )
      const duration = this.options.transitionDurationMs ?? 400
      this.sortBodyFrame = requestAnimationFrame(() => {
        runPaint()
        playFlip(bodyBefore, duration, () => {
          cancelFlipAnimations(this.shell.root)
          this.paintController.schedulePaint(true)
        })
      })
      return
    }

    this.sortBodyFrame = requestAnimationFrame(runPaint)
  }

  private cloneSortState(state: SortState[]): SortState[] {
    return state.map((entry) => ({ ...entry }))
  }

  private rootAnimationFlags(): RootAnimationFlags {
    return {
      animatingCols: this.animatingCols,
      animatingRows: this.animatingRows,
      cellReveal: this.cellRevealActive,
      delayRender:
        this.plugins.has('delay-render') && !this.delayRenderReady,
      delayRenderReady:
        this.plugins.has('delay-render') && this.delayRenderReady,
    }
  }

  private maybeArmCellReveal(prev: number, next: number): void {
    if (!this.plugins.has('cell-reveal')) return
    if (prev !== 0 || next <= 0) return
    if (this.scrollActive) return
    this.armCellReveal()
  }

  private armCellReveal(): void {
    if (this.cellRevealTimer !== null) {
      window.clearTimeout(this.cellRevealTimer)
      this.cellRevealTimer = null
    }
    this.cellRevealActive = true
    this.applyChrome()
    this.paintController.schedulePaint(true)
    const staggerCap = Math.min(Math.max(0, this.options.rowCount - 1), 40)
    const duration = this.options.transitionDurationMs ?? 240
    const totalMs = staggerCap * 12 + duration + 80
    this.cellRevealTimer = window.setTimeout(() => {
      this.cellRevealActive = false
      this.cellRevealTimer = null
      this.applyChrome()
      this.paintController.schedulePaint(true)
    }, totalMs)
  }

  private completeDelayRenderIfNeeded(): void {
    if (!this.plugins.has('delay-render') || this.delayRenderReady) return
    if (this.options.rowCount <= 0) return
    if (this.delayRenderRevealTimer !== null) return

    this.delayRenderRevealTimer = window.setTimeout(() => {
      this.delayRenderRevealTimer = null
      if (this.destroyed) return
      this.delayRenderReady = true
      this.applyChrome()
      this.paintController.schedulePaint(true)
    }, 220)
  }

  private triggerLayoutAnimation(axis: 'col' | 'row' | 'both'): void {
    if (this.options.animateTransitions === false) return

    let animateCol = false
    let animateRow = false
    if (axis === 'col' || axis === 'both') {
      animateCol =
        this.plugins.has('column-move') || this.plugins.has('column-resize')
    }
    if (axis === 'row' || axis === 'both') {
      animateRow = this.plugins.has('row-motion')
    }
    if (!animateCol && !animateRow) return

    const duration = this.options.transitionDurationMs ?? 400
    this.shell.root.style.setProperty('--vgrid-transition-duration', `${duration}ms`)
    if (animateCol) this.animatingCols = true
    if (animateRow) this.animatingRows = true
    syncRootClassName(
      this.shell.root,
      this.options.className,
      this.rootAnimationFlags(),
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
        this.rootAnimationFlags(),
      )
      this.layoutAnimationTimer = null
    }, duration + 32)
  }
}
