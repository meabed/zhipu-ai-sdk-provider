import type { JSONObject, LanguageModelV3Usage } from "@ai-sdk/provider";

interface UsageData {
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  prompt_tokens_details?: {
    cached_tokens?: number;
  } | null;
  completion_tokens_details?: {
    reasoning_tokens?: number;
  } | null;
  total_tokens?: number | null;
}

/**
 * Compute token usage from API response.
 *
 * @param usage - Raw usage data from the Zhipu API
 * @param streamCounts - Optional character counts from streaming to estimate
 *   reasoning vs text token split when the API doesn't provide
 *   `completion_tokens_details.reasoning_tokens`.
 */
export function computeTokenUsage(
  usage: UsageData,
  streamCounts?: { reasoningChars: number; textChars: number },
): LanguageModelV3Usage {
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const cacheReadTokens = usage.prompt_tokens_details?.cached_tokens ?? 0;

  // Use API-provided reasoning_tokens if available
  let reasoningTokens =
    usage.completion_tokens_details?.reasoning_tokens ?? 0;

  // When the API doesn't provide reasoning_tokens but we saw reasoning
  // content in the stream, estimate the split using character ratios
  if (
    reasoningTokens === 0 &&
    streamCounts != null &&
    streamCounts.reasoningChars > 0 &&
    completionTokens > 0
  ) {
    const totalChars = streamCounts.reasoningChars + streamCounts.textChars;
    if (totalChars > 0) {
      reasoningTokens = Math.round(
        completionTokens * (streamCounts.reasoningChars / totalChars),
      );
    }
  }

  return {
    inputTokens: {
      total: promptTokens,
      noCache: promptTokens - cacheReadTokens,
      cacheRead: cacheReadTokens > 0 ? cacheReadTokens : undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: completionTokens,
      text: completionTokens - reasoningTokens,
      reasoning: reasoningTokens > 0 ? reasoningTokens : undefined,
    },
    raw: usage as JSONObject,
  };
}

export function emptyUsage(): LanguageModelV3Usage {
  return {
    inputTokens: {
      total: 0,
      noCache: undefined,
      cacheRead: undefined,
      cacheWrite: undefined,
    },
    outputTokens: {
      total: 0,
      text: undefined,
      reasoning: undefined,
    },
    raw: undefined,
  };
}
