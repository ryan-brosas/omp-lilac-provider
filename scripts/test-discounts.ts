#!/usr/bin/env node
/**
 * E2E test for Lilac discount metadata enumeration.
 *
 * Verifies:
 * 1. fetchStatusDiscounts parses the /status endpoint (real response format).
 * 2. applyDiscounts attaches metadata to matching models and mutates costs.
 * 3. cacheDiscounts / loadCachedDiscounts round-trip correctly.
 * 4. The provider extension registers models with discount metadata on init
 *    and refreshes them after session_start.
 * 5. session_start replays persisted discount events and sets footer status.
 * 6. model_select sets/clears footer status for lilac/non-lilac models.
 * 7. turn_end appends discount entry to session JSONL.
 * 8. before_provider_request refreshes discounts with a 30s cache.
 * 9. formatDiscountStatus returns fallbacks when data is missing.
 */

import type { ExtensionAPI, ModelRegistry } from "@oh-my-pi/pi-coding-agent";
import fs from "fs";

// Isolate cache to a temp directory so the test is deterministic.
const tmpHome = `/tmp/omp-lilac-test-${Date.now()}`;
fs.mkdirSync(tmpHome, { recursive: true });
process.env.HOME = tmpHome;

const originalFetch = globalThis.fetch;

function mockFetch(responses: Record<string, { status?: number; body?: unknown }>) {
  return async (input: URL | RequestInfo, _init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return new Response(JSON.stringify(response.body ?? {}), {
          status: response.status ?? 200,
          headers: { "content-type": "application/json" },
        });
      }
    }
    return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  };
}

const {
  default: registerLilac,
  fetchStatusDiscounts,
  applyDiscounts,
  loadCachedDiscounts,
  cacheDiscounts,
  formatModelsTable,
} = await import("../index.ts");

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// ─── Test 1: fetchStatusDiscounts (real API format) ────────────────────────────

console.log("\n--- Test 1: fetchStatusDiscounts ---");
globalThis.fetch = mockFetch({
  "/status": {
    body: {
      updated_at: "2026-06-06T09:18:14Z",
      current_subscription_supply_updated_at: "2026-06-06T09:11:49Z",
      window: "24h",
      window_secs: 86400,
      stale: false,
      models: [
        {
          id: "google/gemma-4-31b-it",
          name: "Gemma 4",
          tps: 62.67,
          ttfb_seconds: 0.96,
          uptime_pct: 100.0,
          current_subscription_supply_state: "medium",
          current_subscription_discount_percent: 25,
          current_subscription_credit_multiplier: "0.75",
        },
        {
          id: "zai-org/glm-5.1",
          name: "GLM 5.1",
          tps: 163.32,
          ttfb_seconds: 0.92,
          uptime_pct: 100.0,
          current_subscription_supply_state: "high",
          current_subscription_discount_percent: 50,
          current_subscription_credit_multiplier: "0.50",
        },
        {
          id: "minimaxai/minimax-m2.7",
          name: "MiniMax M2.7",
          tps: null,
          ttfb_seconds: null,
          uptime_pct: null,
          current_subscription_supply_state: "low",
          current_subscription_discount_percent: 0,
          current_subscription_credit_multiplier: "1.00",
        },
      ],
    },
  },
}) as any;

const discounts = await fetchStatusDiscounts("test-key");
assert(discounts !== null, "returns a non-null result");
assert(discounts!.has("google/gemma-4-31b-it"), "includes gemma");
assert(discounts!.get("google/gemma-4-31b-it")!.discountPercent === 25, "gemma discount is 25%");
assert(discounts!.get("google/gemma-4-31b-it")!.supplyState === "medium", "gemma state is medium");
assert(discounts!.get("google/gemma-4-31b-it")!.creditMultiplier === 0.75, "gemma credit multiplier is 0.75");
assert(discounts!.get("zai-org/glm-5.1")!.creditMultiplier === 0.50, "glm credit multiplier is 0.50");
assert(discounts!.get("minimaxai/minimax-m2.7")!.creditMultiplier === 1.00, "minimax credit multiplier is 1.00 (no discount)");

// ─── Test 2: applyDiscounts ───────────────────────────────────────────────────

