---
name: virtual-grid-engine
description: >-
  Builds and reviews the virtual-grid-engine config-driven table library using
  the 8-layer architecture, frontend design guidelines, and npm library
  engineering standards. Use for any work in virtual-grid-engine — features,
  refactors, components, hooks, config layers, public API, examples, tests, or
  tooling.
---

# Virtual Grid Engine — Project Standards

This project is a **public npm table engine**, not a generic React app. Follow the three reference documents **strictly**. Do not improvise patterns that conflict with them.

## Mandatory workflow

Before writing or changing code:

1. Read [references/architecture.md](references/architecture.md) for layer boundaries, config cascade, render pipeline, and constraints.
2. Read [references/npm-library-standards.md](references/npm-library-standards.md) for folder layout, exports, naming, API design, and ESLint expectations.
3. If touching UI, demos, or consumer-facing table usage, read [references/frontend-design-guidelines.md](references/frontend-design-guidelines.md).

After changes, verify against the checklists in those documents and the project rules under `.cursor/rules/`.

## Non-negotiable summary

### 8-layer architecture (folder = layer)

```
theme → component → display → layout → registry → headless → view → engine
```

| Layer | May import from |
|-------|-----------------|
| `theme/` | nothing in-library |
| `component/` | `theme/`, `types/` |
| `display/` | `types/` |
| `layout/` | `types/`, `constants/` |
| `registry/` | `component/`, `types/` |
| `headless/` | `registry/`, `types/`, `constants/` — **never** `view/` or `engine/` |
| `view/` | `headless/`, `registry/`, `layout/`, `display/`, `types/` |
| `engine/` | all layers (sole integrator) |
| `utils/`, `constants/` | nothing in-library; **never** exported |
| `types/` | types only, no runtime imports |

- `src/index.ts` is the **only** public export surface.
- `view/layout/` (`table-grid`, `toolbar`) is **sealed** — not in `exports`, not for consumers/plugins.
- Global Tracking Register is engine-owned; hooks **self-register** on mount.

### Config cascade (fixed order)

```
table-config → component-config → display-config → layout-config → plugin transforms
```

- `overrideComponent` and `extendVariant` are **mutually exclusive** per entry.
- Components are pure UI — **no** imports from `headless/` or `engine/`.
- HOC is the only place that wires headless hooks → UI props.

### Render pipeline (fixed order, pure stages)

```
normalize → column processing → plugin processing → filter → sort → group → paginate → virtualize → render
```

### Consumer / demo UI (frontend guidelines)

- **Only** the table engine for data grids — no shadcn `Table`, native `<table>`, or third-party grids.
- Always supply custom `loadingComponent`, `emptyComponent`, `errorComponent` in production UI.
- Do not mirror engine state in Zustand/Context — use `tableController` or `useTableEngine`.
- Stack: React + TS, Tailwind, shadcn/ui, Lucide; feature-based `src/` layout when app code is added.

### Library bar

- No `any`; explicit return types on public APIs; options-object pattern for 3+ parameters.
- Named exports only; `sideEffects: false`; explicit `package.json` `exports` map.
- kebab-case files; no abbreviations; boolean `is`/`has`/`can` prefixes.
- JSDoc on every public export (`@param`, `@returns`, `@throws`, `@example`, `@since`).

## When unsure

Prefer the reference documents over local conventions. If the codebase diverges from the references, **align code to the references** unless the user explicitly asks to change the standard.

## References (full detail)

- [architecture.md](references/architecture.md)
- [frontend-design-guidelines.md](references/frontend-design-guidelines.md)
- [npm-library-standards.md](references/npm-library-standards.md)
