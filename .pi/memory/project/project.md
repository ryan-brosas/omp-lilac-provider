# omp-lilac-provider

## Goal
Lilac provider plugin for OMP (Oh My Pi) — Access Kimi K2.6, GLM 5.1, Gemma 4, and MiniMax M2.7 models through Lilac's OpenAI-compatible API on idle GPUs.

## Success Criteria
- Registers as an OMP provider plugin via `index.ts` extension
- Models discoverable via Lilac /v1/models API with stale-while-revalidate caching
- Per-model pricing with subscription discount tracking from /status endpoint
- Chain-of-thought reasoning via `chat_template_kwargs` (all models, qwen-chat-template format)
- Vision support on Kimi K2.6 and Gemma 4
- Context cache read pricing on Kimi K2.6 and GLM 5.1
- OAuth-compatible login flow (`/login lilac`)
- Live model hot-swap: background API fetch → merge with embedded → hot-swap provider
- vLLM phantom tool_use error handling (auto-retry)
- Discount metadata persisted in session JSONL and replayed on session resume

## Current State
- Plugin code is complete in `index.ts` (480+ lines)
- `models.json` — 4 models (Gemma 4, GLM 5.1, Kimi K2.6, MiniMax M2.7)
- `patch.json` — overrides for compat settings (developer role, thinking format, tool stream)
- `custom-models.json` — empty (placeholder for non-API models)
- `scripts/update-models.js` — model sync script with README table generation
- `scripts/test-discounts.ts` — E2E test suite (12 tests)
- GitHub Actions workflow for daily model sync
- No `.pi/` template (just initialized)
- No CI, no linting

## Scope
- In: Provider registration, model discovery, discount tracking, compat settings, error handling
- Out: Custom provider API (uses openai-completions), per-model endpoint routing