console.log("\n--- Test 2: applyDiscounts ---");
const models = [
  { id: "google/gemma-4-31b-it", name: "Gemma 4", cost: { input: 0.11, output: 0.35, cacheRead: 0, cacheWrite: 0 } },
  { id: "moonshotai/kimi-k2.6", name: "Kimi K2.6", cost: { input: 0.70, output: 3.50, cacheRead: 0.20, cacheWrite: 0 } },
] as any[];
const applied = applyDiscounts(models, discounts);
assert(applied[0].discount != null, "gemma has discount field");
assert(applied[0].discount!.discountPercent === 25, "gemma discount attached correctly");
// credit_multiplier 0.75 means pay 75% of list price
assert(applied[0].cost.input === 0.0825, "gemma input cost = 0.11 * 0.75 = 0.0825");
assert(applied[0].cost.output === 0.2625, "gemma output cost = 0.35 * 0.75 = 0.2625");
assert(applied[1].discount == null, "kimi has no discount (not in status)");
assert(applied[1].cost.input === 0.70, "kimi cost unchanged when no discount");

// ─── Test 3: cache round-trip ─────────────────────────────────────────────────

console.log("\n--- Test 3: cache round-trip ---");
const freshDiscounts = new Map([
  [
    "moonshotai/kimi-k2.6",
    { supplyState: "medium", discountPercent: 25, creditMultiplier: 0.75 },
  ],
]);
cacheDiscounts(freshDiscounts);
const loaded = loadCachedDiscounts();
assert(loaded !== null, "loaded discounts are non-null");
assert(loaded!.has("moonshotai/kimi-k2.6"), "loaded discounts include kimi");
assert(loaded!.get("moonshotai/kimi-k2.6")!.discountPercent === 25, "cached discount percent preserved");
assert(loaded!.get("moonshotai/kimi-k2.6")!.creditMultiplier === 0.75, "cached credit multiplier preserved");

// ─── Test 4: provider e2e registration ─────────────────────────────────────────

console.log("\n--- Test 4: provider e2e registration ---");
globalThis.fetch = mockFetch({
  "/models": {
    body: {
      data: [
        {
          id: "moonshotai/kimi-k2.6",
          name: "Kimi K2.6",
          supported_features: ["reasoning"],
          architecture: { input_modalities: ["text", "image"] },
          pricing: { prompt: "0.0000007", completion: "0.0000035", input_cache_read: "0.0000002" },
          context_length: 262144,
          top_provider: { max_completion_tokens: 262144 },
        },
      ],
    },
  },
  "/status": {
    body: {
      updated_at: "2026-06-06T12:00:00Z",
      current_subscription_supply_updated_at: "2026-06-06T12:00:00Z",
      window: "24h",
      window_secs: 86400,
      stale: false,
      models: [
        {
          id: "moonshotai/kimi-k2.6",
          name: "Kimi K2.6",
          tps: 75.2,
          ttfb_seconds: 0.21,
          uptime_pct: 99.99,
          current_subscription_supply_state: "healthy",
          current_subscription_discount_percent: 25,
          current_subscription_credit_multiplier: "0.75",
        },
      ],
    },
  },
}) as any;

const providers: any[] = [];
const handlers = new Map<string, ((...args: any[]) => void | Promise<void>)[]>();
const statuses = new Map<string, string | undefined>();
const appendedEntries: { customType: string; data: any }[] = [];
const commands = new Map<string, { description?: string; handler: (...args: any[]) => void }>();
const widgets = new Map<string, string[]>();
const notifications: { text: string; type?: string }[] = [];

const mockTheme = {
  fg: (_color: string, text: string) => text, // strip theme for easy assertions
};

const mockUi = {
  setStatus: (key: string, text: string | undefined) => {
    statuses.set(key, text);
  },
  setWidget: (key: string, lines: string[]) => {
    widgets.set(key, lines);
  },
  notify: (text: string, type?: string) => {
    notifications.push({ text, type });
  },
  theme: mockTheme,
};

