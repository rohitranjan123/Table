# NPM Library Engineering Standards — AI Agent Rulebook (Public Library Edition)

## Extends

This document **extends** `frontend-code-pattern-guideline.md`.
All rules defined there apply here without exception.
This document adds rules that are **specific to building a public, community-facing npm library**.

---

## Why Library Standards Are Different

An application serves one team. A public library serves thousands of unknown developers with unknown setups, unknown frameworks, unknown TypeScript configs, and unknown performance budgets.

Every decision you make in a library has amplified consequences:
- A breaking change breaks every consumer.
- A bloated bundle hurts every app using it.
- A confusing API wastes thousands of hours of developer time.
- Poor TypeScript types make the library actively hostile to use.
- Missing documentation means consumers write their own broken abstractions.

**The bar is higher. Every rule here is non-negotiable.**

---

## Core Library Design Principles

| Principle | Rule |
|---|---|
| Consumer First | Every API decision is evaluated from the consumer's perspective, not the author's. |
| Zero Surprise | The library must do exactly what its name and docs say. No hidden behavior. |
| Minimal Footprint | Ship the minimum surface area needed. Every export is a public contract. |
| Explicit over Implicit | No magic defaults that are hard to override. |
| Framework Agnostic (when possible) | Core logic must not be coupled to React, Vue, or any framework unless the library's entire purpose is framework-specific. |
| Stable Public API | Breaking changes require a major version bump. Never break consumers silently. |
| Composable | Small, focused exports that consumers can combine. Not one god-function. |

---

## Folder Structure — Table Engine Library

The folder structure directly mirrors the 8-layer architecture. Every layer is a first-class directory. No layer bleeds into another.

```
/
├── src/
│   │
│   ├── theme/                          # Layer 1 — Design token baseline
│   │   ├── theme-config.ts             # Token definitions (colors, spacing, radius, etc.)
│   │   ├── theme-defaults.ts           # Sensible default values — always exportable
│   │   ├── theme-merger.ts             # Deep-merge logic: consumer partial → full token map
│   │   └── index.ts
│   │
│   ├── component/                      # Layer 2 — Component configuration
│   │   ├── component-config.ts         # Override + new-registration schema
│   │   ├── component-validator.ts      # Validates overrideComponent vs extendVariant mutex rule
│   │   └── index.ts
│   │
│   ├── display/                        # Layer 3 — Show/hide flags
│   │   ├── display-config.ts           # Boolean visibility map per componentId
│   │   ├── display-validator.ts        # Throws warning for unknown componentId keys
│   │   └── index.ts
│   │
│   ├── layout/                         # Layer 4 — Zone placement
│   │   ├── layout-config.ts            # Position + order definitions
│   │   ├── layout-positions.ts         # Typed union of all 12 valid positions
│   │   ├── layout-resolver.ts          # Sorts components per-position by order asc
│   │   └── index.ts
│   │
│   ├── registry/                       # Layer 5 — Component Registry
│   │   ├── component-registry.ts       # Internal map: componentId → component
│   │   ├── registry-defaults.ts        # Ships: search, toolbar, pagination defaults
│   │   ├── registry-merger.ts          # Merges defaults + consumer component-config entries
│   │   └── index.ts
│   │
│   ├── headless/                       # Layer 6 — Stateful logic (hooks only)
│   │   ├── use-sorting.ts
│   │   ├── use-filter.ts
│   │   ├── use-pagination.ts
│   │   ├── use-selection.ts
│   │   ├── use-grouping.ts
│   │   ├── tracking-register.ts        # Singleton — Global Tracking Register
│   │   ├── tracking-types.ts           # TrackingEntry interface + related types
│   │   └── index.ts
│   │
│   ├── view/                           # Layer 7 — Composed table view
│   │   ├── hoc/
│   │   │   └── with-table.tsx          # HOC: wires hooks → layout → pure UI
│   │   ├── layout/                     # Sealed layout modules
│   │   │   ├── table-grid.ts           # Row/cell rendering + virtualization
│   │   │   └── toolbar.ts              # Zone slot layout
│   │   ├── table-config.ts             # Static column/row schema (TableConfig interface)
│   │   └── index.ts
│   │
│   ├── engine/                         # Layer 8 — Runtime core
│   │   ├── grid-engine.ts              # Plugin attachment surface + render pipeline
│   │   ├── plugin-interface.ts         # TablePlugin interface definition
│   │   ├── schema-resolver.ts          # Cascade resolution: table → component → display → layout → plugins
│   │   ├── render-pipeline.ts          # normalize → filter → sort → group → paginate → virtualize → render
│   │   ├── table-context.ts            # TableContext passed to all plugins
│   │   └── index.ts
│   │
│   ├── types/                          # All public-facing TypeScript types
│   │   ├── config.types.ts             # ThemeConfig, ComponentConfig, DisplayConfig, LayoutConfig
│   │   ├── engine.types.ts             # TablePlugin, TableContext, TrackingEntry, EngineProps
│   │   ├── headless.types.ts           # SortState, FilterState, PaginationState, SelectionState
│   │   ├── view.types.ts               # ColumnDef, RowData, TableConfig, VirtualizationConfig
│   │   └── index.ts                    # Single re-export point for all public types
│   │
│   ├── utils/                          # Internal utilities — NEVER exported publicly
│   │   ├── deep-merge.ts               # Used by theme-merger, registry-merger
│   │   ├── assert.ts                   # Internal invariant assertions
│   │   └── internal.ts                 # @internal tag on everything here
│   │
│   ├── constants/                      # Internal constants
│   │   ├── positions.ts                # All 12 layout position string literals
│   │   ├── defaults.ts                 # DEFAULT_TIMEOUT, MAX_COLUMNS, etc.
│   │   └── error-codes.ts              # ERROR_CODES as const map
│   │
│   └── index.ts                        # Root public entry — controls ALL exports
│
├── tests/
│   ├── unit/
│   │   ├── theme/
│   │   ├── component/
│   │   ├── display/
│   │   ├── layout/
│   │   ├── registry/
│   │   ├── headless/
│   │   ├── engine/
│   │   └── utils/
│   ├── integration/
│   │   ├── plugin-lifecycle.test.ts    # attach → initialize → reducers → destroy
│   │   ├── schema-resolution.test.ts   # full cascade resolution order
│   │   ├── render-pipeline.test.ts     # end-to-end pipeline with data
│   │   └── consumer-simulation.test.ts # what a real consumer writes
│   ├── types/
│   │   └── *.test-d.ts                 # Type-level tests for all public APIs
│   └── fixtures/
│       ├── mock-data.ts
│       └── mock-configs.ts
│
├── docs/
│   ├── adr/                            # Architecture Decision Records
│   └── api/                            # Auto-generated from JSDoc
│
├── examples/
│   ├── basic/                          # Minimal working table
│   ├── plugin/                         # Custom plugin usage
│   ├── theme-override/                 # Partial theme config
│   ├── component-override/             # Custom component registration
│   └── advanced/                       # Full config cascade in one app
│
├── scripts/
├── .github/
│   └── workflows/
├── package.json
├── tsconfig.json
├── tsconfig.build.json
├── rollup.config.ts
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

### Folder Rules

- `src/index.ts` is the only file that defines public exports. No other file is imported by consumers.
- Every layer directory owns its own `index.ts`. Cross-layer imports go through `index.ts` only — never deep imports.
- `src/utils/` and `src/constants/` are `@internal`. Zero exports from these reach `src/index.ts`.
- `src/view/layout/` (tableGrid, toolbar) is **sealed**. No consumer or plugin may import from this directory directly.
- `src/headless/tracking-register.ts` is a singleton owned exclusively by the engine. It is not exported.
- `examples/` must be runnable standalone. No pseudocode. Each example must work with `vite` or `node`.

---

## Public API Design Rules

### The Surface Area Rule

**Every export is a forever promise.** Before exporting anything, ask:
- Is this needed by consumers, or is it an implementation detail?
- Can this be changed later without a major version bump?
- Would removing this export break anyone?

If something is internal, do not export it. Mark it `/** @internal */` and keep it out of `index.ts`.

### Naming

- Names must be self-documenting. A consumer should understand what a function does without reading its docs.
- No abbreviations. `validateInput` not `valInp`. `createConnection` not `mkConn`.
- Verb-noun for functions: `parseDate`, `formatCurrency`, `createStore`.
- Noun for classes/factories: `QueryBuilder`, `EventEmitter`, `SchemaValidator`.
- Prefix React hooks with `use`: `useDebounce`, `useVirtualList`.
- Boolean returns prefixed with `is`/`has`/`can`: `isValid`, `hasPermission`.

### Function Signatures

**Options object pattern for anything with more than 2 parameters:**

```ts
// FORBIDDEN: positional hell
function createClient(url: string, timeout: number, retries: number, debug: boolean) {}

