# zhipu-ai-sdk-provider

[Zhipu AI](https://www.zhipuai.cn/) provider for the [Vercel AI SDK](https://sdk.vercel.ai/). Integrates **GLM** language models, embedding models, image generation, and text-to-speech from [bigmodel.cn](https://bigmodel.cn/).

[![npm version](https://img.shields.io/npm/v/zhipu-ai-sdk-provider.svg)](https://www.npmjs.com/package/zhipu-ai-sdk-provider)
[![license](https://img.shields.io/npm/l/zhipu-ai-sdk-provider.svg)](https://github.com/meabed/zhipu-ai-provider/blob/master/LICENSE.md)

## Installation

```bash
npm install zhipu-ai-sdk-provider ai
```

## Configuration

Set your API key from [bigmodel.cn](https://bigmodel.cn/):

```bash
export ZHIPU_API_KEY=your-api-key
```

## Quick Start

```ts
import { generateText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Why is the sky blue?",
});

console.log(text);
```

## Provider Setup

**Default instance** — reads `ZHIPU_API_KEY` from environment:

```ts
import { zhipu } from "zhipu-ai-sdk-provider";
```

**Custom instance** — pass your own config:

```ts
import { createZhipu } from "zhipu-ai-sdk-provider";

const zhipu = createZhipu({
  apiKey: "your-api-key",
  baseURL: "https://open.bigmodel.cn/api/paas/v4", // default
  headers: { "X-Custom": "value" }, // optional
});
```

### Settings

| Option | Type | Description |
| --- | --- | --- |
| `apiKey` | `string` | API key. Defaults to `ZHIPU_API_KEY` env var. |
| `baseURL` | `string` | API base URL. Defaults to `https://open.bigmodel.cn/api/paas/v4`. |
| `headers` | `Record<string, string>` | Custom headers to include in requests. |
| `fetch` | `FetchFunction` | Custom fetch implementation (e.g. for testing or proxying). |

## Supported Models

### Language Models

| Model | Description |
| --- | --- |
| `glm-5` | Latest flagship, designed for agent applications |
| `glm-4.7` | High-performance with deep thinking |
| `glm-4.7-flash` | Fast variant of GLM-4.7 |
| `glm-4.7-flashx` | Extended fast variant of GLM-4.7 |
| `glm-4.6` | Previous-gen flagship, supports `tool_stream` |
| `glm-4.5` | GLM-4.5 with thinking support |
| `glm-4.5-air` | Lightweight GLM-4.5 |
| `glm-4.5-x` | Extended GLM-4.5 |
| `glm-4.5-airx` | Extended lightweight GLM-4.5 |
| `glm-4.5-flash` | Fast GLM-4.5 |
| `glm-4-plus` | Enhanced GLM-4 |
| `glm-4-air` | Lightweight GLM-4 |
| `glm-4-air-250414` | GLM-4-air dated snapshot |
| `glm-4-airx` | Extended lightweight GLM-4 |
| `glm-4-long` | Long-context GLM-4 |
| `glm-4-flash` | Fast GLM-4 |
| `glm-4-flash-250414` | GLM-4-flash dated snapshot |
| `glm-4-flashx` | Extended fast GLM-4 |
| `glm-4-32b-0414-128k` | Open-source 32B model, 128K context |

### Vision Models

| Model | Description |
| --- | --- |
| `glm-4.6v` | GLM-4.6 vision model |
| `glm-4.6v-flash` | Fast GLM-4.6 vision |
| `glm-4.6v-flashx` | Extended fast GLM-4.6 vision |
| `glm-4.5v` | GLM-4.5 vision model |
| `glm-4v-plus-0111` | Enhanced GLM-4 vision |
| `glm-4v-plus` | GLM-4 vision |
| `glm-4v` | Standard GLM-4 vision |
| `glm-4v-flash` | Fast GLM-4 vision |

### Reasoning Models

| Model | Description |
| --- | --- |
| `glm-z1-air` | Lightweight reasoning model |
| `glm-z1-airx` | Extended reasoning model |
| `glm-z1-flash` | Fast reasoning model |
| `glm-4.1v-thinking-flash` | Vision + reasoning |
| `glm-4.1v-thinking-flashx` | Extended vision + reasoning |

### Embedding Models

| Model | Description |
| --- | --- |
| `embedding-3` | Latest embedding model (recommended) |
| `embedding-2` | Standard embedding model |

### Image Generation Models

| Model | Description |
| --- | --- |
| `cogview-4-250304` | Latest CogView 4, supports `quality: "hd"` |
| `cogview-4` | Standard CogView 4 |
| `cogview-3-flash` | Fast image generation |

### Speech Models

| Model | Description |
| --- | --- |
| `glm-tts` | Text-to-speech model |

## Usage

### Text Generation

```ts
import { generateText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Explain quantum computing in simple terms.",
});
```

### Streaming

```ts
import { streamText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const result = streamText({
  model: zhipu("glm-4.7"),
  prompt: "Write a short story about a robot.",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### Thinking / Reasoning Mode

GLM-5 and GLM-4.7 models have thinking enabled by default. You can control this via model settings:

```ts
// Enable with preserved thinking (retains reasoning across turns)
const { text } = await generateText({
  model: zhipu("glm-4.7", {
    thinking: {
      type: "enabled",
      clearThinking: false, // preserve reasoning context across turns
    },
  }),
  prompt: "Solve step by step: What is 23 * 47?",
});
```

```ts
// Disable thinking for faster responses
const { text } = await generateText({
  model: zhipu("glm-4.7", {
    thinking: { type: "disabled" },
  }),
  prompt: "What is 2 + 2?",
});
```

You can also configure thinking at call time with `zhipuOptions`:

```ts
import { generateText } from "ai";
import { zhipu, zhipuOptions } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Solve this complex math problem.",
  providerOptions: zhipuOptions({
    thinking: { type: "enabled", clear_thinking: false },
  }),
});
```

### Provider Options (`zhipuOptions`)

Use `zhipuOptions` to pass Zhipu-specific API parameters at call time. Options are passed directly — no nesting required:

```ts
import { generateText } from "ai";
import { zhipu, zhipuOptions } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Hello!",
  providerOptions: zhipuOptions({
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4096,
    do_sample: true,
  }),
});
```

#### Available Options

| Option | Type | Description |
| --- | --- | --- |
| `temperature` | `number` | Controls randomness. Lower = more deterministic. |
| `top_p` | `number` | Nucleus sampling threshold. |
| `max_tokens` | `number` | Maximum tokens to generate. |
| `do_sample` | `boolean` | `false` = greedy decoding (ignores temperature/top_p). |
| `thinking` | `object` | `{ type: "enabled" \| "disabled", clear_thinking?: boolean }` |
| `stop` | `string[]` | Stop sequences (max 1 supported). |
| `user_id` | `string` | End user ID for abuse detection (6–128 chars). |
| `request_id` | `string` | Unique request ID. |
| `tool_stream` | `boolean` | Enable streaming tool calls (GLM-4.6). |
| `response_format` | `object` | `{ type: "text" }` or `{ type: "json_object" }` |

### Structured Output / JSON Mode

Use `generateObject` or `streamObject` for structured JSON output. The AI SDK automatically sets `response_format: { type: "json_object" }` and injects schema instructions into the prompt:

```ts
import { generateObject } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";
import { z } from "zod";

const { object } = await generateObject({
  model: zhipu("glm-4.7"),
  prompt: "Extract contact info: Zhang San, phone 13800138000, email zhang@example.com",
  schema: z.object({
    name: z.string(),
    phone: z.string().optional(),
    email: z.string().optional(),
  }),
});

console.log(object); // { name: "Zhang San", phone: "13800138000", email: "zhang@example.com" }
```

You can also set JSON mode directly via `providerOptions`:

```ts
import { generateText } from "ai";
import { zhipu, zhipuOptions } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: 'Return a JSON object with fields "name" and "age" for a person named Alice who is 30.',
  providerOptions: zhipuOptions({
    response_format: { type: "json_object" },
  }),
});

