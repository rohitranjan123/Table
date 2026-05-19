// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CellCoordinate, GridCell, GridColumn } from '../types'
import { createGrid } from './GridEngine'
import type { GridEngine } from './types'

const COLUMNS: GridColumn[] = [
  { dataIndex: 'id', title: 'ID', width: 80 },
  { dataIndex: 'name', title: 'Name', width: 120 },
  { dataIndex: 'value', title: 'Value', width: 100 },
  { dataIndex: 'note', title: 'Note', width: 100 },
]

function getCellContent([col, row]: CellCoordinate): GridCell {
  return { type: 'text', data: `R${row}C${col}` }
}

async function flushPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('createGrid integration', () => {
  let host: HTMLDivElement
  let engine: GridEngine | null = null

  beforeEach(() => {
    host = document.createElement('div')
    host.style.width = '400px'
    host.style.height = '300px'
    document.body.appendChild(host)
  })

  afterEach(() => {
    engine?.destroy()
    engine = null
    host.remove()
  })

  it('mounts a grid root with ARIA grid role', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 50,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
    })
    await flushPaint()

    const root = host.querySelector('.vgrid')
    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('grid')
    expect(root?.getAttribute('aria-rowcount')).toBe('50')
    expect(root?.getAttribute('aria-colcount')).toBe('4')
  })

  it('destroy removes the grid from the DOM', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 10,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
    })
    await flushPaint()
    expect(host.querySelector('.vgrid')).not.toBeNull()
    engine.destroy()
    engine = null
    expect(host.querySelector('.vgrid')).toBeNull()
  })

  it('virtualizes body cells to a small window', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 500,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      virtualization: true,
    })
    await flushPaint()

    const bodyCells = host.querySelectorAll(
      '.vgrid__cell[data-header="0"]',
    )
    expect(bodyCells.length).toBeGreaterThan(0)
    expect(bodyCells.length).toBeLessThan(500)
  })

  it('scrollTo updates scroll position', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 200,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
    })
    await flushPaint()

    engine.scrollTo(0, 400)
    const scroll = engine.getScroll()
    expect(scroll.top).toBe(400)
    expect(scroll.left).toBe(0)
  })

  it('frozen left columns render in dedicated layers', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 20,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      frozenColumns: { left: ['id', 'name'] },
    })
    await flushPaint()

    const layers = host.querySelectorAll('.vgrid__layer')
    const headerFrozenLeft = layers[1]
    const bodyFrozenLeft = layers[3]

    expect(
      headerFrozenLeft?.querySelector('.vgrid__cell--header')?.textContent,
    ).toBe('ID')
    expect(
      bodyFrozenLeft?.querySelectorAll('.vgrid__cell[data-header="0"]').length,
    ).toBeGreaterThan(0)
    expect(
      bodyFrozenLeft?.querySelector('.vgrid__cell[data-col="0"][data-row="0"]')
        ?.textContent,
    ).toBe('R0C0')
  })

  it('updateOptions with new frozen columns repaints frozen layer', async () => {
    engine = createGrid(host, {
      gridId: 'integration-test',
      columns: COLUMNS,
      rowCount: 10,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
    })
    await flushPaint()

    engine.updateOptions({ frozenColumns: { left: ['id'] } })
    await flushPaint()
    const divider = host.querySelector('.vgrid__freeze-divider--left')
    expect(divider).not.toBeNull()
    expect((divider as HTMLElement).style.display).not.toBe('none')
  })
})
