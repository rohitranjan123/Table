# High-Performance Table Engine — Architecture

## System Overview

A config-driven, plugin-first table engine. Consumers configure behavior; the engine owns rendering performance, runtime orchestration, and extensibility. No engine internals are modified by consumers.

### Configuration Cascade

```
theme-config.ts
      ↓
component-config.ts
      ↓
internal-display-config.ts
      ↓
layout-config.ts
      ↓
Plugins Attach
      ↓
Table Engine
      ↓
Final Rendered Table
```

---

## Layer 1: theme-config.ts

Defines the Tailwind design token baseline. All plugins and components read from this.

**Controls:** colors, fonts, spacing, borders, shadows, radius, heights, widths.

```ts
export const themeConfig = {
  colors: Record<string, string>,
  spacing: Record<string, string>,
  radius: Record<string, string>,
  typography: Record<string, string>,
  borders: Record<string, string>,
  shadows: Record<string, string>,
  heights: Record<string, string>,
  widths: Record<string, string>,
}
```

- Ships with sensible defaults.
- Consumer passes partial overrides; deep-merged at build time into Tailwind `theme.extend`.
- Passed to plugins via `TableContext` so plugins can respect the active theme.

---

## Layer 2: component-config.ts

Per-component structural and style overrides. Consumed by the Component Registry at engine init.

### Override existing component
```ts
export const componentConfig = {
  search: {
    overrideComponent: CustomSearch,   // replaces DefaultSearch entirely
    style: {
      width: 300,
      height: 40,
      borderRadius: 10,
    },
  },
}
```

### Register a new component
```ts
{
  componentId: 'range',
  render: ({ field, setField }) => (
    <RangePicker value={field} onChange={setField} />
  ),
}
```

**Rules:**
- `overrideComponent` replaces the default; `extendVariant` adds alongside — mutually exclusive per entry.
- `style` is scoped; does not affect global theme tokens.
- New `componentId` values registered here are automatically available to `layout-config.ts`.

---

## Layer 3: internal-display-config.ts

Controls show/hide of built-in components. Display-only flags — no logic.

```ts
export const displayConfig = {
  search: true,
  pagination: true,
  toggleColumnWidth: false,
  // ...any registered componentId
}
```

**Rule:** If a key references a `componentId` not present in `component-config.ts` or the Component Registry, the engine throws a warning at initialization. Unknown keys are ignored at render.

---

## Layer 4: layout-config.ts

Controls where each component renders within the Table Zone grid.

### Available positions
```
topLeft     topCenter     topRight
leftTop     leftCenter    leftBottom
rightTop    rightCenter   rightBottom
bottomLeft  bottomCenter  bottomRight
```

```ts
export const layoutConfig = {
  toolbar: {
    componentId: 'search',
    position: 'topRight',
    order: 1,            // ascending order when multiple occupy same position
  },
}
```

**Rules:**
- Multiple components at the same position are sorted ascending by `order`.
- If a position has no components, it collapses — no empty space reserved.

---

## Layer 5: Component Registry

Internal map of all available components. Merges defaults with `component-config.ts` entries at engine init.

```ts
const componentRegistry = {
  search:     DefaultSearch,
  toolbar:    DefaultToolbar,
  pagination: DefaultPagination,
  // + consumer-registered components from component-config.ts
}
```

Components are pure UI — they receive all state and handlers via props. No imports from Engine or Headless layers.

**Atomic structure:** Atoms → Molecules → Organisms → Templates.

---

## Layer 6: Headless Module

Stateful logic layer. Hooks attach to any component without dictating markup.

### `component-headless.ts`
```ts
useSorting(config)    → { sortState, onSort, resetSort }
useFilter(config)     → { filterState, onFilter, clearFilter }
usePagination(config) → { page, pageSize, onPageChange }
useSelection(config)  → { selected, onSelect, clearSelection }
useGrouping(config)   → { groups, onGroup, clearGroup }
```

Each hook is built on `useReducer` internally + `useSyncExternalStore` for subscription to the Global Tracking Register.

### Global Tracking Register

Singleton owned by the Engine. All headless hooks self-register on mount — no manual wiring.

```ts
interface TrackingEntry {
  componentId: string
  state: unknown
  actions: Record<string, Function>
  currentValue: unknown
  previousValue: unknown
}
```

The Engine reads this register for plugin hooks, analytics, and `tableController` callbacks.

---

## Layer 7: View

Composes Layout modules into a fully-wired table view via HOC pattern.

### Table Zones

```
┌──────────────────────────────────────┐
│  topLeft      topCenter    topRight  │
│                                      │
│  leftZone    Table Area   rightZone  │
│                                      │
│  bottomLeft  bottomCenter bottomRight│
└──────────────────────────────────────┘
```

Empty zones collapse automatically.

### HOC Pattern

```
View
 └── HOC (wires hooks → layout)
      ├── Toolbar  ← useToolbar()
      └── Grid     ← useGrid() + table-config.ts
```

The HOC:
1. Calls `useToolbar()` and `useGrid()`.
2. Passes state + handlers as props to `<Toolbar>` and `<Grid>`.
3. Exposes `useGrid()` externally for consumer control.

### Layout modules (sealed — structure not overridable)

