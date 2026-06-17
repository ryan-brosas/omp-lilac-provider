# Decisions: omp-chore-add-typescript-ci-aq3

## Decision Log

### 1. tsconfig target and module resolution
**Decision:** Use `target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `strict: true`
**Rationale:** Matches Node 22+ capabilities and OMP's ES module convention (`"type": "module"`). NodeNext is required for import assertions (`with { type: "json" }`).
**Rejected:** `ESNext` — too bleeding edge for a plugin consumed by OMP. `Bundler` module resolution — doesn't match OMP's Node.js runtime.

### 2. CI trigger: push only or PR too?
**Decision:** Trigger on both `push` to main and `pull_request` to main
**Rationale:** Run on every push to main for post-merge verification, and on every PR for pre-merge gating. Standard GitHub Actions pattern.
**Rejected:** Push-only — misses pre-merge feedback. PR-only — misses post-merge verification if someone pushes directly to main (though discouraged).

### 3. No npm install step in CI
**Decision:** Skip `npm install` — the project has zero runtime dependencies.
**Rationale:** `tsc` doesn't need node_modules for type checking since `@oh-my-pi/pi-coding-agent` types are not npm-installed (they're consumed by OMP's runtime). The test script uses only stdlib.
**Rejected:** Installing types — would require an internal OMP types package not published to npm. Instead, rely on the inline interface declarations.

### 4. TypeScript installed as devDependency or npx?
**Decision:** Use `npx tsc --noEmit` in CI; add `typescript` as devDependency for local dev.
**Rationale:** `npx` downloads TypeScript on demand in CI (no lockfile needed). For local development, `npm install --save-dev typescript` provides IDE integration.
**Rejected:** Global TypeScript install — fragile across environments.

## Rejected Alternatives
- **Bundled build with esbuild/tsup**: Unnecessary — OMP loads .ts directly
- **Jest/Vitest test runner**: Overkill — test-discounts.ts uses bare assert and works fine with `node`
- **Matrix CI across Node versions**: Premature — one version (22) is sufficient for a plugin
