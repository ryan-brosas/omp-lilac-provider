# Tasks: omp-chore-add-typescript-ci-aq3

## 1. Configuration

### 1.1 Create tsconfig.json

```yaml
depends_on: []
parallel: false
files: ["tsconfig.json"]
estimated_minutes: 10
```

- [ ] Create `tsconfig.json` with strict mode targeting NodeNext/ES2022
- [ ] Include `index.ts` and `scripts/*.ts` in compilation
- [ ] Set `skipLibCheck: true` (OMP types aren't in node_modules)
- [ ] Set `noEmit: true` (type-check only, no output)

### 1.2 Add typecheck script to package.json

```yaml
depends_on: ["1.1"]
parallel: false
files: ["package.json"]
estimated_minutes: 2
```

- [ ] Add `"typecheck": "tsc --noEmit"` to `scripts` in package.json
- [ ] Verify `npm run typecheck` runs tsc

## 2. Type Fixes

### 2.1 Fix index.ts type errors

```yaml
depends_on: ["1.1"]
parallel: false
files: ["index.ts"]
estimated_minutes: 20
```

- [ ] Run `npx tsc --noEmit` against current index.ts
- [ ] Catalog all errors (likely: implicit any in fetch callbacks, untyped JSON parse, possibly-null API key)
- [ ] Fix errors systematically:
  - Add explicit types to callback parameters in `pi.on()` handlers
  - Add null guards for `cachedApiKey` usage
  - Type narrow JSON parse results from cache reads
  - Type the `mctx` parameter in `message_end` handler
  - Type the `ctx` parameter in `session_start`, `turn_end`, `before_provider_request` handlers
- [ ] Verify `npx tsc --noEmit` passes

### 2.2 Fix scripts/test-discounts.ts type errors

```yaml
depends_on: ["1.1"]
parallel: true  # Can run in parallel with 2.1
files: ["scripts/test-discounts.ts"]
estimated_minutes: 10
```

- [ ] Run `npx tsc --noEmit` against test-discounts.ts
- [ ] Fix implicit any on mock fetch, mock responses, model arrays
- [ ] Type the `mockApi` and `mockUi` objects against ExtensionAPI interfaces
- [ ] Fix `as any` casts — replace with proper types where possible
- [ ] Verify `npx tsc --noEmit` passes for the test file

### 2.3 Fix scripts/update-models.js (if needed)

```yaml
depends_on: ["1.1"]
parallel: true  # JS file — may not be included in tsconfig
files: ["scripts/update-models.js"]
estimated_minutes: 5
```

- [ ] Check if update-models.js is included in tsconfig (it's .js, may be excluded)
- [ ] If included, either add JSDoc types or exclude via tsconfig `exclude`
- [ ] Decision: exclude .js files from strict checking (they're already working)

## 3. CI Workflow

### 3.1 Create .github/workflows/ci.yml

```yaml
depends_on: []
parallel: true  # Independent of tsconfig creation
files: [".github/workflows/ci.yml"]
estimated_minutes: 15
```

- [ ] Create workflow file with triggers: `push` to main, `pull_request` to main
- [ ] Steps: checkout → setup Node 22 → typecheck (`npx tsc --noEmit`) → test (`node scripts/test-discounts.ts`)
- [ ] Use `ubuntu-latest` runner
- [ ] No `npm install` needed (zero deps)
- [ ] Verify YAML syntax valid

## 4. Verification

### 4.1 Local verification

```yaml
depends_on: ["2.1", "2.2", "2.3", "3.1"]
parallel: false
estimated_minutes: 5
```

- [ ] `npx tsc --noEmit` → exit 0, zero errors
- [ ] `node scripts/test-discounts.ts` → "All tests passed"
- [ ] `npm run typecheck` → exit 0
- [ ] `npm test` → "All tests passed"

### 4.2 CI verification

```yaml
depends_on: ["4.1"]
parallel: false
estimated_minutes: 5
```

- [ ] Push branch to GitHub
- [ ] Check Actions tab — CI workflow runs and passes
- [ ] Verify both typecheck and test steps show green
