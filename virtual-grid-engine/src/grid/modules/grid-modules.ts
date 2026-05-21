export type GridModuleId =
  | 'client-side-row-model'
  | 'cell-span'
  | 'column-sort'
  | 'freeze-columns'
  | 'virtualization'
  | 'validation'
  | 'cell-reveal'
  | 'row-motion'
  | 'column-move'
  | 'column-resize'
  | 'cell-flash'
  | 'delay-render'
  | 'loading-skeleton'

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
  cellReveal: { id: 'cell-reveal' } as const,
  rowMotion: { id: 'row-motion' } as const,
  columnMove: { id: 'column-move' } as const,
  columnResize: { id: 'column-resize' } as const,
  cellFlash: { id: 'cell-flash' } as const,
  delayRender: { id: 'delay-render' } as const,
  loadingSkeleton: { id: 'loading-skeleton' } as const,
} as const

export const ALL_GRID_MODULES: readonly GridModule[] = Object.values(GridModules)

export const ANIMATION_MODULE_IDS: readonly GridModuleId[] = [
  'cell-reveal',
  'row-motion',
  'column-move',
  'column-resize',
  'cell-flash',
  'delay-render',
  'loading-skeleton',
] as const
