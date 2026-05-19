---
name: frontend-design-guidelines
description: Build clean, production-grade frontend interfaces using React, TypeScript, TailwindCSS, and shadcn/ui with strong UX consistency, accessibility, and scalable component architecture.
---

# Frontend Design Guidelines

## Core Principles

- Clarity over visual noise — every element must justify its presence.
- Build interfaces that feel production-ready, not AI-generated.
- Maintain strong visual hierarchy and consistent spacing.
- Keep layouts clean, balanced, and responsive by default.
- Avoid unnecessary gradients, excessive shadows, and decorative-only animations.
- Prioritize readability, accessibility, and usability above aesthetics.
- Design for real users with real tasks — not for screenshots.

---

## Tech Stack

- **Framework**: React + TypeScript
- **Styling**: TailwindCSS
- **Component Library**: shadcn/ui
- **Icons**: Lucide React
- **Animation**: Framer Motion — only when it improves UX, never decorative
- **State**: Local state first; Zustand or React Context for shared state
- **Data Fetching**: TanStack Query (React Query) preferred
- **Routing**: React Router or Next.js App Router

Avoid introducing additional UI libraries unless there is a clear, justified gap.

---

## Project & File Structure

Organize by feature, not by file type:

```
src/
  components/
    ui/              # shadcn/ui primitives (auto-generated, do not manually edit)
    shared/          # Reusable cross-feature components
    [feature]/       # Feature-specific components
  hooks/             # Custom hooks
  lib/               # Utilities, helpers, constants
  types/             # Shared TypeScript types and interfaces
  pages/ or app/     # Route-level components
```

- One component per file.
- Co-locate styles, tests, and stories with their component when feasible.
- Barrel exports (`index.ts`) per folder to simplify imports.

---

## Component Rules

### General

- Keep components small, focused, and composable.
- Extract repeated UI patterns into shared components immediately.
- Prefer controlled components for forms and inputs.
- Use semantic HTML — `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`.
- Avoid deeply nested JSX; extract sub-components or helper functions.
- Do not mix data-fetching logic with presentational components.

### Naming

Use clear, descriptive, PascalCase names:

Prefer:
- `UserProfileCard`
- `PricingSection`
- `DashboardSidebar`
- `InvoiceTable`

Avoid:
- `Comp`, `TestCard`, `NewSection`, `Wrapper2`, `ModalHelper`

### Props

- Use explicit prop interfaces — never implicit `any`.
- Prefer optional props with sensible defaults over required-everything.
- Document non-obvious props with inline JSDoc comments.
- Avoid passing more than 5–6 props; consider a config object or subcomponents instead.

```tsx
interface UserCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
  /** Show action buttons for admin users only */
  isAdmin?: boolean;
}
```

### Component Variants

Use `cva` (Class Variance Authority) for multi-variant components instead of conditional string concatenation:

```tsx
const button = cva("base-classes", {
  variants: {
    intent: { primary: "...", secondary: "...", ghost: "..." },
    size:   { sm: "...", md: "...", lg: "..." },
  },
  defaultVariants: { intent: "primary", size: "md" },
});
```

---

## Styling Rules

### Spacing

Use the Tailwind spacing scale consistently. Standard units:

- Inline padding: `px-3`, `px-4`, `px-6`
- Block padding: `py-2`, `py-4`, `py-6`
- Section gaps: `gap-4`, `gap-6`, `gap-8`
- Section stacking: `space-y-4`, `space-y-6`, `space-y-8`

Avoid arbitrary values (`p-[13px]`) unless pixel-perfect alignment is explicitly required.

### Border Radius

- Cards and containers: `rounded-xl`, `rounded-2xl`
- Inputs and buttons: `rounded-md`, `rounded-lg`
- Badges and chips: `rounded-full`

Avoid mixing radius scales within the same component. Do not over-round everything.

### Shadows

Use shadows only to establish hierarchy (e.g., modals, dropdowns, cards lifted above the page).

Prefer:
- `shadow-sm` — subtle elevation
- `shadow-md` — moderate card lift

Avoid:
- `shadow-2xl` on flat content
- Colored glow shadows
- Stacked/layered shadow effects

### Borders

Use borders to separate content sections instead of shadow:

- `border border-border` — standard divider
- `border border-border/50` — softer separation
- `divide-y divide-border` — for lists and table rows

### Dark Mode