const data = JSON.parse(text); // { name: "Alice", age: 30 }
```

> **Note:** Zhipu API supports `json_object` mode but does not natively enforce JSON Schema. When using `generateObject` with a schema, the AI SDK injects schema instructions into the prompt. For best results, describe the expected format clearly in your prompt.
>
> See [Zhipu Structured Output docs](https://docs.z.ai/guides/capabilities/struct-output).

### Tool Calling

```ts
import { generateText, tool } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";
import { z } from "zod";

const { text, toolResults } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "What is the weather in Beijing?",
  tools: {
    getWeather: tool({
      description: "Get weather for a city",
      parameters: z.object({ city: z.string() }),
      execute: async ({ city }) => `Sunny, 25°C in ${city}`,
    }),
  },
});
```

### Web Search (Provider Tool)

Zhipu's built-in web search runs server-side — the model searches the web and incorporates results into its response automatically:

```ts
import { generateText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "What are the latest AI news today?",
  tools: {
    web_search: zhipu.tools.webSearch({
      searchEngine: "search_pro",
      count: 5,
      contentSize: "high",
    }),
  },
});
```

#### Web Search Options

| Option | Type | Description |
| --- | --- | --- |
| `searchEngine` | `string` | `"search_std"`, `"search_pro"`, `"search_pro_sogou"`, `"search_pro_quark"` |
| `searchIntent` | `boolean` | Perform search intent recognition first. Default `false`. |
| `count` | `number` | Number of results (1–50). Default `10`. |
| `searchDomainFilter` | `string` | Restrict to domain (e.g. `"www.example.com"`). |
| `searchRecencyFilter` | `string` | `"oneDay"`, `"oneWeek"`, `"oneMonth"`, `"oneYear"`, `"noLimit"` |
| `contentSize` | `string` | `"medium"` (summaries) or `"high"` (full context). |

### Vision

```ts
import { generateText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-4.6v"),
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What do you see?" },
        { type: "image", image: new URL("https://example.com/photo.jpg") },
      ],
    },
  ],
});
```

### File / PDF Analysis

Vision models support `file_url` for PDFs and other documents via the AI SDK `file` content part. Use `streamText` or `generateText`:

```ts
import { streamText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const result = streamText({
  model: zhipu("glm-4.6v-flash"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "file",
          data: new URL("https://example.com/report.pdf"),
          mimeType: "application/pdf",
        },
        { type: "text", text: "Summarize this document." },
      ],
    },
  ],
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

