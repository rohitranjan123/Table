import { GridModules, type GridModule } from '../grid/modules/grid-modules'

export type AnimationPresetId =
  | 'none'
  | 'cell-reveal'
  | 'row-motion'
  | 'column-move'
  | 'column-resize'
  | 'cell-flash'
  | 'delay-render'
  | 'loading-skeleton'

export type AnimationReplayKind =
  | 'remount'
  | 'sort-toggle'
  | 'shuffle-columns'
  | 'column-resize'
  | 'flash-cells'
  | 'fake-loading'

export interface AnimationPreset {
  readonly id: AnimationPresetId
  readonly label: string
  readonly extraModules: readonly GridModule[]
  readonly implemented: boolean
  readonly replay: AnimationReplayKind
}

export const BASE_DEMO_MODULES: readonly GridModule[] = [
  GridModules.cellSpan,
  GridModules.clientSideRowModel,
  GridModules.columnSort,
]

export const ANIMATION_PRESETS: readonly AnimationPreset[] = [
  {
    id: 'none',
    label: 'None (baseline)',
    extraModules: [],
    implemented: true,
    replay: 'remount',
  },
  {
    id: 'cell-reveal',
    label: 'Cell reveal (post-load)',
    extraModules: [GridModules.cellReveal],
    implemented: true,
    replay: 'remount',
  },
  {
    id: 'row-motion',
    label: 'Row motion (sort/filter)',
    extraModules: [GridModules.rowMotion],
    implemented: true,
    replay: 'sort-toggle',
  },
  {
    id: 'column-move',
    label: 'Column move',
    extraModules: [GridModules.columnMove],
    implemented: true,
    replay: 'shuffle-columns',
  },
  {
    id: 'column-resize',
    label: 'Column resize',
    extraModules: [GridModules.columnResize],
    implemented: true,
    replay: 'column-resize',
  },
  {
    id: 'cell-flash',
    label: 'Cell flash (value change)',
    extraModules: [GridModules.cellFlash],
    implemented: true,
    replay: 'flash-cells',
  },
  {
    id: 'delay-render',
    label: 'Delay render',
    extraModules: [GridModules.delayRender],
    implemented: true,
    replay: 'remount',
  },
  {
    id: 'loading-skeleton',
    label: 'Loading skeleton',
    extraModules: [GridModules.loadingSkeleton],
    implemented: true,
    replay: 'fake-loading',
  },
] as const

export function getAnimationPreset(id: AnimationPresetId): AnimationPreset {
  return (
    ANIMATION_PRESETS.find((p) => p.id === id) ?? ANIMATION_PRESETS[0]
  )
}

export function modulesForPreset(preset: AnimationPreset): GridModule[] {
  return [...BASE_DEMO_MODULES, ...preset.extraModules]
}
