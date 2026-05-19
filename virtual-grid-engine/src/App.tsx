import { useCallback, useMemo, useState } from 'react'
import { ENTERPRISE_DEMO_CONFIG } from './demo/enterprise-row-span-demo'
import {
  VirtualizedGrid,
  type CellCoordinate,
  type FrozenColumns,
  type GridCell,
  type GridColumn,
  type GridSize,
  type RowHeightSpec,
} from './index'
import './App.css'

export type DemoTableConfig = {
  id: string
  title: string
  description: string
  rowCount: number
  columnCount: number
  headerHeight: number
  rowHeight: RowHeightSpec
  frozenColumns?: FrozenColumns
  /** `number` = px · `'100%'` = fill parent · `'auto'` = from layout */
  width: GridSize
  height: GridSize
}

// const DEMO_TABLES: DemoTableConfig[] = [
//   {
//     id: 'sales',
//     title: 'Sales ledger',
//     description: '25k rows · 120 cols · frozen ID + Label',
//     rowCount: 25_000,
//     columnCount: 120,
//     headerHeight: 36,
//     rowHeight: (index) => (index % 5 === 0 ? 36 : 28),
//     frozenColumns: { left: ['sales-col-0', 'sales-col-1'] },
//     width: '100%',
//     height: 600,
//   },
//   {
//     id: 'inventory',
//     title: 'Inventory',
//     description: '10k rows · 60 cols · full width · fixed 260px height',
//     rowCount: 10_000,
//     columnCount: 60,
//     headerHeight: 32,
//     rowHeight: 32,
//     frozenColumns: { left: ['inventory-col-0', 'inventory-col-1'] },
//     width: '100%',
//     height: 260,
//   },
// ]

function buildColumns(tableId: string, count: number): GridColumn[] {
  const cols: GridColumn[] = [
    {
      dataIndex: `${tableId}-col-0`,
      title: 'ID',
      width: 72,
    },
    {
      dataIndex: `${tableId}-col-1`,
      title: 'Label',
      width: 120,
    },
  ]
  for (let index = 2; index < count; index++) {
    cols.push({
      dataIndex: `${tableId}-col-${index}`,
      title: `Col ${index}`,
      width: 88 + (index % 4) * 14,
    })
  }
  return cols
}

function EnterpriseDemoPanel() {
  const [hover, setHover] = useState<CellCoordinate | null>(null)
  const [selected, setSelected] = useState<CellCoordinate | null>(null)
  const cfg = ENTERPRISE_DEMO_CONFIG

  const status = useMemo(() => {
    const parts: string[] = [`#${cfg.id}`, `${cfg.rowCount} rows`]
    if (hover) {
      const field = cfg.columns[hover[0]]?.dataIndex ?? '?'
      parts.push(`hover ${field} [${hover[0]}, ${hover[1]}]`)
    }
    if (selected) {
      const field = cfg.columns[selected[0]]?.dataIndex ?? '?'
      parts.push(`sel ${field} [${selected[0]}, ${selected[1]}]`)
    }
    return parts.join(' · ')
  }, [cfg.id, cfg.rowCount, cfg.columns, hover, selected])

  return (
    <article
      className="grid-demo__panel grid-demo__panel--fluid-height"
      aria-labelledby="panel-title-enterprise"
    >
      <header className="grid-demo__panel-header">
        <h2 id="panel-title-enterprise">{cfg.title}</h2>
        <p>{cfg.description}</p>
        <p className="grid-demo__panel-status">{status}</p>
      </header>
      <div className="grid-demo__panel-body">
        <VirtualizedGrid
          gridId={cfg.id}
          className="vgrid--enterprise"
          columns={cfg.columns}
          rowCount={cfg.rowCount}
          getCellContent={cfg.getCellContent}
          headerHeight={cfg.headerHeight}
          rowHeight={cfg.rowHeight}
          frozenColumns={cfg.frozenColumns}
          animateTransitions
          transitionDurationMs={240}
          width={cfg.width}
          height={cfg.height}
          onCellHover={setHover}
          onCellSelect={setSelected}
        />
      </div>
    </article>
  )
}

function DemoTablePanel({ config }: { config: DemoTableConfig }) {
  const [hover, setHover] = useState<CellCoordinate | null>(null)
  const [selected, setSelected] = useState<CellCoordinate | null>(null)

  const columns = useMemo(
    () => buildColumns(config.id, config.columnCount),
    [config.id, config.columnCount],
  )

  const getCellContent = useCallback(
    ([col, row]: CellCoordinate): GridCell => {
      if (col === 0) {
        return { type: 'number', data: row + 1 }
      }
      if (col === 1) {
        return { type: 'text', data: `${config.title} · row ${row + 1}` }
      }
      if (col % 7 === 0) {
        return { type: 'number', data: col * 1000 + row }
      }
      return {
        type: 'text',
        data: `${config.id} R${row}·C${col}`,
      }
    },
    [config.id, config.title],
  )

  const status = useMemo(() => {
    const parts: string[] = [`#${config.id}`]
    if (hover) parts.push(`hover [${hover[0]}, ${hover[1]}]`)
    if (selected) parts.push(`sel [${selected[0]}, ${selected[1]}]`)
    return parts.join(' · ')
  }, [config.id, hover, selected])

  const usesFluidHeight =
    config.height === '100%' || config.height === 'auto'

  return (
    <article
      className={`grid-demo__panel${usesFluidHeight ? ' grid-demo__panel--fluid-height' : ''}`}
      aria-labelledby={`panel-title-${config.id}`}
    >
      <header className="grid-demo__panel-header">
        <h2 id={`panel-title-${config.id}`}>{config.title}</h2>
        <p>{config.description}</p>
        <p className="grid-demo__panel-status">{status}</p>
      </header>
      <div className="grid-demo__panel-body">
        <VirtualizedGrid
          gridId={config.id}
          className={`vgrid--${config.id}`}
          columns={columns}
          rowCount={config.rowCount}
          getCellContent={getCellContent}
          headerHeight={config.headerHeight}
          rowHeight={config.rowHeight}
          frozenColumns={config.frozenColumns}
          animateTransitions
          transitionDurationMs={240}
          width={config.width}
          height={config.height}
          onCellHover={setHover}
          onCellSelect={setSelected}
        />
      </div>
    </article>
  )
}

function App() {
  return (
    <div className="grid-demo">
      <header className="grid-demo__header">
        <h1>Virtualized Grid — multi-instance demo</h1>
        <p>
          Fintech ledger: 10k trades × 200 columns. Nested row spans follow
          Region → Country → Desk → Product (parent values repeat per group).
          Frozen columns match AG Grid <code>pinned: &apos;left&apos;</code>.
        </p>
      </header>

      <div className="grid-demo__tables">
        <EnterpriseDemoPanel />
        {/* {DEMO_TABLES.map((config) => (
          <DemoTablePanel key={config.id} config={config} />
        ))} */}
      </div>
    </div>
  )
}

export default App
