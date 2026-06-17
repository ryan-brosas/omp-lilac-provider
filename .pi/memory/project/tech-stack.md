# Tech Stack

## Runtime
- **TypeScript** — Primary language (strict mode, ES modules)
- **Node.js** — Runtime for scripts and OMP extension host
- **OMP** (`@oh-my-pi/pi-coding-agent`) — Extension API host

## Key APIs
- **ExtensionAPI** — `registerProvider`, `on`, `setStatus`, `appendEntry`, `exec`
- **ModelRegistry** — `getApiKeyForProvider` for OAuth-style key resolution

## Dependencies
- None (zero runtime dependencies)
- Stdlib: `fs`, `os`, `path`

## Provider API
- Lilac API: `https://api.getlilac.com/v1` (OpenAI-compatible)
- Models endpoint: `GET /v1/models`
- Status endpoint: `GET /status` (discount metadata)
- Auth: Bearer token via `LILAC_API_KEY` env var or OAuth login

## Build/Test
- No build step (OMP loads .ts directly)
- Test: `node scripts/test-discounts.ts` (12 E2E tests)
- Model sync: `node scripts/update-models.js` (fetches API → writes models.json + README)

## CI
- GitHub Actions: daily model sync workflow (fetches API → creates PR if changed)
