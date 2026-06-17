# PRD: Add `/lilac models` slash command with supply-aware model browser

**Bead:** omp-lilac-models-command-w6s | **Type:** feature | **Priority:** P2
**Created:** 2026-06-18 | **Estimate:** 60 min

## Problem

WHEN a user wants to browse available Lilac models THEN they must leave OMP and visit getlilac.com BECAUSE there is no in-app model browser. The `/model` command requires knowing exact model IDs, and the discount/supply data fetched from the `/status` endpoint is only visible in the footer status bar for the currently selected model. Users cannot compare models side-by-side or discover which models have active discounts.

**Who is affected?** All Lilac plugin users who want to compare models before selecting.
**Why now?** The infrastructure is already in place — model metadata, discount tracking, supply states, and the ExtensionAPI command system. A model browser is the missing UX layer that makes this data actionable.

## Scope

### In Scope
- Register a `/lilac-models` slash command (aliased as `/lilac models` via input interception)
- Display all available Lilac models in a formatted table showing:
  - Display name
  - Effective input pricing (after subscription discount)
  - Effective output pricing
  - Cache read pricing (with discount)
  - Supply state (healthy/medium/low/unknown)
  - Active discount percentage
  - Vision support (yes/no)
  - Context window size
- Highlight the currently active model (if on a Lilac model)
- Store the latest model list in a module-level reference for command access
- Update the `types/omp.d.ts` to include `setWidget` in `UIApi`

### Out of Scope
- Interactive model selection from the table (future bead)
- Model sorting/filtering options (future bead)
- Persistent model list widget (future bead)
- `/lilac status` for API health (future bead)
- Color-coded supply states beyond theme-aware dimming (future bead)

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | `/lilac-models` command registered | MUST | Typing `/lilac-models` in OMP triggers the handler |
| 2 | `/lilac models` also works | SHOULD | Space-separated alias maps to same handler |
| 3 | Table shows all 4+ models | MUST | All models from provider registration appear |
| 4 | Pricing reflects active discounts | MUST | Discounted costs match footer status numbers |
| 5 | Supply state displayed | MUST | Each model shows its supply state (healthy/medium/low) |
| 6 | Active model highlighted | SHOULD | Currently selected Lilac model is marked |
| 7 | Command works before API fetch completes | MUST | Stale (cached/embedded) models work immediately |
| 8 | TypeScript compiles with zero errors | MUST | `npx tsc --noEmit` exits 0 |
| 9 | All existing tests pass | MUST | `npm test` passes (12/12) |

## Technical Context

- **ExtensionAPI:** `pi.registerCommand()` accepts `{ description, handler }`. Handlers receive `(args, ctx)` where `ctx` extends `ExtensionContext` with `ExtensionCommandContext` methods (`waitForIdle`, etc.).
- **UI Display:** `ctx.ui.setWidget(key, lines: string[])` renders a multi-line widget above the editor. `ctx.ui.theme.fg(color, text)` applies theme-aware styling. `ctx.ui.notify(text, type)` for ephemeral notifications.
- **Model Data Access:** The extension already maintains model lists internally via `registerProvider()`. Need to store a reference to the latest model list at module scope for command handler access.
- **Discount Data:** `latestDiscounts` (a `Map<string, JsonDiscount>`) is already maintained. Pricing is already discount-adjusted in the registered models.
- **Key Files:** `index.ts` (main extension), `types/omp.d.ts` (type declarations), `scripts/test-discounts.ts` (test suite)
- **No Build Step:** OMP loads `.ts` directly via jiti.

## Approach

1. **Store model reference:** Add a module-level `let latestModels: JsonModel[] = []` variable. Update it each time `registerProvider()` is called.
2. **Register command:** Call `pi.registerCommand("lilac-models", { description, handler })` in the extension factory.
3. **Format table:** In the handler, map `latestModels` into formatted strings using `ctx.ui.theme.fg()` for highlighting.
4. **Display:** Use `ctx.ui.setWidget("lilac-models", lines)` to render the table, then `ctx.ui.notify()` as fallback.
5. **Update types:** Add `setWidget(key: string, lines: string[]): void` to `UIApi` in `types/omp.d.ts`.

**Alternatives considered:**
- **`ctx.ui.select()` for interactive picking** — Rejected. `select()` shows a single-column list, not a rich table. A widget-based table provides more information density. Interactive selection is a future bead.
- **Custom TUI component via `ctx.ui.custom()`** — Rejected. Overly complex for a table display. `setWidget` is simpler and sufficient.
- **`/lilac` as the command name** — Rejected. Too broad; reserve for future subcommands (`/lilac status`, `/lilac health`).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `setWidget` not available in command ctx | Low | High | Fall back to `notify()` multi-line if needed; verify during implementation |
| Model list stale during live fetch | Med | Low | Show note "models refreshing…" when revalidation is in-flight |
| Type errors from `setWidget` signature | Low | Med | Update `types/omp.d.ts` before implementing |

## Success Criteria

- [ ] `/lilac-models` displays a table of all Lilac models with pricing, supply, vision, and context
    - Verify: Type `/lilac-models` in OMP TUI, see formatted table
- [ ] Active model is visually highlighted in the table
    - Verify: Select a Lilac model via `/model`, run `/lilac-models`, see it marked
- [ ] Discounted pricing matches the footer status
    - Verify: Compare `/lilac-models` prices with status bar discount display
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npm test` passes all 12 tests
