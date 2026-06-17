---
purpose: Task decomposition with dependency tracking
updated: 2026-06-18
---

# Tasks: omp-lilac-models-command-w6s

## Task Metadata

```yaml
id: "1.1"
depends_on: []
parallel: true
conflicts_with: []
files: ["types/omp.d.ts"]
estimated_minutes: 5
```

## 1. Setup — Type Declarations + Model Store

### 1.1 Add `setWidget` to UIApi type

```yaml
depends_on: []
parallel: true
files: ["types/omp.d.ts"]
```

- [ ] Add `setWidget(key: string, lines: string[]): void` to `UIApi` interface

### 1.2 Add module-level model list store

```yaml
depends_on: []
parallel: true
files: ["index.ts"]
```

- [ ] Add `let latestModels: JsonModel[] = []` at module scope
- [ ] Update `latestModels` in every `registerProvider()` call site

## 2. Core Implementation

### 2.1 Implement table formatter function

```yaml
depends_on: ["1.1", "1.2"]
parallel: true
files: ["index.ts"]
```

- [ ] Write `formatModelsTable(models, activeModelId, ctx)` that returns `string[]`
- [ ] Columns: Name, Input $/M, Output $/M, Cache $/M, Supply, Discount, Vision, Context
- [ ] Active model row gets `→` prefix and bold/highlight color
- [ ] Zero-cost values show `—`
- [ ] Supply states get descriptive labels (healthy, medium, low, unknown)

### 2.2 Register `/lilac-models` command

```yaml
depends_on: ["2.1"]
parallel: false
files: ["index.ts"]
```

- [ ] Call `pi.registerCommand("lilac-models", { description, handler })` in extension factory
- [ ] Handler builds table from `latestModels` and current `ctx.model`
- [ ] Display via `ctx.ui.setWidget("lilac-models", lines)` 
- [ ] Fallback to `ctx.ui.notify()` if `setWidget` is unavailable

### 2.3 Add `/lilac models` alias via input handler

```yaml
depends_on: ["2.2"]
parallel: true
files: ["index.ts"]
```

- [ ] Register `pi.on("input", ...)` handler that matches `/lilac models` 
- [ ] Transform to `/lilac-models` internally

## 3. Testing

### 3.1 Add command registration test

```yaml
depends_on: ["2.3"]
parallel: true
files: ["scripts/test-discounts.ts"]
```

- [ ] Verify `pi.registerCommand` is called with `"lilac-models"`
- [ ] Verify `pi.on("input", ...)` is registered for the alias
- [ ] Test that the handler produces output for each model in `latestModels`

### 3.2 Add table formatter unit test

```yaml
depends_on: ["2.1"]
parallel: true
files: ["scripts/test-discounts.ts"]
```

- [ ] Test with known models and discounts
- [ ] Verify active model highlighting
- [ ] Verify zero-cost display as `—`
- [ ] Verify supply state labels

## 4. Verification

### 4.1 TypeScript compilation

```yaml
depends_on: ["2.3"]
parallel: false
```

- [ ] `npx tsc --noEmit` exits 0 with zero errors

### 4.2 All tests pass

```yaml
depends_on: ["3.1", "3.2"]
parallel: false
```

- [ ] `npm test` passes all tests (12 original + new tests)

### 4.3 Manual smoke test

```yaml
depends_on: ["4.1", "4.2"]
parallel: false
```

- [ ] Type `/lilac-models` in OMP — table appears
- [ ] Type `/lilac models` — same result
- [ ] Select a Lilac model, run command — it's highlighted
- [ ] Select a non-Lilac model, run command — no highlight
