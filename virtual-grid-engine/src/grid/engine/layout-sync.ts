/** @internal Spacer, layer geometry, scrollbar gutter, and ARIA layout sync. */

import { toCssSize } from '../grid-size'
import type { GridSize } from '../types'
import type { ResolvedFreeze, RowMetrics } from '../plugins'
import type { GridDomShell } from './dom-shell'
import type { GridEngineOptions } from './types'

export interface LayoutSyncParams {
  shell: GridDomShell
  options: GridEngineOptions
  /** Measured header band when any column uses `headerTextOverflow: 'wrap'`. */
  layoutHeaderHeight: number
  freeze: ResolvedFreeze
  rowMetrics: RowMetrics
  viewportWidth: number
  viewportHeight: number
}

function setLayerStyle(
  element: HTMLElement,
  left: number,
  top: number,
  width: number,
  height: number,
): void {
  element.style.left = `${left}px`
  element.style.top = `${top}px`
  element.style.width = `${width}px`
  element.style.height = `${height}px`
}

export function applyContainerSize(
  root: HTMLDivElement,
  width: GridSize | undefined,
  height: GridSize | undefined,
): void {
  root.style.width = toCssSize(width)
  root.style.height = toCssSize(height)
}

export function applyTransitionStyle(
  root: HTMLDivElement,
  transitionDurationMs: number | undefined,
): void {
  const milliseconds = transitionDurationMs ?? 240
  root.style.setProperty('--vgrid-transition-duration', `${milliseconds}ms`)
}

export interface RootAnimationFlags {
  animatingCols: boolean
  animatingRows: boolean
  cellReveal: boolean
  delayRender: boolean
  delayRenderReady: boolean
}

export function syncRootClassName(
  root: HTMLDivElement,
  className: string | undefined,
  flags: RootAnimationFlags,
): void {
  const parts = ['vgrid', className].filter(Boolean)
  if (flags.animatingCols) parts.push('vgrid--animate-cols')
  if (flags.animatingRows) parts.push('vgrid--animate-rows')
  if (flags.cellReveal) parts.push('vgrid--cell-reveal')
  if (flags.delayRender) parts.push('vgrid--delay-render')
  if (flags.delayRenderReady) parts.push('vgrid--delay-render-ready')
  root.className = parts.join(' ')
}

export function syncAriaCounts(
  root: HTMLDivElement,
  rowCount: number,
  columnCount: number,
): void {
  root.setAttribute('aria-rowcount', String(rowCount))
  root.setAttribute('aria-colcount', String(columnCount))
}

export function measureViewport(
  shell: GridDomShell,
  options: GridEngineOptions,
): { width: number; height: number } {
  const clientWidth = shell.viewport.clientWidth
  const clientHeight = shell.viewport.clientHeight
  if (clientWidth > 0 && clientHeight > 0) {
    return { width: clientWidth, height: clientHeight }
  }
  const rootWidth = shell.root.clientWidth
  const rootHeight = shell.root.clientHeight
  return {
    width:
      rootWidth > 0
        ? rootWidth
        : typeof options.width === 'number'
          ? options.width
          : 0,
    height:
      rootHeight > 0
        ? rootHeight
        : typeof options.height === 'number'
          ? options.height
          : 0,
  }
}

export function syncScrollbarGutter(shell: GridDomShell): void {
  const { scroller, root } = shell
  let width = scroller.offsetWidth - scroller.clientWidth
  let height = scroller.offsetHeight - scroller.clientHeight
  const canScrollX = scroller.scrollWidth > scroller.clientWidth
  const canScrollY = scroller.scrollHeight > scroller.clientHeight
  const fallback = 12
  if (width === 0 && canScrollY) width = fallback
  if (height === 0 && canScrollX) height = fallback
  root.style.setProperty('--vgrid-scrollbar-w', `${width}px`)
  root.style.setProperty('--vgrid-scrollbar-h', `${height}px`)
}

export function syncSpacerAndLayers(params: LayoutSyncParams): void {
  const { shell, freeze, rowMetrics, viewportWidth, viewportHeight } = params
  const { layoutHeaderHeight } = params
  const totalWidth = freeze.layoutWidth
  const totalBodyHeight = rowMetrics.getTotalBodyHeight()
  const totalHeight = layoutHeaderHeight + totalBodyHeight
  const { leftWidth, rightWidth } = freeze

  shell.spacer.style.width = `${totalWidth}px`
  shell.spacer.style.height = `${totalHeight}px`
  shell.spacer.style.minWidth = `${totalWidth}px`
  shell.spacer.style.minHeight = `${totalHeight}px`

  const headerWidth = Math.max(0, viewportWidth - leftWidth - rightWidth)
  const bodyHeight = Math.max(0, viewportHeight - layoutHeaderHeight)

  setLayerStyle(
    shell.layerHeaderScroll,
    leftWidth,
    0,
    headerWidth,
    layoutHeaderHeight,
  )
  setLayerStyle(shell.layerHeaderFrozenLeft, 0, 0, leftWidth, layoutHeaderHeight)
  setLayerStyle(
    shell.layerHeaderFrozenRight,
    Math.max(0, viewportWidth - rightWidth),
    0,
    rightWidth,
    layoutHeaderHeight,
  )
  setLayerStyle(
    shell.layerFrozenLeft,
    0,
    layoutHeaderHeight,
    leftWidth,
    bodyHeight,
  )
  setLayerStyle(
    shell.layerFrozenRight,
    Math.max(0, viewportWidth - rightWidth),
    layoutHeaderHeight,
    rightWidth,
    bodyHeight,
  )
  setLayerStyle(
    shell.layerBody,
    leftWidth,
    layoutHeaderHeight,
    headerWidth,
    bodyHeight,
  )

  shell.freezeDividerLeft.style.left = `${leftWidth - 1}px`
  shell.freezeDividerLeft.style.display = leftWidth > 0 ? '' : 'none'

  shell.freezeDividerRight.style.left = `${Math.max(0, viewportWidth - rightWidth - 1)}px`
  shell.freezeDividerRight.style.display = rightWidth > 0 ? '' : 'none'

  syncScrollbarGutter(shell)
}
