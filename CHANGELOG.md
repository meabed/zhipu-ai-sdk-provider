# zhipu-ai-sdk-provider

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
- **Streaming reasoning** — emits `reasoning-start` / `reasoning-delta` events for thinking content
- **`stream-start` event** — V3 streams now begin with a `stream-start` event containing warnings
- **`sensitive` finish reason** — mapped to `content-filter` (Zhipu content moderation)
- **`network_error` finish reason** — mapped to `error` with an error event
- **Streaming tool calls** — fixed schema to support continuation chunks (partial `id`/`type`/`name`)

### Improvements
- Rewrote README with model tables, feature support matrix, and real-world examples
- Fixed `isMultiModel` regex to avoid false positives on model names like `cogview`
- Fixed `toolChoice` warning to correctly check for unsupported modes
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