# Gotchas

## vLLM Streaming Parser Bugs
- **GLM 5.1 phantom tool_use**: vLLM emits `finish_reason: "tool_calls"` without `delta.tool_calls` chunks. Message_end handler converts to retryable error. Tests in test-discounts.ts do NOT cover this — only the `message_end` handler logic.
- **GLM 5.1 CoT leakage**: Disabling reasoning may still leak chain-of-thought into `content`. Post-process to discard up to first ``` marker.

## Model-Specific Quirks
- **Developer role**: GLM, Kimi, and MiniMax chat templates silently drop `role: "developer"` prompts. `supportsDeveloperRole: false` forces OMP to use `role: "system"`.
- **Gemma 4 structured output**: `enable_thinking: false` + `response_format: json_schema` can silently disable structured output. Leave thinking enabled or validate client-side.
- **Gemma 4 reasoning parser**: vLLM can fail to populate `reasoning` field when special tokens are stripped. Post-process `<|channel|>thought ... <|channel|>` markers.

## Cache Management
- Cache directory: `~/.omp/cache/` — must be writable
- Cache files: `lilac-models.json`, `lilac-discounts.json`
- Cache write failures are non-fatal (silently skipped)

## Discount Tracking
- `creditMultiplier` from /status is the effective price factor (not discountPercent)
- Discount caching has 30s TTL via `STATUS_CACHE_TTL_MS`
- Discount data is persisted in session JSONL via `appendEntry` for replay on resume
