/** @internal Header vs body layer groups — sort repaints body only. */

import type { GridDomShell } from './dom-shell'

export type BodyLayer = Pick<
  GridDomShell,
  'layerFrozenLeft' | 'layerFrozenRight' | 'layerBody'
>

export type HeaderLayer = Pick<
  GridDomShell,
  'layerHeaderScroll' | 'layerHeaderFrozenLeft' | 'layerHeaderFrozenRight'
>

export function bodyLayers(shell: GridDomShell): HTMLElement[] {
  return [shell.layerFrozenLeft, shell.layerFrozenRight, shell.layerBody]
}

export function headerLayers(shell: GridDomShell): HTMLElement[] {
  return [
    shell.layerHeaderScroll,
    shell.layerHeaderFrozenLeft,
    shell.layerHeaderFrozenRight,
  ]
}

export function setBodySortingActive(shell: GridDomShell, active: boolean): void {
  for (const layer of bodyLayers(shell)) {
    layer.classList.toggle('vgrid__layer--sorting', active)
  }
}
