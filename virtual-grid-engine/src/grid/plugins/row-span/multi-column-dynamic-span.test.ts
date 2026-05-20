// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRowMetrics } from '../virtualization'
import type { ResolvedColumn } from '../../col-def'
import type { CellCoordinate, GridCell } from '../../types'
import { createGrid } from '../../engine/GridEngine'
import type { GridEngine } from '../../engine/types'
import { GridModules } from '../../modules/grid-modules'

const SPAN_TEST_MODULES = [
  GridModules.clientSideRowModel,
  GridModules.cellSpan,
  GridModules.virtualization,
] as const
import { collectSpanAnchorsForColumn } from './collect-span-anchors'
import { computeRowSpans } from './compute-row-spans'

/** Group lengths per column — each column spans on its own schedule. */
const GROUP_LENGTHS: Record<number, number[]> = {
  0: [2, 5, 3, 1, 4],
  1: [3, 2, 4, 6, 1],
}

function groupIdForColumn(col: number, row: number): string {
  const pattern = GROUP_LENGTHS[col]
  if (!pattern) return `c${col}-r${row}`

  let cursor = 0
  let groupIndex = 0
  while (cursor <= row) {
    const len = pattern[groupIndex % pattern.length]!
    if (row < cursor + len) {
      return `c${col}-g${groupIndex}`
    }
    cursor += len
    groupIndex += 1
  }
  return `c${col}-g${groupIndex}`
}

function getCellContent([col, row]: CellCoordinate): GridCell {
  if (col <= 1) {
    return { type: 'text', data: groupIdForColumn(col, row) }
  }
  return { type: 'text', data: `plain-${row}` }
}

const SPAN_COLUMNS: ResolvedColumn[] = [
  { field: 'dept', title: 'Dept', width: 80, spanCell: true },
  { field: 'team', title: 'Team', width: 80, spanCell: true },
  { field: 'name', title: 'Name', width: 100 },
]

function expectedSegments(
  col: number,
  rowCount: number,
): { startRowIndex: number; spanCount: number }[] {
  const pattern = GROUP_LENGTHS[col]!
  const segments: { startRowIndex: number; spanCount: number }[] = []
  let row = 0
  let patternIndex = 0
  while (row < rowCount) {
    const spanCount = pattern[patternIndex % pattern.length]!
    segments.push({ startRowIndex: row, spanCount })
    row += spanCount
    patternIndex += 1
  }
  return segments
}

async function flushPaint(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve())
    })
  })
}

