# zhipu-ai-sdk-provider

## 0.4.0

### New Features
- **Web search provider tool** — `zhipu.tools.webSearch()` enables server-side web search. Supports all Zhipu search engines: `search_std`, `search_pro`, `search_pro_sogou`, `search_pro_quark`. Configurable result count, domain filtering, recency filtering, and content size.
- **Text-to-speech** — `zhipu.speechModel("glm-tts")` for speech generation with voice, speed, volume, and format options.
- **Structured output / JSON mode** — `response_format: { type: "json_object" }` supported via AI SDK's `generateObject`/`streamObject` and directly through `zhipuOptions({ response_format: { type: "json_object" } })`. Schema instructions are injected into prompts automatically by the AI SDK.
- **Reasoning token estimation** — when the Zhipu API omits `completion_tokens_details.reasoning_tokens` (model-dependent), the provider now estimates the reasoning/text token split from streamed character counts instead of reporting 0.
- **Flat provider options** — `zhipuOptions()` and `zhipuImageOptions()` no longer wrap in `{ zhipu: {} }`. Options are passed directly. No nesting anywhere in the SDK.
- **Provider tool support in language model** — `getArgs()` now handles both `function` and `provider` tool types, converting `zhipu.web_search` to the Zhipu API's `{ type: "web_search", web_search: {...} }` format.

### Improvements
- Removed redundant `providerMetadata` from image model (image URLs are already in the `images` return field)
- Removed all `{ zhipu: {} }` nesting from `providerOptions` and `providerMetadata`
- Stream transform now tracks reasoning and text character counts for accurate token estimation
- Added `buildToolsArray()` helper to cleanly separate function tools from provider tools

### Testing
- Expanded from 121 → 139 tests across 11 test files
- Added `zhipu-tools.test.ts` (5 tests) — web search tool creation and configuration
- Added `zhipu-speech-model.test.ts` (8 tests) — speech model construction, request body, warnings
- Added provider tests for `speechModel()` and `tools.webSearch()`
- Updated streaming tests to validate reasoning token estimation

## 0.3.0

### Breaking Changes
- **AI SDK V3 interfaces** — migrated from V2 (`LanguageModelV2`, `EmbeddingModelV2`, `ImageModelV2`, `ProviderV2`) to V3 (`LanguageModelV3`, `EmbeddingModelV3`, `ImageModelV3`, `ProviderV3`). Requires `ai@^6.0` / `@ai-sdk/provider@^3.0`.
- **Finish reason** is now an object `{ unified, raw }` instead of a plain string.
- **Usage** is now a structured object with `inputTokens.{ total, noCache, cacheRead, cacheWrite }` and `outputTokens.{ total, text, reasoning }`.

### New Models
- Added **GLM-5** (latest flagship)
- Added **GLM-4.7**, **GLM-4.7-flash**, **GLM-4.7-flashx** (4.7 series)
- Added **GLM-4.6** (with `tool_stream` support)
- Added **GLM-4.5-flash**, **GLM-4.5-flash-250414** (4.5 flash series)
- Added **GLM-4-32B-0414-128K** (open-source 32B)

### New Features
- **Cached token accounting** — `prompt_tokens_details.cached_tokens` mapped to `inputTokens.cacheRead`
- **Reasoning token accounting** — `completion_tokens_details.reasoning_tokens` mapped to `outputTokens.reasoning`
- **Streaming reasoning** — emits `reasoning-start` / `reasoning-delta` / `reasoning-end` events for thinking content
- **`stream-start` event** — V3 streams now begin with a `stream-start` event containing warnings
- **`sensitive` finish reason** — mapped to `content-filter` (Zhipu content moderation)
- **`network_error` finish reason** — mapped to `error` with an error event
- **Streaming tool calls** — fixed schema to support continuation chunks (partial `id`/`type`/`name`)

### Improvements
- **`zhipuOptions()` / `zhipuImageOptions()` helpers** — type-safe providerOptions
- **Vision model IDs** — added `glm-4.6v`, `glm-4.6v-flash`, `glm-4.6v-flashx`, `glm-4.5v`
- **`ZhipuProviderOptions`** — fully typed interface for all documented API parameters
- **Performance: streaming hot path** — replaced triple `string.split()` with single regex match for `<think>` tag parsing
- **Performance: duplicate events** — removed duplicate `tool-input-start` event emission in stream transform
- **Performance: message conversion** — single-pass text detection instead of `every()` + `map()` + `join()` chain; array-based string building for assistant messages
- **Performance: image size validation** — single `split("x")` call instead of two
- **Performance: unused import** — removed unused `generateId` import
- **Refactored** multi-model content warning from `every(…every())` to clearer `some(…some())` logic
- **Refactored** `doGenerate` to reuse `choice` variable instead of repeating `responseData.choices[0]`
- **Refactored** tool call continuation path — removed redundant null checks
- Fixed `isMultiModel` regex to avoid false positives on model names like `cogview`
- Fixed `toolChoice` warning to correctly check for unsupported modes
- Fixed stream lifecycle bug: premature `text-start` causing `AI_UIMessageStreamError`
- Updated `clearThinking` default documentation to `true`

### Testing
- Expanded from 31 → 121 tests across 9 test files
- Added 6 new test files: `compute-token-usage`, `map-zhipu-finish-reason`, `get-response-metadata`, `zhipu-image-options`, `zhipu-image-model`, `zhipu-provider`
- Expanded `convert-to-zhipu-chat-messages` tests from 3 → 20
- Added realistic streaming tests based on actual GLM-5, GLM-4.7, and GLM-4.7-flash responses
- Added streaming tool call tests (single-chunk and multi-chunk argument patterns)
- Added `sensitive` and `network_error` finish reason stream tests

## 0.2.1
- Support for disabling thinking for hybrid models

## 0.2.0
- Bug fix
- providerOptions support

## 0.2.0-beta.1
- Support for ai-sdk-v5
- Support for image generation