// CORRECT: named options, all optional with defaults
function createClient(options: CreateClientOptions): Client {}

interface CreateClientOptions {
  url: string
  timeout?: number       // default: 5000
  retries?: number       // default: 3
  debug?: boolean        // default: false
}
```

**Why:** Options objects are forward-compatible. Adding a new option is not a breaking change. Adding a new positional parameter always is.

### Overloads Over Unions in Parameters

```ts
// AVOID: union parameter types with different behaviors
function process(input: string | string[] | ProcessOptions) {}

// PREFER: explicit overloads consumers can discover via IntelliSense
function process(input: string): Result
function process(input: string[]): Result[]
function process(options: ProcessOptions): Result
```

### Return Types

- Always explicitly type return values of public functions.
- Return consistent shapes. Don't return `null` sometimes and `undefined` other times.
- For operations that can fail, use a `Result<T, E>` type instead of throwing:

```ts
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E }

// Consumer can handle without try/catch
const result = parseDate(input)
if (!result.success) {
  console.error(result.error.message)
  return
}
use(result.data)
```

- For async operations, always return `Promise<T>`. Never mix sync and async in the same function signature.

---

## Architecture Layer Rules

The engine is an 8-layer system. Each layer has a single owner, a single responsibility, and strict import boundaries. Violating any boundary is a breaking architecture decision — not a style preference.

### Layer Boundary Map — Enforced by ESLint `import/no-cycle` and Custom Rules

```
theme/          → imports nothing from this library
component/      → imports from: theme/, types/
display/        → imports from: types/
layout/         → imports from: types/, constants/
registry/       → imports from: component/, types/
headless/       → imports from: registry/, types/, constants/
view/           → imports from: headless/, registry/, layout/, display/, types/
engine/         → imports from: ALL layers (sole integrator)

utils/          → imports nothing from this library (pure utilities)
constants/      → imports nothing from this library (pure values)
types/          → imports nothing from this library (pure type declarations)
```

**Hard rules:**
- `theme/` has zero imports from any other layer. It is the root of the dependency tree.
- `headless/` never imports from `view/` or `engine/`. Hooks are framework-stateful but view-agnostic.
- `view/layout/` (tableGrid, toolbar) is sealed. It is never imported by consumers, plugins, or headless hooks.
- `engine/` is the only layer that imports from all other layers. Nothing else is permitted to do this.
- `utils/` and `constants/` import nothing from the library. They are stateless, framework-free primitives.
- `types/` contains only type declarations — no runtime values, no imports of runtime modules.

**Circular imports are zero-tolerance.** `import/no-cycle` runs on every CI build and blocks merge.

---

### Layer 1 — Theme Config Rules

`src/theme/theme-config.ts`

```ts
// Correct: typed token map, ships with all keys
export interface ThemeConfig {
  colors: Record<string, string>
  spacing: Record<string, string>
  radius: Record<string, string>
  typography: Record<string, string>
  borders: Record<string, string>
  shadows: Record<string, string>
  heights: Record<string, string>
  widths: Record<string, string>
}

// Correct: deep-merge consumer partial over defaults at build time
export function buildThemeConfig(overrides?: Partial<ThemeConfig>): ThemeConfig {
  return deepMerge(THEME_DEFAULTS, overrides ?? {})
}
```

- Consumer always passes `Partial<ThemeConfig>`. The engine fills missing keys from defaults. Never require a full config.
- The resolved config is injected into `TableContext` so plugins and components can read active tokens.
- Tokens flow into Tailwind `theme.extend` at build time. No runtime CSS injection.
- `themeConfig` is never mutated after engine initialization. Treat as frozen after `GridEngine.plugin.themeConfig()` is called.

---

### Layer 2 — Component Config Rules

`src/component/component-config.ts`

```ts
// Correct: discriminated union enforces mutual exclusivity
type ComponentEntry =
  | {
      componentId: string
      overrideComponent: React.ComponentType<ComponentProps>  // replaces default entirely
      style?: ComponentStyleOverride
    }
  | {
      componentId: string
      extendVariant: React.ComponentType<ComponentProps>      // adds alongside default
      style?: ComponentStyleOverride
    }

export type ComponentConfig = Record<string, ComponentEntry>
```

- `overrideComponent` and `extendVariant` are **mutually exclusive per entry**. The TypeScript discriminated union enforces this at compile time. The runtime validator in `component-validator.ts` enforces it at engine init with a thrown `EngineConfigError`.
- `style` is scoped to the component entry. It never modifies global theme tokens.
- New `componentId` values registered here are automatically available to `layout-config.ts` and `display-config.ts`.
- Components registered here are pure UI. They receive state and handlers via props. They must not import from `headless/`, `engine/`, or `registry/`.

---

### Layer 3 — Display Config Rules

`src/display/display-config.ts`

```ts
// Correct: boolean flags only — no logic, no conditions
export type DisplayConfig = Record<string, boolean>

// Example consumer config
export const displayConfig: DisplayConfig = {
  search: true,
  pagination: true,
  toggleColumnWidth: false,
}
```

- `display-config.ts` contains **display-only flags**. Zero logic lives here.
- At engine init, `display-validator.ts` checks every key against the Component Registry. Keys not found in the registry produce a `console.warn` (the one permitted use of console in the engine — init-time misconfiguration only) and are ignored at render time.
- Unknown keys never throw a fatal error — they warn and degrade gracefully. This is the only layer where graceful degradation over hard failure is the rule.

---

### Layer 4 — Layout Config Rules

`src/layout/layout-config.ts`

```ts
// All 12 valid positions — exhaustive union, no string literals in consumer code
export type LayoutPosition =
  | 'topLeft'    | 'topCenter'    | 'topRight'
  | 'leftTop'    | 'leftCenter'   | 'leftBottom'
  | 'rightTop'   | 'rightCenter'  | 'rightBottom'
  | 'bottomLeft' | 'bottomCenter' | 'bottomRight'

export interface LayoutEntry {
  componentId: string
  position: LayoutPosition
  order: number              // ascending — lower number renders first
}

export type LayoutConfig = Record<string, LayoutEntry>
```

- `layout-resolver.ts` sorts all entries at the same position by `order` ascending before render.
- Positions with zero components **collapse**. No empty DOM nodes or whitespace are reserved.
- `order` values must be unique per position. Duplicate `order` values at the same position produce a `console.warn` at engine init.
- `componentId` values in `layout-config.ts` must exist in the Component Registry. Unknown IDs warn at init and are skipped at render.

---

### Layer 5 — Component Registry Rules

`src/registry/component-registry.ts`

```ts
// Internal map — never exported directly
type ComponentRegistry = Map<string, React.ComponentType<ComponentProps>>

