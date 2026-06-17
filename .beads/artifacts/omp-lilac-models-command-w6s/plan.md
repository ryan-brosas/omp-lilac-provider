---
purpose: Wave-sequenced implementation plan
updated: 2026-06-18
---

# Plan: omp-lilac-models-command-w6s

**Goal:** Add a `/lilac-models` slash command that displays a formatted table of all Lilac models with real-time pricing, supply states, and capabilities.

## Graph Context

- **Blast radius:** `index.ts` (+30 lines), `types/omp.d.ts` (+1 line), `scripts/test-discounts.ts` (+test case)
- **Unblocks:** Interactive model selection from table (future bead), `/lilac status` health command (future bead)
- **Blocked by:** None — all infrastructure is in place
- **Critical path:** No
- **Forecast:** 60 minutes, 3 waves

## Observable Truths

What must be TRUE for the goal to be achieved:

1. **User can type `/lilac-models` and see a formatted table** — Table shows all Lilac models with name, input/output/cache pricing (discounted), supply state, discount %, vision support, context window
2. **Active model is visually distinct** — The currently selected Lilac model is marked with an indicator (e.g., `→` prefix, bold, or color)
3. **Pricing is consistent** — The prices shown in `/lilac-models` match the per-model costs tracked in the footer status bar
4. **TypeScript compiles cleanly** — `npx tsc --noEmit` exits 0 with zero errors across all files
5. **Existing tests pass** — All 12 discount tests continue to pass, and the new command is tested

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| Module-level model store | Command handler access to current models | `index.ts` | Need |
| `/lilac-models` command registration | Slash command entry point | `index.ts` | Need |
| `/lilac models` alias via input handler | Natural-language command alias | `index.ts` | Need |
| Table formatter | Model data → formatted display lines | `index.ts` | Need |
| `setWidget` type declaration | TypeScript compilation | `types/omp.d.ts` | Need |
| Command test case | Regression safety | `scripts/test-discounts.ts` | Need |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | Type declarations, model store, command registration | Yes | None | `npx tsc --noEmit` |
| 2 | Table formatter, `/lilac models` alias | No | Wave 1 | Command displays table in OMP |
| 3 | Tests, full verification | No | Wave 2 | `npm test` passes, manual smoke test |

## Tasks

Detailed task decomposition: see `tasks.md` in the same artifact directory.

## Full Verification

```bash
cd /home/ryan/repos/omp-lilac-provider
npx tsc --noEmit                    # Zero type errors
npm test                            # All 13 tests pass
node -e "require('./index.ts')"     # No import errors
```
