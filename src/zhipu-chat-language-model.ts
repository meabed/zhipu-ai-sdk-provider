import {
  InvalidResponseDataError,
  LanguageModelV3,
  LanguageModelV3Content,
  LanguageModelV3FinishReason,
  LanguageModelV3StreamPart,
  SharedV3Warning,
} from "@ai-sdk/provider";
import {
  isParsableJson,
  generateId,
  FetchFunction,
  ParseResult,
  combineHeaders,
  createEventSourceResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { convertToZhipuChatMessages } from "./convert-to-zhipu-chat-messages";
import { mapZhipuFinishReason } from "./map-zhipu-finish-reason";
import { computeTokenUsage, emptyUsage } from "./compute-token-usage";
import { ZhipuChatModelId, ZhipuChatSettings } from "./zhipu-chat-settings";
import { zhipuFailedResponseHandler } from "./zhipu-error";
import { getResponseMetadata } from "./get-response-metadata";

type ZhipuChatConfig = {
  provider: string;
  baseURL: string;
  isMultiModel?: boolean;
  isReasoningModel?: boolean;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
};

export class ZhipuChatLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly defaultObjectGenerationMode = "json";
  readonly supportedUrls: Record<string, RegExp[]> = {
    "image/*": [/^data:image\/[a-zA-Z]+;base64,/, /^https?:\/\/.+$/i],
    "video/*": [/^https?:\/\/.+\.(mp4|webm|ogg)$/i],
  };

  readonly modelId: ZhipuChatModelId;
  readonly settings: ZhipuChatSettings;

  private readonly config: ZhipuChatConfig;

  /**
   * Constructs a new ZhipuChatLanguageModel.
   * @param modelId - The model identifier.
   * @param settings - Settings for the chat.
   * @param config - Model configuration.
   */
  constructor(
    modelId: ZhipuChatModelId,
    settings: ZhipuChatSettings,
    config: ZhipuChatConfig,
  ) {
    this.modelId = modelId.toLocaleLowerCase();
    this.settings = settings;
    this.config = config;
    // Vision model if model ID contains "v" (e.g. glm-4v, glm-4.5v, glm-4.1v-thinking)
    this.config.isMultiModel = /\d+v/.test(this.modelId);
    // Model is a reasoning model if:
    // 1. Model ID contains "z" (dedicated reasoning models like glm-z1-*)
    // 2. Model ID contains "thinking" (vision reasoning models)
    // 3. Thinking mode is explicitly enabled via settings (GLM-4.5+/4.7/5 with thinking)
    this.config.isReasoningModel =
      this.modelId.includes("z") ||
      this.modelId.includes("thinking") ||
      settings.thinking?.type === "enabled";
  }

  /**
   * Getter for the provider name.
   */
  get provider(): string {
    return this.config.provider;
  }

  private getArgs({
    prompt,
    maxOutputTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    tools,
    toolChoice,
  }: Parameters<LanguageModelV3["doGenerate"]>[0]) {
    // const type = mode.type;

    const warnings: SharedV3Warning[] = [];

    if (
      !this.config.isMultiModel &&
      prompt.every(
        (msg) =>
          msg.role === "user" &&
          !msg.content.every((part) => part.type === "text"),
      )
    ) {
      warnings.push({
        type: "other",
        message: "Non-vision models does not support message parts",
      });
    }

    if (topK != null) {
      warnings.push({
        type: "unsupported",
        feature: "topK",
      });
    }

    if (frequencyPenalty != null) {
      warnings.push({
        type: "unsupported",
        feature: "frequencyPenalty",
      });
    }

    if (presencePenalty != null) {
      warnings.push({
        type: "unsupported",
        feature: "presencePenalty",
      });
    }

    if (stopSequences != null && this.config.isMultiModel) {
      warnings.push({
        type: "unsupported",
        feature: "stopSequences",
        details: "Stop sequences are not supported for vision model",
      });
    }

    if (stopSequences != null && stopSequences.length > 1) {
      warnings.push({
        type: "unsupported",
        feature: "stopSequences",
        details: "Only supports one stop sequence",
      });
    }

    if (seed != null) {
      warnings.push({
        type: "unsupported",
        feature: "seed",
      });
    }

    if (
      responseFormat &&
      responseFormat.type === "json" &&
      (this.config.isMultiModel || this.config.isReasoningModel)
    ) {
      warnings.push({
        type: "unsupported",
        feature: "responseFormat",
        details:
          "JSON response format is not supported with vision and reasoning models.",
      });
    }

    if (tools && tools.length > 0 && this.config.isMultiModel) {
      warnings.push({
        type: "unsupported",
        feature: "tools",
        details: "Tools are not supported with vision models.",
      });
    }

    if (
      tools &&
      tools.length > 0 &&
      tools.some((tool) => tool.type !== "function")
    ) {
      warnings.push({
        type: "unsupported",
        feature: "tools",
        details: "Provider-defined tools are not implemented",
      });
    }

    if (
      responseFormat &&
      responseFormat.type === "json" &&
      responseFormat.schema
    ) {
      warnings.push({
        type: "unsupported",
        feature: "responseFormat",
        details:
          "Structured output with schema is not supported, use json response format instead.",
      });
    }

    if (toolChoice != null && toolChoice?.type !== "auto") {
      warnings.push({
        type: "unsupported",
        feature: "toolChoice",
        details: "Only 'auto' tool choice is supported",
      });
    }

    const baseArgs = {
      // model id:
      model: this.modelId,

      // model specific settings:
      user_id: this.settings.userId,
      do_sample: this.settings.doSample,
      request_id: this.settings.requestId,

      // thinking mode for GLM-4.5+ models:
      thinking: this.settings.thinking
        ? {
            type: this.settings.thinking.type,
            ...(this.settings.thinking.clearThinking !== undefined && {
              clear_thinking: this.settings.thinking.clearThinking,
            }),
          }
        : undefined,

      // standardized settings:
      max_tokens: maxOutputTokens,
      temperature: temperature,
      top_p: topP,

      // response format:
      response_format:
        responseFormat?.type === "json" ? { type: "json_object" } : undefined,

      // messages:
      messages: convertToZhipuChatMessages(prompt),

      // tools:
      tool_choice: "auto",
      tools:
        tools
          ?.filter((tool) => tool.type === "function")
          .map((tool) => ({
            type: "function" as const,
            function: {
              name: tool.name,
              description: tool.description ?? undefined,
              parameters: tool.inputSchema,
            },
          })) ?? undefined,

      // TODO: add provider-specific tool (web_search|retrieval)
    };

    return {
      args: baseArgs,
      warnings,
    };
  }

  async doGenerate(
    options: Parameters<LanguageModelV3["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV3["doGenerate"]>>> {
    const { args, warnings } = this.getArgs(options);

    const providerOptions = options.providerOptions || {};
    const zhipuOptions = providerOptions.zhipu || {};

    const fullArgs = {
      ...args,
      // merge any zhipu-specific options last to allow overrides
      ...zhipuOptions,
    };

    const {
      value: response,
      rawValue: rawResponse,
      responseHeaders,
    } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body: fullArgs,
      failedResponseHandler: zhipuFailedResponseHandler,
      successfulResponseHandler: createJsonResponseHandler(
        zhipuChatResponseSchema,
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const responseData = response as z.infer<typeof zhipuChatResponseSchema>;
    const choice = responseData.choices[0];

    const content: LanguageModelV3Content[] = [];

    // Extract text content
    const responseText = responseData.choices[0].message.content;
    const responseReasoningText =
      responseData.choices[0].message.reasoning_content;

    if (responseReasoningText) {
      content.push({
        type: "reasoning",
        text: responseReasoningText,
      });
    }

    if (responseText) {
      if (this.config.isReasoningModel && responseText.includes("<think>")) {
        content.push(
          {
            type: "reasoning",
            text: responseText.split("<think>")[1].split("</think>")[0],
          },
          {
            type: "text",
            text: responseText.split("</think>")[1],
          },
        );
      } else {
        content.push({
          type: "text",
          text: responseText,
        });
      }
    }

    // Extract tool calls
    if (responseData.choices[0].message.tool_calls) {
      for (const toolCall of responseData.choices[0].message.tool_calls) {
        content.push({
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: toolCall.function.arguments,
          providerExecuted: toolCall.type === "function" ? false : true,
        });
      }
    }

    return {
      content,
      finishReason: mapZhipuFinishReason(choice.finish_reason),
      usage: computeTokenUsage(responseData.usage),
      request: { body: fullArgs },
      response: {
        ...getResponseMetadata(responseData),
        headers: responseHeaders,
        body: rawResponse,
      },
      warnings,
    };
  }

  async doStream(
    options: Parameters<LanguageModelV3["doStream"]>[0],
  ): Promise<Awaited<ReturnType<LanguageModelV3["doStream"]>>> {
    const { args, warnings } = this.getArgs(options);

    const providerOptions = options.providerOptions || {};
    const zhipuOptions = providerOptions.zhipu || {};

    const body = { ...args, ...zhipuOptions, stream: true };

    const { responseHeaders, value: response } = await postJsonToApi({
      url: `${this.config.baseURL}/chat/completions`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: zhipuFailedResponseHandler,
      successfulResponseHandler:
        createEventSourceResponseHandler(zhipuChatChunkSchema),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    const toolCalls: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
      hasFinished: boolean;
    }> = [];

    let finishReason: LanguageModelV3FinishReason = {
      unified: "other",
      raw: undefined,
    };
    let usage = emptyUsage();
    let isFirstChunk = true;
    let isActiveReasoning = false;
    let isActiveText = false;

    return {
      stream: response.pipeThrough(
        new TransformStream<
          ParseResult<z.infer<typeof zhipuChatChunkSchema>>,
          LanguageModelV3StreamPart
        >({
          transform(chunk, controller) {
            // Emit raw chunk if requested (before anything else)
            if (options.includeRawChunks) {
              controller.enqueue({ type: "raw", rawValue: chunk.rawValue });
            }

            // handle failed chunk parsing / validation:
            if (chunk.success == false) {
              finishReason = { unified: "error", raw: undefined };
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }

            const value = chunk.value;

            // handle error chunks:
            if ("error" in value) {
              finishReason = { unified: "error", raw: undefined };
              controller.enqueue({ type: "error", error: value.error });
              return;
            }

            if (isFirstChunk) {
              isFirstChunk = false;

              controller.enqueue({
                type: "stream-start",
                warnings,
              });

              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value),
              });
            }

            if (value.usage != null) {
              usage = computeTokenUsage(value.usage);
            }

            const choice = value.choices[0];

            if (choice?.finish_reason != null) {
              if (choice.finish_reason === "network_error") {
                controller.enqueue({
                  type: "error",
                  error: new Error(`Error: Network Error`),
                });
                return;
              }

              finishReason = mapZhipuFinishReason(choice.finish_reason);
            }

            if (choice?.delta == null) {
              return;
            }

            const delta = choice.delta;

            if (delta.reasoning_content != null) {
              if (!isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-start",
                  id: "reasoning-0",
                });
                isActiveReasoning = true;
              }

              controller.enqueue({
                id: "reasoning-0",
                type: "reasoning-delta",
                delta: delta.reasoning_content,
              });
            }

            if (delta.content != null) {
              // Close reasoning part before starting text
              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: "reasoning-0",
                });
                isActiveReasoning = false;
              }

              if (!isActiveText) {
                controller.enqueue({ type: "text-start", id: "txt-0" });
                isActiveText = true;
              }

              controller.enqueue({
                id: "txt-0",
                type: "text-delta",
                delta: delta.content,
              });
            }

            if (delta.tool_calls != null) {
              // Close open parts before tool calls
              if (isActiveReasoning) {
                controller.enqueue({
                  type: "reasoning-end",
                  id: "reasoning-0",
                });
                isActiveReasoning = false;
              }
              if (isActiveText) {
                controller.enqueue({ type: "text-end", id: "txt-0" });
                isActiveText = false;
              }

              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                if (toolCalls[index] == null) {
                  if (toolCallDelta.id == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'id' to be a string.`,
                    });
                  }

                  if (toolCallDelta.function?.name == null) {
                    throw new InvalidResponseDataError({
                      data: toolCallDelta,
                      message: `Expected 'function.name' to be a string.`,
                    });
                  }

                  controller.enqueue({
                    type: "tool-input-start",
                    id: toolCallDelta.id,
                    toolName: toolCallDelta.function.name,
                  });

                  toolCalls[index] = {
                    id: toolCallDelta.id,
                    type: "function",
                    function: {
                      name: toolCallDelta.function.name,
                      arguments: toolCallDelta.function.arguments ?? "",
                    },
                    hasFinished: false,
                  };

                  const toolCall = toolCalls[index];

                  if (
                    toolCall.function?.name != null &&
                    toolCall.function?.arguments != null
                  ) {
                    // send delta if the argument text has already started:
                    if (toolCall.function.arguments.length > 0) {
                      controller.enqueue({
                        type: "tool-input-start",
                        id: toolCall.id,
                        toolName: toolCall.function.name,
                      });
                    }

                    // check if tool call is complete
                    // (some providers send the full tool call in one chunk):
                    if (isParsableJson(toolCall.function.arguments)) {
                      controller.enqueue({
                        type: "tool-input-end",
                        id: toolCall.id,
                      });

                      controller.enqueue({
                        type: "tool-call",
                        toolCallId: toolCall.id ?? generateId(),
                        toolName: toolCall.function.name,
                        input: toolCall.function.arguments,
                      });
                      toolCall.hasFinished = true;
                    }
                  }

                  continue;
                }

                // existing tool call, merge if not finished
                const toolCall = toolCalls[index];

                if (toolCall.hasFinished) {
                  continue;
                }

                if (toolCallDelta.function?.arguments != null) {
                  toolCall.function!.arguments +=
                    toolCallDelta.function?.arguments ?? "";
                }

                // send delta
                controller.enqueue({
                  type: "tool-input-delta",
                  id: toolCall.id,
                  delta: toolCallDelta.function.arguments ?? "",
                });

                // check if tool call is complete
                if (
                  toolCall.function?.name != null &&
                  toolCall.function?.arguments != null &&
                  isParsableJson(toolCall.function.arguments)
                ) {
                  controller.enqueue({
                    type: "tool-input-end",
                    id: toolCall.id,
                  });

                  controller.enqueue({
                    type: "tool-call",
                    toolCallId: toolCall.id ?? generateId(),
                    toolName: toolCall.function.name,
                    input: toolCall.function.arguments,
                  });
                  toolCall.hasFinished = true;
                }
              }
            }
          },

          flush(controller) {
            if (isActiveReasoning) {
              controller.enqueue({
                type: "reasoning-end",
                id: "reasoning-0",
              });
            }
            if (isActiveText) {
              controller.enqueue({ type: "text-end", id: "txt-0" });
            }
            controller.enqueue({
              type: "finish",
              finishReason,
              usage,
            });
          },
        }),
      ),
      request: { body },
      response: { headers: responseHeaders },
    };
  }
}

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const zhipuChatResponseSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal("assistant"),
        content: z.string().nullish(),
        reasoning_content: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              index: z.number().nullish(),
              type: z.literal("function"),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .nullish(),
      }),
      index: z.number(),
      finish_reason: z.string().nullish(),
    }),
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number().nullish(),
    total_tokens: z.number().nullish(),
    prompt_tokens_details: z
      .object({
        cached_tokens: z.number().optional(),
      })
      .nullish(),
    completion_tokens_details: z
      .object({
        reasoning_tokens: z.number().optional(),
      })
      .nullish(),
  }),
  web_search: z
    .object({
      icon: z.string(),
      title: z.string(),
      link: z.string(),
      media: z.string(),
      content: z.string(),
    })
    .nullish(),
});

// limited version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const zhipuChatChunkSchema = z.object({
  id: z.string().nullish(),
  created: z.number().nullish(),
  model: z.string().nullish(),
  choices: z.array(
    z.object({
      delta: z.object({
        role: z.enum(["assistant"]).optional(),
        content: z.string().nullish(),
        reasoning_content: z.string().nullish(),
        tool_calls: z
          .array(
            z.object({
              // id, type, function.name may be absent on continuation chunks
              id: z.string().nullish(),
              index: z.number(),
              type: z.literal("function").nullish(),
              function: z.object({
                name: z.string().nullish(),
                arguments: z.string().nullish(),
              }),
            }),
          )
          .nullish(),
      }),
      finish_reason: z.string().nullish(),
      index: z.number(),
    }),
  ),
  usage: z
    .object({
      prompt_tokens: z.number(),
      completion_tokens: z.number().nullish(),
      total_tokens: z.number().nullish(),
      prompt_tokens_details: z
        .object({
          cached_tokens: z.number().optional(),
        })
        .nullish(),
      completion_tokens_details: z
        .object({
          reasoning_tokens: z.number().optional(),
        })
        .nullish(),
    })
    .nullish(),
  web_search: z
    .object({
      icon: z.string(),
      title: z.string(),
      link: z.string(),
      media: z.string(),
      content: z.string(),
    })
    .nullish(),
});