// Registry is built once at engine init — immutable after
function buildRegistry(
  defaults: ComponentRegistry,
  consumerConfig: ComponentConfig,
): ComponentRegistry {
  // merge defaults first, then apply consumer overrides
}
```

- The registry is built **once** at `GridEngine` initialization. It is never mutated at render time.
- Default components ship with the library: `search`, `toolbar`, `pagination`. These are overridable.
- Components in the registry are pure UI. They receive all state and handlers via props. They must not call hooks from `headless/` directly — hooks are wired by the HOC in `view/`.
- The registry is **internal**. Consumers interact with it only through `component-config.ts`. The registry type is never exported.

---

### Layer 6 — Headless Module Rules

`src/headless/`

```ts
// Correct: each hook owns one concern, returns typed state + typed actions
export function useSorting(configuration: SortingConfig): SortingHookResult {
  const [sortState, dispatch] = useReducer(sortingReducer, initialSortState)

  // Self-register to Global Tracking Register on mount
  useEffect(() => {
    trackingRegister.register({
      componentId: 'sorting',
      state: sortState,
      actions: { onSort, resetSort },
      currentValue: sortState.column,
      previousValue: undefined,
    })
    return () => trackingRegister.unregister('sorting')
  }, [])

  return { sortState, onSort, resetSort }
}
```

**Hook rules:**
- Every headless hook is built on `useReducer` internally for predictable state transitions.
- Every headless hook subscribes to the Global Tracking Register via `useSyncExternalStore` for cross-hook state visibility.
- Every headless hook **self-registers on mount and unregisters on unmount**. No manual wiring by the consumer or the HOC.
- Hooks return only typed state and typed action handlers. Never raw dispatch. Never internal reducer shape.
- Hooks clean up all subscriptions and registrations in their `useEffect` cleanup. No leaks.
- Hooks never import from `view/`, `engine/`, or `registry/`. They are stateful logic only.

**Global Tracking Register rules:**
- The register is a singleton owned exclusively by `engine/`.
- It is not exported publicly. Consumers interact with it only through `tableController` prop and `useTableEngine`.
- Plugins read from the register via `TableContext`. They do not write to it directly.

```ts
// TrackingEntry — exported type, internal value
export interface TrackingEntry {
  componentId: string
  state: unknown
  actions: Record<string, (...arguments: unknown[]) => unknown>
  currentValue: unknown
  previousValue: unknown
}
```

---

### Layer 7 — View Rules

`src/view/`

**HOC rules:**
- The HOC is the only place that calls headless hooks and passes results as props to pure UI components.
- The HOC never contains business logic. It wires — it does not transform.
- `useGrid()` is exposed externally via the HOC for consumer control. This is the only hook exposed at the consumer API boundary.

```ts
// Correct: HOC wires hooks → props → components
function withTable<TProps extends TableBaseProps>(
  WrappedComponent: React.ComponentType<TProps>,
): React.ComponentType<TProps> {
  return function TableHoc(props: TProps): React.ReactElement {
    const toolbarState = useToolbar()
    const gridState = useGrid(props.tableConfig)

    return (
      <WrappedComponent
        {...props}
        toolbar={toolbarState}
        grid={gridState}
      />
    )
  }
}
```

**Sealed layout modules (`view/layout/`) rules:**
- `table-grid.ts` and `toolbar.ts` are sealed. Their internal structure is not overridable.
- Consumers never import from `view/layout/` directly. This path is excluded from the `exports` map.
- Plugins never import from `view/layout/`. They interact with rendering via the plugin interface (`reducers`, `hooks`, `components`).
- Any change to `view/layout/` internals that preserves the external render contract is not a breaking change.

**`table-config.ts` rules:**
- This is a static schema consumed by `tableGrid.ts`. It defines columns, row key, default sort, and virtualization config.
- It is consumed at `useGrid()` call time. It must be stable across renders — wrap in `useMemo` if constructed inline.

```ts
export interface TableConfig {
  columns: ColumnDef[]
  rowKey: string                         // unique key per row — required
  defaultSort?: SortConfig
  virtualization?: VirtualizationConfig
}
```

---

### Layer 8 — Engine Rules

`src/engine/grid-engine.ts`

**Plugin attachment rules:**
- All 4 plugin attachment methods are optional: `themeConfig`, `componentConfig`, `displayConfig`, `layoutConfig`.
- The engine is fully functional with zero plugin configuration — defaults apply.
- Plugins attach before the first render. Attaching after first render is permitted but triggers a re-resolution of the schema cascade — document this cost.

```ts
// Correct: fluent plugin attachment
GridEngine
  .plugin.themeConfig(themeConfig)
  .plugin.componentConfig(componentConfig)
  .plugin.displayConfig(displayConfig)
  .plugin.layoutConfig(layoutConfig)
```

**`TablePlugin` interface rules:**
- Every plugin must have a unique `id`. Duplicate plugin IDs throw `EngineConfigError` at init.
- `initialize` receives `TableContext` and must be synchronous. No async initialization.
- `destroy` must clean up all subscriptions, timers, and references. Memory leaks in plugins are the plugin author's responsibility but the engine must call `destroy` on unmount.
- `reducers`, `hooks`, and `components` are all optional. A plugin may implement any subset.

```ts
export interface TablePlugin {
  id: string
  initialize?: (context: TableContext) => void
  reducers?: ReducerMap
  hooks?: HookMap
  components?: ComponentMap
  destroy?: () => void
}
```

**Schema resolution order — enforced, non-configurable:**

```
1. table-config.ts          static column/row schema
2. component-config.ts      component overrides + new registrations
3. display-config.ts        show/hide flags
4. layout-config.ts         zone placement
5. Plugin transforms        dynamic mutations via reducers/hooks
6. Final resolved config
```

This order is fixed. No plugin or consumer config may change the resolution sequence.

**Render pipeline — enforced order:**

```
Raw Data
   ↓  Normalization      (shape validation, key extraction)
   ↓  Column Processing  (visible columns, widths, pin state)
   ↓  Plugin Processing  (plugin reducers run here)
   ↓  Filtering          (useFilter state applied)
   ↓  Sorting            (useSorting state applied)
   ↓  Grouping           (useGrouping state applied)
   ↓  Pagination         (usePagination state applied)
   ↓  Virtualization     (grid kernel windowing in `src/grid/plugins/virtualization/`)
   ↓  Renderer           (pure UI output)
```

Each stage is a pure function: `(data, config) => data`. No stage mutates its input. No stage reads from stages below it.

---

### Engine Public API Rules

#### Props

All engine props are typed. No `any`. No optional props used as required at runtime.

```ts
export interface TableEngineProps {
  rowData: RowData[]                                           // required
  column: ColumnDef[]                                          // required
  virtualization?: boolean                                     // default: true
  tableStyle?: TableStyleOverride                             // optional
  toolbarStyle?: ToolbarStyleOverride                         // optional
  errorComponent?: React.ReactNode                            // optional
  emptyComponent?: React.ReactNode                            // optional
  loadingComponent?: React.ReactNode                          // optional
  tableController?: (currentState: TableControllerState) => void  // optional callback
}
```

- `rowData` and `column` are the only required props. All others degrade gracefully with defaults.
- `tableController` is a callback — not a ref, not an imperative handle. It receives current state on every relevant state change. It must not trigger re-renders.

#### `useTableEngine`

```ts
// Correct: works like useState — typed read + write of engine state
const { gridValue, setGridValue } = useTableEngine()
```

- `useTableEngine` is the only consumer-facing hook. It is the external API for reading and writing engine state from outside the table boundary.
- It must not be called inside a headless hook or inside the HOC. It is a consumer-level API only.
- It subscribes via `useSyncExternalStore` to avoid tearing.

#### Exports Map for Engine

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts"
  },
  "./theme": {
    "import": "./dist/theme/index.js",
    "require": "./dist/theme/index.cjs",
    "types": "./dist/theme/index.d.ts"
  },
  "./types": {
    "types": "./dist/types/index.d.ts"
  }
}
```

