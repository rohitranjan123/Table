import { useMemo, useState } from 'react'
import type { IOlympicData } from './interfaces'
import { useFetchJson } from './useFetchJson'
import {
  VirtualizedGrid,
  GridModules,
  type ColDef,
  type DefaultColDef,
  type SortState,
} from './index'
import './App.css'

const OLYMPIC_URL =
  'https://www.ag-grid.com/example-assets/olympic-winners.json'

const modules = [
  GridModules.cellSpan,
  GridModules.clientSideRowModel,
  GridModules.columnSort,
  ...(import.meta.env.DEV ? [GridModules.validation] : []),
]

function App() {
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), [])
  const gridStyle = useMemo(() => ({ height: 560, width: '100%' }), [])

  const [columnDefs] = useState<ColDef[]>([
    { field: 'country', spanCell: true, sort: 'asc' },
    { field: 'year', spanCell: true, sort: 'asc' },
    { field: 'sport', spanCell: true, sort: 'asc' },
    { field: 'athlete' },
    { field: 'age' },
    { field: 'total' },
  ])

  const defaultColDef = useMemo<DefaultColDef>(() => ({ flex: 1 }), [])

  const { data, loading } = useFetchJson<IOlympicData>(OLYMPIC_URL)

  const [sortState, setSortState] = useState<SortState[]>([
    { columnId: 'country', direction: 'asc', mode: 'smart' },
    { columnId: 'year', direction: 'asc', mode: 'smart' },
    { columnId: 'sport', direction: 'asc', mode: 'smart' },
  ])

  return (
    <div className="grid-demo">
      <header className="grid-demo__header">
        <h1>Olympic winners — cell span demo</h1>
        <p>
          AG Grid–aligned API: <code>rowData</code>, <code>columnDefs</code>,{' '}
          <code>defaultColDef.flex</code>, <code>spanCell</code>,{' '}
          <code>engine.plugins.attach(modules)</code>.
        </p>
      </header>

      <div className="grid-demo__tables">
        <article className="grid-demo__panel grid-demo__panel--fluid-height">
          <header className="grid-demo__panel-header">
            <h2>Olympic medalists</h2>
            <p>Live data from AG Grid example assets.</p>
          </header>
          <div className="grid-demo__panel-body" style={containerStyle}>
            <div style={gridStyle}>
              <VirtualizedGrid<IOlympicData>
                gridId="olympic"
                className="vgrid--olympic"
                rowData={data}
                loading={loading}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                enableCellSpan
                modules={modules}
                headerHeight={36}
                rowHeight={28}
                width="100%"
                height={560}
                sortState={sortState}
                onSortStateChange={setSortState}
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

export default App
