import {
  EmbeddingModelV3,
  ImageModelV3,
  LanguageModelV3,
  ProviderV3,
  SpeechModelV3,
} from "@ai-sdk/provider";
import {
  FetchFunction,
  loadApiKey,
  withoutTrailingSlash,
} from "@ai-sdk/provider-utils";
import { ZhipuChatLanguageModel } from "./zhipu-chat-language-model";
import { ZhipuChatModelId, ZhipuChatSettings } from "./zhipu-chat-settings";
import { ZhipuEmbeddingModel } from "./zhipu-embedding-model";
import { ZhipuImageModelId } from "./zhipu-image-options";
import { ZhipuImageModel } from "./zhipu-image-model";
import {
  ZhipuEmbeddingModelId,
  ZhipuEmbeddingSettings,
} from "./zhipu-embedding-settings";
import {
  ZhipuSpeechModel,
  ZhipuSpeechModelId,
  ZhipuSpeechSettings,
} from "./zhipu-speech-model";
import { webSearch } from "./zhipu-tools";

export interface ZhipuProvider extends ProviderV3 {
  (modelId: ZhipuChatModelId, settings?: ZhipuChatSettings): LanguageModelV3;

  /**
Creates a model for text generation.
*/
  languageModel(
    modelId: ZhipuChatModelId,
    settings?: ZhipuChatSettings,
  ): LanguageModelV3;

  /**
Creates a model for text generation.
*/
  chat(
    modelId: ZhipuChatModelId,
    settings?: ZhipuChatSettings,
  ): LanguageModelV3;

  /**
Creates a model for text embedding.
*/
  embeddingModel: (
    modelId: ZhipuEmbeddingModelId,
    settings?: ZhipuEmbeddingSettings,
  ) => EmbeddingModelV3;

  /**
Creates a model for text embedding.
@deprecated Use `embeddingModel` instead.
*/
  textEmbeddingModel?: (
    modelId: ZhipuEmbeddingModelId,
    settings?: ZhipuEmbeddingSettings,
  ) => EmbeddingModelV3;

  /**
Creates a model for image generation.
*/
  imageModel(modelId: ZhipuImageModelId): ImageModelV3;

  /**
Creates a model for image generation.
@deprecated Use `imageModel` instead.
*/
  image(modelId: ZhipuImageModelId): ImageModelV3;

  /**
Creates a model for text-to-speech.
*/
  speechModel(
    modelId: ZhipuSpeechModelId,
    settings?: ZhipuSpeechSettings,
  ): SpeechModelV3;

  /**
Provider-defined tools for Zhipu AI capabilities.
*/
  readonly tools: {
    /**
     * Web search tool — the model performs server-side web search.
     * @see https://docs.bigmodel.cn/api-reference/工具-api/网络搜索
     */
    webSearch: typeof webSearch;
  };
}

export interface ZhipuProviderSettings {
  /**
Use a different URL prefix for API calls, e.g. to use proxy servers.
The default prefix is `https://open.bigmodel.cn/api/paas/v4`.
   */
  baseURL?: string;

  /**
API key that is being send using the `Authorization` header.
It defaults to the `ZHIPU_API_KEY` environment variable.
   */
  apiKey?: string;

  /**
Custom headers to include in the requests.
     */
  headers?: Record<string, string>;

  /**
Custom fetch implementation. You can use it as a middleware to intercept requests,
or to provide a custom fetch implementation for e.g. testing.
    */
  fetch?: FetchFunction;
}

/**
Create a Zhipu AI provider instance.
 */
export function createZhipu(
  options: ZhipuProviderSettings = {},
): ZhipuProvider {
  const baseURL =
    withoutTrailingSlash(options.baseURL) ??
    "https://open.bigmodel.cn/api/paas/v4";

  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "ZHIPU_API_KEY",
      description: "ZHIPU API key",
    })}`,
    ...options.headers,
  });

  const createChatModel = (
    modelId: ZhipuChatModelId,
    settings: ZhipuChatSettings = {},
  ) =>
    new ZhipuChatLanguageModel(modelId, settings, {
      provider: "zhipu.chat",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createEmbeddingModel = (
    modelId: ZhipuEmbeddingModelId,
    settings: ZhipuEmbeddingSettings = {},
  ) =>
    new ZhipuEmbeddingModel(modelId, settings, {
      provider: "zhipu.embedding",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const createImageModel = (modelId: ZhipuImageModelId) =>
    new ZhipuImageModel(modelId, {
      provider: "zhipu.image",
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      _internal: {
        currentDate: () => new Date(),
      },
    });

  const createSpeechModel = (
    modelId: ZhipuSpeechModelId,
    settings: ZhipuSpeechSettings = {},
  ) =>
    new ZhipuSpeechModel(modelId, settings, {
      provider: "zhipu.speech",
      baseURL,
      headers: getHeaders,
      fetch: options.fetch,
    });

  const provider = function (
    modelId: ZhipuChatModelId,
    settings?: ZhipuChatSettings,
  ) {
    if (new.target) {
      throw new Error(
        "The Zhipu model function cannot be called with the new keyword.",
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.specificationVersion = "v3" as const;
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;

  provider.textEmbeddingModel = createEmbeddingModel;
  provider.embeddingModel = createEmbeddingModel;

  provider.image = createImageModel;
  provider.imageModel = createImageModel;

  provider.speechModel = createSpeechModel;

  provider.tools = {
    webSearch: webSearch,
  };

  return provider;
}

/**
Default Zhipu provider instance.
 */
export const zhipu = createZhipu();