`view/layout/`, `engine/`, `registry/`, `headless/tracking-register`, and `utils/` are **not in the exports map**. They are unreachable by consumers by design.

---

### Configuration Cascade Rules

The 4 config layers form a strict cascade. Every rule below is non-negotiable:

| Rule | Enforcement |
|---|---|
| `overrideComponent` and `extendVariant` are mutually exclusive per entry | TypeScript discriminated union + runtime validator |
| `display-config` keys must exist in the Component Registry | Runtime validator at engine init — warns, does not throw |
| Unknown `layout-config` `componentId` values are skipped | Runtime validator at engine init — warns, does not throw |
| Duplicate `order` values at the same layout position warn at init | Runtime validator |
| Duplicate plugin `id` values throw at init | `EngineConfigError` thrown |
| Schema resolution order is fixed | Hardcoded in `schema-resolver.ts` — not configurable |
| `themeConfig` is frozen after engine init | `Object.freeze()` applied after `buildThemeConfig()` |
| The Global Tracking Register is owned by the Engine only | Not exported — no consumer or plugin can write to it directly |

---

## Architecture Anti-Patterns

These are specific to the table engine architecture, in addition to the general anti-pattern table.

| Anti-Pattern | Why It's Forbidden |
|---|---|
| Component importing from `headless/` | Components are pure UI. Hooks belong in the HOC only. |
| Headless hook importing from `view/` | Hooks are view-agnostic. This creates circular dependency. |
| Plugin importing from `view/layout/` | Layout modules are sealed. Plugins use the plugin interface only. |
| Consumer importing from `view/layout/` | Sealed — not in the exports map. Path is unreachable by design. |
| Adding logic to `display-config.ts` | Display config is flags only. Logic belongs in the engine or headless layer. |
| Mutating `themeConfig` after engine init | Theme is frozen post-init. Mutation causes undefined rendering behavior. |
| Manual registration to Global Tracking Register | Hooks self-register. Manual registration breaks the auto-wire contract. |
| Calling `destroy()` manually on a plugin | The engine owns lifecycle. Consumers call `GridEngine.plugin.remove(id)`. |
| Async `initialize()` in a plugin | Engine init is synchronous. Async plugin init causes race conditions. |
| Two plugins with the same `id` | Engine throws `EngineConfigError`. IDs must be globally unique. |
| Skipping schema resolution order | Resolution order is hardcoded. Reordering breaks config cascade semantics. |
| Render pipeline stage mutating its input | Each stage is pure. Mutation causes cross-stage state corruption. |

---

### Non-Negotiable Rules (Extended from Base)

- Export all types that consumers need to use the library correctly. Never force consumers to use `any` or write their own types.
- Never use `any` internally. Never let `any` leak into public types.
- Use `unknown` at system boundaries. Narrow with type guards before use.
- Generic types must have constraints. `<T>` with no constraint is forbidden on public APIs.
- All exported interfaces are prefixed consistently (do not prefix with `I`; use descriptive names).

### Public Type Export Pattern

```ts
// src/types/index.ts — single source of all public types

export type { CreateClientOptions } from '../core/client'
export type { Result } from '../core/result'
export type { ParseOptions, ParseResult } from '../core/parser'

// src/index.ts — re-exports types alongside implementations
export type { CreateClientOptions, Result, ParseOptions, ParseResult } from './types'
export { createClient } from './core/client'
export { parse } from './core/parser'
```

### Generic Constraints

```ts
// FORBIDDEN: unconstrained generic
function merge<T>(a: T, b: T): T

// CORRECT: constrained to objects
function merge<T extends Record<string, unknown>>(a: T, b: T): T

// CORRECT: with meaningful constraint name
function serialize<TData extends Serializable>(data: TData): string
```

### Strict tsconfig for Library Build

```json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "bundler",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  }
}
```

`exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` are required for library-grade type safety. They catch bugs that standard `strict` mode misses.

---

## Bundle and Package Rules

### Package.json — Required Fields

```json
{
  "name": "@scope/package-name",
  "version": "0.0.1",
  "description": "One sentence. What it does, not what it is.",
  "license": "MIT",
  "author": "Name <email> (https://website)",
  "repository": {
    "type": "git",
    "url": "https://github.com/org/repo"
  },
  "homepage": "https://your-docs-site.com",
  "bugs": "https://github.com/org/repo/issues",
  "keywords": ["relevant", "searchable", "terms"],

  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },

  "files": ["dist", "README.md", "CHANGELOG.md", "LICENSE"],

  "sideEffects": false,

  "peerDependencies": {
    "react": ">=17.0.0"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true }
  }
}
```

### `exports` Map is Mandatory

Package consumers use modern bundlers. The `exports` field controls exactly what they get. Without it, consumers can import internal files directly — which is a breaking change waiting to happen.

```json
"exports": {
  ".": { ... },
  "./react": {
    "import": "./dist/react/index.js",
    "require": "./dist/react/index.cjs",
    "types": "./dist/react/index.d.ts"
  },
  "./utils": { ... }
}
```

Never allow `"exports": "*"`. Explicit exports only.

### Bundle Rules

- `sideEffects: false` is mandatory. Enables tree-shaking. If the library has side effects, list the specific files.
- Target ES2020 minimum. Do not ship ES5. Consumers' bundlers handle transpilation.
- Ship both ESM (`.js`) and CJS (`.cjs`) for maximum compatibility.
- Ship declaration maps (`*.d.ts.map`) so consumers can "Go to definition" and see source.
- Ship source maps for debuggability.
- Do NOT bundle peer dependencies. They must remain external in your bundler config.

### Bundle Size Budget

| Library Type | Max Gzipped Size |
|---|---|
| Utility library (no framework) | < 5 KB |
| React hook library | < 15 KB |
| Full UI component library | Document per component |

Check size on every PR with `size-limit`:

```json
// package.json
"size-limit": [
  { "path": "dist/index.js", "limit": "5 KB" }
]
```

### Dependency Rules

| Type | Rule |
|---|---|
| `dependencies` | Only packages that consumers must have to use the library. Absolute minimum. |
| `devDependencies` | Build tools, test runners, linters. Never shipped. |
| `peerDependencies` | Packages the consumer already has (React, Vue, etc.). Declare with a version range. |
| `optionalDependencies` | Almost never. Document why if used. |

**Never put React in `dependencies` if the library is React-optional.** It ships two copies of React into consumer apps.

---

## Versioning and Breaking Changes

### Semantic Versioning — Enforced

```
MAJOR.MINOR.PATCH

MAJOR → Breaking change. Any of:
  - Removed export
  - Changed function signature (parameters or return type)
  - Changed behavior that consumers relied on
  - Raised minimum peer dependency version

MINOR → New feature. Backward-compatible.
  - New export added
  - New optional parameter added
  - New option added to existing options object

PATCH → Bug fix. Backward-compatible.
  - Fix behavior to match documented contract
  - Internal refactor with no API change
```

### Deprecation Before Removal

Never remove an API without a deprecation cycle:

```ts
/**
 * @deprecated Use `createClient` instead. Will be removed in v3.0.
 */
export function initClient(url: string) {
  console.warn('[lib-name] initClient is deprecated. Use createClient instead.')
  return createClient({ url })
}
```

