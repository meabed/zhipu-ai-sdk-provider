// https://docs.z.ai/api-reference/llm/chat-completion
export type ZhipuChatModelId =
  // Flagship models
  | "glm-5"
  // GLM-4.7 series
  | "glm-4.7"
  | "glm-4.7-flash"
  | "glm-4.7-flashx"
  // GLM-4.6 series
  | "glm-4.6"
  // GLM-4.5 series
  | "glm-4.5"
  | "glm-4.5-air"
  | "glm-4.5-x"
  | "glm-4.5-airx"
  | "glm-4.5-flash"
  // GLM-4 series
  | "glm-4-plus"
  | "glm-4-air-250414"
  | "glm-4-air"
  | "glm-4-airx"
  | "glm-4-long"
  | "glm-4-flash"
  | "glm-4-flash-250414"
  | "glm-4-flashx"
  | "glm-4-32b-0414-128k"
  // Vision/Video Models
  | "glm-4v-plus-0111"
  | "glm-4v-plus"
  | "glm-4v"
  | "glm-4v-flash"
  // Vision models (4.6)
  | "glm-4.6v"
  | "glm-4.6v-flash"
  | "glm-4.6v-flashx"
  // Vision models (4.5)
  | "glm-4.5v"
  // Reasoning Models
  | "glm-z1-air"
  | "glm-z1-airx"
  | "glm-z1-flash"
  // Vision Reasoning Models
  | "glm-4.1v-thinking-flash"
  | "glm-4.1v-thinking-flashx"
  | (string & {});

/**
 * Thinking mode configuration for GLM-4.5+ models.
 * Controls chain-of-thought deep reasoning capabilities.
 *
 * @see https://docs.z.ai/guides/capabilities/thinking
 * @see https://docs.z.ai/guides/capabilities/thinking-mode
 */
export interface ZhipuThinkingConfig {
  /**
   * Enable or disable thinking mode.
   * - `"enabled"` (default for GLM-5, GLM-4.7): Model uses deep reasoning before responding.
   *    GLM-4.6 and GLM-4.5 will automatically determine if thinking is needed.
   * - `"disabled"`: Standard response without explicit reasoning.
   */
  type: "enabled" | "disabled";
  /**
   * Whether to clear thinking content from previous turns (Preserved Thinking).
   *
   * - `true` (default): Previous reasoning is not retained in context.
   * - `false`: Reasoning content from previous assistant turns is preserved,
   *   improving continuity and increasing cache hit rates in multi-turn conversations.
   *
   * Only applicable when `type` is `"enabled"`.
   *
   * @default true
   * @see https://docs.z.ai/guides/capabilities/thinking-mode
   */
  clearThinking?: boolean;
}

/**
 * Zhipu-specific provider options passed via `providerOptions`.
 * These are sent directly to the Zhipu API as body parameters.
 *
 * Since this SDK is exclusively for Zhipu AI, you can pass options directly
 * using the {@link zhipuOptions} helper (no nesting required):
 *
 * @example
 * ```ts
 * import { zhipu, zhipuOptions } from "zhipu-ai-sdk-provider";
 *
 * const result = await generateText({
 *   model: zhipu("glm-4.7"),
 *   prompt: "Explain quantum computing",
 *   providerOptions: zhipuOptions({
 *     temperature: 0.7,
 *     top_p: 0.9,
 *     max_tokens: 4096,
 *     thinking: { type: "enabled", clear_thinking: false },
 *   }),
 * });
 * ```
 *
 * @see https://docs.z.ai/guides/overview/concept-param
 */
export interface ZhipuProviderOptions {
  /**
   * Controls the randomness of the model's output.
   * - Lower values (e.g., 0.2): More deterministic and conservative output.
   * - Higher values (e.g., 0.8): More random and diverse output.
   *
   * It is recommended to use only one of `temperature` and `top_p`.
   */
  temperature?: number;

