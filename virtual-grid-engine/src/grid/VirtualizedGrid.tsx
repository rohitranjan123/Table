/**
 * VirtualizedGrid — React adapter for the imperative grid engine.
 * Scroll and cell DOM are handled outside the React render path.
 */

import { useEffect, useLayoutEffect, useRef } from 'react'
import './grid.css'
import { createGrid, type GridEngine } from './engine'
import type { VirtualizedGridProps } from './types'

export function VirtualizedGrid({
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
}: VirtualizedGridProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GridEngine | null>(null)

  const onCellHoverRef = useRef(onCellHover)
  const onCellSelectRef = useRef(onCellSelect)

  useEffect(() => {
    onCellHoverRef.current = onCellHover
    onCellSelectRef.current = onCellSelect
  })

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return

    const engine = createGrid(host, {
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
    })
    engineRef.current = engine

    return () => {
      engine.destroy()
      engineRef.current = null
    }
    // Mount once; option updates flow through the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.updateOptions({
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
    })
  }, [
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
  ])

  return <div ref={hostRef} style={{ width: width ?? '100%', height: height ?? '100%' }} />
}