You can also pass base64-encoded files or mix images with documents:

```ts
import { streamText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";
import { readFileSync } from "fs";

const pdfBuffer = readFileSync("./contract.pdf");

const result = streamText({
  model: zhipu("glm-4.6v"),
  messages: [
    {
      role: "user",
      content: [
        {
          type: "file",
          data: pdfBuffer,
          mimeType: "application/pdf",
        },
        {
          type: "image",
          image: new URL("https://example.com/signature.png"),
        },
        { type: "text", text: "Compare the signature in the image with the one in the PDF contract." },
      ],
    },
  ],
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

> **Supported file types:** Images (`image_url`), PDFs, documents, and other files (`file_url`). The Zhipu VLM processes document pages visually — no text extraction needed.

### Embeddings

```ts
import { embed, embedMany } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

// Single embedding
const { embedding } = await embed({
  model: zhipu.embeddingModel("embedding-3"),
  value: "Hello, world!",
});

// With custom dimensions
const { embedding: smallEmbedding } = await embed({
  model: zhipu.embeddingModel("embedding-3", { dimensions: 256 }),
  value: "Hello, world!",
});

// Multiple embeddings
const { embeddings } = await embedMany({
  model: zhipu.embeddingModel("embedding-3"),
  values: ["Hello", "World"],
});
```

### Image Generation

```ts
import { generateImage } from "ai";
import { zhipu, zhipuImageOptions } from "zhipu-ai-sdk-provider";