  /**
   * Controls diversity through nucleus sampling.
   * Samples from the smallest set of tokens whose cumulative probability exceeds this threshold.
   * - Lower values (e.g., 0.2): More deterministic output.
   * - Higher values (e.g., 0.9): More diverse output.
   *
   * It is recommended to use only one of `temperature` and `top_p`.
   */
  top_p?: number;

  /**
   * Maximum number of tokens to generate in a single call.
   * This limits the length of generated content, not including input.
   *
   * Default and maximum values vary by model:
   * - GLM-5/4.7/4.6: default 65536, max 131072
   * - GLM-4.5 series: default 65536, max 98304
   * - GLM-4.6v/4.5v: default 16384, max 32768/16384
   * - GLM-4-32B: default 16384, max 16384
   *
   * @see https://docs.z.ai/guides/overview/concept-param#max_tokens
   */
  max_tokens?: number;

  /**
   * Whether to sample the output to increase diversity.
   * - `true` (default): Performs random sampling based on token probability distribution.
   * - `false`: Uses greedy strategy, always selecting the highest probability token.
   *
   * When `false`, `temperature` and `top_p` will not take effect.
   */
  do_sample?: boolean;

  /**
   * Thinking mode configuration for GLM-4.5+ models.
   * Controls chain-of-thought deep reasoning.
   *
   * @example
   * ```json
   * { "type": "enabled", "clear_thinking": false }
   * ```
   *
   * @see https://docs.z.ai/guides/capabilities/thinking
   */
  thinking?: {
    /**
     * - `"enabled"`: Enable chain-of-thought reasoning (default for GLM-5, GLM-4.7).
     * - `"disabled"`: Disable reasoning for faster responses.
     */
    type: "enabled" | "disabled";
    /**
     * Whether to clear thinking content from previous turns.
     * Set to `false` to enable Preserved Thinking (retains reasoning across turns).
     * @default true
     */
    clear_thinking?: boolean;
  };

  /**
   * Stop sequences. When the model generates one of these strings, it will stop.
   * Zhipu API supports at most 1 stop sequence.
   */
  stop?: string[];

  /**
   * The unique ID of the end user. Helps the platform with abuse detection.
   * Length: 6–128 characters.
   */
  user_id?: string;

  /**
   * The unique ID of the request. Must be unique per call.
   * The platform generates one by default if not provided.
   */
  request_id?: string;

  /**
   * Specifies the response format of the model output.
   *
   * - `{ type: "text" }` — plain text mode (default).
   * - `{ type: "json_object" }` — JSON mode. The model returns valid JSON.
   *   When using JSON mode, clearly request JSON output in your prompt.
   *
   * This is also set automatically when using `generateObject` / `streamObject`
   * from the AI SDK (`responseFormat: { type: "json" }` is mapped to `json_object`).
   *
   * @see https://docs.z.ai/guides/capabilities/struct-output
   */
  response_format?: {
    type: "text" | "json_object";
  };

  /**
   * Enable streaming tool calls for GLM-4.6 models.
   * When enabled, tool calls are streamed incrementally.
   */
  tool_stream?: boolean;

  /**
   * Additional key-value pairs to pass through to the API body.
   * Use this for any new or undocumented parameters.
   */
  [key: string]: unknown;
}

export interface ZhipuChatSettings {
  /**
   * The unique ID of the end user. Helps the platform with abuse detection.
   * Length: 6–128 characters.
   */
  userId?: string;
  /**
   * The unique ID of the request, passed by the user side, must be unique.
   * The platform will generate one by default if not provided.
   */
  requestId?: string;
  /**
   * Whether to sample the output to increase diversity.
   * When `false`, temperature and top_p will not take effect.
   */
  doSample?: boolean;
  /**
   * Enable thinking/reasoning mode for GLM-4.5+ models.
   * When enabled, the model will perform deep reasoning before responding,
   * which improves performance on complex tasks like coding and multi-step reasoning.
   *
   * @see https://docs.z.ai/guides/capabilities/thinking
   */
  thinking?: ZhipuThinkingConfig;
}
