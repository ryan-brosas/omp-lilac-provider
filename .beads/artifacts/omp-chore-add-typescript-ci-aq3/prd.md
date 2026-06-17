# PRD: Add TypeScript Strict Mode + CI Test Workflow

**Bead:** omp-chore-add-typescript-ci-aq3 | **Type:** chore | **Priority:** P2
**Created:** 2026-06-18 | **Estimate:** 60 min

## Problem

WHEN contributors open this repo in an IDE or submit a PR THEN they get no TypeScript errors, no type checking, and no automated test feedback BECAUSE there is no `tsconfig.json`, no type-check script, and no CI workflow for tests.

**Who is affected?** Maintainers and contributors — they can't catch type errors locally or in PRs.
**Why now?** The plugin is feature-complete and the codebase just received pi-core initialization. Quality infrastructure must exist before further feature work.

## Scope

### In Scope
- Add `tsconfig.json` with strict mode (`strict: true`) targeting Node.js + ES modules
- Fix TypeScript type errors that emerge from strict mode (likely: implicit any, possibly-null, etc.)
- Add `typecheck` script to `package.json` (`tsc --noEmit`)
- Add GitHub Actions workflow (`.github/workflows/ci.yml`) that runs `tsc --noEmit` + `node scripts/test-discounts.ts`
- Ensure all 12 existing E2E tests pass in CI

### Out of Scope
- ESLint/Prettier configuration (future bead)
- Adding new unit tests beyond existing test-discounts.ts
- Renovate/Dependabot config
- Coverage reporting
- Publishing to npm

## Requirements

| # | Requirement | Priority | Acceptance Criteria |
|---|------------|----------|-------------------|
| 1 | tsconfig.json with strict mode | MUST | `tsc --noEmit` exits 0 with no errors |
| 2 | typecheck package.json script | MUST | `npm run typecheck` runs tsc |
| 3 | Fix all strict-mode type errors | MUST | Zero type errors in index.ts, scripts/* |
| 4 | CI workflow on push/PR | MUST | `.github/workflows/ci.yml` runs typecheck + tests |
| 5 | CI runs on Node 22+ | MUST | Uses `actions/setup-node` with node 22 |
| 6 | Tests pass in CI | MUST | `node scripts/test-discounts.ts` exits 0 |

## Technical Context

- **Entry point:** `index.ts` — imports `@oh-my-pi/pi-coding-agent` types, loads JSON with import assertions
- **Scripts:** `scripts/update-models.js` (JS, no types), `scripts/test-discounts.ts` (TS, inline types)
- **package.json:** `"type": "module"` — uses ES module import syntax
- **Key type surface:** `ExtensionAPI`, `ModelRegistry`, `JsonModel`, `JsonDiscount`, `PatchEntry` interfaces are all defined in index.ts
- **No existing tsconfig** — types currently validated only by IDE inference

## Approach

1. Create `tsconfig.json` targeting `ES2022`, `NodeNext` module resolution, `strict: true`
2. Run `tsc --noEmit` and catalog all errors
3. Fix errors systematically (add explicit types, null checks, type assertions where justified)
4. Add `"typecheck": "tsc --noEmit"` to package.json scripts
5. Create `.github/workflows/ci.yml` with:
   - Trigger: push to main, PR to main
   - Steps: checkout, setup Node 22, install (none needed — zero deps), typecheck, test
6. Push branch, open PR, verify CI passes

**Alternatives considered:**
- **Skip tsconfig, just add CI** — Rejected. Type safety is the primary value; CI without type checking is half-measure.
- **Add eslint too** — Rejected. Keep bead focused. ESLint is a natural follow-up.
- **Use Deno** — Rejected. OMP runs on Node; keep runtime consistent.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Strict mode reveals deep structural issues | Low | Med | Type errors are fixable; index.ts is already well-typed |
| OMP types not available in CI | Low | High | Use `@oh-my-pi/pi-coding-agent` types already declared inline; no npm install needed |
| test-discounts.ts uses top-level await | Low | Low | Already works with `node` (ES module, no extra flags needed) |
| CI can't fetch without API key | Low | Med | Tests mock fetch — no real API calls |

## Success Criteria

- [ ] `npm run typecheck` passes (zero errors)
  - Verify: `npx tsc --noEmit`
- [ ] All 12 E2E tests pass
  - Verify: `node scripts/test-discounts.ts`
- [ ] CI workflow triggers on push and passes
  - Verify: Check Actions tab after push
- [ ] No regressions in provider behavior
  - Verify: `omp -e /path/to/omp-lilac-provider --model lilac/moonshotai/kimi-k2.6` loads correctly (manual smoke test)