1. Mark deprecated in MINOR release.
2. Log warning at runtime.
3. Remove in next MAJOR release.
4. Document the migration path in CHANGELOG.

### CHANGELOG.md — Required Format

```md
## [2.1.0] - 2025-05-10

### Added
- `useDebounce` hook with configurable delay and immediate option

### Changed
- `parseDate` now accepts ISO 8601 strings in addition to Date objects

### Deprecated
- `initClient` — use `createClient` instead (removed in v3.0)

### Fixed
- `formatCurrency` no longer throws on zero values

### Breaking (Major only)
- Removed `legacyMode` option from `createClient`
```

Never skip the CHANGELOG. It is not optional. It is the contract between you and your community.

---

## Error Design Rules

### Typed Errors — Mandatory

Never throw generic `Error` from a library. Consumers need to distinguish your errors from other errors.

```ts
// src/errors/index.ts

export class LibValidationError extends Error {
  readonly code = 'VALIDATION_ERROR'
  readonly field: string

  constructor(message: string, field: string) {
    super(message)
    this.name = 'LibValidationError'
    this.field = field
    Object.setPrototypeOf(this, LibValidationError.prototype) // Required for extends Error in TS
  }
}

export class LibNetworkError extends Error {
  readonly code = 'NETWORK_ERROR'
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'LibNetworkError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, LibNetworkError.prototype)
  }
}
```

**Consumer can now narrow errors precisely:**

```ts
import { LibValidationError, LibNetworkError } from 'your-lib'

try {
  await client.submit(data)
} catch (error) {
  if (error instanceof LibValidationError) {
    showFieldError(error.field, error.message)
  } else if (error instanceof LibNetworkError) {
    retryIfAppropriate(error.statusCode)
  } else {
    throw error // re-throw unknown errors
  }
}
```

### Error Code Constants — Export Them

```ts
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]
```

Consumers can switch on `error.code` without importing the class — useful in environments where `instanceof` breaks across module boundaries.

---

## Testing Standards — Library Grade

### Test Matrix

| Layer | Tool | What to Test |
|---|---|---|
| Core logic | Vitest / Jest | Pure functions, edge cases, error cases |
| React hooks | `@testing-library/react` | Hook state, effects, cleanup |
| React components | `@testing-library/react` | Rendering, interaction, accessibility |
| Type safety | `tsd` or `expect-type` | Public types are correct and stable |
| Bundle | `size-limit` | Size budget not exceeded |
| Integration | Vitest + real consumers | Real-world usage patterns |

### Type Testing — Non-Negotiable

Types are part of your public API. Test them.

```ts
// tests/types/client.test-d.ts
import { expectType, expectError } from 'tsd'
import { createClient, type Client } from '../../src'

// Should accept valid options
expectType<Client>(createClient({ url: 'https://api.example.com' }))

// Should reject invalid input
expectError(createClient({ url: 123 }))

// Should reject missing required field
expectError(createClient({}))
```

### Edge Case Coverage

A library must handle what applications ignore:

```ts
describe('parseDate', () => {
  it('handles empty string', () => {})
  it('handles null input', () => {})
  it('handles undefined input', () => {})
  it('handles invalid date string', () => {})
  it('handles timezone edge cases', () => {})
  it('handles leap year edge cases', () => {})
  it('handles maximum Date value', () => {})
})
```

Application code can assume sanitized input. Library code cannot.

### Consumer Simulation Tests

Write tests that simulate how a real consumer uses the library — not how you built it:

```ts
// tests/integration/real-world-usage.test.ts

it('works end-to-end for a typical use case', async () => {
  // Simulate exactly what a consumer would write in their app
  const client = createClient({ url: TEST_URL })
  const result = await client.query('users', { limit: 10 })

  expect(result.data).toHaveLength(10)
  expect(result.data[0]).toMatchObject({ id: expect.any(String) })
})
```

---

## Documentation Standards — Library Grade

### README.md Structure — Mandatory Order

```md
# package-name

One-sentence description of what this does.

## Install
## Quick Start        ← Working code. Copy-paste ready. First thing after install.
## Why This Library   ← Problem it solves. When to use it. When NOT to use it.
## API Reference      ← Every export, every option, every type.
## Examples           ← Real-world scenarios, not trivial demos.
## TypeScript         ← How types work, how to extend them.
## Changelog          ← Link to CHANGELOG.md.
## Contributing       ← Link to CONTRIBUTING.md.
## License
```

### API Reference — Every Export Must Document

```ts
/**
 * Creates a configured client instance.
 *
 * @param options - Configuration options for the client.
 * @param options.url - Base URL for all requests. Required.
 * @param options.timeout - Request timeout in milliseconds. Default: `5000`.
 * @param options.retries - Number of retry attempts on network failure. Default: `3`.
 *
 * @returns A configured `Client` instance.
 *
 * @throws {LibValidationError} If `url` is not a valid URL.
 *
 * @example
 * ```ts
 * const client = createClient({ url: 'https://api.example.com', timeout: 3000 })
 * ```
 *
 * @since 1.0.0
 */
export function createClient(options: CreateClientOptions): Client
```

Every `@param`, `@returns`, `@throws`, `@example`, and `@since` is required on every public export.

### Document What It Does NOT Do

```md
## Limitations

- This library does not handle authentication. Attach auth headers via the `beforeRequest` interceptor.
- This library requires a Promise-compatible environment. No IE11 support.
- Retry logic applies to network errors only, not 4xx responses.
```

Undocumented limitations become bug reports.

---

## React-Specific Library Rules

### Hook Design Rules

- Every hook must clean up after itself. Subscriptions, timers, and listeners must return a cleanup function from `useEffect`.
- Hooks must be idempotent. Calling with the same props must produce the same behavior.
- Hooks must not have required internal state that consumers cannot control. Support controlled and uncontrolled modes.
- Never read from `localStorage`, `sessionStorage`, or `document` directly in SSR-unsafe hooks without a guard.

### SSR Safety — Non-Negotiable

```ts
// FORBIDDEN: breaks SSR (Next.js, Remix, etc.)
const width = window.innerWidth

// CORRECT: safe in SSR
const width = typeof window !== 'undefined' ? window.innerWidth : 0

// BETTER: explicit SSR guard utility
function isBrowser(): boolean {
  return typeof window !== 'undefined'
}
```

Every browser API access must be guarded. Consumers using Next.js or any SSR framework will get runtime crashes otherwise.

### Controlled and Uncontrolled Pattern

```tsx
interface UseToggleOptions {
  defaultOpen?: boolean  // Uncontrolled: initial value
  open?: boolean         // Controlled: consumer manages state
  onOpenChange?: (open: boolean) => void
}

function useToggle(options: UseToggleOptions = {}) {
  const isControlled = options.open !== undefined
  const [internalOpen, setInternalOpen] = useState(options.defaultOpen ?? false)

  const open = isControlled ? options.open! : internalOpen

  const toggle = () => {
    if (!isControlled) setInternalOpen(prev => !prev)
    options.onOpenChange?.(!open)
  }

  return { open, toggle }
}
```

Forcing consumers into either controlled or uncontrolled mode is a design failure.

### Component API — Compound Pattern for Complex UI

```tsx
// Preferred for complex components: compound pattern
<Select>
  <Select.Trigger>Choose one</Select.Trigger>
  <Select.Content>
    <Select.Item value="a">Option A</Select.Item>
    <Select.Item value="b">Option B</Select.Item>
  </Select.Content>
</Select>

// Instead of: god-component with 20 props
<Select
  options={[...]}
  renderTrigger={...}
  renderItem={...}
  triggerClassName={...}
  contentClassName={...}
/>
```

Compound components are composable. God components lock consumers into your implementation decisions.

---

## Release and CI Pipeline Rules

