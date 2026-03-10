import type { SharedV3ProviderOptions } from "@ai-sdk/provider";
import type { ZhipuProviderOptions } from "./zhipu-chat-settings";
import type { ZhipuImageProviderOptions } from "./zhipu-image-options";

/**
 * Type helper for Zhipu chat model `providerOptions`.
 * Pass your options directly — no nesting required.
 *
 * @example
 * ```ts
 * import { zhipu, zhipuOptions } from "zhipu-ai-sdk-provider";
 *
 * const result = await generateText({
 *   model: zhipu("glm-4.7"),
 *   prompt: "Hello",
 *   providerOptions: zhipuOptions({
 *     temperature: 0.7,
 *     thinking: { type: "enabled" },
 *   }),
 * });
 * ```
 */
export function zhipuOptions(
  options: ZhipuProviderOptions,
): SharedV3ProviderOptions {
  return options as unknown as SharedV3ProviderOptions;
}

/**
 * Type helper for Zhipu image model `providerOptions`.
 *
 * @example
 * ```ts
 * import { zhipu, zhipuImageOptions } from "zhipu-ai-sdk-provider";
 *
 * const { image } = await generateImage({
 *   model: zhipu.imageModel("cogview-4-250304"),
 *   prompt: "A landscape",
 *   providerOptions: zhipuImageOptions({ quality: "hd" }),
 * });
 * ```
 */
export function zhipuImageOptions(
  options: ZhipuImageProviderOptions,
): SharedV3ProviderOptions {
  return options as unknown as SharedV3ProviderOptions;
}
