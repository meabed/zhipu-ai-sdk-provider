import { describe, it, expect } from "vitest";
import { LanguageModelV3Prompt } from "@ai-sdk/provider";
import { convertReadableStreamToArray } from "@ai-sdk/provider-utils/test";
import { createZhipu } from "./zhipu-provider";
import { zhipuOptions } from "./zhipu-options";
import { createTestServer } from "./test-server";

// Zhipu API request body structure (subset of fields used in tests)
type ZhipuRequestBody = {
  model: string;
  messages: unknown[];
  user_id?: string;
  temperature?: number;
  top_p?: number;
  tools?: unknown[];
  tool_choice?: string;
  stream?: boolean;
  response_format?: { type: string };
};

const TEST_PROMPT: LanguageModelV3Prompt = [
  { role: "user", content: [{ type: "text", text: "Hello" }] },
];

const TEST_API_KEY = "test-api-key";
const provider = createZhipu({
  apiKey: TEST_API_KEY,
});

const model = provider.chat("glm-4-flash");

const server = createTestServer({
  "https://open.bigmodel.cn/api/paas/v4/chat/completions": {
    response: { type: "json-value", body: {} },
  },
});

describe("doGenerate", () => {
  function prepareJsonResponse({
    content = "",
    tool_calls,
    function_call,
    usage = {
      prompt_tokens: 4,
      total_tokens: 34,
      completion_tokens: 30,
    },
    finish_reason = "stop",
    id = "chatcmpl-95ZTZkhr0mHNKqerQfiwkuox3PHAd",
    created = 1711115037,
    model = "glm-4-flash",
    headers,
  }: {
    content?: string;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
    function_call?: {
      name: string;
      arguments: string;
    };
    usage?: {
      prompt_tokens?: number;
      total_tokens?: number;
      completion_tokens?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
      };
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    };
    finish_reason?: string;
    created?: number;
    id?: string;
    model?: string;
    headers?: Record<string, string>;
  } = {}) {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "json-value",
      headers,
      body: {
        headers,
        id,
        object: "chat.completion",
        created,
        model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content,
              tool_calls,
              function_call,
            },
            finish_reason,
          },
        ],
        usage,
        system_fingerprint: "fp_3bc1b5746c",
      },
    };
  }

  it("should extract text response", async () => {
    prepareJsonResponse({ content: "Hello, World!" });

    const { content } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(content).toMatchInlineSnapshot(`
      [
        {
          "text": "Hello, World!",
          "type": "text",
        },
      ]
    `);
  }); // Closing brace for the 'it' block on line 90

  it("should extract usage", async () => {
    prepareJsonResponse({
      content: "",
      usage: {
        prompt_tokens: 20,
        total_tokens: 25,
        completion_tokens: 5,
      },
    });

    const { usage } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(usage).toStrictEqual({
      inputTokens: {
        total: 20,
        noCache: 20,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: 5,
        text: 5,
        reasoning: undefined,
      },
      raw: {
        prompt_tokens: 20,
        completion_tokens: 5,
        total_tokens: 25,
      },
    });
  });

  it("should send request body", async () => {
    prepareJsonResponse({});

    const { request } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(request?.body).toMatchObject({
      model: "glm-4-flash",
      messages: [{ role: "user", content: "Hello" }],
    });
  });

  it("should send additional response information", async () => {
    prepareJsonResponse({
      id: "test-id",
      created: 123,
      model: "test-model",
    });

    const { response } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(response).toMatchObject({
      id: "test-id",
      timestamp: new Date(123 * 1000),
      modelId: "test-model",
    });
  });

  it("should support partial usage", async () => {
    prepareJsonResponse({
      content: "",
      usage: { prompt_tokens: 20, total_tokens: 20 },
    });

    const { usage } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(usage).toStrictEqual({
      inputTokens: {
        total: 20,
        noCache: 20,
        cacheRead: undefined,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: 0,
        text: 0,
        reasoning: undefined,
      },
      raw: {
        prompt_tokens: 20,
        total_tokens: 20,
      },
    });
  });

  it("should account for cached tokens and reasoning tokens", async () => {
    prepareJsonResponse({
      content: "",
      usage: {
        prompt_tokens: 100,
        total_tokens: 150,
        completion_tokens: 50,
        prompt_tokens_details: {
          cached_tokens: 60,
        },
        completion_tokens_details: {
          reasoning_tokens: 20,
        },
      },
    });

    const { usage } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(usage).toStrictEqual({
      inputTokens: {
        total: 100,
        noCache: 40,
        cacheRead: 60,
        cacheWrite: undefined,
      },
      outputTokens: {
        total: 50,
        text: 30,
        reasoning: 20,
      },
      raw: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
        prompt_tokens_details: {
          cached_tokens: 60,
        },
        completion_tokens_details: {
          reasoning_tokens: 20,
        },
      },
    });
  });

  it("should extract finish reason", async () => {
    prepareJsonResponse({
      content: "",
      finish_reason: "stop",
    });

    const response = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(response.finishReason).toStrictEqual({ unified: "stop", raw: "stop" });
  });

  it("should support unknown finish reason", async () => {
    prepareJsonResponse({
      content: "",
      finish_reason: "eos",
    });

    const response = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(response.finishReason).toStrictEqual({ unified: "other", raw: "eos" });
  });

  it("should expose the raw response headers", async () => {
    prepareJsonResponse({
      headers: { "test-header": "test-value" },
    });

    const { response } = await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    expect(response?.headers).toMatchObject({
      "content-type": "application/json",
      "test-header": "test-value",
    });
  });

  it("should pass the model and the messages", async () => {
    prepareJsonResponse({ content: "" });

    await model.doGenerate({
      prompt: TEST_PROMPT,
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("should pass settings", async () => {
    prepareJsonResponse();

    await provider
      .chat("glm-4-flash", {
        userId: "test-user-id",
      })
      .doGenerate({
        prompt: TEST_PROMPT,
      });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.user_id).toBe("test-user-id");
  });

  it("should pass providerOptions directly and override base args", async () => {
    prepareJsonResponse();

    await provider
      .chat("glm-4-flash", {
        userId: "test-user-id",
      })
      .doGenerate({
        prompt: TEST_PROMPT,
        providerOptions: zhipuOptions({
          user_id: "override-user-id",
          temperature: 0.8,
        }),
      });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.user_id).toBe("override-user-id");
    expect(body.temperature).toBe(0.8);
    expect(body.tool_choice).toBe("auto");
  });

  it("should pass tools and toolChoice", async () => {
    prepareJsonResponse({ content: "" });

    await model.doGenerate({
      tools: [
        {
          type: "function",
          name: "test-tool",
          inputSchema: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
      toolChoice: {
        type: "tool",
        toolName: "test-tool",
      },
      prompt: TEST_PROMPT,
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.tools).toEqual([
      {
        type: "function",
        function: {
          name: "test-tool",
          parameters: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      },
    ]);
    expect(body.tool_choice).toBe("auto");
  });

  it("should pass headers", async () => {
    prepareJsonResponse({ content: "" });

    const provider = createZhipu({
      apiKey: TEST_API_KEY,
      headers: {
        "Custom-Provider-Header": "provider-header-value",
      },
    });

    await provider.chat("glm-4-flash").doGenerate({
      prompt: TEST_PROMPT,
      headers: {
        "Custom-Request-Header": "request-header-value",
      },
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const headers = calls[calls.length - 1].requestHeaders as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["custom-provider-header"]).toBe("provider-header-value");
    expect(headers["custom-request-header"]).toBe("request-header-value");
  });

  it("should parse tool results", async () => {
    prepareJsonResponse({
      tool_calls: [
        {
          id: "call_O17Uplv4lJvD6DVdIvFFeRMw",
          type: "function",
          function: {
            name: "test-tool",
            arguments: '{"value":"Spark"}',
          },
        },
      ],
    });

    const result = await model.doGenerate({
      tools: [
        {
          type: "function",
          name: "test-tool",
          inputSchema: {
            type: "object",
            properties: { value: { type: "string" } },
            required: ["value"],
            additionalProperties: false,
            $schema: "http://json-schema.org/draft-07/schema#",
          },
        },
      ],
      toolChoice: {
        type: "tool",
        toolName: "test-tool",
      },
      prompt: TEST_PROMPT,
    });

    expect(result.content).toEqual([
      {
        type: "tool-call",
        toolCallId: "call_O17Uplv4lJvD6DVdIvFFeRMw",
        toolName: "test-tool",
        input: '{"value":"Spark"}',
        // v6 field: false indicates the provider did not execute the tool; execution is delegated to the client.
        providerExecuted: false,
      },
    ]);
  });

  describe("response format", () => {
    it("should not send a response_format when response format is text", async () => {
      prepareJsonResponse({ content: '{"value":"Spark"}' });

      const model = provider.chat("glm-4-flash");

      await model.doGenerate({
        prompt: TEST_PROMPT,
        responseFormat: { type: "text" },
      });

      const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
      expect(calls[calls.length - 1].requestBodyJson).toMatchObject({
        model: "glm-4-flash",
        messages: [{ role: "user", content: "Hello" }],
      });
    });

    it('should forward json response format as "json_object" without schema', async () => {
      prepareJsonResponse({ content: '{"value":"Spark"}' });

      const model = provider.chat("glm-4-flash");

      await model.doGenerate({
        prompt: TEST_PROMPT,
        responseFormat: { type: "json" },
      });

      const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
      expect(body.model).toBe("glm-4-flash");
      expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
      expect(body.response_format).toEqual({ type: "json_object" });
    });

    it("should warn but still send json_object when schema is provided", async () => {
      prepareJsonResponse({ content: '{"value":"Spark"}' });

      const model = provider.chat("glm-4-flash");

      const result = await model.doGenerate({
        prompt: TEST_PROMPT,
        responseFormat: {
          type: "json",
          schema: {
            type: "object",
            properties: { value: { type: "string" } },
          },
          name: "TestSchema",
        },
      });

      const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
      const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
      expect(body.response_format).toEqual({ type: "json_object" });

      // Should produce an "other" warning about no native schema enforcement
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "other",
            message: expect.stringContaining("does not support native JSON schema"),
          }),
        ]),
      );
    });

    it("should allow response_format override via providerOptions", async () => {
      prepareJsonResponse({ content: '{"value":"Spark"}' });

      const model = provider.chat("glm-4-flash");

      await model.doGenerate({
        prompt: TEST_PROMPT,
        providerOptions: {
          response_format: { type: "json_object" },
        },
      });

      const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
      const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
      expect(body.response_format).toEqual({ type: "json_object" });
    });
  });
});