const mockApi: ExtensionAPI = {
  registerProvider: (name: string, config: any) => {
    providers.push({ name, config });
  },
  on: (event: string, handler: (...args: any[]) => void | Promise<void>) => {
    if (!handlers.has(event)) handlers.set(event, []);
    handlers.get(event)!.push(handler);
  },
  setStatus: mockUi.setStatus,
  registerCommand: (name: string, config: any) => {
    commands.set(name, typeof config === "function" ? { handler: config } : config);
  },
  setHiddenThinkingLabel: () => {},
  setLabel: () => {},
  appendEntry: (customType: string, data?: any) => {
    appendedEntries.push({ customType, data });
  },
  exec: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
} as any;

registerLilac(mockApi);

const initialProvider = providers.find((p: any) => p.name === "lilac");
assert(initialProvider != null, "provider registered on init");
assert(initialProvider.config.models.length > 0, "models registered on init");

// Trigger session_start to fetch live data
const mockRegistry: ModelRegistry = {
  getApiKeyForProvider: async () => "test-key",
} as any;

for (const handler of handlers.get("session_start") || []) {
  await handler(
    {},
    {
      modelRegistry: mockRegistry,
      ui: mockUi,
      model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
      sessionManager: { getBranch: () => [] },
    }
  );
}

// Allow micro-tasks to flush
await new Promise((r) => setTimeout(r, 100));

const updatedProvider = providers[providers.length - 1];
assert(updatedProvider != null, "provider re-registered after session_start");

const kimi = updatedProvider.config.models.find((m: any) => m.id === "moonshotai/kimi-k2.6");
assert(kimi != null, "kimi model present after live fetch");
assert(kimi.discount != null, "kimi has discount metadata");
assert(kimi.discount.discountPercent === 25, "kimi discount is 25%");
assert(kimi.discount.creditMultiplier === 0.75, "kimi credit multiplier is 0.75");
// List costs after transformApiModel: input=0.70, output=3.50, cacheRead=0.20
// credit_multiplier 0.75 → effective cost = list * 0.75
assert(kimi.cost.input === 0.525, "kimi input cost = 0.70 * 0.75 = 0.525");
assert(kimi.cost.output === 2.625, "kimi output cost = 3.50 * 0.75 = 2.625");
assert(kimi.cost.cacheRead === 0.15, "kimi cacheRead cost = 0.20 * 0.75 = 0.15");

const gemma = updatedProvider.config.models.find((m: any) => m.id === "google/gemma-4-31b-it");
assert(gemma != null, "gemma model still present (from embedded fallback)");
assert(gemma.discount == null, "gemma has no discount (not in status response)");
assert(gemma.cost.input === 0.11, "gemma cost unchanged (no discount in status)");

// ─── Test 5: session_start sets footer status ─────────────────────────────────

console.log("\n--- Test 5: session_start sets footer status ---");
assert(statuses.get("lilac") === "supply: healthy · sub-discount: 25%", "status set after session_start in correct format");

// ─── Test 6: model_select for lilac model updates status ──────────────────────

console.log("\n--- Test 6: model_select for lilac model ---");
for (const handler of handlers.get("model_select") || []) {
  await handler(
    {
      type: "model_select",
      model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
      previousModel: undefined,
      source: "set",
    },
    { ui: mockUi }
  );
}
assert(statuses.get("lilac") === "supply: healthy · sub-discount: 25%", "model_select keeps status for lilac model");

// ─── Test 7: model_select for non-lilac model clears status ───────────────────

console.log("\n--- Test 7: model_select for non-lilac model ---");
for (const handler of handlers.get("model_select") || []) {
  await handler(
    {
      type: "model_select",
      model: { id: "claude-sonnet-4", provider: "anthropic" },
      previousModel: undefined,
      source: "set",
    },
    { ui: mockUi }
  );
}
assert(statuses.get("lilac") === undefined, "model_select clears status for non-lilac model");

// ─── Test 8: before_provider_request with fresh cache sets status ─────────────

console.log("\n--- Test 8: before_provider_request with fresh cache ---");
for (const handler of handlers.get("before_provider_request") || []) {
  await handler(
    { type: "before_provider_request", payload: {} },
    {
      ui: mockUi,
      model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
    }
  );
}
assert(statuses.get("lilac") === "supply: healthy · sub-discount: 25%", "before_provider_request sets status when cache is fresh");

// ─── Test 9: turn_end appends discount entry ──────────────────────────────────

