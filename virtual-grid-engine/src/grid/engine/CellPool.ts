/** @internal Cell DOM pool for a single render layer. */

import { createCellElement, hideCellElement } from './domCell'

/** Cap recycled nodes per layer so fast scroll cannot retain unbounded hidden DOM. */
const MAX_FREE_CELLS = 256

/** Recycles cell DOM nodes within a single layer container. */
export class CellPool {
  private readonly layer: HTMLElement
  private readonly active = new Map<string, HTMLDivElement>()
  private readonly free: HTMLDivElement[] = []

  constructor(layer: HTMLElement) {
    this.layer = layer
  }

  acquire(key: string): HTMLDivElement {
    const existing = this.active.get(key)
    if (existing) return existing

    const el = this.free.pop() ?? createCellElement()
    this.layer.appendChild(el)
    this.active.set(key, el)
    return el
  }

  release(key: string): void {
    const el = this.active.get(key)
    if (!el) return
    this.active.delete(key)
    hideCellElement(el)
    if (this.free.length >= MAX_FREE_CELLS) {
      el.remove()
    } else {
      this.free.push(el)
    }
  }

  /** Hide and pool every cell whose key is not in `keep`. */
  prune(keep: ReadonlySet<string>): void {
    for (const key of [...this.active.keys()]) {
      if (!keep.has(key)) this.release(key)
    }
    this.trimExcessFree()
  }

  /** Drop all DOM nodes — use when data shape or virtualization mode changes. */
  clear(): void {
    for (const el of this.active.values()) el.remove()
    for (const el of this.free) el.remove()
    this.active.clear()
    this.free.length = 0
  }

  private trimExcessFree(): void {
    const budget = Math.min(MAX_FREE_CELLS, this.active.size * 2)
    while (this.free.length > budget) {
      const el = this.free.pop()
      el?.remove()
    }
  }

  destroy(): void {
    this.clear()
  }
}