- Use Tailwind's `dark:` variant consistently.
- Define color tokens via CSS variables in `globals.css` — never hardcode hex values in components.
- Test both light and dark themes before shipping.

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  /* ... */
}
.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
}
```

---

## Typography

### Scale

Limit active font sizes to a defined scale:

| Use            | Class                        |
|----------------|------------------------------|
| Page heading   | `text-3xl` – `text-5xl`      |
| Section title  | `text-xl` – `text-2xl`       |
| Subheading     | `text-base` – `text-lg`      |
| Body           | `text-sm` – `text-base`      |
| Caption/label  | `text-xs` – `text-sm`        |

### Rules

- Use `font-semibold` or `font-bold` for headings; avoid relying on size alone to establish hierarchy.
- Keep body text at a comfortable line length: `max-w-prose` or `max-w-2xl`.
- Use `leading-relaxed` or `leading-loose` for paragraph-length content.
- Use `tracking-tight` for large display headings; avoid on body text.
- Never use all-caps for long strings of text.
- Maintain WCAG AA contrast minimum (4.5:1 for body text, 3:1 for large text).

---

## Color Usage

- One primary accent color. One semantic error/warning/success palette.
- Use CSS variables, not hardcoded colors, for all brand and theme colors.
- Background: neutral (`gray-50`, `white`, `gray-950`).
- Surface: one step above background (`white` on `gray-50`, `gray-900` on `gray-950`).
- Foreground: high-contrast text on every background.

Avoid:
- Purple gradients as a default aesthetic choice
- Neon or oversaturated accent colors
- More than two accent colors in a single view
- Color alone to convey meaning (pair with icon or label for accessibility)

### Semantic Color Usage

| Role      | Usage                                   |
|-----------|-----------------------------------------|
| Primary   | CTAs, active states, key interactions   |
| Secondary | Supporting actions, secondary buttons   |
| Muted     | Labels, placeholder text, disabled UI  |
| Destructive | Errors, delete confirmations          |
| Success   | Completion states, confirmations        |

---

## Layout Rules

### Structure

- Default to `flex` for linear arrangements, `grid` for two-dimensional layouts.
- Use `grid-cols-12` or named template areas for complex page layouts.
- Maintain predictable alignment — do not mix alignment strategies within a section.

### Page Anatomy

Every page should have a clear structure:

```
<header>     — navigation, branding, global actions
<main>
  <aside>    — optional: sidebar, filters
  <section>  — primary content
</main>
<footer>     — secondary links, legal, metadata
```

### Content Width

| Context         | Class                          |
|-----------------|--------------------------------|
| Full-width page | `w-full`                       |
| App shell       | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` |
| Readable prose  | `max-w-2xl` or `max-w-prose`   |
| Narrow form     | `max-w-md` or `max-w-lg`       |

### Responsive Design

- Mobile-first: write base styles for mobile, override for larger breakpoints.
- Standard breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px).
- Stack layouts vertically on mobile; use side-by-side on desktop.
- Avoid horizontal scrolling on any viewport.
- Test at 375px (iPhone SE), 768px (tablet), and 1440px (desktop).

---

## shadcn/ui Usage

### Principles

- Use shadcn/ui primitives as the default for all common UI patterns.
- Do not manually replicate components that shadcn/ui already provides.
- Never directly edit files inside `components/ui/` — extend them via wrapper components.
- Install components via CLI: `npx shadcn@latest add [component]`

### Preferred Components

| Category     | Components                                              |
|--------------|---------------------------------------------------------|
| Layout       | `Card`, `Separator`, `Scroll Area`                      |
| Forms        | `Input`, `Textarea`, `Select`, `Checkbox`, `Switch`, `RadioGroup`, `Slider`, `Form` |
| Navigation   | `Tabs`, `Breadcrumb`, `Pagination`                      |
| Overlays     | `Dialog`, `Sheet`, `Popover`, `Tooltip`, `Alert Dialog` |
| Feedback     | `Toast`, `Alert`, `Badge`, `Progress`, `Skeleton`       |
| Data         | `Table`, `DataTable`                                    |
| Actions      | `Button`, `DropdownMenu`, `Context Menu`, `Command`     |

### Buttons

- **Primary**: Solid background, high-contrast label. One per section maximum.
- **Secondary**: `outline` or `ghost` variant for supporting actions.
- **Destructive**: Only for irreversible actions (delete, revoke, reset).
- Avoid multiple primary CTAs in the same visual region.
- Always include a visible label — do not rely on icon-only buttons without a `Tooltip`.

