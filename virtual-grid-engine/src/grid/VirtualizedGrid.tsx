/**
 * VirtualizedGrid — React adapter for the imperative grid engine.
 */

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { toCssSize } from './grid-size'
import './grid.css'
import { createGrid, type GridEngine } from './engine'
import type { GridModuleId } from './modules/grid-modules'
import {
  resolveGridInput,
  resolveModules,
  toEngineOptions,
} from './resolve-grid-options'
import { colDefsToSortState } from './col-def'
import type { GridSize, SortState, VirtualizedGridProps } from './types'

function hostSizeStyle(
  width: GridSize | undefined,
  height: GridSize | undefined,
): CSSProperties {
  return {
    width: toCssSize(width),
    height: toCssSize(height),
    minWidth: 0,
    minHeight: 0,
    position: 'relative',
  }
}

export function VirtualizedGrid<T extends object>({
  gridId: gridIdProp,
  columnDefs,
  defaultColDef,
  rowData,
  loading = false,
  enableCellSpan,
  modules: modulesProp,
  headerHeight,
  headerTextOverflow,
  cellTextOverflow,
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
  sortState: sortStateProp,
  onSortStateChange: onSortStateChangeProp,
}: VirtualizedGridProps<T>) {
  const reactId = useId()
  const gridId = gridIdProp ?? reactId

  const [internalSort, setInternalSort] = useState<SortState[]>(() =>
    colDefsToSortState(columnDefs),
  )
  const sortState = sortStateProp ?? internalSort
  const onSortStateChange = onSortStateChangeProp ?? setInternalSort

  const modules = useMemo(
    () => resolveModules(modulesProp, enableCellSpan),
    [modulesProp, enableCellSpan],
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  /** Imperative-only mount — React must not render children into this node. */
  const engineMountRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<GridEngine | null>(null)
  const mountedRef = useRef(false)
  const attachedRef = useRef<ReadonlySet<GridModuleId>>(
    new Set(modules.map((m) => m.id)),
  )

  const onCellHoverRef = useRef(onCellHover)
  const onCellSelectRef = useRef(onCellSelect)
  const onSortStateChangeRef = useRef(onSortStateChange)

  useEffect(() => {
    onCellHoverRef.current = onCellHover
    onCellSelectRef.current = onCellSelect
    onSortStateChangeRef.current = onSortStateChange
  })

  useEffect(() => {
    attachedRef.current = new Set(modules.map((m) => m.id))
  }, [modules])

  const buildOptions = useCallback(
    (viewportWidth: number) => {
      const resolved = resolveGridInput(
        {
          columnDefs,
          defaultColDef,
          rowData,
          enableCellSpan,
          modules,
          frozenColumns,
          virtualization,
          sortState,
        },
        viewportWidth,
        attachedRef.current,
      )
      return toEngineOptions(gridId, {
        columnDefs,
        defaultColDef,
        rowData,
        enableCellSpan,
        modules,
        headerHeight,
        headerTextOverflow,
        cellTextOverflow,
        rowHeight,
        frozenColumns,
        virtualization,
        animateTransitions,
        transitionDurationMs,
        width,
        height,
        className,
        rowSpanRevision,
        sortState,
      }, resolved, {
        onCellHover: (cell) => onCellHoverRef.current?.(cell),
        onCellSelect: (cell) => onCellSelectRef.current?.(cell),
        onSortStateChange: (next) => onSortStateChangeRef.current?.(next),
      })
    },
    [
      gridId,
      columnDefs,
      defaultColDef,
      rowData,
      enableCellSpan,
      modules,
      headerHeight,
      headerTextOverflow,
      cellTextOverflow,
      rowHeight,
      frozenColumns,
      virtualization,
      animateTransitions,
      transitionDurationMs,
      width,
      height,
      className,
      rowSpanRevision,
      sortState,
    ],
  )

  useLayoutEffect(() => {
    if (loading) return

    const mount = engineMountRef.current
    if (!mount) return

    mountedRef.current = true
    attachedRef.current = new Set(modules.map((m) => m.id))
    const viewportWidth =
      mount.clientWidth || wrapperRef.current?.clientWidth || 0

    const engine = createGrid(mount, {
      ...buildOptions(viewportWidth),
      modules,
    })
    engineRef.current = engine

    return () => {
      mountedRef.current = false
      engine.destroy()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridId, loading])

  useEffect(() => {
    if (loading || !mountedRef.current || !engineRef.current) return
    const mount = engineMountRef.current
    const viewportWidth =
      mount?.clientWidth ?? wrapperRef.current?.clientWidth ?? 0
    engineRef.current.updateOptions(buildOptions(viewportWidth))
  }, [buildOptions, modules, loading])

  return (
    <div
      ref={wrapperRef}
      className="vgrid-host"
      data-vgrid-host={gridId}
      data-loading={loading ? 'true' : undefined}
      style={hostSizeStyle(width, height)}
      aria-busy={loading}
    >
      <div
        ref={engineMountRef}
        className="vgrid-engine-mount"
        aria-hidden={loading}
      />
      {loading ? (
        <div className="vgrid-loading" role="status">
          Loading…
        </div>
      ) : null}
    </div>
  )
}
