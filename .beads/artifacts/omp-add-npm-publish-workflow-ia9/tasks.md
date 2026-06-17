# Tasks: omp-add-npm-publish-workflow-ia9

## 1. Configuration

### 1.1 Add publishConfig to package.json

```yaml
depends_on: []
parallel: false
files: ["package.json"]
estimated_minutes: 3
```

- [ ] Add `"publishConfig": { "access": "public" }` to package.json
- [ ] Verify: `node -e "console.log(require('./package.json').publishConfig.access)"` prints `public`
- [ ] Verify npm dry-run shows correct files: `npm publish --dry-run 2>&1 | grep -c "index.ts"` returns 1

### 1.2 Verify files whitelist is correct (dry run)

```yaml
depends_on: ["1.1"]
parallel: false
files: ["package.json"]
estimated_minutes: 5
```

- [ ] Run `npm publish --dry-run` and inspect Tarball Contents
- [ ] Confirm only 6 files: index.ts, models.json, custom-models.json, patch.json, README.md, LICENSE (+ package.json auto-included)
- [ ] Confirm no `.pi/`, `scripts/`, `types/`, `.github/`, `tsconfig.json` in tarball
- [ ] If any unwanted files appear, add them to `.gitignore` or adjust `files` whitelist

## 2. Workflow

### 2.1 Create publish workflow

```yaml
depends_on: ["1.1"]
parallel: false
files: [".github/workflows/publish.yml"]
estimated_minutes: 10
```

- [ ] Create `.github/workflows/publish.yml`
- [ ] Trigger: `on.push.tags: ['v*']`
- [ ] Job: ubuntu-latest, Node 22 via `actions/setup-node@v4`
- [ ] Steps: checkout → npm ci → npm publish
- [ ] `registry-url: 'https://registry.npmjs.org'` in setup-node
- [ ] `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` env var for publish step
- [ ] Verify YAML syntax: `npx actionlint .github/workflows/publish.yml`

### 2.2 Add npm package badge to README

```yaml
depends_on: ["2.1"]
parallel: false
files: ["README.md"]
estimated_minutes: 5
```

- [ ] Add npm version badge: `[![npm](https://img.shields.io/npm/v/omp-lilac-provider)](https://www.npmjs.com/package/omp-lilac-provider)`
- [ ] Place in the badge row alongside existing OMP plugin badge

## 3. Verification

### 3.1 Local verification

```yaml
depends_on: ["2.1", "2.2"]
parallel: false
estimated_minutes: 5
```

- [ ] `npx tsc --noEmit` → exit 0 (no regressions)
- [ ] `node scripts/test-discounts.ts` → "All tests passed" (no regressions)
- [ ] `npm publish --dry-run` shows only expected files
- [ ] `npx actionlint .github/workflows/publish.yml` → no errors
- [ ] `git diff --stat` shows only expected changes: package.json, README.md, .github/workflows/publish.yml

### 3.2 CI verification (post-push)

```yaml
depends_on: ["3.1"]
parallel: false
estimated_minutes: 5
```

- [ ] Push branch to GitHub (bead branch)
- [ ] CI workflow (typecheck + test) passes in Actions tab
- [ ] (Manual, post-merge) Push a `v*` tag and verify publish workflow triggers in Actions tab
