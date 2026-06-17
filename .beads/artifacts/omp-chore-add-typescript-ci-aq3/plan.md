# Plan: omp-chore-add-typescript-ci-aq3

**Goal:** Add TypeScript strict mode config, fix all type errors, and add CI test workflow to catch regressions on every push and PR.

## Graph Context

- **Blast radius:** `tsconfig.json` (new), `package.json` (modified), `index.ts` (type fixes), `scripts/update-models.js` (may need type annotations), `.github/workflows/ci.yml` (new)
- **Unblocks:** Future type-safe feature work, ESLint bead (needs tsconfig), any contributor workflow improvements
- **Blocked by:** None
- **Critical path:** No — additive quality work
- **Forecast:** 60 minutes

## Observable Truths

1. `npx tsc --noEmit` exits 0 with zero errors
2. `node scripts/test-discounts.ts` prints "All tests passed" and exits 0
3. CI workflow in GitHub Actions tab shows green check on push/PR
4. `index.ts` still registers the Lilac provider correctly (no runtime behavior change)

## Required Artifacts

| Artifact | Provides | Path | Status |
|----------|----------|------|--------|
| tsconfig.json | TypeScript compiler config | `tsconfig.json` | Need |
| typecheck script | npm run typecheck alias | `package.json` (scripts) | Need |
| ci.yml | GitHub Actions CI workflow | `.github/workflows/ci.yml` | Need |

## Wave Structure

| Wave | Tasks | Parallel? | Preconditions | Verification Gate |
|------|-------|-----------|---------------|-------------------|
| 1 | tsconfig.json + type fixes | No (sequential: config → fix) | None | `npx tsc --noEmit` exits 0 |
| 2 | CI workflow | Yes (independent of Wave 1 code) | None | Workflow file valid YAML |
| 3 | Full verification | No | Wave 1 + 2 | All checks pass |

## Full Verification

```bash
# Type check
npx tsc --noEmit

# Run tests
node scripts/test-discounts.ts

# Verify package.json scripts
npm run typecheck
npm test

# Verify CI workflow syntax
# (manual: push to GitHub and check Actions tab)
```