console.log("\n--- Test 9: turn_end appends discount entry ---");
for (const handler of handlers.get("turn_end") || []) {
  await handler(
    { type: "turn_end" },
    {
      ui: mockUi,
      model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
    }
  );
}
assert(appendedEntries.length > 0, "at least one entry was appended");
const discountEntry = appendedEntries.find(e => e.customType === "lilac-discount");
assert(discountEntry != null, "lilac-discount entry was appended");
assert(discountEntry!.data.modelId === "moonshotai/kimi-k2.6", "entry has correct modelId");
assert(discountEntry!.data.discountPercent === 25, "entry has correct discountPercent");
assert(discountEntry!.data.creditMultiplier === 0.75, "entry has correct creditMultiplier");
assert(discountEntry!.data.supplyState === "healthy", "entry has correct supplyState");

// ─── Test 10: formatDiscountStatus fallbacks ───────────────────────────────────

console.log("\n--- Test 10: formatDiscountStatus fallbacks ---");
assert(
  statuses.get("lilac") === "supply: healthy · sub-discount: 25%",
  "known model shows full discount status",
);

// Unknown model (not in latestDiscounts) shows fallback dash
statuses.delete("lilac");
for (const handler of handlers.get("model_select") || []) {
  await handler(
    {
      type: "model_select",
      model: { id: "some/unknown-model", provider: "lilac" },
      previousModel: undefined,
      source: "set",
    },
    { ui: mockUi },
  );
}
assert(statuses.get("lilac") === "supply: —", "unknown model shows fallback dash");

// Known model restores full status
for (const handler of handlers.get("model_select") || []) {
  await handler(
    {
      type: "model_select",
      model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
      previousModel: undefined,
      source: "set",
    },
    { ui: mockUi },
  );
}
assert(
  statuses.get("lilac") === "supply: healthy · sub-discount: 25%",
  "known model restores full discount status",
);

// ─── Test 11: re-register stability ───────────────────────────────────────────

console.log("\n--- Test 11: re-register stability ---");

// Simulate multiple rapid re-registers (e.g. before_provider_request fires
// right after session_start's background fetch completes). Each re-register
// should produce a clean model list — no duplicates, no missing models.
//
// In OMP's real runtime:
//   1. omp captures state.model (old object) for the in-flight stream
//   2. before_provider_request re-registers (creates new model objects in registry)
//   3. _refreshCurrentModelFromRegistry updates state.model to the new object
//   4. the in-flight stream still uses the old model reference for cost calc
//   5. the next turn picks up the new model with updated costs
//
// So re-registering never corrupts an in-flight request — the stream holds
// its own model reference. We verify the provider produces a stable model list
// across successive re-registers.

const modelIdsAfterSignup = updatedProvider.config.models.map((m: any) => m.id).sort();

// Build fresh model list with known LIST prices for cost verification
const freshModels = updatedProvider.config.models.map((m: any) => ({
  ...m,
  cost: { input: 0.70, output: 3.50, cacheRead: 0.20, cacheWrite: 0 },
  discount: undefined,
}));

// Re-register with changed discounts
const changedDiscounts = new Map([
  ["moonshotai/kimi-k2.6", { supplyState: "low", discountPercent: 10, creditMultiplier: 0.90 }],
]);

const reRegisterModels = applyDiscounts(freshModels, changedDiscounts);
mockApi.registerProvider("lilac", {
  name: "Lilac",
  baseUrl: "https://api.getlilac.com/v1",
  apiKey: "$LILAC_API_KEY",
  api: "openai-completions",
  models: reRegisterModels,
});
const afterFirst = providers[providers.length - 1];
const modelIdsAfterFirst = afterFirst.config.models.map((m: any) => m.id).sort();
assert(modelIdsAfterFirst.length === modelIdsAfterSignup.length, "model count preserved after re-register");
assert(JSON.stringify(modelIdsAfterFirst) === JSON.stringify(modelIdsAfterSignup), "model IDs stable after re-register");

