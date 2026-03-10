import { SpeechModelV3, SharedV3Warning } from "@ai-sdk/provider";
import {
  FetchFunction,
  combineHeaders,
  createBinaryResponseHandler,
  createStatusCodeErrorResponseHandler,
  postJsonToApi,
} from "@ai-sdk/provider-utils";

/**
 * Zhipu TTS model IDs.
 * @see https://docs.bigmodel.cn/cn/guide/models/sound-and-video/glm-tts
 */
export type ZhipuSpeechModelId = "glm-tts" | (string & {});

export interface ZhipuSpeechSettings {
  /**
   * Volume control (0.1 - 2.0).
   * @default 1.0
   */
  volume?: number;
}

type ZhipuSpeechConfig = {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
  fetch?: FetchFunction;
};

export class ZhipuSpeechModel implements SpeechModelV3 {
  readonly specificationVersion = "v3" as const;
  readonly provider: string;
  readonly modelId: ZhipuSpeechModelId;

  private readonly settings: ZhipuSpeechSettings;
  private readonly config: ZhipuSpeechConfig;

  constructor(
    modelId: ZhipuSpeechModelId,
    settings: ZhipuSpeechSettings,
    config: ZhipuSpeechConfig,
  ) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.provider = config.provider;
  }

  async doGenerate(
    options: Parameters<SpeechModelV3["doGenerate"]>[0],
  ): Promise<Awaited<ReturnType<SpeechModelV3["doGenerate"]>>> {
    const warnings: SharedV3Warning[] = [];

    if (options.language != null) {
      warnings.push({
        type: "unsupported",
        feature: "language",
        details: "GLM-TTS automatically detects language.",
      });
    }

    if (options.instructions != null) {
      warnings.push({
        type: "unsupported",
        feature: "instructions",
        details: "GLM-TTS does not support instructions.",
      });
    }

    const responseFormat = options.outputFormat ?? "wav";

    const body: Record<string, unknown> = {
      model: this.modelId,
      input: options.text,
      response_format: responseFormat,
    };

    if (options.voice != null) {
      body.voice = options.voice;
    }
    if (options.speed != null) {
      body.speed = options.speed;
    }
    if (this.settings.volume != null) {
      body.volume = this.settings.volume;
    }

    const { value: audio, responseHeaders } = await postJsonToApi({
      url: `${this.config.baseURL}/audio/speech`,
      headers: combineHeaders(this.config.headers(), options.headers),
      body,
      failedResponseHandler: createStatusCodeErrorResponseHandler(),
      successfulResponseHandler: createBinaryResponseHandler(),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch,
    });

    return {
      audio,
      warnings,
      response: {
        timestamp: new Date(),
        modelId: this.modelId,
        headers: responseHeaders,
      },
    };
  }
}