describe("doStream", () => {
  function prepareStreamResponse({
    content,
    finish_reason = "stop",
    headers,
  }: {
    content: string[];
    finish_reason?: string;
    headers?: Record<string, string>;
  }) {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      headers,
      chunks: [
        `data: {"id":"chatcmpl-e7f8e220-656c-4455-a132-dacfc1370798","object":"chat.completion.chunk","created":1702657020,"model":"grok-beta",` +
          `"system_fingerprint":null,"choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n\n`,
        ...content.map((text) => {
          return (
            `data: {"id":"chatcmpl-e7f8e220-656c-4455-a132-dacfc1370798","object":"chat.completion.chunk","created":1702657020,"model":"grok-beta",` +
            `"system_fingerprint":null,"choices":[{"index":1,"delta":{"content":"${text}"},"finish_reason":null}]}\n\n`
          );
        }),
        `data: {"id":"chatcmpl-e7f8e220-656c-4455-a132-dacfc1370798","object":"chat.completion.chunk","created":1702657020,"model":"grok-beta",` +
          `"system_fingerprint":null,"choices":[{"index":0,"delta":{},"finish_reason":"${finish_reason}"}]}\n\n`,
        `data: {"id":"chatcmpl-e7f8e220-656c-4455-a132-dacfc1370798","object":"chat.completion.chunk","created":1729171479,"model":"grok-beta",` +
          `"system_fingerprint":"fp_10c08bf97d","choices":[{"index":0,"delta":{},"finish_reason":"${finish_reason}"}],` +
          `"usage":{"queue_time":0.061348671,"prompt_tokens":18,"prompt_time":0.000211569,` +
          `"completion_tokens":439,"completion_time":0.798181818,"total_tokens":457,"total_time":0.798393387}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };
  }

  it("should stream text deltas", async () => {
    prepareStreamResponse({
      content: ["Hello", ", ", "World!"],
      finish_reason: "stop",
    });

    const { stream } = await model.doStream({
      prompt: TEST_PROMPT,
    });

    // note: space moved to last chunk bc of trimming
    const result = await convertReadableStreamToArray(stream);

    // Check key elements exist
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "stream-start",
      }),
    );

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "response-metadata",
      }),
    );

    expect(result).toContainEqual(
      expect.objectContaining({
        type: "finish",
        finishReason: { unified: "stop", raw: "stop" },
        usage: {
          inputTokens: {
            total: 18,
            noCache: 18,
            cacheRead: undefined,
            cacheWrite: undefined,
          },
          outputTokens: {
            total: 439,
            text: 439,
            reasoning: undefined,
          },
          raw: {
            prompt_tokens: 18,
            completion_tokens: 439,
            total_tokens: 457,
          },
        },
      }),
    );
  });

  it("should stream reasoning then content then tool_calls (GLM-5 style)", async () => {
    // Real GLM-5 response pattern: reasoning → content → tool_calls → finish with cached tokens
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        // Reasoning chunks
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Let me"}}]}\n\n`,
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":" think about this."}}]}\n\n`,
        // Content chunks
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","content":"Let me read"}}]}\n\n`,
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","content":" the file."}}]}\n\n`,
        // Tool call chunk (full arguments in one chunk, matching real GLM-5 behavior)
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_58107da92b3f","index":0,"type":"function",` +
          `"function":{"name":"read-file","arguments":"{\\"path\\":\\"index.ts\\"}"}}]}}]}\n\n`,
        // Finish chunk with usage (matching real GLM-5 final chunk shape)
        `data: {"id":"glm5-resp-001","object":"chat.completion.chunk","created":1773167900,"model":"glm-5",` +
          `"choices":[{"index":0,"finish_reason":"tool_calls","delta":{"role":"assistant","content":""}}],` +
          `"usage":{"prompt_tokens":16316,"completion_tokens":156,"total_tokens":16472,` +
          `"prompt_tokens_details":{"cached_tokens":15808}}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    const types = result.map((r) => r.type);
    expect(types).toContain("stream-start");
    expect(types).toContain("response-metadata");
    expect(types).toContain("reasoning-start");
    expect(types).toContain("reasoning-delta");
    expect(types).toContain("text-delta");
    expect(types).toContain("tool-input-start");
    expect(types).toContain("tool-call");
    expect(types).toContain("finish");

    // Verify reasoning deltas
    const reasoningDeltas = result.filter((r) => r.type === "reasoning-delta");
    expect(reasoningDeltas).toHaveLength(2);
    expect(reasoningDeltas[0]).toMatchObject({ delta: "Let me" });
    expect(reasoningDeltas[1]).toMatchObject({ delta: " think about this." });

    // Verify text deltas
    const textDeltas = result.filter((r) => r.type === "text-delta");
    expect(textDeltas.length).toBeGreaterThanOrEqual(2);

    // Verify tool call
    const toolCall = result.find((r) => r.type === "tool-call");
    expect(toolCall).toMatchObject({
      type: "tool-call",
      toolCallId: "call_58107da92b3f",
      toolName: "read-file",
      input: '{"path":"index.ts"}',
    });

    // Verify finish with cached tokens
    const finish = result.find((r) => r.type === "finish");
    expect(finish).toMatchObject({
      finishReason: { unified: "tool-calls", raw: "tool_calls" },
      usage: {
        inputTokens: {
          total: 16316,
          noCache: 508,
          cacheRead: 15808,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 156,
          // Estimated from stream character counts (API didn't provide reasoning_tokens)
          text: expect.any(Number),
          reasoning: expect.any(Number),
        },
      },
    });
  });

  it("should stream with cached and reasoning tokens (GLM-4.7 style)", async () => {
    // Real GLM-4.7 response: reasoning → content → tool_calls → finish with both cached + reasoning tokens
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        `data: {"id":"glm47-resp-001","object":"chat.completion.chunk","created":1773167957,"model":"glm-4.7",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"Analyzing..."}}]}\n\n`,
        `data: {"id":"glm47-resp-001","object":"chat.completion.chunk","created":1773167957,"model":"glm-4.7",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","content":"I found the files."}}]}\n\n`,
        `data: {"id":"glm47-resp-001","object":"chat.completion.chunk","created":1773167957,"model":"glm-4.7",` +
          `"choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_aeba6bac","index":0,"type":"function",` +
          `"function":{"name":"find-files","arguments":"{\\"listAll\\":true}"}}]}}]}\n\n`,
        `data: {"id":"glm47-resp-001","object":"chat.completion.chunk","created":1773167957,"model":"glm-4.7",` +
          `"choices":[{"index":0,"finish_reason":"tool_calls","delta":{"role":"assistant","content":""}}],` +
          `"usage":{"prompt_tokens":15563,"completion_tokens":95,"total_tokens":15658,` +
          `"prompt_tokens_details":{"cached_tokens":42},"completion_tokens_details":{"reasoning_tokens":65}}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    const finish = result.find((r) => r.type === "finish");
    expect(finish).toMatchObject({
      finishReason: { unified: "tool-calls", raw: "tool_calls" },
      usage: {
        inputTokens: {
          total: 15563,
          noCache: 15521,
          cacheRead: 42,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 95,
          text: 30,
          reasoning: 65,
        },
      },
    });
  });

  it("should stream tool call deltas across multiple chunks", async () => {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        // First chunk: tool call start with id, name, empty args
        `data: {"id":"tc-stream","object":"chat.completion.chunk","created":1711357598,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{"role":"assistant",` +
          `"tool_calls":[{"index":0,"id":"call_O17Uplv4lJvD6DVdIvFFeRMw","type":"function","function":{"name":"test-tool","arguments":""}}]}}]}\n\n`,
        // Continuation chunks: only index + function.arguments (no id, type, name)
        `data: {"id":"tc-stream","object":"chat.completion.chunk","created":1711357598,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"value"}}]}}]}\n\n`,
        `data: {"id":"tc-stream","object":"chat.completion.chunk","created":1711357598,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\":\\"Sparkle Day\\"}"}}]}}]}\n\n`,
        // Finish
        `data: {"id":"tc-stream","object":"chat.completion.chunk","created":1711357598,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{},"finish_reason":"tool_calls"}],` +
          `"usage":{"prompt_tokens":53,"completion_tokens":17,"total_tokens":70}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    // Verify tool-input-start is emitted
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "tool-input-start",
        id: "call_O17Uplv4lJvD6DVdIvFFeRMw",
        toolName: "test-tool",
      }),
    );

    // Verify tool-input-delta for streaming args
    const inputDeltas = result.filter((r) => r.type === "tool-input-delta");
    expect(inputDeltas.length).toBeGreaterThanOrEqual(1);

    // Verify complete tool-call emitted once args are valid JSON
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "call_O17Uplv4lJvD6DVdIvFFeRMw",
        toolName: "test-tool",
        input: '{"value":"Sparkle Day"}',
      }),
    );

    // Verify finish
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "finish",
        finishReason: { unified: "tool-calls", raw: "tool_calls" },
      }),
    );
  });

  it("should handle sensitive finish reason as content-filter", async () => {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        `data: {"id":"sens-1","object":"chat.completion.chunk","created":1702657020,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","content":"I cannot"},"finish_reason":"sensitive"}],` +
          `"usage":{"prompt_tokens":10,"completion_tokens":2,"total_tokens":12}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    const finish = result.find((r) => r.type === "finish");
    expect(finish).toMatchObject({
      finishReason: { unified: "content-filter", raw: "sensitive" },
    });
  });

  it("should handle network_error finish reason", async () => {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        `data: {"id":"err-1","object":"chat.completion.chunk","created":1702657020,"model":"glm-4-flash",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","content":""},"finish_reason":"network_error"}]}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    // network_error emits an error event
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "error",
      }),
    );
  });

  it("should stream reasoning directly to tool_calls with no content (GLM-4.7-flash style)", async () => {
    // GLM-4.7-flash pattern: 110 reasoning chunks → tool_call → finish (no content chunks at all)
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [
        `data: {"id":"flash-001","object":"chat.completion.chunk","created":1773168059,"model":"glm-4.7-flash",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":"The user wants"}}]}\n\n`,
        `data: {"id":"flash-001","object":"chat.completion.chunk","created":1773168059,"model":"glm-4.7-flash",` +
          `"choices":[{"index":0,"delta":{"role":"assistant","reasoning_content":" to list all files."}}]}\n\n`,
        // Tool call directly after reasoning (no content chunks)
        `data: {"id":"flash-001","object":"chat.completion.chunk","created":1773168059,"model":"glm-4.7-flash",` +
          `"choices":[{"index":0,"delta":{"tool_calls":[{"id":"call_4b630193","index":0,"type":"function",` +
          `"function":{"name":"find-library-files","arguments":"{\\"limit\\":30,\\"listAll\\":true}"}}]}}]}\n\n`,
        `data: {"id":"flash-001","object":"chat.completion.chunk","created":1773168059,"model":"glm-4.7-flash",` +
          `"choices":[{"index":0,"finish_reason":"tool_calls","delta":{"role":"assistant","content":""}}],` +
          `"usage":{"prompt_tokens":16206,"completion_tokens":130,"total_tokens":16336,` +
          `"prompt_tokens_details":{"cached_tokens":43},"completion_tokens_details":{"reasoning_tokens":110}}}\n\n`,
        "data: [DONE]\n\n",
      ],
    };

    const { stream } = await model.doStream({ prompt: TEST_PROMPT });
    const result = await convertReadableStreamToArray(stream);

    const types = result.map((r) => r.type);
    expect(types).toContain("reasoning-start");
    expect(types).toContain("reasoning-delta");
    expect(types).toContain("tool-input-start");
    expect(types).toContain("tool-call");
    expect(types).toContain("finish");

    // No text-delta should appear (only the empty content from finish chunk)
    const textDeltas = result.filter(
      (r) => r.type === "text-delta" && "delta" in r && r.delta !== "",
    );
    expect(textDeltas).toHaveLength(0);

    // Verify tool call
    expect(result).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "call_4b630193",
        toolName: "find-library-files",
        input: '{"limit":30,"listAll":true}',
      }),
    );

    // Verify finish with both cached and reasoning tokens
    const finish = result.find((r) => r.type === "finish");
    expect(finish).toMatchObject({
      finishReason: { unified: "tool-calls", raw: "tool_calls" },
      usage: {
        inputTokens: {
          total: 16206,
          noCache: 16163,
          cacheRead: 43,
          cacheWrite: undefined,
        },
        outputTokens: {
          total: 130,
          text: 20,
          reasoning: 110,
        },
      },
    });
  });

  it("should handle unparsable stream parts", async () => {
    server.urls[
      "https://open.bigmodel.cn/api/paas/v4/chat/completions"
    ].response = {
      type: "stream-chunks",
      chunks: [`data: {unparsable}\n\n`, "data: [DONE]\n\n"],
    };

    const { stream } = await model.doStream({
      prompt: TEST_PROMPT,
    });

    const elements = await convertReadableStreamToArray(stream);

    expect(elements.length).toBe(2);
    expect(elements[0].type).toBe("error");
    expect(elements[1]).toMatchObject({
      finishReason: { unified: "error", raw: undefined },
      type: "finish",
    });
  });

  it("should send request body", async () => {
    prepareStreamResponse({ content: [] });

    const { request } = await model.doStream({
      prompt: TEST_PROMPT,
    });

    expect(request?.body).toMatchObject({
      model: "glm-4-flash",
      messages: [{ role: "user", content: "Hello" }],
      stream: true,
    });
  });

  it("should expose the raw response headers", async () => {
    prepareStreamResponse({
      content: [],
      headers: {
        "test-header": "test-value",
      },
    });

    const { response } = await model.doStream({
      prompt: TEST_PROMPT,
    });

    expect(response?.headers).toStrictEqual({
      // default headers:
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",

      // custom header
      "test-header": "test-value",
    });
  });

  it("should pass the messages and the model", async () => {
    prepareStreamResponse({ content: [] });

    await model.doStream({
      prompt: TEST_PROMPT,
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.stream).toBe(true);
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
  });

  it("should pass providerOptions directly in stream mode", async () => {
    prepareStreamResponse({ content: [] });

    await model.doStream({
      prompt: TEST_PROMPT,
      providerOptions: zhipuOptions({
        temperature: 0.9,
        top_p: 0.95,
      }),
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const body = calls[calls.length - 1].requestBodyJson as ZhipuRequestBody;
    expect(body.stream).toBe(true);
    expect(body.model).toBe("glm-4-flash");
    expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    expect(body.temperature).toBe(0.9);
    expect(body.top_p).toBe(0.95);
    expect(body.tool_choice).toBe("auto");
  });

  it("should pass headers", async () => {
    prepareStreamResponse({ content: [] });

    const provider = createZhipu({
      apiKey: TEST_API_KEY,
      headers: {
        "Custom-Provider-Header": "provider-header-value",
      },
    });

    await provider.chat("glm-4-flash").doStream({
      prompt: TEST_PROMPT,
      headers: {
        "Custom-Request-Header": "request-header-value",
      },
    });

    const calls = server.urls["https://open.bigmodel.cn/api/paas/v4/chat/completions"].calls;
    const headers = calls[calls.length - 1].requestHeaders as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${TEST_API_KEY}`);
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["custom-provider-header"]).toBe("provider-header-value");
    expect(headers["custom-request-header"]).toBe("request-header-value");
  });
});