describe('multi-column row span with dynamic group lengths', () => {
  const rowCount = 15

  it('computes independent span segments per column', () => {
    const rowMetrics = createRowMetrics(rowCount, 28)
    const ctx = computeRowSpans({
      rowCount,
      columns: SPAN_COLUMNS,
      getCellContent,
      rowMetrics,
    })!

    const deptSegments = ctx.segmentsByColumn.get(0)!
    const teamSegments = ctx.segmentsByColumn.get(1)!

    expect(deptSegments).toEqual(expectedSegments(0, rowCount))
    expect(teamSegments).toEqual(expectedSegments(1, rowCount))

    expect(deptSegments).not.toEqual(teamSegments)

    const deptMeta = ctx.metaByColumnIndex.get(0)!
    const teamMeta = ctx.metaByColumnIndex.get(1)!

    expect(deptMeta[0]!.spanCount).toBe(2)
    expect(deptMeta[2]!.spanCount).toBe(5)
    expect(teamMeta[0]!.spanCount).toBe(3)
    expect(teamMeta[3]!.spanCount).toBe(2)
  })

  it('assigns different totalHeight per anchor when row heights vary', () => {
    const rowHeight = (i: number) => (i % 2 === 0 ? 40 : 20)
    const rowMetrics = createRowMetrics(rowCount, rowHeight)
    const ctx = computeRowSpans({
      rowCount,
      columns: SPAN_COLUMNS,
      getCellContent,
      rowMetrics,
    })!

    const deptAnchor0 = ctx.metaByColumnIndex.get(0)![0]!
    const teamAnchor0 = ctx.metaByColumnIndex.get(1)![0]!

    expect(deptAnchor0.totalHeight).toBe(
      rowMetrics.getRowTop(2) - rowMetrics.getRowTop(0),
    )
    expect(teamAnchor0.totalHeight).toBe(
      rowMetrics.getRowTop(3) - rowMetrics.getRowTop(0),
    )
    expect(deptAnchor0.totalHeight).not.toBe(teamAnchor0.totalHeight)
  })

  it('collects anchors independently per column for the same viewport', () => {
    const rowMetrics = createRowMetrics(rowCount, 28)
    const ctx = computeRowSpans({
      rowCount,
      columns: SPAN_COLUMNS,
      getCellContent,
      rowMetrics,
    })!

    const bounds = { colStart: 0, colEnd: 2, rowStart: 4, rowEnd: 6 }

    const deptAnchors = collectSpanAnchorsForColumn(ctx, 0, bounds)
    const teamAnchors = collectSpanAnchorsForColumn(ctx, 1, bounds)

    expect(deptAnchors.has(2)).toBe(true)
    expect(deptAnchors.has(7)).toBe(false)

    expect(teamAnchors.has(3)).toBe(true)
    expect(teamAnchors.has(2)).toBe(false)
  })

  it('supports per-column spanCell callbacks with different merge rules', () => {
    const columns: ResolvedColumn[] = [
      {
        field: 'a',
        title: 'A',
        width: 80,
        spanCell: ({ rowIndex }) => rowIndex % 4 !== 0,
      },
      {
        field: 'b',
        title: 'B',
        width: 80,
        spanCell: ({ rowIndex }) => rowIndex % 7 !== 0,
      },
    ]

    const ctx = computeRowSpans({
      rowCount: 20,
      columns,
      getCellContent: ([col, row]) => ({ type: 'text', data: `${col}-${row}` }),
      rowMetrics: createRowMetrics(20, 28),
    })!

    const aSegments = ctx.segmentsByColumn.get(0)!
    const bSegments = ctx.segmentsByColumn.get(1)!

    expect(aSegments[0]!.spanCount).toBe(4)
    expect(aSegments[1]!.spanCount).toBe(4)
    expect(bSegments[0]!.spanCount).toBe(7)
    expect(bSegments[1]!.spanCount).toBe(7)
  })
})

describe('multi-column dynamic span — DOM integration', () => {
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

  it('renders two span columns with different cell heights in the viewport', async () => {
    engine = createGrid(host, {
      gridId: 'multi-span',
      columns: SPAN_COLUMNS,
      rowCount: 15,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      modules: [...SPAN_TEST_MODULES],
    })
    await flushPaint()

    const spanCells = host.querySelectorAll(
      '.vgrid__cell--row-span[data-span="1"]',
    )
    expect(spanCells.length).toBeGreaterThanOrEqual(2)

    const heights = new Set<number>()
    for (const cell of spanCells) {
      const h = Number.parseFloat((cell as HTMLElement).style.height)
      if (!Number.isNaN(h)) heights.add(h)
    }
    expect(heights.size).toBeGreaterThanOrEqual(2)
  })

  it('keeps independent anchors per column after scroll', async () => {
    engine = createGrid(host, {
      gridId: 'multi-span-scroll',
      columns: SPAN_COLUMNS,
      rowCount: 15,
      getCellContent,
      headerHeight: 32,
      rowHeight: 28,
      width: 400,
      height: 300,
      modules: [...SPAN_TEST_MODULES],
    })
    await flushPaint()

    engine.scrollTo(0, 196)
    await flushPaint()

    const deptRows = new Set(
      [...host.querySelectorAll('.vgrid__cell--row-span[data-col="0"]')].map(
        (el) => (el as HTMLElement).dataset.row,
      ),
    )
    const teamRows = new Set(
      [...host.querySelectorAll('.vgrid__cell--row-span[data-col="1"]')].map(
        (el) => (el as HTMLElement).dataset.row,
      ),
    )

    expect(deptRows.size).toBeGreaterThan(0)
    expect(teamRows.size).toBeGreaterThan(0)
    expect(deptRows.has('7') || deptRows.has('2')).toBe(true)
    expect(teamRows.has('5') || teamRows.has('3')).toBe(true)
  })
})
