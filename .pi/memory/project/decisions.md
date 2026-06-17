# Decision Log

## 2026-06-18 — Project initialized
- Initialized br workspace with prefix `omp`
- Created .pi/memory/project/ files from pi-core template
- Plugin code is complete and functional (480+ lines, 12 E2E tests)
- Main gaps: no CI beyond daily model sync, no linting/formatting, no TypeScript strict config
- Provider uses openai-completions API (not custom) — Lilac is OpenAI-compatible
- Stale-while-revalidate chosen over blocking fetch for zero-latency startup
- `qwen-chat-template` thinking format chosen as universal format across all 4 model families
- OAuth-style login via `lilacOauth` block with static credentials (API keys don't expire)
- Discount metadata persisted in session JSONL for cross-session continuity
