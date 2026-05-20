export type GridModuleId =
  | 'client-side-row-model'
  | 'cell-span'
  | 'column-sort'
  | 'freeze-columns'
  | 'virtualization'
  | 'validation'

export interface GridModule {
  readonly id: GridModuleId
}

export const GridModules = {
  clientSideRowModel: { id: 'client-side-row-model' } as const,
  cellSpan: { id: 'cell-span' } as const,
  columnSort: { id: 'column-sort' } as const,
  freezeColumns: { id: 'freeze-columns' } as const,
  virtualization: { id: 'virtualization' } as const,
  validation: { id: 'validation' } as const,
} as const

export const ALL_GRID_MODULES: readonly GridModule[] = Object.values(GridModules)