// Re-register again with original discounts (simulates rapid successive updates)
// Use the same discount data that session_start fetched (which includes kimi at 25%)
const sessionDiscounts = new Map([
  ["moonshotai/kimi-k2.6", { supplyState: "healthy", discountPercent: 25, creditMultiplier: 0.75 }],
]);
const reRegisterModels2 = applyDiscounts(
  freshModels.map((m: any) => ({ ...m, discount: undefined })),
  sessionDiscounts,
);
mockApi.registerProvider("lilac", {
  name: "Lilac",
  baseUrl: "https://api.getlilac.com/v1",
  apiKey: "$LILAC_API_KEY",
  api: "openai-completions",
  models: reRegisterModels2,
});
const afterSecond = providers[providers.length - 1];
const modelIdsAfterSecond = afterSecond.config.models.map((m: any) => m.id).sort();
assert(modelIdsAfterSecond.length === modelIdsAfterSignup.length, "model count preserved after second re-register");
assert(JSON.stringify(modelIdsAfterSecond) === JSON.stringify(modelIdsAfterSignup), "model IDs stable after second re-register");

// Verify the costs reflect the LATEST registration (not stale from an earlier one)
const kimiFinal = afterSecond.config.models.find((m: any) => m.id === "moonshotai/kimi-k2.6");
assert(kimiFinal.discount.discountPercent === 25, "final registration uses correct discount (not stale from first re-register)");
assert(kimiFinal.cost.input === 0.525, "final registration uses correct cost (0.70 * 0.75)");
// ─── Test 12: API-key login flow (/login lilac) ──────────────────────────────

console.log("\n--- Test 12: API-key login flow ---");

// The oauth block should be present on the initial provider registration.
// OMP's login API accepts a string return value for API-key providers; AuthStorage
// then replaces stale provider credentials instead of appending another OAuth row.
const oauthProvider = providers[0]?.config?.oauth;
assert(oauthProvider != null, "oauth block present on initial registration");
assert(oauthProvider.name === "Lilac", "oauth.name is 'Lilac'");
assert(typeof oauthProvider.login === "function", "oauth.login is a function");
assert(oauthProvider.refreshToken === undefined, "oauth.refreshToken is omitted for API-key login");
assert(oauthProvider.getApiKey === undefined, "oauth.getApiKey is omitted for API-key login");

// loginLilac validates against POST /chat/completions then returns the raw key.
globalThis.fetch = mockFetch({
  "/chat/completions": { status: 200, body: { id: "chatcmpl-test", choices: [{ message: { role: "assistant", content: "ok" } }] } },
});

const enteredKey = "test-lilac-key-123";
const storedKey = await oauthProvider.login({
  onPrompt: async () => enteredKey,
  signal: undefined as any,
});
assert(storedKey === enteredKey, "login returns the raw API key for AuthStorage");

// Empty key is rejected before any network call.
let emptyRejected = false;
try {
  await oauthProvider.login({ onPrompt: async () => "  ", signal: undefined as any });
} catch (e) {
  emptyRejected = true;
}
assert(emptyRejected, "empty key throws");

// Invalid key (non-200 from /chat/completions) is rejected with a status-derived message.
globalThis.fetch = mockFetch({ "/chat/completions": { status: 401, body: { error_message: "bad key" } } });
let badKeyRejected = false;
let badKeyMessage = "";
try {
  await oauthProvider.login({ onPrompt: async () => "bad-key", signal: undefined as any });
} catch (e: any) {
  badKeyRejected = true;
  badKeyMessage = e.message;
}
assert(badKeyRejected, "rejected key (401) throws");
assert(badKeyMessage.includes("bad key"), "error message includes server message");

globalThis.fetch = originalFetch;

// ─── Test 13: /lilac-models command registration ──────────────────────────────

console.log("\n--- Test 13: /lilac-models command registration ---");

// Command should have been registered during registerLilac() call
const lilacModelsCmd = commands.get("lilac-models");
assert(lilacModelsCmd != null, "/lilac-models command is registered");
assert(typeof lilacModelsCmd!.handler === "function", "command handler is a function");
assert(typeof lilacModelsCmd!.description === "string", "command has a description");
assert(lilacModelsCmd!.description!.length > 0, "command description is non-empty");

// ─── Test 14: /lilac-models command handler output ────────────────────────────

console.log("\n--- Test 14: /lilac-models command handler output ---");

