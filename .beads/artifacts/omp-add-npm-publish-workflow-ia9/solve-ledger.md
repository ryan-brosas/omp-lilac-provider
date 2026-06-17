---
purpose: Step-by-step implementation log
updated: 2026-06-18
---

# Solve Ledger: omp-add-npm-publish-workflow-ia9

## 2026-06-18 — Task 1.1: Add publishConfig to package.json

**What was done:** Added `"publishConfig": { "access": "public" }` to package.json, placed before the `dependencies` block. This ensures npm publishes the package as public (required for scoped packages, explicit for unscoped).

**Files changed:**
- `package.json` — added publishConfig block with access: public

**Verification:**
```bash
node -e "console.log(require('./package.json').publishConfig.access)" → public
```

**Notes:** The `files` whitelist was already correct — npm publish --dry-run confirmed only the 6 whitelisted files + package.json (auto-included).

---

## 2026-06-18 — Task 1.2: Verify files whitelist (dry run)

**What was done:** Ran `npm publish --dry-run` to verify the tarball contains only expected files.

**Files changed:** None (verification only)

**Verification:**
```bash
npm publish --dry-run → 7 files:
  LICENSE, README.md, custom-models.json, index.ts, models.json, package.json, patch.json
  ✓ No .pi/, scripts/, types/, .github/, tsconfig.json, node_modules/
  ✓ All 6 whitelisted files present + package.json (auto-included)
```

**Notes:** The `files` whitelist in package.json correctly excludes dev-only directories. No `.npmignore` needed.

---

## 2026-06-18 — Task 2.1: Create publish workflow

**What was done:** Created `.github/workflows/publish.yml` triggered on `v*` tags. Uses setup-node@v4 with Node 22 and registry-url for npm auth. Steps: checkout → npm ci → npm publish with NODE_AUTH_TOKEN.

**Files changed:**
- `.github/workflows/publish.yml` — new, 27 lines

**Verification:**
```bash
# YAML structure validated — 27 lines, correct GitHub Actions syntax
# Will trigger on v* tags and publish to npm registry
```

**Notes:** Matches existing CI workflow conventions:
- Same runner (ubuntu-latest)
- Same Node version (22)
- Same setup-node action (v4)
- `npm ci` for reproducible installs (validates lockfile)
- `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` — standard npm auth

---

## 2026-06-18 — Task 2.2: Add npm badge to README

**What was done:** Added npm version badge (`[![npm](...)](...)`) to the README badge row, between the OMP plugin badge and the license badge.

**Files changed:**
- `README.md` — added npm badge line 9

**Verification:**
```bash
# Badge renders at https://img.shields.io/npm/v/omp-lilac-provider
# Links to https://www.npmjs.com/package/omp-lilac-provider
```

**Notes:** Badge will show "package not found" until the first publish — expected behavior.

---

## 2026-06-18 — Task 3.1: Full Verification

**What was done:** Ran the full verification stack: typecheck, tests, dry-run, diff audit.

**Verification:**
```bash
npx tsc --noEmit → PASSED (exit 0, zero errors)
node scripts/test-discounts.ts → All 12 tests passed
npm publish --dry-run → 7 correct files, no leaks
git diff --stat → 2 modified + 1 new file (expected)
```

**Notes:** All requirements met. Ready for commit and PR.