### Required CI Checks — All Must Pass Before Merge

```yaml
# .github/workflows/ci.yml
jobs:
  validate:
    steps:
      - lint          # ESLint + Prettier — zero warnings
      - typecheck     # tsc --noEmit on strict config
      - test          # All tests pass
      - test:types    # tsd type tests pass
      - build         # Bundle builds without errors
      - size          # size-limit budget not exceeded
```

### Release Process

Use `changesets` or `semantic-release` for automated, traceable releases. Manual releases are forbidden.

```
1. Developer creates PR with changeset file describing the change.
2. CI validates the PR.
3. PR merged to main.
4. Release bot opens a Version PR with updated CHANGELOG and version bump.
5. Maintainer merges Version PR.
6. CI publishes to npm automatically.
```

Never publish to npm from a local machine. Always publish from CI.

### Required npm Publish Config

```json
"publishConfig": {
  "access": "public",
  "registry": "https://registry.npmjs.org"
}
```

---

## Security Rules — Library Edition

- Never log consumer data. Libraries must be silent by default. Add a `debug` option if logging is needed, defaulting to `false`.
- Never import `fs`, `path`, `crypto`, or any Node built-in without documenting that the library requires Node and documenting the minimum version.
- Never eval, new Function, or construct code from strings.
- Audit dependencies with `npm audit` on every CI run.
- Pin devDependencies to exact versions to ensure reproducible builds. Use ranges for peerDependencies.
- Provide a `browser` field or condition in `exports` if behavior differs between Node and browser.

---

## ESLint Rules — Library Edition

This section defines the complete ESLint configuration and every naming/code-quality rule that must be enforced for a public npm library. All rules are set to `error`, not `warn`. Warnings are ignored in CI. If it matters, it must be an error.

---

### ESLint Config — Flat Config (eslint.config.ts)

```ts
// eslint.config.ts
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import unicorn from 'eslint-plugin-unicorn'
import sonarjs from 'eslint-plugin-sonarjs'
import jsdoc from 'eslint-plugin-jsdoc'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import n from 'eslint-plugin-n'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      unicorn,
      sonarjs,
      jsdoc,
      import: importPlugin,
      'react-hooks': reactHooks,
      n,
    },
    rules: {
      // ─── Naming ────────────────────────────────────────────────
      // (see full naming rules section below)

      // ─── TypeScript ────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/explicit-function-return-type': ['error', {
        allowExpressions: false,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/prefer-readonly-parameter-types': 'off', // too strict for library params
      '@typescript-eslint/no-redundant-type-constituents': 'error',
      '@typescript-eslint/no-duplicate-type-constituents': 'error',

      // ─── Code Quality ──────────────────────────────────────────
      'no-console': 'error',               // Libraries must be silent
      'no-debugger': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-param-reassign': 'error',        // Arguments are immutable
      'no-shadow': 'off',                  // Use TS version
      '@typescript-eslint/no-shadow': 'error',
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
      'no-nested-ternary': 'error',
      'no-unneeded-ternary': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'default-case': 'error',
      'no-fallthrough': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // ─── Import Rules ──────────────────────────────────────────
      'import/no-cycle': 'error',
      'import/no-self-import': 'error',
      'import/no-default-export': 'error',       // Named exports only in libraries
      'import/no-mutable-exports': 'error',
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: ['**/*.test.ts', '**/*.spec.ts', '**/*.test-d.ts', 'eslint.config.ts'],
      }],
      'import/order': ['error', {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      }],

      // ─── Unicorn (Code Style Enforcement) ─────────────────────
      'unicorn/filename-case': ['error', {
        cases: { kebabCase: true },                // Files: kebab-case.ts
      }],
      'unicorn/prevent-abbreviations': ['error', {
        replacements: {
          args: { arguments: true },
          cb: { callback: true },
          ctx: { context: true },
          err: { error: true },
          evt: { event: true },
          fn: { function: true },
          idx: { index: true },
          len: { length: true },
          msg: { message: true },
          obj: { object: true },
          param: { parameter: true },
          params: { parameters: true },
          prop: { property: true },
          props: false,                            // Allow "props" in React contexts
          ref: false,                              // Allow "ref" in React
          req: { request: true },
          res: { response: true },
          ret: { returnValue: true },
          str: { string: true },
          val: { value: true },
          num: { number: true },
          bool: { boolean: true },
          temp: { temporary: true },
          tmp: { temporary: true },
          util: { utility: true },
          utils: { utilities: true },
        },
      }],
      'unicorn/no-array-for-each': 'error',
      'unicorn/no-for-loop': 'error',
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-index-of': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/prefer-string-slice': 'error',
      'unicorn/prefer-ternary': 'error',
      'unicorn/no-null': 'off',                   // null is valid in library APIs
      'unicorn/prefer-module': 'error',
      'unicorn/prefer-node-protocol': 'error',    // import 'node:fs' not 'fs'
      'unicorn/throw-new-error': 'error',
      'unicorn/no-useless-undefined': 'error',
      'unicorn/consistent-function-scoping': 'error',
      'unicorn/no-lonely-if': 'error',

      // ─── SonarJS (Cognitive Complexity) ───────────────────────
      'sonarjs/cognitive-complexity': ['error', 10],  // Max complexity per function
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/no-collapsible-if': 'error',
      'sonarjs/no-redundant-boolean': 'error',
      'sonarjs/prefer-immediate-return': 'error',

      // ─── JSDoc (Public API documentation) ─────────────────────
      'jsdoc/require-jsdoc': ['error', {
        publicOnly: true,
        require: {
          FunctionDeclaration: true,
          MethodDefinition: true,
          ClassDeclaration: true,
          ArrowFunctionExpression: false,         // Only named exports need JSDoc
        },
      }],
      'jsdoc/require-param': 'error',
      'jsdoc/require-param-description': 'error',
      'jsdoc/require-param-type': 'off',          // Types come from TypeScript
      'jsdoc/require-returns': 'error',
      'jsdoc/require-returns-description': 'error',
      'jsdoc/require-throws': 'error',
      'jsdoc/require-example': 'error',
      'jsdoc/check-param-names': 'error',
      'jsdoc/check-tag-names': 'error',

      // ─── React Hooks (if applicable) ──────────────────────────
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // Relax some rules in test files
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test-d.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
    },
  },
)
```

---

### Naming Rules — Complete Reference

Every identifier in the codebase must follow these rules. Rules are enforced by `@typescript-eslint/naming-convention`.