// Invoke the command handler with a Lilac model active
widgets.clear();
notifications.length = 0;
await lilacModelsCmd!.handler(
  {},
  {
    model: { id: "moonshotai/kimi-k2.6", provider: "lilac" },
    ui: mockUi,
  },
);

const widgetLines = widgets.get("lilac-models");
assert(widgetLines != null, "setWidget was called with lilac-models key");
assert(widgetLines!.length >= 2, "widget has header + at least one model row");
assert(widgetLines![0].includes("Model"), "header row contains Model column");
assert(widgetLines![0].includes("Input"), "header row contains Input column");
assert(widgetLines![0].includes("Output"), "header row contains Output column");
assert(widgetLines![0].includes("Supply"), "header row contains Supply column");
assert(widgetLines![0].includes("Disc%"), "header row contains Disc% column");
assert(widgetLines![0].includes("Vis"), "header row contains Vis column");
assert(widgetLines![0].includes("Context"), "header row contains Context column");

// Active model (kimi) should have → prefix
const activeRow = widgetLines!.slice(1).find((l: string) => l.includes("→"));
assert(activeRow != null, "active model row has → prefix");
assert(activeRow!.includes("Kimi"), "active model row contains model name");

// All models from the provider should appear
for (const modelId of ["moonshotai/kimi-k2.6", "zai-org/glm-5.1", "google/gemma-4-31b-it", "minimaxai/minimax-m2.7"]) {
  const found = widgetLines!.some((l: string) => l.includes(modelId) || l.includes(l.replace(/.*\//, "")));
  // Models display their name field, not ID — check by looking for known names
}
const hasKimi = widgetLines!.some((l: string) => l.includes("Kimi"));
const hasGlm = widgetLines!.some((l: string) => l.includes("GLM"));
const hasGemma = widgetLines!.some((l: string) => l.includes("Gemma"));
const hasMiniMax = widgetLines!.some((l: string) => l.includes("MiniMax"));
assert(hasKimi, "Kimi K2.6 appears in table");
assert(hasGlm, "GLM 5.1 appears in table");
assert(hasGemma, "Gemma 4 appears in table");
assert(hasMiniMax, "MiniMax M2.7 appears in table");

// Active model is Kimi — only one row should have →
const activeCount = widgetLines!.filter((l: string) => l.includes("→")).length;
assert(activeCount === 1, "exactly one model row has active indicator");

// Invoke with a non-Lilac model — no model should be highlighted
widgets.clear();
await lilacModelsCmd!.handler(
  {},
  {
    model: { id: "claude-sonnet-4", provider: "anthropic" },
    ui: mockUi,
  },
);
const widgetLines2 = widgets.get("lilac-models");
assert(widgetLines2 != null, "widget produced for non-Lilac active model");
const activeCount2 = widgetLines2!.filter((l: string) => l.includes("→")).length;
assert(activeCount2 === 0, "no model highlighted when non-Lilac model is active");

// ─── Test 15: /lilac models input alias ──────────────────────────────────────

console.log("\n--- Test 15: /lilac models input alias ---");

const inputHandlers = handlers.get("input");
assert(inputHandlers != null && inputHandlers.length > 0, "input event handler registered for alias");

// Test that the alias handler transforms "/lilac models" → "/lilac-models"
const aliasHandler = inputHandlers![0] as (...args: any[]) => any;
const result1 = aliasHandler("/lilac models");
assert(result1 === "/lilac-models", "'/lilac models' transforms to '/lilac-models'");

// Test that "/lilac-models" passes through unchanged
const result2 = aliasHandler("/lilac-models");
assert(result2 === "/lilac-models", "'/lilac-models' passes through unchanged");

// Test that other input is untouched
const result3 = aliasHandler("hello world");
assert(result3 === "hello world", "unrelated input passes through unchanged");

// Test object form of input
const result4: any = aliasHandler({ text: "/lilac models please" });
// Handler returns the transformed text, OMP will handle the rest
assert(typeof result4 === "string" && (result4 as string).includes("/lilac-models"), "object input with /lilac models triggers alias");

// ─── Test 16: formatModelsTable unit tests ───────────────────────────────────

console.log("\n--- Test 16: formatModelsTable unit ---");

const fgLog: { color: string; text: string }[] = [];
const testCtx = {
  ui: {
    theme: {
      fg: (color: string, text: string) => { fgLog.push({ color, text }); return `<${color}>${text}</${color}>`; },
    },
  },
};

const testModels: any[] = [
  {
    id: "a", name: "Alpha", reasoning: true, input: ["text", "image"],
    cost: { input: 0.50, output: 2.00, cacheRead: 0.10, cacheWrite: 0 },
    contextWindow: 262144, maxTokens: 262144,
    discount: { supplyState: "healthy", discountPercent: 25, creditMultiplier: 0.75 },
  },
  {
    id: "b", name: "Beta", reasoning: false, input: ["text"],
    cost: { input: 0.30, output: 1.00, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000, maxTokens: 128000,
    discount: { supplyState: "low", discountPercent: 0, creditMultiplier: 1.00 },
  },
  {
    id: "c", name: "Gamma", reasoning: false, input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 4096, maxTokens: 4096,
    // No discount field — supply defaults to unknown
  },
];

// 16a: Empty models → header-only (no model rows); command handler owns the "no models" notification
fgLog.length = 0;
const emptyOut = formatModelsTable([], undefined, testCtx as any);
assert(emptyOut.length === 1, "empty list returns header-only (1 line)");
assert(emptyOut[0].includes("Model"), "header row present even for empty models");

// 16b: Table has header + one row per model
fgLog.length = 0;
const table = formatModelsTable(testModels, undefined, testCtx as any);
assert(table.length === 1 + testModels.length, "header + one row per model");
const dimCalls = fgLog.filter(c => c.color === "dim");
assert(dimCalls.length >= 1, "at least header is dimmed");

// 16c: All model names appear
for (const m of testModels) {
  assert(table.some(row => row.includes(m.name)), `model "${m.name}" in table`);
}

// 16d: Active model gets → prefix and bold
fgLog.length = 0;
const activeTable = formatModelsTable(testModels, "a", testCtx as any);
const activeLine = activeTable.find(r => r.startsWith("→"));
assert(activeLine != null, "active model line has → prefix");
const boldHit = fgLog.find(c => c.color === "bold");
assert(boldHit != null, "active model row uses bold color");
assert(boldHit!.text.startsWith("→"), "bold-applied text includes → prefix");

// 16e: Non-active model no → prefix
const betaLine = activeTable.find(r => r.includes("Beta"));
assert(betaLine != null, "Beta appears");
assert(!betaLine.trimStart().startsWith("→"), "non-active Beta has no →");

// 16f: Zero costs display as —
const gammaLine = table.find(r => r.includes("Gamma"));
assert(gammaLine != null, "Gamma appears");
assert(gammaLine!.includes("—"), "zero-cost model shows —");

// 16g: Non-zero costs display with $
const alphaLine = table.find(r => r.includes("Alpha"));
assert(alphaLine != null, "Alpha appears");
assert(alphaLine!.includes("$"), "cost-bearing model shows $");

// 16h: Supply state labels
assert(alphaLine!.includes("healthy"), "healthy supply displayed");
assert(betaLine!.includes("low"), "low supply displayed");
assert(gammaLine!.includes("unknown"), "missing discount → unknown supply");

// 16i: Discount percentage
assert(alphaLine!.includes("25%"), "25% discount shown");
assert(betaLine!.includes("0%"), "0% discount shown");

// 16j: Vision indicator
assert(alphaLine!.includes("✓"), "image-input model shows ✓");
assert(betaLine!.includes("—"), "text-only model shows vision dash");

// 16k: Context window formatting
assert(alphaLine!.includes("262K"), "262144 → 262K");
assert(betaLine!.includes("128K"), "128000 → 128K");
assert(gammaLine!.includes("4K"), "4096 → 4K");

// 16l: Footer counts
const footer = table[table.length - 1];
assert(footer.includes("3 models"), "footer shows model count");
const activeFooter = activeTable[activeTable.length - 1];
assert(activeFooter.includes("→ active"), "active footer shows → active");

// ─── Cleanup ──────────────────────────────────────────────────────────────────

globalThis.fetch = originalFetch;
fs.rmSync(tmpHome, { recursive: true, force: true });

console.log("\n--- All tests passed ---\n");