const { images } = await generateImage({
  model: zhipu.imageModel("cogview-4-250304"),
  prompt: "A beautiful landscape with mountains and a river",
  size: "1024x1024",
  providerOptions: zhipuImageOptions({ quality: "hd" }),
});

// Images are returned as URLs
console.log(images[0]); // URL string
```

#### Image Size Constraints

- Width and height must be between 512–2048 pixels
- Both must be divisible by 16
- Total pixels (width × height) must not exceed 2²¹

### Text-to-Speech

```ts
import { generateSpeech } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { audio } = await generateSpeech({
  model: zhipu.speechModel("glm-tts"),
  text: "Hello, welcome to Zhipu AI!",
  voice: "female",
  speed: 1.0,
  outputFormat: "wav",
});

// audio is a Uint8Array of the WAV file
```

#### Speech Options

| Option | Type | Description |
| --- | --- | --- |
| `voice` | `string` | Voice selection (e.g. `"female"`, `"male"`). |
| `speed` | `number` | Speech speed. |
| `outputFormat` | `string` | Audio format. Default `"wav"`. |
| `volume` | `number` | Volume (0.1–2.0). Set via model settings. |

## Token Usage

The provider reports detailed token usage including cached and reasoning tokens:

```ts
const { usage } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Think step by step: what is 15 * 23?",
});

console.log(usage);
// {
//   inputTokens:  { total: 100, noCache: 80, cacheRead: 20 },
//   outputTokens: { total: 50,  text: 30,    reasoning: 20 },
// }
```

When the Zhipu API provides `completion_tokens_details.reasoning_tokens`, it is used directly. When the API omits this field (model-dependent), the provider estimates the reasoning/text split from streamed character counts.

## Features

- ✅ Text generation (`generateText`, `streamText`)
- ✅ Structured output (JSON mode)
- ✅ Tool / function calling
- ✅ Web search (provider-defined tool via `zhipu.tools.webSearch()`)
- ✅ Text-to-speech (`generateSpeech` via `zhipu.speechModel("glm-tts")`)
- ✅ Streaming with reasoning events (`reasoning-start`, `reasoning-delta`, `reasoning-end`)
- ✅ Thinking / reasoning mode (GLM-5, GLM-4.7, GLM-4.5)
- ✅ Preserved thinking (`clearThinking: false`)
- ✅ Turn-level thinking control (enable/disable per request)
- ✅ Vision (images and file URLs including PDFs)
- ✅ Vision + reasoning models
- ✅ Embeddings (`embed`, `embedMany`)
- ✅ Image generation (`generateImage`)
- ✅ Cached token accounting (`inputTokens.cacheRead`)
- ✅ Reasoning token accounting (`outputTokens.reasoning`)
- ✅ Reasoning token estimation when API omits breakdown

## Exported Types

```ts
import type {
  ZhipuProvider,
  ZhipuProviderSettings,
  ZhipuChatModelId,
  ZhipuChatSettings,
  ZhipuThinkingConfig,
  ZhipuProviderOptions,
  ZhipuEmbeddingModelId,
  ZhipuImageModelId,
  ZhipuImageProviderOptions,
  ZhipuSpeechModelId,
  ZhipuSpeechSettings,
} from "zhipu-ai-sdk-provider";

import {
  zhipu,
  createZhipu,
  zhipuOptions,
  zhipuImageOptions,
  webSearch,
} from "zhipu-ai-sdk-provider";
```

## Links

- [Zhipu API Reference](https://docs.z.ai/api-reference/llm/chat-completion)
- [GLM Model Guide](https://docs.z.ai/guides/llm/glm-4.7)
- [Thinking Mode Docs](https://docs.z.ai/guides/capabilities/thinking)
- [Web Search API](https://docs.bigmodel.cn/api-reference/工具-api/网络搜索)
- [Vercel AI SDK Docs](https://sdk.vercel.ai/docs/introduction)
- [GitHub Repository](https://github.com/meabed/zhipu-ai-provider)

## License

[MIT](./LICENSE.md)