| Module | Responsibility |
|---|---|
| `tableGrid.ts` | Row/cell rendering, virtualization, column processing |
| `toolbar.ts` | Zone slot layout, component placement by `layout-config.ts` |

### `table-config.ts`

Static schema consumed by `tableGrid.ts`.

```ts
interface TableConfig {
  columns: ColumnDef[]
  rowKey: string
  defaultSort?: SortConfig
  virtualization?: VirtualizationConfig
}
```

---

## Layer 8: Engine

Runtime core. Owns plugin lifecycle, render pipeline orchestration, and the Global Tracking Register.

### Plugin Attachment

All plugins are optional.

```ts
import { GridEngine } from 'table-engine'

GridEngine.plugin.themeConfig(themeConfig)
GridEngine.plugin.componentConfig(componentConfig)
GridEngine.plugin.displayConfig(displayConfig)
GridEngine.plugin.layoutConfig(layoutConfig)
```

### Plugin Interface

```ts
interface TablePlugin {
  id: string
  initialize?: (context: TableContext) => void
  reducers?: ReducerMap
  hooks?: HookMap
  components?: ComponentMap
  destroy?: () => void
}
```

Plugins attach/detach at runtime without remounting the view.

### Schema Resolution Order

```
table-config.ts          (static column/row schema)
  → component-config.ts  (component overrides + new registrations)
  → display-config.ts    (show/hide flags)
  → layout-config.ts     (zone placement)
  → Plugin transforms    (dynamic mutations via reducers/hooks)
  → Final resolved config
```

### Render Pipeline

```
Raw Data
   ↓  Normalization
   ↓  Column Processing
   ↓  Plugin Processing
   ↓  Filtering
   ↓  Sorting
   ↓  Grouping
   ↓  Pagination
   ↓  Virtualization
   ↓  Renderer
```

---

## Engine API

### Accepted Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `rowData` | `RowData[]` | — | Table data source |
| `column` | `ColumnData[]` | — | Column definitions |
| `virtualization` | `boolean` | `true` | Row + column virtualization |
| `tableStyle` | `{ row, column, cell, border, scroll }` | — | Grid UI overrides |
| `toolbarStyle` | `{ top, left, bottom, right }` | — | Toolbar zone UI overrides |
| `errorComponent` | `ReactNode` | — | Custom error state |
| `emptyComponent` | `ReactNode` | — | Custom empty state |
| `loadingComponent` | `ReactNode` | — | Custom loading state |
| `tableController` | `(current) => void` | — | Exposes current state, selected rows, processed rows, active filters, sort state |

### `useTableEngine`

```ts
const { gridValue, setGridValue } = useTableEngine()
```

Works like `useState` — reads and writes engine state from outside the table.

---

## Performance Requirements

### Grid kernel (`src/grid`) — implemented today

The imperative grid kernel uses **custom row/column windowing** (see `src/grid/plugins/virtualization/`), DOM cell pooling, and `requestAnimationFrame` scroll batching. This path is required for frozen-column layering and direct DOM paint; it is documented in [docs/grid-kernel.md](../../../docs/grid-kernel.md).

### Full table engine (target) — required

- Row and column virtualization (windowing before paint)
- Memoized rendering (`React.memo`) in React surfaces (toolbar, chrome)
- Batched state updates
- Stable references (`useMemo`, `useCallback`)
- Fine-grained subscriptions (`useSyncExternalStore`) in headless hooks
- Lazy calculations and incremental rendering in the data pipeline

### Recommended stack (non-kernel layers)

- **State**: Zustand (headless / tracking — not inside `src/grid`)
- **Virtualization**: Custom windowing in `src/grid`; TanStack Virtual may be used for optional React-only surfaces (e.g. simple lists) but is **not** the kernel grid implementation
- **Memoization**: `React.memo`, `useMemo`, `useCallback` in view/components

---

## Data Flow Summary

```
theme-config    → Tailwind tokens (build time)
component-config → Component Registry (engine init)
display-config  → render guards (per component)
layout-config   → zone slot assignments (render time)

Engine
  ├── resolves full schema (cascade order above)
  ├── runs render pipeline (normalize → paginate → virtualize)
  ├── owns Global Tracking Register ← headless hooks auto-register
  └── executes plugin lifecycle (initialize → reducers/hooks → destroy)

View (HOC)
  ├── calls useToolbar() + useGrid()
  ├── passes state+actions → Toolbar + Grid (pure UI)
  └── exposes useGrid() + tableController to consumer

Consumer
  ├── configures via 4 config files + props
  └── never modifies engine internals
```

---

## Key Constraints

| Rule | Rationale |
|---|---|
| Components never import from Headless or Engine | Pure UI separation |
| Layout modules are sealed | Stable render contract |
| Headless hooks self-register to tracking store | Zero-config observability |
| Engine is sole owner of Global Tracking Register | Single source of truth |
| `overrideComponent` and `extendVariant` are mutually exclusive per entry | No ambiguous resolution |
| `display-config` keys must exist in component registry | Fail-fast on misconfiguration |
| Empty toolbar zones collapse — no reserved whitespace | Clean layout without consumer CSS hacks |
| All plugins are optional | Engine fully functional with zero config |
