import {
  createProviderToolFactoryWithOutputSchema,
  lazySchema,
  zodSchema,
} from "@ai-sdk/provider-utils";
import { z } from "zod";

/**
 * Schema for Zhipu web_search tool configuration arguments.
 *
 * @see https://docs.bigmodel.cn/api-reference/工具-api/网络搜索
 */
export const webSearchArgsSchema = lazySchema(() =>
  zodSchema(
    z.object({
      /**
       * Search engine to use.
       * - `search_std`: Standard search engine
       * - `search_pro`: Advanced search engine
       * - `search_pro_sogou`: Sogou search
       * - `search_pro_quark`: Quark search
       */
      searchEngine: z
        .enum(["search_std", "search_pro", "search_pro_sogou", "search_pro_quark"])
        .optional(),
      /**
       * Whether to perform search intent recognition before searching.
       * When true, the model will first determine if a search is needed.
       * @default false
       */
      searchIntent: z.boolean().optional(),
      /**
       * Number of results to return (1-50).
       * @default 10
       */
      count: z.number().min(1).max(50).optional(),
      /**
       * Restrict search results to a specific domain (e.g., "www.example.com").
       * Supported engines: search_std, search_pro, search_pro_sogou.
       */
      searchDomainFilter: z.string().optional(),
      /**
       * Filter results by recency.
       * @default "noLimit"
       */
      searchRecencyFilter: z
        .enum(["oneDay", "oneWeek", "oneMonth", "oneYear", "noLimit"])
        .optional(),
      /**
       * Content size of returned results.
       * - `medium`: Summary info for basic reasoning
       * - `high`: Full context for detailed analysis
       */
      contentSize: z.enum(["medium", "high"]).optional(),
    }),
  ),
);

const webSearchOutputSchema = lazySchema(() =>
  zodSchema(
    z.object({
      searchResult: z.array(
        z.object({
          title: z.string(),
          content: z.string(),
          link: z.string(),
          media: z.string().optional(),
          icon: z.string().optional(),
          refer: z.string().optional(),
        }),
      ),
    }),
  ),
);

const webSearchToolFactory = createProviderToolFactoryWithOutputSchema<
  Record<string, never>,
  {
    searchResult: Array<{
      title: string;
      content: string;
      link: string;
      media?: string;
      icon?: string;
      refer?: string;
    }>;
  },
  {
    searchEngine?: "search_std" | "search_pro" | "search_pro_sogou" | "search_pro_quark";
    searchIntent?: boolean;
    count?: number;
    searchDomainFilter?: string;
    searchRecencyFilter?: "oneDay" | "oneWeek" | "oneMonth" | "oneYear" | "noLimit";
    contentSize?: "medium" | "high";
  }
>({
  id: "zhipu.web_search",
  inputSchema: lazySchema(() => zodSchema(z.object({}))),
  outputSchema: webSearchOutputSchema,
});

/**
 * Creates a Zhipu web_search provider tool for use with GLM models.
 *
 * Zhipu's web_search is a provider-executed tool — the model performs
 * the search server-side and returns results inline.
 *
 * @example
 * ```ts
 * import { generateText } from "ai";
 * import { zhipu } from "zhipu-ai-sdk-provider";
 *
 * const { text } = await generateText({
 *   model: zhipu("glm-4.7"),
 *   tools: {
 *     web_search: zhipu.tools.webSearch({ searchEngine: "search_pro" }),
 *   },
 *   prompt: "What happened in the news today?",
 * });
 * ```
 *
 * @see https://docs.bigmodel.cn/api-reference/工具-api/网络搜索
 */
export const webSearch = (
  args: Parameters<typeof webSearchToolFactory>[0] = {},
) => webSearchToolFactory(args);
