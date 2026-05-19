/**
 * VirtualizedGrid — React adapter for the imperative grid engine.
 * Each mount owns an isolated engine instance (DOM, listeners, timers).
 */

import { useEffect, useId, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { toCssSize } from './grid-size'
import './grid.css'
import { createGrid, type GridEngine } from './engine'
import type { GridSize, VirtualizedGridProps } from './types'

function hostSizeStyle(
  width: GridSize | undefined,
  height: GridSize | undefined,
): CSSProperties {
  return {
    width: toCssSize(width),
    height: toCssSize(height),
    minWidth: 0,
    minHeight: 0,
  }
}

export function VirtualizedGrid({
  gridId: gridIdProp,
  columns,
  rowCount,
  getCellContent,
  headerHeight,
  rowHeight,
  frozenColumns,
  virtualization = true,
  animateTransitions = true,
  transitionDurationMs,
  width,
  height,
  className,
  onCellHover,
  onCellSelect,
  rowSpanRevision,
}: VirtualizedGridProps) {
  const reactId = useId()
  const gridId = gridIdProp ?? reactId

  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GridEngine | null>(null)
  const mountedRef = useRef(false)

  const onCellHoverRef = useRef(onCellHover)
  const onCellSelectRef = useRef(onCellSelect)

  useEffect(() => {
    onCellHoverRef.current = onCellHover
    onCellSelectRef.current = onCellSelect
  })

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    mountedRef.current = true

    const engine = createGrid(host, {
      gridId,
      columns,
      rowCount,
      getCellContent,
      headerHeight,
      rowHeight,
      frozenColumns,
      virtualization,
      animateTransitions,
      transitionDurationMs,
      width,
      height,
      className,
      onCellHover: (cell) => onCellHoverRef.current?.(cell),
      onCellSelect: (cell) => onCellSelectRef.current?.(cell),
      rowSpanRevision,
    })
    engineRef.current = engine

    return () => {
      mountedRef.current = false
      engine.destroy()
      engineRef.current = null
      host.replaceChildren()
    }
    // Mount once per gridId host; option updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId])

  useEffect(() => {
    if (!mountedRef.current) return
    engineRef.current?.updateOptions({
      gridId,
      columns,
      rowCount,
      getCellContent,
      headerHeight,
      rowHeight,
      frozenColumns,
      virtualization,
      animateTransitions,
      transitionDurationMs,
      width,
      height,
      className,
      onCellHover: (cell) => onCellHoverRef.current?.(cell),
      onCellSelect: (cell) => onCellSelectRef.current?.(cell),
      rowSpanRevision,
    })
  }, [
    gridId,
    columns,
    rowCount,
    getCellContent,
    headerHeight,
    rowHeight,
    frozenColumns,
    virtualization,
    animateTransitions,
    transitionDurationMs,
    width,
    height,
    className,
    rowSpanRevision,
  ])

  return (
    <div
      ref={hostRef}
      className="vgrid-host"
      data-vgrid-host={gridId}
      style={hostSizeStyle(width, height)}
    />
  )
}