```ts
// Add inside the rules object in eslint.config.ts
'@typescript-eslint/naming-convention': [
  'error',

  // ─── Default: camelCase for everything not overridden below ───
  {
    selector: 'default',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Variables ────────────────────────────────────────────────
  {
    selector: 'variable',
    format: ['camelCase', 'UPPER_CASE'],   // UPPER_CASE for module-level constants
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Unused variables (must be prefixed with _) ───────────────
  {
    selector: 'variable',
    modifiers: ['unused'],
    format: ['camelCase'],
    leadingUnderscore: 'require',
  },

  // ─── Functions ────────────────────────────────────────────────
  // Regular functions: camelCase, verb-noun pattern enforced by convention
  {
    selector: 'function',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Parameters ───────────────────────────────────────────────
  // All parameters: camelCase, no abbreviations (enforced by unicorn/prevent-abbreviations)
  {
    selector: 'parameter',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // Unused parameters: must be prefixed with _
  {
    selector: 'parameter',
    modifiers: ['unused'],
    format: ['camelCase'],
    leadingUnderscore: 'require',
    trailingUnderscore: 'forbid',
  },

  // ─── Properties ───────────────────────────────────────────────
  {
    selector: 'objectLiteralProperty',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Class Members ────────────────────────────────────────────
  {
    selector: 'classProperty',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // Private class members: # (native private) is preferred over underscore
  // If using TypeScript private keyword:
  {
    selector: 'classProperty',
    modifiers: ['private'],
    format: ['camelCase'],
    leadingUnderscore: 'forbid',           // Use # syntax instead, not _private
  },

  // Static readonly class properties: UPPER_CASE
  {
    selector: 'classProperty',
    modifiers: ['static', 'readonly'],
    format: ['UPPER_CASE'],
  },

  // Class methods: camelCase
  {
    selector: 'classMethod',
    format: ['camelCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Classes ──────────────────────────────────────────────────
  // PascalCase, noun-only (enforced by convention, not lint rule)
  {
    selector: 'class',
    format: ['PascalCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Interfaces ───────────────────────────────────────────────
  // PascalCase, NO 'I' prefix
  {
    selector: 'interface',
    format: ['PascalCase'],
    custom: {
      regex: '^(?!I[A-Z])',                // Forbid IFoo, IBar
      match: true,
    },
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Type Aliases ─────────────────────────────────────────────
  {
    selector: 'typeAlias',
    format: ['PascalCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Generic Type Parameters ──────────────────────────────────
  // Must be PascalCase and descriptive (not single letter like T, K, V)
  // Exception: single-letter allowed only on the most generic utilities
  {
    selector: 'typeParameter',
    format: ['PascalCase'],
    // Prefer: TData, TError, TResult, TKey, TValue
    // Avoid: T, K, V (only acceptable in stdlib-style generics)
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Enums ────────────────────────────────────────────────────
  {
    selector: 'enum',
    format: ['PascalCase'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // Enum members: UPPER_CASE
  {
    selector: 'enumMember',
    format: ['UPPER_CASE'],
    leadingUnderscore: 'forbid',
    trailingUnderscore: 'forbid',
  },

  // ─── Constants ────────────────────────────────────────────────
  // Module-level const: UPPER_CASE
  // Function-scoped const: camelCase
  {
    selector: 'variable',
    modifiers: ['const', 'global'],
    format: ['UPPER_CASE', 'camelCase'],
  },

  // ─── Exported Constants ───────────────────────────────────────
  {
    selector: 'variable',
    modifiers: ['exported', 'const'],
    format: ['UPPER_CASE', 'camelCase'],   // camelCase allowed for exported functions-as-values
  },

  // ─── Boolean Variables ────────────────────────────────────────
  // Must start with is, has, can, should, will, did
  {
    selector: 'variable',
    types: ['boolean'],
    format: ['camelCase'],
    prefix: ['is', 'has', 'can', 'should', 'will', 'did'],
  },

  // Boolean parameters
  {
    selector: 'parameter',
    types: ['boolean'],
    format: ['camelCase'],
    prefix: ['is', 'has', 'can', 'should', 'will', 'did'],
  },
],
```

---

### Naming Rules — Human-Readable Reference

The table below is the canonical naming reference for every identifier type. It is derived from the ESLint config above and exists so AI agents and developers can verify decisions without reading the config.

| Identifier | Format | Prefix / Suffix | Example |
|---|---|---|---|
| Variable (regular) | camelCase | none | `userProfile`, `fetchedData` |
| Variable (boolean) | camelCase | `is` / `has` / `can` / `should` / `will` / `did` | `isLoading`, `hasError`, `canRetry` |
| Variable (module const) | UPPER_CASE | none | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| Variable (unused) | camelCase | `_` prefix required | `_unusedParam` |
| Function | camelCase | verb-noun | `parseDate`, `createClient`, `validateInput` |
| Function (React hook) | camelCase | `use` prefix required | `useDebounce`, `useVirtualList` |
| Function (predicate/guard) | camelCase | `is` / `has` / `can` prefix | `isValidUrl`, `hasPermission` |
| Parameter (regular) | camelCase | none | `userId`, `requestOptions` |
| Parameter (boolean) | camelCase | `is` / `has` / `can` / `should` | `isRequired`, `shouldRetry` |
| Parameter (unused) | camelCase | `_` prefix required | `_context`, `_event` |
| Class | PascalCase | noun-only | `QueryBuilder`, `EventEmitter` |
| Interface | PascalCase | NO `I` prefix | `CreateClientOptions`, `ParseResult` |
| Type alias | PascalCase | none | `Result`, `RequestState` |
| Generic type param | PascalCase | descriptive, not single-letter | `TData`, `TError`, `TResult`, `TKey` |
| Enum | PascalCase | none | `LogLevel`, `ErrorCode` |
| Enum member | UPPER_CASE | none | `LOG_LEVEL.DEBUG`, `ERROR_CODE.NOT_FOUND` |
| Class property (public) | camelCase | none | `this.baseUrl`, `this.timeout` |
| Class property (static readonly) | UPPER_CASE | none | `Client.DEFAULT_TIMEOUT` |
| Class method | camelCase | verb-noun | `this.sendRequest()`, `this.parseResponse()` |
| File name | kebab-case | none | `create-client.ts`, `use-debounce.ts` |
| Test file | kebab-case | `.test.ts` suffix | `create-client.test.ts` |
| Type test file | kebab-case | `.test-d.ts` suffix | `create-client.test-d.ts` |

---

### Naming Anti-Patterns — Forbidden

```ts
// ── Abbreviations ───────────────────────────────────────────────────────
const cb = () => {}              // FORBIDDEN → callback
const fn = () => {}              // FORBIDDEN → handler, processor, or specific name
const err = new Error()          // FORBIDDEN → error
const res = await fetch(...)     // FORBIDDEN → response
const req = buildRequest(...)    // FORBIDDEN → request
const ctx = getContext()         // FORBIDDEN → context
const idx = items.indexOf(x)     // FORBIDDEN → index
const len = items.length         // FORBIDDEN → length
const msg = 'Something failed'   // FORBIDDEN → message
const val = getValue()           // FORBIDDEN → value
const num = parseInt(str)        // FORBIDDEN → count, total, or specific name
const tmp = transform(data)      // FORBIDDEN → temporary (still vague — use specific name)

// ── Vague names ──────────────────────────────────────────────────────────
const data = await fetch(...)     // FORBIDDEN → userProfile, orderList, etc.
const result = process(input)     // FORBIDDEN → parsedDate, validationResult, etc.
const info = getDetails()         // FORBIDDEN → userDetails, connectionInfo, etc.
const item = list[0]              // FORBIDDEN → firstUser, topResult, etc.
const obj = buildConfig()         // FORBIDDEN → clientConfig, retryOptions, etc.
const thing = getNext()           // FORBIDDEN — always use domain-specific name
function doStuff() {}             // FORBIDDEN — always verb-noun

// ── Wrong casing ─────────────────────────────────────────────────────────
interface IUserProfile {}         // FORBIDDEN → UserProfile
const MAX_retries = 3             // FORBIDDEN → MAX_RETRIES
class userService {}              // FORBIDDEN → UserService
enum logLevel {}                  // FORBIDDEN → LogLevel
type userData = {}                // FORBIDDEN → UserData

// ── Boolean naming ───────────────────────────────────────────────────────
const loading = true              // FORBIDDEN → isLoading
const error = false               // FORBIDDEN → hasError (or just `error: Error | null`)
const enabled = check()           // FORBIDDEN → isEnabled
const valid = validate(x)         // FORBIDDEN → isValid
function notEnabled() {}          // FORBIDDEN — never invert boolean names → isDisabled

// ── Generic type params ───────────────────────────────────────────────────
function wrap<T>(value: T): T     // DISCOURAGED in public API → wrap<TValue>(value: TValue)
function fetch<T, K>(...)         // FORBIDDEN → fetch<TData, TKey>(...)
```