### Form Integration

Use `react-hook-form` with `zod` validation, integrated via shadcn/ui's `Form` component:

```tsx
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

---

## Forms

- Every input must have a visible `<label>` or `aria-label`.
- Show validation errors inline, below the relevant field — not in a top-level banner alone.
- Use `helper text` sparingly — only for non-obvious constraints (e.g., password rules).
- Disable the submit button while submitting; show a loading state.
- Preserve user input on validation failure — never reset the form.
- Group related fields visually with consistent spacing (`space-y-4` or `space-y-6`).
- Use `fieldset` + `legend` for grouped radio or checkbox inputs.

### Validation UX

- Validate on blur for individual fields (not on every keystroke).
- Validate the entire form on submit.
- Show success confirmation after async operations complete.

---

## Tables & Data UI

### When to Use the Table Engine

The table engine is the **only** table implementation in this project. All data tables — regardless of size or interactivity — use the engine. Do not use `shadcn/ui Table`, native `<table>` elements, or any third-party grid library as an alternative.

| Scenario | Configuration |
|---|---|
| Read-only display data | Engine with `virtualization: false`, minimal config |
| Interactive (sort, filter, paginate) | Engine with relevant headless hooks enabled |
| Large datasets (>50 rows) | Engine with `virtualization: true` (default) |

### Table Engine — Consumer Rules

The project uses a config-driven table engine. Consumers configure behavior through four config files and props. **Never modify engine internals.**

#### Configuration Cascade (in order)

```
theme-config.ts        → design tokens (colors, spacing, radius, typography)
component-config.ts    → override or register components
internal-display-config.ts → show/hide built-in components
layout-config.ts       → zone placement of components
```

Each layer is additive. Pass only the configs you need — all are optional.

#### Engine Props

| Prop | Type | Notes |
|---|---|---|
| `rowData` | `RowData[]` | Required. Table data source. |
| `column` | `ColumnData[]` | Required. Column definitions. |
| `virtualization` | `boolean` | Default `true`. Always keep on for >50 rows. |
| `tableStyle` | `{ row, column, cell, border, scroll }` | Grid-level visual overrides. |
| `toolbarStyle` | `{ top, left, bottom, right }` | Toolbar zone visual overrides. |
| `errorComponent` | `ReactNode` | Required — always provide a custom error state. |
| `emptyComponent` | `ReactNode` | Required — always provide a custom empty state. |
| `loadingComponent` | `ReactNode` | Required — always provide a custom loading state. |
| `tableController` | `(current) => void` | Access selected rows, filters, sort state, processed rows from outside the table. |

Always provide `errorComponent`, `emptyComponent`, and `loadingComponent`. Never leave these as the engine default in production UI.

#### Reading and Writing Engine State Externally

```tsx
const { gridValue, setGridValue } = useTableEngine()
```

Use `useTableEngine` when a component outside the table needs to read or control table state (e.g., a "Clear filters" button in the page header).

#### Attaching Plugins

```ts
GridEngine.plugin.themeConfig(themeConfig)
GridEngine.plugin.componentConfig(componentConfig)
GridEngine.plugin.displayConfig(displayConfig)
GridEngine.plugin.layoutConfig(layoutConfig)
```

Plugins attach/detach at runtime without remounting. Only attach the plugins your view actually needs.

---

### theme-config.ts

Override design tokens. Deep-merged into Tailwind `theme.extend` at build time. All tokens map to the existing Tailwind scale — do not introduce arbitrary values.

```ts
export const themeConfig = {
  colors:     { primary: '...', surface: '...' },
  spacing:    { rowHeight: '...' },
  radius:     { cell: '...' },
  typography: { cell: '...' },
  borders:    { row: '...' },
  shadows:    {},
  heights:    { row: '40px' },
  widths:     { column: '...' },
}
```

- Pass only the keys you need to override — not the full object.
- Theme tokens defined here are readable by all plugins via `TableContext`.
- Do not hardcode colors in `componentConfig` or `layoutConfig` — use tokens.

---

### component-config.ts

Override existing components or register new ones.

**Override an existing component:**
```ts
export const componentConfig = {
  search: {
    overrideComponent: CustomSearch,  // replaces DefaultSearch entirely
    style: { width: 300, height: 40, borderRadius: 10 },
  },
}
```

**Register a new component:**
```ts
{
  componentId: 'dateRangePicker',
  render: ({ field, setField }) => (
    <DateRangePicker value={field} onChange={setField} />
  ),
}
```

Rules:
- `overrideComponent` and `extendVariant` are **mutually exclusive** per entry. Using both on the same `componentId` is an error.
- `style` in component-config is scoped to that component — it does not affect global theme tokens.
- Any `componentId` registered here becomes available for placement in `layout-config.ts`.
- Components must be pure UI — they receive state and handlers via props. Never import from the Engine or Headless layer inside a component.

---

### internal-display-config.ts

Show or hide built-in components. Boolean flags only — no logic here.

```ts
export const displayConfig = {
  search:             true,
  pagination:         true,
  toggleColumnWidth:  false,
}
```

Rules:
- Keys must correspond to a `componentId` in the Component Registry or `component-config.ts`. Unknown keys are ignored at render but trigger a console warning at init — treat warnings as errors.
- Use this to hide features, not to conditionally render them in component code.

---

### layout-config.ts

Controls which component renders in which toolbar zone.

**Available zones:**
```
topLeft     topCenter     topRight
leftTop     leftCenter    leftBottom
rightTop    rightCenter   rightBottom
bottomLeft  bottomCenter  bottomRight
```

```ts
export const layoutConfig = {
  searchBar: {
    componentId: 'search',
    position:    'topRight',
    order:       1,
  },
  dateFilter: {
    componentId: 'dateRangePicker',
    position:    'topRight',
    order:       2,          // renders after searchBar in the same zone
  },
}
```

Rules:
- Multiple components in the same zone are rendered in ascending `order`.
- Unused zones collapse automatically — do not add placeholder components to fill space.
- Only reference `componentId` values that exist in the Component Registry or `component-config.ts`.

---

### Headless Hooks

Use these hooks inside components that need table state. They self-register to the engine's Global Tracking Register — no manual wiring needed.

```ts
useSorting(config)    → { sortState, onSort, resetSort }
useFilter(config)     → { filterState, onFilter, clearFilter }
usePagination(config) → { page, pageSize, onPageChange }
useSelection(config)  → { selected, onSelect, clearSelection }
useGrouping(config)   → { groups, onGroup, clearGroup }
```

- Each hook is built on `useReducer` + `useSyncExternalStore`.
- Do not replicate this state in Zustand or React Context — the engine owns it.
- Access this state from outside the table via `tableController` prop or `useTableEngine`.

---

### Component Architecture Inside the Engine

Follow the atomic structure the engine expects:

```
Atoms       → primitive UI elements (cell, badge, icon button)
Molecules   → composed atoms (sortable header, filter chip)
Organisms   → full table sub-sections (toolbar, grid body)
Templates   → full wired views (HOC-composed table)
```

Components at any level must not import from the Headless or Engine layers. All state arrives via props.

---

### Table UI Standards

The table grid is rendered entirely with `div` elements — no `<table>`, `<thead>`, `<tr>`, or `<td>`. The engine's `tableGrid.ts` owns row and cell rendering via virtualization. Do not attempt to replace or wrap these with native HTML table elements.

**Structure the engine produces:**
```
div [grid root]
  div [header row]
    div [header cell] × n
  div [body]
    div [row] × n   ← virtualized
      div [cell] × n
