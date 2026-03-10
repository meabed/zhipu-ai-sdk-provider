# Zhipu AI Provider - Vercel AI SDK Community Provider

This is a [Zhipu](https://www.zhipuai.cn/) provider for the [AI SDK](https://sdk.vercel.ai/). It enables seamless integration with **GLM** and Embedding Models provided on [bigmodel.cn](https://bigmodel.cn/).

## Setup

```bash
# npm
npm i zhipu-ai-sdk-provider

# pnpm
pnpm add zhipu-ai-sdk-provider

# yarn
yarn add zhipu-ai-sdk-provider
```

Set up your `.env` file / environment with your API key.

```bash
ZHIPU_API_KEY=<your-api-key>
```

## Provider Instance

You can import the default provider instance `zhipu` from `zhipu-ai-sdk-provider` (This automatically reads the API key from the environment variable `ZHIPU_API_KEY`):

```ts
import { zhipu } from "zhipu-ai-sdk-provider";
```

Alternatively, you can create a provider instance with custom configuration with `createZhipu`:

```ts
import { createZhipu } from "zhipu-ai-sdk-provider";

const zhipu = createZhipu({
  baseURL: "https://open.bigmodel.cn/api/paas/v4",
  apiKey: "your-api-key",
});
```

You can use the following optional settings to customize the Zhipu provider instance:

- **baseURL**: _string_
  - Use a different URL prefix for API calls, e.g. to use proxy servers. The default prefix is `https://open.bigmodel.cn/api/paas/v4`.
- **apiKey**: _string_
  - Your API key for Zhipu [BigModel Platform](https://bigmodel.cn/). If not provided, the provider will attempt to read the API key from the environment variable `ZHIPU_API_KEY`.
- **headers**: _Record<string,string>_
  - Custom headers to include in the requests.

## Supported Models

### Language Models

| Model | Description |
| --- | --- |
| `glm-5` | Latest flagship model, designed for agent applications |
| `glm-4.7` | High-performance model with thinking support |
| `glm-4.7-flash` | Fast variant of GLM-4.7 |
| `glm-4.7-flashx` | Extended fast variant of GLM-4.7 |
| `glm-4.6` | Previous generation flagship |
| `glm-4.5` | GLM-4.5 series with thinking support |
| `glm-4.5-air` | Lightweight GLM-4.5 |
| `glm-4.5-x` | Extended GLM-4.5 |
| `glm-4.5-airx` | Extended lightweight GLM-4.5 |
| `glm-4.5-flash` | Fast GLM-4.5 |
| `glm-4-plus` | Enhanced GLM-4 |
| `glm-4-flash` | Fast GLM-4 |
| `glm-4-32b-0414-128k` | 32B parameter model with 128K context |

### Vision Models

| Model | Description |
| --- | --- |
| `glm-4v-plus-0111` | Enhanced vision model |
| `glm-4v-plus` | Vision model |
| `glm-4v` | Standard vision model |
| `glm-4v-flash` | Fast vision model |

### Reasoning Models

| Model | Description |
| --- | --- |
| `glm-z1-air` | Lightweight reasoning model |
| `glm-z1-airx` | Extended reasoning model |
| `glm-z1-flash` | Fast reasoning model |
| `glm-4.1v-thinking-flash` | Vision reasoning model |
| `glm-4.1v-thinking-flashx` | Extended vision reasoning model |

### Embedding Models

| Model | Description |
| --- | --- |
| `embedding-2` | Standard embedding model |
| `embedding-3` | Latest embedding model (recommended) |

### Image Generation Models

| Model | Description |
| --- | --- |
| `cogview-3-flash` | Fast image generation |
| `cogview-4` | Standard CogView 4 |
| `cogview-4-250304` | Latest CogView 4 with quality options |

## Language Model Example

```ts
import { generateText } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { text } = await generateText({
  model: zhipu("glm-5"),
  prompt: "Why is the sky blue?",
});

console.log(text);
```

## Thinking / Reasoning Mode

GLM-4.5+ and GLM-4.7+ models support thinking mode for complex reasoning tasks. When enabled, the model performs deep reasoning before responding.

```ts
const { text } = await generateText({
  model: zhipu("glm-4.7", {
    thinking: {
      type: "enabled",
    },
  }),
  prompt: "Solve this step by step: What is 23 * 47?",
});
```

To disable thinking:

```ts
const { text } = await generateText({
  model: zhipu("glm-4.7", {
    thinking: {
      type: "disabled",
    },
  }),
  prompt: "Explain quantum computing in simple terms.",
});
```

You can also configure thinking via `providerOptions`:

```ts
const { text } = await generateText({
  model: zhipu("glm-4.7"),
  prompt: "Explain quantum computing in simple terms.",
  providerOptions: {
    zhipu: {
      thinking: {
        type: "disabled",
      },
    },
  },
});
```

## Embedding Example

```ts
import { embed } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { embedding } = await embed({
  model: zhipu.embeddingModel("embedding-3", {
    dimensions: 256, // Optional, defaults to 2048
  }),
  value: "Hello, world!",
});

console.log(embedding);
```

## Image Generation Example

Zhipu supports image generation with the `cogview` models, but the API does not return images in base64 or buffer format, so the image URLs are returned in the `providerMetadata` field.

```ts
import { experimental_generateImage as generateImage } from "ai";
import { zhipu } from "zhipu-ai-sdk-provider";

const { image, providerMetadata } = await generateImage({
  model: zhipu.imageModel("cogview-4-250304"),
  prompt: "A beautiful landscape with mountains and a river",
  size: "1024x1024", // optional
  providerOptions: {
    // optional
    zhipu: {
      quality: "hd",
    },
  },
});

console.log(providerMetadata.zhipu.images[0].url);
```

## Features Support

- [x] Text generation
- [x] Text embedding
- [x] Image generation
- [x] Chat
- [x] Tools / Function calling
- [x] Streaming
- [x] Structured output (JSON mode)
- [x] Reasoning / Thinking mode
- [x] Vision (images and video)
- [x] Vision Reasoning
- [x] Cache token accounting
- [ ] Provider-defined tools (web_search, retrieval)
- [ ] Voice Models

## Documentation

- **[Zhipu API Reference](https://docs.z.ai/api-reference/llm/chat-completion)**
- **[GLM Model Guide](https://docs.z.ai/guides/llm/glm-4.7)**
- **[Vercel AI SDK Documentation](https://sdk.vercel.ai/docs/introduction)**
- **[Zhipu AI Provider Repo](https://github.com/meabed/zhipu-ai-sdk-provider)**