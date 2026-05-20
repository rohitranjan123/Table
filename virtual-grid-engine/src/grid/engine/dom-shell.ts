/** @internal DOM scaffold for the virtual grid (scroller, viewport, layers). */

export interface GridDomShell {
  root: HTMLDivElement
  scroller: HTMLDivElement
  spacer: HTMLDivElement
  viewport: HTMLDivElement
  layerHeaderScroll: HTMLDivElement
  layerHeaderFrozenLeft: HTMLDivElement
  layerHeaderFrozenRight: HTMLDivElement
  layerFrozenLeft: HTMLDivElement
  layerFrozenRight: HTMLDivElement
  layerBody: HTMLDivElement
  freezeDividerLeft: HTMLDivElement
  freezeDividerRight: HTMLDivElement
}

function createLayer(kind: 'header' | 'body'): HTMLDivElement {
  const layer = document.createElement('div')
  layer.className = `vgrid__layer vgrid__layer--${kind}`
  return layer
}

export function createGridDomShell(
  container: HTMLElement,
  gridId: string,
  className?: string,
): GridDomShell {
  const rootEl = document.createElement('div')
  rootEl.className = ['vgrid', className].filter(Boolean).join(' ')
  rootEl.setAttribute('role', 'grid')
  rootEl.dataset.vgridId = gridId
  rootEl.setAttribute('aria-label', `Data grid ${gridId}`)

  const scroller = document.createElement('div')
  scroller.className = 'vgrid__scroll'

  const spacer = document.createElement('div')
  spacer.className = 'vgrid__spacer'

  const viewport = document.createElement('div')
  viewport.className = 'vgrid__viewport'

  const layerHeaderScroll = createLayer('header')
  const layerHeaderFrozenLeft = createLayer('header')
  const layerHeaderFrozenRight = createLayer('header')
  const layerFrozenLeft = createLayer('body')
  const layerFrozenRight = createLayer('body')
  const layerBody = createLayer('body')

  const freezeDividerLeft = document.createElement('div')
  freezeDividerLeft.className =
    'vgrid__freeze-divider vgrid__freeze-divider--left'
  freezeDividerLeft.setAttribute('aria-hidden', 'true')

  const freezeDividerRight = document.createElement('div')
  freezeDividerRight.className =
    'vgrid__freeze-divider vgrid__freeze-divider--right'
  freezeDividerRight.setAttribute('aria-hidden', 'true')

  scroller.appendChild(spacer)
  rootEl.appendChild(scroller)
  rootEl.appendChild(viewport)

  viewport.appendChild(freezeDividerLeft)
  viewport.appendChild(freezeDividerRight)
  viewport.appendChild(layerHeaderScroll)
  viewport.appendChild(layerHeaderFrozenLeft)
  viewport.appendChild(layerHeaderFrozenRight)
  viewport.appendChild(layerFrozenLeft)
  viewport.appendChild(layerFrozenRight)
  viewport.appendChild(layerBody)

  container.appendChild(rootEl)

  return {
    root: rootEl,
    scroller,
    spacer,
    viewport,
    layerHeaderScroll,
    layerHeaderFrozenLeft,
    layerHeaderFrozenRight,
    layerFrozenLeft,
    layerFrozenRight,
    layerBody,
    freezeDividerLeft,
    freezeDividerRight,
  }
}
