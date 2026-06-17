---
purpose: Decision log for omp-lilac-models-command-w6s
updated: 2026-06-18
---

# Decisions: omp-lilac-models-command-w6s

## Decision Log

| # | Decision | Rationale | Confidence |
|---|----------|-----------|------------|
| 1 | Use `ctx.ui.setWidget()` for table display | `setWidget` renders multi-line persistent widget above editor, providing information density for a multi-column model table. `ctx.ui.select()` is single-column only. `ctx.ui.custom()` is overkill for a static table. | High |
| 2 | Register command as `lilac-models` with space alias | OMP slash commands use kebab-case. `/lilac models` is a natural-space alias handled via input interception mapping to the same handler. Reserve `/lilac` for future subcommands (`/lilac status`, `/lilac health`). | High |
| 3 | Store models at module level via `let latestModels` | The command handler runs outside provider registration scope. A module-level mutable reference is the simplest way to provide models to the handler without refactoring the extension architecture. | High |
| 4 | Show stale (cached) models immediately, refresh in background | Model data is embedded at build time and refreshed on discount fetch. The table should render with available data immediately rather than waiting for a live API response. This matches the existing pattern used for footer status. | High |
| 5 | Highlight active model in table | Visual feedback shows the user which model they're currently using. Implement via `ctx.ui.theme.fg()` with a distinct color for the active row. | High |
| 6 | Update `types/omp.d.ts` to add `setWidget` to `UIApi` | `setWidget` is available at runtime but not yet declared in OMP's type definitions. Adding it prevents type errors and documents the API surface. | High |

## Rejected Alternatives

| # | Alternative | Why Rejected | Risk if Re-introduced |
|---|-------------|--------------|----------------------|
| 1 | `ctx.ui.select()` for interactive model picker | Single-column list can't show multi-column pricing/supply/vision data. Information density too low. | Breaks comparison UX — users can't see pricing alongside supply. |
| 2 | Custom TUI component via `ctx.ui.custom()` | Overly complex for a static display. Adds maintenance burden with no user benefit over `setWidget`. | Adds unnecessary surface area for bugs. |
| 3 | `/lilac` as the command name | Too broad — prevents future `/lilac status`, `/lilac health` subcommands without breaking changes. | Blocks future Lilac subcommand ecosystem. |
| 4 | Fetch live models on every command invocation | Unnecessary latency. Stale models are functionally identical to fresh models in 99% of cases. | Adds 200-500ms latency to every `/lilac-models` invocation. |
| 5 | Store models in a closure instead of module-level | Adds indirection without benefit. Module-level `let` is the simplest approach and matches how `latestDiscounts` is already stored. | Adds unnecessary refactoring of provider registration. |

## Assumptions

| # | Assumption | Validation | Invalidation Impact |
|---|------------|------------|---------------------|
| 1 | `ctx.ui.setWidget(key, lines)` is available in command handler context | Unknown — verify during implementation | Fall back to `ctx.ui.notify()` with multi-line text |
| 2 | `ctx.ui.theme.fg(color, text)` works with widget lines | Unknown — verify during implementation | Use raw strings without color highlighting |
| 3 | Models registered via `registerProvider()` are available when command fires | Validated — provider registration runs at extension init before any user commands | N/A |
| 4 | Discount data is available at command invocation time | Validated — `latestDiscounts` is populated before provider registration completes | Show undiscounted prices with "no discount data" note |
| 5 | `/lilac models` space alias can be intercepted via OMP input preprocessing | Unknown — OMP may only support kebab commands natively | Register only `/lilac-models`, document the alias in help text |
