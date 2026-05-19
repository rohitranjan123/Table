# Agent instructions — virtual-grid-engine

This repository is a **high-performance, config-driven table engine** shipped as a public npm library.

## Required reading

Before implementing or reviewing code, use the **virtual-grid-engine** skill and read the matching reference:

| Topic | Path |
|-------|------|
| Skill (start here) | [.cursor/skills/virtual-grid-engine/SKILL.md](.cursor/skills/virtual-grid-engine/SKILL.md) |
| 8-layer architecture | [.cursor/skills/virtual-grid-engine/references/architecture.md](.cursor/skills/virtual-grid-engine/references/architecture.md) |
| Frontend & consumer UI | [.cursor/skills/virtual-grid-engine/references/frontend-design-guidelines.md](.cursor/skills/virtual-grid-engine/references/frontend-design-guidelines.md) |
| NPM library standards | [.cursor/skills/virtual-grid-engine/references/npm-library-standards.md](.cursor/skills/virtual-grid-engine/references/npm-library-standards.md) |

Persistent rules live in [.cursor/rules/](.cursor/rules/).

**Grid kernel (implemented today):** [docs/grid-kernel.md](docs/grid-kernel.md) — scope, plugin meaning, parallel dev lanes, layer status.

## Quick constraints

- Eight layers with strict import boundaries; `engine/` is the sole integrator.
- Config cascade and render pipeline order are **not configurable**.
- Components never import headless or engine code; HOC wires hooks to UI.
- Only `src/index.ts` exports public API; `view/layout/` is sealed.
- All data tables use this engine — no alternate table implementations.
- No `any`; library code stays silent (no `console.log`).

When in doubt, follow the reference documents over existing code patterns.
