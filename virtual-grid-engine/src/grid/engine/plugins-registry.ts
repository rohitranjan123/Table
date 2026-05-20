import type { ColDef } from '../types'
import type { GridModule, GridModuleId } from '../modules/grid-modules'

export interface GridPluginsRegistry {
  attach(modules: readonly GridModule[]): void
  has(id: GridModuleId): boolean
}

export function createPluginsRegistry(
  onAttach?: (ids: ReadonlySet<GridModuleId>) => void,
): GridPluginsRegistry {
  const attached = new Set<GridModuleId>()

  return {
    attach(modules: readonly GridModule[]) {
      for (const mod of modules) {
        attached.add(mod.id)
      }
      onAttach?.(attached)
    },
    has(id: GridModuleId) {
      return attached.has(id)
    },
  }
}

export function stripSpanCellWhenDisabled(
  columns: ColDef[],
  cellSpanEnabled: boolean,
): ColDef[] {
  if (cellSpanEnabled) return columns
  return columns.map((col) => {
    if (col.spanCell === undefined) return col
    const { spanCell: _spanCell, ...rest } = col
    return rest
  })
}
