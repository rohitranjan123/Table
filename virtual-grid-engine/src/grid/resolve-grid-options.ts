import {
  colDefsToSortState,
  createGetCellContentFromRowData,
  mergeColDefs,
  pinnedToFrozenColumns,
  resolveColumnWidths,
  type ResolvedColumn,
} from './col-def'
import type { GridEngineOptions } from './engine/types'
import {
  ALL_GRID_MODULES,
  type GridModule,
  type GridModuleId,
} from './modules/grid-modules'
import { stripSpanCellWhenDisabled } from './engine/plugins-registry'
import type {
  CellCoordinate,
  GridCell,
  SortState,
  VirtualizedGridProps,
} from './types'

export interface ResolvedGridInput {
  columns: ResolvedColumn[]
  rowCount: number
  getCellContent: (cell: CellCoordinate) => GridCell
  sortState: SortState[]
  frozenColumns: GridEngineOptions['frozenColumns']
  virtualization: boolean
  modules: readonly GridModule[]
}

export function resolveModules(
  modules: readonly GridModule[] | undefined,
  enableCellSpan: boolean | undefined,
): readonly GridModule[] {
  const base = modules ?? ALL_GRID_MODULES
  if (enableCellSpan === false) {
    return base.filter((m) => m.id !== 'cell-span')
  }
  return base
}

export function resolveGridInput(
  props: Pick<
    VirtualizedGridProps,
    | 'columnDefs'
    | 'defaultColDef'
    | 'rowData'
    | 'enableCellSpan'
    | 'modules'
    | 'frozenColumns'
    | 'virtualization'
    | 'sortState'
  >,
  viewportWidth: number,
  attachedModules: ReadonlySet<GridModuleId>,
): ResolvedGridInput {
  const modules = resolveModules(props.modules, props.enableCellSpan)
  const cellSpanOn =
    props.enableCellSpan !== false &&
    modules.some((mod) => mod.id === 'cell-span')
  const colDefsRaw = stripSpanCellWhenDisabled(
    [...props.columnDefs],
    cellSpanOn,
  )

  const columns =
    viewportWidth > 0
      ? resolveColumnWidths(colDefsRaw, props.defaultColDef, viewportWidth)
      : mergeColDefs(colDefsRaw, props.defaultColDef)

  const rowData = props.rowData ?? []
  const rowCount = rowData.length
  const getCellContent = createGetCellContentFromRowData(rowData, columns)

  const initialSort = colDefsToSortState(props.columnDefs)
  const sortState = props.sortState ?? initialSort

  const pinned = pinnedToFrozenColumns(props.columnDefs)
  const frozenColumns =
    attachedModules.has('freeze-columns') && props.frozenColumns === undefined
      ? pinned
      : attachedModules.has('freeze-columns')
        ? props.frozenColumns
        : undefined

  const virtualization =
    attachedModules.has('virtualization') && props.virtualization !== false

  return {
    columns,
    rowCount,
    getCellContent,
    sortState,
    frozenColumns,
    virtualization,
    modules,
  }
}

export function toEngineOptions(
  gridId: string,
  props: VirtualizedGridProps,
  resolved: ResolvedGridInput,
  callbacks: {
    onCellHover?: (cell: CellCoordinate | null) => void
    onCellSelect?: (cell: CellCoordinate) => void
    onSortStateChange?: (sortState: SortState[]) => void
  },
): GridEngineOptions {
  const sortEnabled =
    resolved.modules.some((m) => m.id === 'column-sort') &&
    callbacks.onSortStateChange !== undefined

  return {
    gridId,
    columns: resolved.columns,
    columnDefs: props.columnDefs,
    defaultColDef: props.defaultColDef,
    modules: resolved.modules,
    rowCount: resolved.rowCount,
    getCellContent: resolved.getCellContent,
    headerHeight: props.headerHeight,
    headerTextOverflow: props.headerTextOverflow,
    cellTextOverflow: props.cellTextOverflow,
    rowHeight: props.rowHeight,
    frozenColumns: resolved.frozenColumns,
    virtualization: resolved.virtualization,
    animateTransitions: props.animateTransitions,
    transitionDurationMs: props.transitionDurationMs,
    width: props.width,
    height: props.height,
    className: props.className,
    rowSpanRevision: props.rowSpanRevision,
    sortState: sortEnabled ? resolved.sortState : [],
    onSortStateChange: sortEnabled ? callbacks.onSortStateChange : undefined,
    onCellHover: callbacks.onCellHover,
    onCellSelect: callbacks.onCellSelect,
  }
}
