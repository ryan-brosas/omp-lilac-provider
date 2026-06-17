/**
 * Minimal type declarations for @oh-my-pi/pi-coding-agent.
 *
 * The OMP runtime provides these types at execution time. This declaration
 * enables TypeScript strict-mode checking without requiring the OMP core
 * to be installed as an npm dependency.
 */

declare module "@oh-my-pi/pi-coding-agent" {
  /** Theme helper available via ctx.ui.theme */
  interface ThemeAPI {
    fg(color: string, text: string): string;
    bg?(color: string, text: string): string;
  }

  /** UI surface available via ctx.ui */
  interface UIApi {
    setStatus(key: string, text: string | undefined): void;
    theme: ThemeAPI;
  }

  /** Session manager available via ctx.sessionManager */
  interface SessionManager {
    getBranch(): SessionEntry[];
  }

  /** A single entry in the session JSONL branch */
  interface SessionEntry {
    type: string;
    customType?: string;
    data?: unknown;
  }

  /** Model descriptor */
  interface ModelInfo {
    id: string;
    provider?: string;
    name?: string;
    reasoning?: boolean;
    input?: string[];
    cost?: {
      input: number;
      output: number;
      cacheRead: number;
      cacheWrite: number;
    };
    contextWindow?: number;
    maxTokens?: number;
    compat?: Record<string, unknown>;
    discount?: {
      supplyState: string;
      discountPercent: number;
      creditMultiplier: number;
    };
  }

  /** Registry for resolving provider credentials */
  interface ModelRegistry {
    getApiKeyForProvider(providerId: string): Promise<string | null>;
  }

  /** Message block (toolCall, text, etc.) */
  interface MessageBlock {
    type: string;
    [key: string]: unknown;
  }

  /** Message object in message_end event */
  interface AssistantMessage {
    role: string;
    provider?: string;
    stopReason?: string;
    content: string | MessageBlock[];
    errorMessage?: string;
    [key: string]: unknown;
  }

  /** Context passed to session_start handler */
  interface SessionStartContext {
    modelRegistry: ModelRegistry;
    ui: UIApi;
    model?: ModelInfo;
    sessionManager: SessionManager;
  }

  /** Context passed to turn_end handler */
  interface TurnEndContext {
    ui: UIApi;
    model?: ModelInfo;
  }

  /** Context passed to before_provider_request handler */
  interface BeforeProviderRequestContext {
    ui: UIApi;
    model?: ModelInfo;
  }

  /** Context passed to model_select handler */
  interface ModelSelectContext {
    ui: UIApi;
  }

  /** model_select event */
  interface ModelSelectEvent {
    type: string;
    model: ModelInfo;
    previousModel?: ModelInfo;
    source: string;
  }

  /** Context passed to session_tree handler */
  interface SessionTreeContext {
    model?: ModelInfo;
    ui: UIApi;
    sessionManager: SessionManager;
  }

  /** message_end event */
  interface MessageEndEvent {
    message: AssistantMessage;
  }

  /** Context passed to message_end handler */
  interface MessageEndContext {
    model?: ModelInfo;
  }

  /** message_end handler return: can mutate event or return void */
  type MessageEndResult =
    | void
    | { message: AssistantMessage };

  /** Provider config passed to registerProvider */
  interface ProviderConfig {
    name: string;
    baseUrl: string;
    apiKey: string;
    api: string;
    models: ModelInfo[];
    oauth?: unknown;
  }

  /** The ExtensionAPI surface injected by OMP */
  interface ExtensionAPI {
    registerProvider(name: string, config: ProviderConfig): void;
    on(
      event: string,
      handler: ((...args: any[]) => unknown)
    ): void;
    setStatus(key: string, text: string | undefined): void;
    registerCommand(name: string, handler: (...args: any[]) => unknown): void;
    setHiddenThinkingLabel(label: string): void;
    setLabel(key: string, text: string): void;
    appendEntry(customType: string, data?: unknown): void;
    exec(command: string): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  }

  export type {
    ExtensionAPI,
    ModelRegistry,
    ModelInfo,
    ProviderConfig,
    UIApi,
    ThemeAPI,
    SessionManager,
    SessionEntry,
    MessageBlock,
    AssistantMessage,
    SessionStartContext,
    TurnEndContext,
    BeforeProviderRequestContext,
    ModelSelectContext,
    ModelSelectEvent,
    SessionTreeContext,
    MessageEndEvent,
    MessageEndContext,
    MessageEndResult,
  };
}
