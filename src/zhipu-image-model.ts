import { ImageModelV3, SharedV3Warning } from "@ai-sdk/provider";
import {
  combineHeaders,
  createJsonErrorResponseHandler,
  createJsonResponseHandler,
  FetchFunction,
  postJsonToApi,
} from "@ai-sdk/provider-utils";
import { z } from "zod";
import { defaultZhipuErrorStructure } from "./zhipu-error";
import {
  ZhipuImageModelId,
  ZhipuImageProviderOptions,
  sizeSchema,
} from "./zhipu-image-options";

export type ZhipuImageModelConfig = {
  provider: string;
  headers: () => Record<string, string | undefined>;
  url: (options: { modelId: string; path: string }) => string;
  fetch?: FetchFunction;
  _internal?: {
    currentDate?: () => Date;
  };
};

export class ZhipuImageModel implements ImageModelV3 {
  readonly specificationVersion = "v3";
  readonly maxImagesPerCall = 10;

  get provider(): string {
    return this.config.provider;
  }

  constructor(
    readonly modelId: ZhipuImageModelId,
    private readonly config: ZhipuImageModelConfig,
  ) {}

  async doGenerate({
    prompt,
    n,
    size,
    aspectRatio,
    seed,
    providerOptions,
    headers,
    abortSignal,
  }: Parameters<ImageModelV3["doGenerate"]>[0]): Promise<
    Awaited<ReturnType<ImageModelV3["doGenerate"]>>
  > {
    const warnings: Array<SharedV3Warning> = [];

    // Read providerOptions directly — no nesting required
    const zhipuProviderOptions = (providerOptions ?? {}) as ZhipuImageProviderOptions;

    if (n != null && n > 1) {
      warnings.push({
        type: "unsupported",
        feature: "n",
        details: "This model does not support multiple images per call.",
      });
    }

    if (aspectRatio != null) {
      warnings.push({
        type: "unsupported",
        feature: "aspectRatio",
        details:
          "This model does not support aspect ratio. Use `size` instead.",
      });
    }

    if (seed != null) {
      warnings.push({ type: "unsupported", feature: "seed" });
    }

    if (size != null) {
      const [w, h] = size.split("x");
      if (
        !sizeSchema.safeParse({
          width: parseInt(w),
          height: parseInt(h),
        }).success
      ) {
        throw new Error(
          "Invalid size. Size must be an object with width and height, both divisible by 16, and within the range of 512 to 2048 pixels.",
        );
      }
    }

    const currentDate = this.config._internal?.currentDate?.() ?? new Date();
    const { value: response, responseHeaders } = await postJsonToApi({
      url: this.config.url({
        path: "/images/generations",
        modelId: this.modelId,
      }),
      headers: combineHeaders(this.config.headers(), headers),
      body: {
        model: this.modelId,
        prompt,
        size,
        ...(zhipuProviderOptions ?? {}),
      },
      failedResponseHandler: createJsonErrorResponseHandler(
        defaultZhipuErrorStructure,
      ),
      successfulResponseHandler: createJsonResponseHandler(
        zhipuImageResponseSchema,
      ),
      abortSignal,
      fetch: this.config.fetch,
    });

    const typedResponse = response as z.infer<typeof zhipuImageResponseSchema>;

    return {
      images: typedResponse.data.map((item) => item.url),
      warnings,
      response: {
        timestamp: currentDate,
        modelId: this.modelId,
        headers: responseHeaders,
      },
    };
  }
}

// minimal version of the schema, focussed on what is needed for the implementation
// this approach limits breakages when the API changes and increases efficiency
const zhipuImageResponseSchema = z.object({
  created: z.number(),
  data: z.array(z.object({ url: z.url() })),
});
