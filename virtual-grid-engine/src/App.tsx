import { useCallback, useMemo, useState } from 'react'
import {
  VirtualizedGrid,
  type CellCoordinate,
  type FrozenColumns,
  type GridCell,
  type GridColumn,
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
  width: number
  height: number
}

const DEMO_TABLES: DemoTableConfig[] = [
  {
    id: 'sales',
    title: 'Sales ledger',
    description: '25k rows · 120 cols · variable row height · frozen ID & name',
    rowCount: 250_000,
    columnCount: 1020,
    headerHeight: 36,
    rowHeight: (index) => (index % 5 === 0 ? 36 : 28),
    frozenColumns: { left: ['sales-col-0', 'sales-col-1'] },
    width: 1600,
    height: 260,
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: '10k rows · 60 cols · fixed 32px rows · no freeze',
    rowCount: 100_000,
    columnCount: 460,
    headerHeight: 32,
    rowHeight: 32,
    width: 440,
    height: 260,
  },
]

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

  return (
    <article
      className="grid-demo__panel"
      aria-labelledby={`panel-title-${config.id}`}
    >
      <header className="grid-demo__panel-header">
        <h2 id={`panel-title-${config.id}`}>{config.title}</h2>
        <p>{config.description}</p>
        <p className="grid-demo__panel-status">{status}</p>
      </header>
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
    </article>
  )
}

function App() {
  return (
    <div className="grid-demo">
      <header className="grid-demo__header">
        <h1>Virtualized Grid — multi-instance demo</h1>
        <p>
          Four independent grids in one view. Each mount owns its own engine,
          DOM tree, scroll container, and interaction state (
          <code>data-vgrid-id</code>).
        </p>
      </header>

      <div className="grid-demo__tables">
        {DEMO_TABLES.map((config) => (
          <DemoTablePanel key={config.id} config={config} />
        ))}
      </div>
    </div>
  )
}

export default App
