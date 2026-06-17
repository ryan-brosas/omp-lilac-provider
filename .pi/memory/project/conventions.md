# Conventions

## Naming
- Provider ID: `lilac`
- Plugin name: `omp-lilac-provider`
- Extension file: `index.ts` (OMP convention for plugin entry)
- Model IDs: `org/model` format (moonshotai/kimi-k2.6, zai-org/glm-5.1, etc.)
- Cache directory: `~/.omp/cache/lilac-*.json`
- Commit prefix: `omp`

## Code Style
- TypeScript with ES modules (`"type": "module"`)
- Type imports from `@oh-my-pi/pi-coding-agent`
- All JSON loading uses `with { type: "json" }` import assertions
- Interface-based typing (JsonModel, JsonDiscount, PatchEntry, etc.)
- Functions over classes (no OOP patterns needed)
- JSDoc for public API surface in index.ts
- Async/await for network operations (fetch, API calls)
- AbortController pattern for cancellable background fetches

## Git Workflow
- Branch per bead via worktrees (br create --worktree)
- Commit at phase boundaries (create, ship, close)
- Prefix: `omp` (omp-001, omp-002, ...)

## Testing
- Node.js runtime tests (scripts/test-discounts.ts)
- Mock fetch with pattern-matched responses
- Assert function for lightweight test assertions
- Temp HOME directory isolation for cache tests

## Data Flow
- models.json (auto-generated) → patch.json (overrides) → custom-models.json (additions)
- Stale-while-revalidate: cached → embedded → live API → hot-swap
- Discount flow: /status endpoint → cached → applied to costs → persisted in session JSONL