```

**Styling rules for div-based grid:**
- Header row stickiness is set through `tableStyle` or `themeConfig` — not in component CSS.
- Cell padding: apply via `themeConfig.spacing` or `tableStyle.cell` — not inline styles on individual cell components.
- Row hover: controlled by `tableStyle.row` — do not add `hover:` Tailwind classes directly on engine-rendered row divs.
- Column alignment (numeric right, text left): set per `ColumnDef` via the `column` prop — not global CSS rules.
- Column widths: pass through `ColumnDef` or `tableStyle.column` — never set `width` directly on cell divs; the engine's column processing pipeline owns this.
- Avoid combining zebra-striping and heavy borders — use one or neither.
- Sort direction: visible arrow icon on the active header cell, not color alone.

**Accessibility for div grids:**
- The engine applies `role="grid"`, `role="row"`, `role="gridcell"`, and `role="columnheader"` to rendered divs. Do not add these roles manually in override components — they will conflict.
- Keyboard navigation (arrow keys, Tab, Enter) is engine-managed. Custom cell renderers must not intercept these keys unless the cell is explicitly in an edit mode.

### Empty, Loading, and Error States

Always supply custom components via props — never rely on engine defaults in production:

```tsx
<TableEngine
  rowData={data}
  column={columns}
  loadingComponent={<TableSkeleton rows={10} />}
  emptyComponent={<EmptyState title="No results" action={<Button>Add row</Button>} />}
  errorComponent={<ErrorState onRetry={refetch} />}
