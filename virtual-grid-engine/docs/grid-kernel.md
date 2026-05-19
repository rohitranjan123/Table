# Grid kernel contract

`src/grid` is the **imperative rendering kernel** for the virtual-grid-engine (Layer 8 slice). The full 8-layer table product described in `.cursor/skills/virtual-grid-engine/references/architecture.md` is the **target**; only this kernel exists today.

## Scope (in)

| Responsibility | Location |
|----------------|----------|
| Row/column windowing (virtualization) | `src/grid/plugins/virtualization/` |
| Frozen column layout math | `src/grid/plugins/freeze-columns/` |
| Column row spanning (floating anchor cells) | `src/grid/plugins/row-span/` |
| DOM shell, scroll, paint scheduling | `src/grid/engine/` |
| React adapter | `src/grid/VirtualizedGrid.tsx` |

## Multiple grids in one view

Each `<VirtualizedGrid>` (or `createGrid(host)`) is a **fully isolated instance**:

- Own DOM subtree under its host (`data-vgrid-host` + inner `data-vgrid-id`)
- Own scroll container, cell pools, timers, `ResizeObserver`, and pointer handlers
- Own hover/selection state (callbacks are per instance — do not share one React state across grids unless intentional)

Pass a stable `gridId` prop (or rely on React `useId()`). Unmount must call `engine.destroy()` — `VirtualizedGrid` does this in layout-effect cleanup and clears the host with `replaceChildren()`.

There is **no global engine singleton**; the only module-level state is a per-`gridId` dev warning set for forced virtualization.

## Out of scope (until other layers land)

- Config cascade (`theme-config`, `component-config`, `display-config`, `layout-config`)
- Data pipeline: normalize → filter → sort → group → paginate
- Runtime `TablePlugin` registry (initialize / reducers / hooks)
- Headless hooks, HOC, toolbar zones, `useTableEngine`
- Component registry and pure UI components

## Public API

Consumers use exports from `src/index.ts`:

- **React:** `VirtualizedGrid`
- **Imperative:** `createGrid(container, options)` → `GridEngine`
- **Types:** `GridColumn`, `GridCell`, `VirtualizedGridProps`, `FrozenColumns`, etc.

`src/grid/engine/*` internals are `@internal` and not part of the semver surface.

## Inputs

| Option | Role |
|--------|------|
| `width` / `height` | `number` (px), `'100%'` (fill host), or `'auto'` (CSS auto + ResizeObserver). Default `'100%'`. |
| `columns` | Column descriptors (`dataIndex`, `title`, `width`) |
| `rowCount` | Logical row count |
| `rowHeight` | Fixed height or per-index function |
| `headerHeight` | Header band height |
| `getCellContent` | Sync callback `(col, row) → GridCell` for body cells |
| `frozenColumns` | Optional `{ left?, right? }` lists of `dataIndex` |
| `columns[].spanRows` | Optional `true` (merge equal `GridCell.data`) or callback to continue span from row above |
| `rowSpanRevision` | Bump to recompute span map when `getCellContent` ref is stable |
| `virtualization` | Windowing on/off (forced on for huge grids) |
| `width` / `height` | Container size; omit to fill parent + `ResizeObserver` |

## Outputs

- **DOM:** div-based grid with `role="grid"`, layered frozen/scroll regions
- **Events:** `onCellHover`, `onCellSelect`
- **Imperative:** `getScroll()`, `scrollTo()`, `updateOptions()`, `destroy()`

## “Plugins” in this folder

`src/grid/plugins` are **compile-time layout modules** (pure functions, unit-tested). They are imported by the engine integrator — **not** runtime `TablePlugin` instances.

Add new behavior as `src/grid/plugins/<feature>/` + barrel export from `plugins/index.ts`. Touch `GridRenderer` when paint semantics change; touch `GridEngine` only when integrating scroll/layout/input.

## Parallel development lanes

| Lane | Safe to own | Coordinate on |
|------|-------------|-----------------|
| A (grid features) | `plugins/**`, `GridRenderer`, `domCell`, `CellPool`, plugin tests | `types.ts`, `GridEngine` integration |
| B (table product) | `src/theme/`, `headless/`, `view/`, etc. as siblings of `grid/` | Public `src/index.ts` exports |

Do not implement headless or config resolution inside `GridEngine`.

## Scroll performance

- **Row metrics cache** (`createRowMetrics`): prefix-sum row offsets so `getRowTop` / `findRowIndexAtOffset` are O(1) / O(log n) — required for function `rowHeight` at large `rowCount`.
- **RAF coalescing** (`ScrollScheduler`): at most one paint per animation frame.
- **Scroll-active mode**: off-window cells are **always hidden** each frame; only free-pool trimming is deferred until scroll idles (~50ms). Position-only updates apply when cell content is unchanged.
- **Wheel axis lock** clears on direction reversal and on native scrollbar scroll so fast left↔right (or up↔down) does not stick for 1–2s.

## Pre-merge checklist

- [ ] Plugin logic has unit tests
- [ ] Imports use `plugins/index.ts` barrels (no deep cross-plugin paths)
- [ ] Demo: scroll + freeze toggles on large grid (`App.tsx`)
- [ ] Public type changes reflected in `src/index.ts`

## Layer status (target vs today)

| Target layer | Folder | Status |
|--------------|--------|--------|
| theme | `src/theme/` | Missing |
| component | `src/component/` | Missing |
| display | `src/display/` | Missing |
| layout | `src/layout/` | Missing |
| registry | `src/registry/` | Missing |
| headless | `src/headless/` | Missing |
| view | `src/view/` | Missing |
| engine (grid kernel) | `src/grid/` | **Partial** — render + virtualize only |
