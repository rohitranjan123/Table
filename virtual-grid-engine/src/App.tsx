import { useCallback, useMemo, useState } from 'react'
import type { IOlympicData } from './interfaces'
import { useFetchJson } from './useFetchJson'
import {
  VirtualizedGrid,
  GridModules,
  type ColDef,
  type DefaultColDef,
  type SortState,
} from './index'
import {
  ANIMATION_PRESETS,
  getAnimationPreset,
  modulesForPreset,
  type AnimationPresetId,
} from './demo/animation-presets'
import './App.css'

const OLYMPIC_URL =
  'https://www.ag-grid.com/example-assets/olympic-winners.json'

const INITIAL_COLUMN_DEFS: ColDef[] = [
  { field: 'country', spanCell: true, sort: 'asc' },
  { field: 'year', spanCell: true, sort: 'asc' },
  { field: 'sport', spanCell: true, sort: 'asc' },
  { field: 'athlete' },
  { field: 'age' },
  { field: 'total' },
]

function App() {
  const containerStyle = useMemo(() => ({ width: '100%', height: '100%' }), [])
  const gridStyle = useMemo(() => ({ height: 560, width: '100%' }), [])

  const [columnDefs, setColumnDefs] = useState<ColDef[]>(INITIAL_COLUMN_DEFS)
  const [presetId, setPresetId] = useState<AnimationPresetId>('cell-reveal')
  const [replayNonce, setReplayNonce] = useState(0)
  const [demoLoading, setDemoLoading] = useState(false)
  const [flashRowData, setFlashRowData] = useState<IOlympicData[] | undefined>(
    undefined,
  )
  const [resizeColDef, setResizeColDef] = useState<DefaultColDef | undefined>(
    undefined,
  )

  const preset = useMemo(() => getAnimationPreset(presetId), [presetId])
  const modules = useMemo(
    () => [
      ...modulesForPreset(preset),
      ...(import.meta.env.DEV ? [GridModules.validation] : []),
    ],
    [preset],
  )

  const defaultColDef = useMemo<DefaultColDef>(
    () => resizeColDef ?? { flex: 1 },
    [resizeColDef],
  )

  const { data: fetchedData, loading: fetchLoading } =
    useFetchJson<IOlympicData>(OLYMPIC_URL)

  const rowData = flashRowData ?? fetchedData
  const loading = fetchLoading || demoLoading

  const [sortState, setSortState] = useState<SortState[]>([
    { columnId: 'country', direction: 'asc', mode: 'smart' },
    { columnId: 'year', direction: 'asc', mode: 'smart' },
    { columnId: 'sport', direction: 'asc', mode: 'smart' },
  ])

  const handlePresetChange = (nextId: AnimationPresetId) => {
    setPresetId(nextId)
    setReplayNonce((n) => n + 1)
    setFlashRowData(undefined)
    setResizeColDef(undefined)
  }

  const handleReplay = useCallback(() => {
    const p = getAnimationPreset(presetId)
    switch (p.replay) {
      case 'remount':
        setReplayNonce((n) => n + 1)
        break
      case 'sort-toggle': {
        setSortState((prev) => {
          const sport = prev.find((s) => s.columnId === 'sport')
          const rest = prev.filter((s) => s.columnId !== 'sport')
          const nextDir = sport?.direction === 'asc' ? 'desc' : 'asc'
          return [
            ...rest,
            { columnId: 'sport', direction: nextDir, mode: 'smart' },
          ]
        })
        break
      }
      case 'shuffle-columns':
        setColumnDefs((cols) => {
          if (cols.length < 2) return cols
          const next = [...cols]
          const i = next.findIndex((c) => c.field === 'athlete')
          const j = next.findIndex((c) => c.field === 'country')
          if (i >= 0 && j >= 0) {
            ;[next[i], next[j]] = [next[j], next[i]]
          }
          return next
        })
        break
      case 'column-resize':
        setResizeColDef((prev) =>
          prev?.width === 120 ? { flex: 1 } : { width: 120 },
        )
        break
      case 'flash-cells': {
        const source =
          (rowData?.length ?? 0) > 0 ? rowData! : (fetchedData ?? [])
        if (source.length === 0) return
        const copy = source.map((row) => ({ ...row }))
        const limit = Math.min(40, copy.length)
        for (let i = 0; i < limit; i++) {
          copy[i] = {
            ...copy[i],
            total: (copy[i].total ?? 0) + 1,
          }
        }
        setFlashRowData(copy)
        break
      }
      case 'fake-loading':
        setDemoLoading(true)
        window.setTimeout(() => setDemoLoading(false), 600)
        setReplayNonce((n) => n + 1)
        break
      default:
        setReplayNonce((n) => n + 1)
    }
  }, [presetId, fetchedData])

  const gridKey = `${presetId}-${replayNonce}`

  return (
    <div className="grid-demo">
      <header className="grid-demo__header">
        <h1>Olympic winners — cell span demo</h1>
        <p>
          AG Grid–aligned API with animation modules preview. Pick an effect,
          then use Replay to see it again.
        </p>
      </header>

      <div className="grid-demo__tables">
        <article className="grid-demo__panel grid-demo__panel--fluid-height">
          <header className="grid-demo__panel-header">
            <h2>Olympic medalists</h2>
            <p>Live data from AG Grid example assets.</p>
          </header>

          <div
            className="grid-demo__toolbar grid-demo__animation-toolbar"
            role="toolbar"
            aria-label="Animation preview"
          >
            <div className="grid-demo__toolbar-group">
              <label className="grid-demo__toolbar-label" htmlFor="anim-preset">
                Animation
              </label>
              <select
                id="anim-preset"
                className="grid-demo__select"
                value={presetId}
                onChange={(e) =>
                  handlePresetChange(e.target.value as AnimationPresetId)
                }
              >
                {ANIMATION_PRESETS.map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={!p.implemented}
                  >
                    {p.label}
                    {!p.implemented ? ' (coming soon)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="grid-demo__btn grid-demo__btn--ghost"
                onClick={handleReplay}
                disabled={loading && preset.replay !== 'fake-loading'}
              >
                Replay
              </button>
            </div>
            <p className="grid-demo__animation-hint">
              Modules:{' '}
              {preset.extraModules.length
                ? preset.extraModules.map((m) => m.id).join(', ')
                : 'none (baseline layout transitions off)'}
              {preset.id === 'cell-flash'
                ? ' — Replay bumps totals on the first visible rows.'
                : ''}
            </p>
          </div>

          <div className="grid-demo__panel-body" style={containerStyle}>
            <div style={gridStyle}>
              <VirtualizedGrid<IOlympicData>
                key={gridKey}
                gridId="olympic"
                className="vgrid--olympic"
                rowData={rowData}
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