/>
```

- `loadingComponent`: Skeleton rows matching the expected data shape and column count.
- `emptyComponent`: Icon + short explanation + primary action (e.g., "Add your first record").
- `errorComponent`: Short error message + retry button. Never expose raw error objects.

---

## Loading & Async States

Define all four states for every async UI:
- **Idle**: Default appearance before any interaction
- **Loading**: Skeleton loaders (preferred over spinners for content areas); spinner for button actions
- **Success**: Confirmation message or updated UI
- **Error**: Inline error with a retry option

Use `Skeleton` from shadcn/ui for content placeholders. Match skeleton dimensions to actual content to prevent layout shift.

---

## Error Handling & Empty States

- Every list, table, or data view needs a designed empty state.
- Empty states should include: an icon or illustration, a short explanation, and a primary action.
- Never show raw error objects or stack traces to users.
- Use `Alert` (shadcn/ui) for inline non-blocking errors.
- Use `Alert Dialog` for errors that block interaction.

---

## Navigation Patterns

- **Top nav**: Application name/logo, primary navigation links, user menu.
- **Sidebar**: Feature-level navigation for dashboards and multi-section apps.
- **Tabs**: Sub-section navigation within a page.
- **Breadcrumbs**: Required for pages more than two levels deep.
- **Command palette**: `Command` (shadcn/ui) for power-user navigation in complex apps.

Active navigation states must be visually unambiguous. Never rely on color alone.

---

## Feedback & Notifications

- **Toast** (`useToast`): Ephemeral, non-blocking feedback for async actions (saved, deleted, copied).
- **Alert**: Persistent, contextual messages (warnings, info banners).
- **Badge**: Status indicators on items in lists or tables.
- **Progress**: Multi-step processes or file uploads.

Rules:
- Toasts auto-dismiss after 4–5 seconds.
- Destructive toasts may stay until dismissed.
- Never stack more than 3 toasts simultaneously.

---

## Accessibility (Mandatory)

These are non-negotiable requirements, not suggestions:

- All interactive elements reachable and operable via keyboard alone.
- Visible focus indicators on all focusable elements — never `outline-none` without a replacement.
- Sufficient color contrast: WCAG AA minimum (4.5:1 body, 3:1 large text).
- All images have meaningful `alt` text; decorative images use `alt=""`.
- All icons used without adjacent text have `aria-label` or `<title>`.
- Modal dialogs trap focus and return focus to the trigger on close.
- Form inputs linked to labels via `htmlFor`/`id` or `aria-labelledby`.
- Use `aria-live` regions for dynamic content updates (search results, notifications).
- Semantic landmark roles: `role="main"`, `role="navigation"`, `role="complementary"`.
- Do not rely solely on color to communicate state (error, success, disabled).

---

## Motion & Animation

Motion should serve the user experience, not decorate it.

### When to Animate

- State transitions: collapsing panels, drawer open/close, modal entrance.
- Loading feedback: skeleton shimmer, progress indicators.
- Directional navigation: page transitions that reinforce spatial context.
- Microinteractions: button press, toggle state, icon swap.

### Rules

- Keep durations short: `150ms`–`300ms` for UI elements; `400ms` max for page transitions.
- Use `ease-out` for entrances; `ease-in` for exits.
- Prefer `transform` and `opacity` — they do not trigger layout reflow.
- Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Avoid:
- Entrance animations on every element
- Bouncing or springy effects on functional UI
- Animations that delay access to content
- Motion that plays on every re-render

---

## Icons

- Use Lucide React exclusively. Do not mix icon libraries.
- Pair icons with visible text labels wherever possible.
- Icon-only controls require `aria-label` and a `Tooltip`.
- Consistent sizing:
  - Inline with text: `h-4 w-4`
  - Standalone/button: `h-5 w-5`
  - Feature icons: `h-6 w-6`
- Use `strokeWidth={1.5}` for a refined, less heavy appearance when appropriate.

---

## TypeScript Standards

- `any` is forbidden. Use `unknown` and narrow the type, or define a proper interface.
- Define explicit return types for all exported functions and hooks.
- Extract shared types to `src/types/` — do not redeclare the same shape in multiple files.
- Use `satisfies` operator for type-safe object literals without losing inference.
- Prefer `interface` for object shapes; `type` for unions, intersections, and primitives.
- Use `Readonly<>` and `ReadonlyArray<>` for props and state that should not be mutated.

---

## State Management

| Scope             | Approach                          |
|-------------------|-----------------------------------|
| Component-local   | `useState`, `useReducer`          |
| Cross-component   | Prop drilling (up to 2 levels), then Context |
| Global app state  | Zustand (preferred) or Jotai      |
| Server/async state| TanStack Query (`useQuery`, `useMutation`) |
| URL state         | Search params via router          |

- Do not store derived values in state — compute them during render.
- Do not store server data in global state if TanStack Query is in use.
- Reset form state explicitly on modal close or navigation away.
- **Table engine state** (sort, filter, selection, pagination) is owned by the engine's Global Tracking Register. Do not mirror it in Zustand or Context — read it via `tableController` or `useTableEngine`.

---

## Performance

- Memoize with `useMemo` and `useCallback` only when profiling confirms a re-render problem. Do not premature-optimize.
- Use `React.memo` on list item components rendered in large lists.
- Lazy load route-level components with `React.lazy` and `Suspense`.
- Data grids use the imperative grid kernel (`VirtualizedGrid` / `createGrid`) — not shadcn `Table` or native `<table>`. Optional TanStack Virtual for non-grid lists only.
- Avoid inline function definitions in JSX prop positions for frequently re-rendered components.
- Image optimization: use correct formats (WebP/AVIF), set explicit `width` and `height`, use `loading="lazy"` for below-fold images.

---

## Code Quality

- No commented-out code in committed files.
- No `console.log` in production components — use a logger utility.
- Extract magic strings and numbers to named constants.
- Keep components under ~200 lines; split at logical boundaries if longer.
- Collocate related logic: a hook that manages a specific piece of state should live next to the component that owns it unless it is shared.

---

## Design Decisions Checklist

Before shipping any component or view, verify:

- [ ] Works on mobile (375px) without horizontal scroll
- [ ] Works in both light and dark mode
- [ ] All interactive elements are keyboard accessible
- [ ] Focus states are visible
- [ ] Loading, empty, and error states are handled
- [ ] No hardcoded colors or spacing values outside the Tailwind scale
- [ ] TypeScript types are explicit — no `any`
- [ ] Form fields have labels and show validation errors
- [ ] Async actions show feedback (loading, success, error)
- [ ] `prefers-reduced-motion` is respected
- [ ] Table engine: custom `loadingComponent`, `emptyComponent`, `errorComponent` supplied
- [ ] Table engine: `displayConfig` keys verified against Component Registry (no unknown keys)
- [ ] Table engine: `layoutConfig` positions reference only registered `componentId` values
- [ ] Table engine: components do not import from Engine or Headless layers

---

## What to Avoid

| Avoid                              | Prefer Instead                          |
|------------------------------------|-----------------------------------------|
| Purple gradients as a default      | Intentional, context-appropriate color  |
| Glassmorphism without purpose      | Clear surface hierarchy                 |
| Icon-only buttons without labels   | Icon + label, or Tooltip on icon-only   |
| `any` in TypeScript                | Explicit types or `unknown` + narrowing |
| Spinners for content loading       | Skeleton loaders                        |
| Color alone to convey meaning      | Color + icon/label combination          |
| Hiding focus outlines              | Custom focus styles with `ring-*`       |
| Storing server data in global state| TanStack Query cache                    |
| Premature memoization              | Profile first, then optimize            |
| Multiple primary CTAs per section  | One primary, supporting secondary/ghost |
| Mirroring table engine state in Zustand | Read via `tableController` or `useTableEngine` |
| Importing Engine/Headless in components | All state via props only          |
| Using both `overrideComponent` and `extendVariant` on same entry | Pick one per `componentId` |
| Leaving engine default empty/loading/error states in production | Always supply custom `emptyComponent`, `loadingComponent`, `errorComponent` |
| Using `<table>`, `<thead>`, `<tr>`, `<td>` for data grids | Engine div-based grid only; style via `tableStyle` and `themeConfig` |
| Setting `width`/`height` on engine cell divs directly | Pass column constraints through `ColumnDef` or `tableStyle.column` |
| Adding ARIA grid roles manually to engine components | Engine applies `role="grid/row/gridcell"` — overriding causes conflicts |
