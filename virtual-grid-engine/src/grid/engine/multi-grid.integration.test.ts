// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest'
import type { CellCoordinate, GridCell, GridColumn } from '../types'
import { createGrid } from './GridEngine'
import type { GridEngine } from './types'

function columnsFor(prefix: string, count: number): GridColumn[] {
  return Array.from({ length: count }, (_, index) => ({
    dataIndex: `${prefix}-col-${index}`,
    title: `${prefix} ${index}`,
    width: 80 + (index % 3) * 12,
  }))
}

function cellFactory(prefix: string) {
  return ([col, row]: CellCoordinate): GridCell => ({
    type: 'text',
    data: `${prefix}:${row},${col}`,
  })
}

describe('multiple grid instances', () => {
  const hosts: HTMLDivElement[] = []
  const engines: GridEngine[] = []

  afterEach(() => {
    for (const engine of engines.splice(0)) {
      engine.destroy()
    }
    for (const host of hosts.splice(0)) {
      host.remove()
    }
  })

  it('mounts isolated roots with unique data-vgrid-id', async () => {
    const configs = [
      { id: 'grid-a', prefix: 'A', rows: 200, cols: 12 },
      { id: 'grid-b', prefix: 'B', rows: 150, cols: 10 },
      { id: 'grid-c', prefix: 'C', rows: 100, cols: 8 },
      { id: 'grid-d', prefix: 'D', rows: 120, cols: 9 },
    ] as const

    for (const config of configs) {
      const host = document.createElement('div')
      host.style.width = '320px'
      host.style.height = '200px'
      document.body.appendChild(host)
      hosts.push(host)

      const engine = createGrid(host, {
        gridId: config.id,
        columns: columnsFor(config.prefix, config.cols),
        rowCount: config.rows,
        getCellContent: cellFactory(config.prefix),
        headerHeight: 32,
        rowHeight: 28,
        width: 320,
        height: 200,
      })
      engines.push(engine)
    }

    const roots = document.querySelectorAll('[data-vgrid-id]')
    expect(roots.length).toBe(4)

    const ids = [...roots].map((node) =>
      (node as HTMLElement).dataset.vgridId,
    )
    expect(new Set(ids).size).toBe(4)
    expect(ids).toContain('grid-a')
    expect(ids).toContain('grid-d')

    engines[0]!.scrollTo(0, 400)
    expect(engines[1]!.getScroll().top).toBe(0)

    const cellA = hosts[0]!.querySelector(
      '[data-vgrid-id="grid-a"] .vgrid__cell[data-row="5"]',
    )
    const cellB = hosts[1]!.querySelector(
      '[data-vgrid-id="grid-b"] .vgrid__cell[data-row="5"]',
    )
    expect(cellA?.textContent).toMatch(/^A:/)
    expect(cellB?.textContent).toMatch(/^B:/)
  })

  it('destroy removes all DOM and allows garbage collection of hosts', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)

    const engine = createGrid(host, {
      gridId: 'teardown',
      columns: columnsFor('T', 4),
      rowCount: 20,
      getCellContent: cellFactory('T'),
      headerHeight: 28,
      rowHeight: 24,
      width: 200,
      height: 160,
    })
    engines.push(engine)

    expect(host.querySelector('[data-vgrid-id="teardown"]')).not.toBeNull()
    engine.destroy()
    engines.pop()
    expect(host.querySelector('[data-vgrid-id="teardown"]')).toBeNull()
    expect(host.childNodes.length).toBe(0)
  })
})
