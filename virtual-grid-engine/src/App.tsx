import { useCallback, useMemo, useState } from 'react'
import {
  VirtualizedGrid,
  type CellCoordinate,
  type FrozenColumns,
  type GridCell,
  type GridColumn,
} from './index'
import './App.css'

const COLUMN_COUNT = 1200

function buildDemoColumns(count: number): GridColumn[] {
  const cols: GridColumn[] = [
    { dataIndex: 'id', title: 'ID', width: 72 },
    { dataIndex: 'name', title: 'Name', width: 140 },
  ]
  for (let i = 2; i < count; i++) {
    cols.push({
      dataIndex: `col-${i}`,
      title: `Column ${i}`,
      width: 96 + (i % 4) * 16,
    })
  }
  return cols
}

const DEMO_COLUMNS = buildDemoColumns(COLUMN_COUNT)

const ROW_COUNT = 100_000

const PRESET_DEFAULT: FrozenColumns = {
  left: ['id', 'name'],
  right: [`col-${COLUMN_COUNT - 2}`, `col-${COLUMN_COUNT - 1}`],
}

function variableRowHeight(index: number): number {
  return index % 5 === 0 ? 36 : 28
}

function App() {
  const [hover, setHover] = useState<CellCoordinate | null>(null)
  const [selected, setSelected] = useState<CellCoordinate | null>(null)
  const [frozenLeft, setFrozenLeft] = useState<string[]>([...PRESET_DEFAULT.left!])
  const [frozenRight, setFrozenRight] = useState<string[]>([
    ...PRESET_DEFAULT.right!,
  ])

  const frozenColumns = useMemo(
    (): FrozenColumns => ({
      left: frozenLeft,
      right: frozenRight,
    }),
    [frozenLeft, frozenRight],
  )

  const selectedDataIndex =
    selected !== null ? DEMO_COLUMNS[selected[0]]?.dataIndex : null

  const getCellContent = useCallback(
    ([col, row]: CellCoordinate): GridCell => {
      if (col === 0) return { type: 'number', data: row + 1 }
      if (col === 1) return { type: 'text', data: `User ${row + 1}` }
      if (col % 7 === 0) {
        return { type: 'number', data: col * 1000 + row }
      }
      return { type: 'text', data: `R${row}·C${col}` }
    },
    [],
  )

  const pinLeft = useCallback((dataIndex: string) => {
    setFrozenRight((r) => r.filter((k) => k !== dataIndex))
    setFrozenLeft((l) => (l.includes(dataIndex) ? l : [...l, dataIndex]))
  }, [])

  const pinRight = useCallback((dataIndex: string) => {
    setFrozenLeft((l) => l.filter((k) => k !== dataIndex))
    setFrozenRight((r) => (r.includes(dataIndex) ? r : [...r, dataIndex]))
  }, [])

  const unpin = useCallback((dataIndex: string) => {
    setFrozenLeft((l) => l.filter((k) => k !== dataIndex))
    setFrozenRight((r) => r.filter((k) => k !== dataIndex))
  }, [])

  const status = useMemo(() => {
    const parts: string[] = []
    if (hover) parts.push(`Hover: [${hover[0]}, ${hover[1]}]`)
    if (selected) {
      parts.push(
        `Selected: ${selectedDataIndex ?? `[${selected[0]}, ${selected[1]}]`}`,
      )
    }
    parts.push(
      `Frozen L: ${frozenLeft.length ? frozenLeft.join(', ') : '—'}`,
    )
    parts.push(
      `Frozen R: ${frozenRight.length ? frozenRight.join(', ') : '—'}`,
    )
    return parts.join(' · ')
  }, [hover, selected, selectedDataIndex, frozenLeft, frozenRight])

  return (
    <div className="grid-demo">
      <header className="grid-demo__header">
        <h1>Virtualized-Grid</h1>
        <p>
          {ROW_COUNT.toLocaleString()} rows × {COLUMN_COUNT} columns · click a
          cell, then pin/unpin columns · layout changes animate
        </p>
        <p className="grid-demo__status">{status}</p>

        <div className="grid-demo__toolbar" role="toolbar" aria-label="Column freeze">
          <div className="grid-demo__toolbar-group">
            <span className="grid-demo__toolbar-label">Presets</span>
            <button
              type="button"
              className="grid-demo__btn"
              onClick={() => {
                setFrozenLeft([...(PRESET_DEFAULT.left ?? [])])
                setFrozenRight([...(PRESET_DEFAULT.right ?? [])])
              }}
            >
              Default freeze
            </button>
            <button
              type="button"
              className="grid-demo__btn grid-demo__btn--ghost"
              onClick={() => {
                setFrozenLeft([])
                setFrozenRight([])
              }}
            >
              Clear all
            </button>
          </div>

          <div className="grid-demo__toolbar-group">
            <span className="grid-demo__toolbar-label">Selected column</span>
            <button
              type="button"
              className="grid-demo__btn"
              disabled={!selectedDataIndex}
              onClick={() => selectedDataIndex && pinLeft(selectedDataIndex)}
            >
              Pin left
            </button>
            <button
              type="button"
              className="grid-demo__btn"
              disabled={!selectedDataIndex}
              onClick={() => selectedDataIndex && pinRight(selectedDataIndex)}
            >
              Pin right
            </button>
            <button
              type="button"
              className="grid-demo__btn grid-demo__btn--ghost"
              disabled={!selectedDataIndex}
              onClick={() => selectedDataIndex && unpin(selectedDataIndex)}
            >
              Unpin
            </button>
          </div>

          <div className="grid-demo__toolbar-group">
            <span className="grid-demo__toolbar-label">Quick toggle</span>
            {(['id', 'name', 'col-2', 'col-10'] as const).map((key) => {
              const onLeft = frozenLeft.includes(key)
              const onRight = frozenRight.includes(key)
              const label = onLeft ? 'L' : onRight ? 'R' : '·'
              return (
                <button
                  key={key}
                  type="button"
                  className={`grid-demo__btn grid-demo__btn--chip${onLeft || onRight ? ' grid-demo__btn--chip-active' : ''}`}
                  title={`Toggle freeze: ${key}`}
                  onClick={() => {
                    if (onLeft) unpin(key)
                    else if (onRight) unpin(key)
                    else pinLeft(key)
                  }}
                >
                  {key} <span className="grid-demo__chip-side">{label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <VirtualizedGrid
        columns={DEMO_COLUMNS}
        rowCount={ROW_COUNT}
        getCellContent={getCellContent}
        headerHeight={36}
        rowHeight={variableRowHeight}
        frozenColumns={frozenColumns}
        animateTransitions
        transitionDurationMs={280}
        width={900}
        height={480}
        onCellHover={setHover}
        onCellSelect={setSelected}
      />
    </div>
  )
}

export default App