---

### ESLint Rules — Rule-by-Rule Rationale

Every rule below exists for a specific reason. AI agents must not disable these rules without documented justification.

#### Naming and Clarity

| Rule | Rationale |
|---|---|
| `@typescript-eslint/naming-convention` | Enforces the naming table above at the AST level. Catches violations that code review misses. |
| `unicorn/prevent-abbreviations` | Abbreviations force readers to decode intent. In a public library, the reader is always a stranger. |
| `unicorn/filename-case: kebabCase` | Consistent file naming prevents `CreateClient.ts` vs `create-client.ts` ambiguity across OS case sensitivity. |

#### TypeScript Strictness

| Rule | Rationale |
|---|---|
| `@typescript-eslint/no-explicit-any` | `any` disables type checking for everyone downstream of that point. |
| `@typescript-eslint/explicit-function-return-type` | Public API functions must declare their return type. Inference is not a contract. |
| `@typescript-eslint/explicit-module-boundary-types` | Every exported function's signature is a promise to consumers. Make it explicit. |
| `@typescript-eslint/no-non-null-assertion` | `!` assertions are silent runtime crashes waiting to happen. |
| `@typescript-eslint/no-floating-promises` | Unhandled promises are the #1 source of silent bugs in async code. |
| `@typescript-eslint/switch-exhaustiveness-check` | Discriminated union switches must handle every case or the compiler must fail. |
| `@typescript-eslint/prefer-readonly` | Immutability prevents a class of mutation bugs in library internals. |
| `@typescript-eslint/consistent-type-imports` | Separates type-only imports from value imports. Enables better tree-shaking. |

#### Code Quality

| Rule | Rationale |
|---|---|
| `no-console` | Libraries must be silent. `console.log` in library code pollutes consumer production logs. |
| `no-param-reassign` | Mutating function arguments causes non-obvious bugs and violates consumer expectations. |
| `no-nested-ternary` | Nested ternaries are unreadable. Early returns exist for this reason. |
| `no-else-return` | After a `return`, `else` is structurally redundant and adds indentation noise. |
| `eqeqeq: always` | `==` has implicit coercion rules that library code must never rely on. |
| `sonarjs/cognitive-complexity: 10` | Functions with complexity > 10 cannot be understood, tested, or maintained reliably. |
| `no-eval` / `no-new-func` | String-based code execution is a security vulnerability. No exceptions. |

#### Import Discipline

| Rule | Rationale |
|---|---|
| `import/no-cycle` | Circular dependencies cause unpredictable module initialization order and bundle issues. |
| `import/no-default-export` | Default exports are renamed at the import site. Named exports are always explicit and refactor-safe. |
| `import/no-mutable-exports` | Exported mutable values can be modified by consumers, causing global side effects. |
| `import/no-extraneous-dependencies` | Importing devDependencies in source code causes runtime failures for consumers. |
| `unicorn/prefer-node-protocol` | `import 'node:fs'` is unambiguous and avoids name collision with npm packages. |

---

### Required ESLint Packages

```json
{
  "devDependencies": {
    "eslint": "^9.0.0",
    "@eslint/js": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "eslint-plugin-unicorn": "^55.0.0",
    "eslint-plugin-sonarjs": "^2.0.0",
    "eslint-plugin-jsdoc": "^50.0.0",
    "eslint-plugin-import": "^2.31.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-n": "^17.0.0"
  }
}
```

Install:
```bash
npm install --save-dev eslint @eslint/js typescript-eslint \
  eslint-plugin-unicorn eslint-plugin-sonarjs eslint-plugin-jsdoc \
  eslint-plugin-import eslint-plugin-react-hooks eslint-plugin-n
```

---

### ESLint Scripts — Required in package.json

```json
"scripts": {
  "lint": "eslint src --max-warnings 0",
  "lint:fix": "eslint src --fix --max-warnings 0",
  "lint:ci": "eslint src --max-warnings 0 --format github"
}
```

`--max-warnings 0` is mandatory. Zero warnings allowed. Every lint issue is a blocking error in CI.

---

## Anti-Pattern Reference — Library Edition

These are in addition to the base anti-pattern table.

| Anti-Pattern | Why It's Forbidden |
|---|---|
| Exporting internal utilities | Every export is a forever promise; internals become consumer dependencies |
| Throwing generic `Error` | Consumers cannot distinguish library errors from their own |
| Shipping dependencies in bundle | Causes duplicate packages and version conflicts in consumer apps |
| No `exports` map in package.json | Consumers can import internal files; breaks when you refactor |
| `console.log` in library code | Pollutes consumer's production logs |
| Reading `window`/`document` without SSR guard | Crashes Next.js and any SSR consumer |
| Mutation of input arguments | Violates consumer's expectations; causes subtle bugs |
| Implicit peer dependency on a specific major | Consumer upgrades break your library silently |
| No type exports | Consumers are forced to write their own types or use `any` |
| No CHANGELOG | Community cannot evaluate upgrade safety |
| Breaking changes in minor/patch versions | Breaks semver contract; destroys consumer trust |
| Forcing a specific bundler or module format | Limits where the library can be used |
| `sideEffects: true` without reason | Disables tree-shaking across all consumers |

---

## Library Release Checklist

Before every release:

- [ ] All CI checks pass (lint, typecheck, tests, types, build, size)
- [ ] `eslint src --max-warnings 0` exits clean — zero warnings, zero errors
- [ ] No naming violations — no abbreviations, no wrong casing, no missing boolean prefix, no vague names
- [ ] No `any` in source or emitted `.d.ts` declarations
- [ ] All parameters named in full — no `cb`, `fn`, `err`, `res`, `req`, `ctx`, `idx`
- [ ] All boolean variables and parameters carry `is`/`has`/`can`/`should` prefix
- [ ] All enum members are UPPER_CASE, all interfaces are PascalCase without `I` prefix
- [ ] All generic type parameters are descriptive PascalCase (`TData`, `TKey`) — not single-letter

**Architecture integrity:**
- [ ] No cross-layer boundary violations — `import/no-cycle` passes clean
- [ ] `theme/` imports nothing from this library
- [ ] `headless/` imports nothing from `view/` or `engine/`
- [ ] `view/layout/` (tableGrid, toolbar) is not imported by any consumer-facing file
- [ ] `tracking-register.ts` is not in the exports map and not reachable from `src/index.ts`
- [ ] `utils/` and `constants/` are fully `@internal` — nothing surfaces in `src/index.ts`
- [ ] `overrideComponent` / `extendVariant` mutual exclusivity enforced by discriminated union
- [ ] Schema resolution order unchanged in `schema-resolver.ts`
- [ ] Render pipeline stages are all pure functions — no input mutation
- [ ] All headless hooks self-register and clean up in `useEffect` return

**Release:**
- [ ] Semver version bump matches the change type (patch/minor/major)
- [ ] All new public APIs have JSDoc with `@param`, `@returns`, `@throws`, `@example`, `@since`
- [ ] All deprecated APIs have `@deprecated` JSDoc and runtime warning
- [ ] Breaking changes documented with migration path in CHANGELOG
- [ ] Bundle size within budget
- [ ] `dist/` contains `.js`, `.cjs`, `.d.ts`, `.d.ts.map`, `.js.map`
- [ ] `package.json` exports map covers all public entry points
- [ ] SSR safety verified for all browser API access
- [ ] No `console.log` or debug artifacts in source
- [ ] `examples/` updated to reflect any API changes
- [ ] README Quick Start is still accurate

---

## Final Directive — Library Edition

A library is not finished when it works.
It is finished when a developer who has never spoken to you can install it, understand it, use it correctly, handle its errors, and upgrade it safely — all without asking you a single question.

**Build for that developer.**
