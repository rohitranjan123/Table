// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedColumn } from '../col-def'
import { GridModules } from '../modules/grid-modules'
import type { CellCoordinate, GridCell } from '../types'
import { createGrid } from './GridEngine'
import type { GridEngine } from './types'

const DEFAULT_MODULES = [
  GridModules.clientSideRowModel,
  GridModules.cellSpan,
  GridModules.columnSort,
  GridModules.freezeColumns,
  GridModules.virtualization,
] as const

function mountEngine(
  host: HTMLDivElement,
  options: Parameters<typeof createGrid>[1],
): GridEngine {
  return createGrid(host, {
    ...options,
    modules: [...DEFAULT_MODULES],
  })
}

const COLUMNS: ResolvedColumn[] = [
  { field: 'id', title: 'ID', width: 80 },
  { field: 'name', title: 'Name', width: 120 },
  { field: 'value', title: 'Value', width: 100 },
  { field: 'note', title: 'Note', width: 100 },
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
    engine = mountEngine(host, {
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
    engine = mountEngine(host, {
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
    engine = mountEngine(host, {
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
    engine = mountEngine(host, {
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
    engine = mountEngine(host, {
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
    engine = mountEngine(host, {
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

  it('renders row-span anchor cells taller than a single row', async () => {
    const spanColumns: ResolvedColumn[] = [
      { field: 'group', title: 'Group', width: 100, spanCell: true },
      { field: 'value', title: 'Value', width: 100 },
    ]
    const spanGetCell = ([col, row]: CellCoordinate): GridCell => {
      if (col === 0) {
        return { type: 'text', data: `G${Math.floor(row / 3)}` }
      }
      return { type: 'text', data: `v${row}` }
    }

    engine = mountEngine(host, {
      gridId: 'integration-span',
      columns: spanColumns,
      rowCount: 30,
      getCellContent: spanGetCell,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
    })
    await flushPaint()

    const spanCell = host.querySelector(
      '.vgrid__cell--row-span[data-span="1"]',
    ) as HTMLElement | null
    expect(spanCell).not.toBeNull()
    expect(Number.parseFloat(spanCell!.style.height)).toBeGreaterThan(28)
    expect(spanCell!.dataset.row).toBe('0')
  })

  it('paints body cells when rowCount grows with unchanged sortState (async rowData)', async () => {
    const sortState = [{ columnId: 'name', direction: 'asc' as const }]
    const rows: string[] = []

    engine = mountEngine(host, {
      gridId: 'integration-async-data',
      columns: COLUMNS,
      rowCount: 0,
      getCellContent: ([, row]) => ({
        type: 'text',
        data: rows[row] ?? '',
      }),
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      sortState,
      onSortStateChange: () => {},
    })
    rows.push('alpha', 'beta', 'gamma')
    engine.updateOptions({
      rowCount: rows.length,
      getCellContent: ([, row]) => ({
        type: 'text',
        data: rows[row] ?? '',
      }),
      sortState,
    })
    await flushPaint()

    const bodyCells = host.querySelectorAll(
      '.vgrid__layer--body .vgrid__cell[data-row]',
    )
    expect(bodyCells.length).toBeGreaterThan(0)
    expect(bodyCells[0]?.textContent).toBeTruthy()
  })

  it('applies spanCell when rowData loads with unchanged sortState', async () => {
    const sortState = [{ columnId: 'group', direction: 'asc' as const }]
    const spanColumns: ResolvedColumn[] = [
      { field: 'group', title: 'Group', width: 100, spanCell: true },
      { field: 'value', title: 'Value', width: 100 },
    ]
    const rows: string[] = []

    const getCell = ([col, row]: CellCoordinate): GridCell => {
      if (col === 0) return { type: 'text', data: rows[row] ?? '' }
      return { type: 'number', data: row }
    }

    engine = mountEngine(host, {
      gridId: 'integration-async-span',
      columns: spanColumns,
      rowCount: 0,
      getCellContent: getCell,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      sortState,
      onSortStateChange: () => {},
    })

    rows.push('A', 'A', 'A', 'B', 'B')
    engine.updateOptions({
      rowCount: rows.length,
      getCellContent: getCell,
      columns: spanColumns,
      sortState,
    })
    await flushPaint()

    const spanCell = host.querySelector(
      '.vgrid__cell--row-span[data-span="1"]',
    ) as HTMLElement | null
    expect(spanCell).not.toBeNull()
    expect(Number.parseFloat(spanCell!.style.height)).toBeGreaterThan(28)
  })
})
