import { describe, it, expect } from "vitest";
import { ImageModelV3CallOptions } from "@ai-sdk/provider";
import { createZhipu } from "./zhipu-provider";
import { zhipuImageOptions } from "./zhipu-options";
import { createTestServer } from "./test-server";

const TEST_API_KEY = "test-api-key";

const BASE_OPTIONS: ImageModelV3CallOptions = {
  prompt: "A beautiful sunset",
  n: 1,
  size: "1024x1024",
  aspectRatio: undefined,
  seed: undefined,
  files: undefined,
  mask: undefined,
  providerOptions: {},
};

const server = createTestServer({
  "https://open.bigmodel.cn/api/paas/v4/images/generations": {
    response: { type: "json-value", body: {} },
  },
});

function prepareJsonResponse({
  url = "https://example.com/generated-image.png",
  created = 1711115037,
  headers,
}: {
  url?: string;
  created?: number;
  headers?: Record<string, string>;
} = {}) {
  server.urls[
    "https://open.bigmodel.cn/api/paas/v4/images/generations"
  ].response = {
    type: "json-value",
    headers,
    body: {
      created,
      data: [{ url }],
    },
  };
}

describe("ZhipuImageModel", () => {
  const provider = createZhipu({ apiKey: TEST_API_KEY });
  const model = provider.imageModel("cogview-4-250304");

  it("should have correct specificationVersion", () => {
    expect(model.specificationVersion).toBe("v3");
  });

  it("should have correct modelId", () => {
    expect(model.modelId).toBe("cogview-4-250304");
  });

  it("should generate image and return URL", async () => {
    prepareJsonResponse({ url: "https://example.com/image.png" });

    const result = await model.doGenerate(BASE_OPTIONS);

    expect(result.images).toStrictEqual(["https://example.com/image.png"]);
  });

  it("should not include unnecessary providerMetadata", async () => {
    prepareJsonResponse({ url: "https://example.com/image.png" });

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "A cat" });

    expect(result.providerMetadata).toBeUndefined();
  });

  it("should pass model and prompt in request body", async () => {
    prepareJsonResponse();

    await model.doGenerate({ ...BASE_OPTIONS, prompt: "A landscape with mountains" });

    const calls =
      server.urls["https://open.bigmodel.cn/api/paas/v4/images/generations"]
        .calls;
    const body = calls[calls.length - 1].requestBodyJson as Record<
      string,
      unknown
    >;
    expect(body.model).toBe("cogview-4-250304");
    expect(body.prompt).toBe("A landscape with mountains");
    expect(body.size).toBe("1024x1024");
  });

  it("should pass authorization header", async () => {
    prepareJsonResponse();

    await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test" });

    const calls =
      server.urls["https://open.bigmodel.cn/api/paas/v4/images/generations"]
        .calls;
    const headers = calls[calls.length - 1].requestHeaders;
    expect(headers.authorization).toBe(`Bearer ${TEST_API_KEY}`);
  });

  it("should warn when n > 1", async () => {
    prepareJsonResponse();

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test", n: 4 });

    expect(result.warnings).toContainEqual({
      type: "unsupported",
      feature: "n",
      details: "This model does not support multiple images per call.",
    });
  });

  it("should warn when aspectRatio is provided", async () => {
    prepareJsonResponse();

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test", aspectRatio: "16:9" });

    expect(result.warnings).toContainEqual({
      type: "unsupported",
      feature: "aspectRatio",
      details:
        "This model does not support aspect ratio. Use `size` instead.",
    });
  });

  it("should warn when seed is provided", async () => {
    prepareJsonResponse();

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test", seed: 42 });

    expect(result.warnings).toContainEqual({
      type: "unsupported",
      feature: "seed",
    });
  });

  it("should throw on invalid size", async () => {
    prepareJsonResponse();

    await expect(
      model.doGenerate({ ...BASE_OPTIONS, prompt: "Test", size: "100x100" }),
    ).rejects.toThrow("Invalid size");
  });

  it("should throw on size not divisible by 16", async () => {
    prepareJsonResponse();

    await expect(
      model.doGenerate({ ...BASE_OPTIONS, prompt: "Test", size: "1000x1000" }),
    ).rejects.toThrow("Invalid size");
  });

  it("should pass provider options to request body", async () => {
    prepareJsonResponse();

    await model.doGenerate({
      ...BASE_OPTIONS,
      prompt: "Test",
      providerOptions: zhipuImageOptions({ quality: "hd" }),
    });

    const calls =
      server.urls["https://open.bigmodel.cn/api/paas/v4/images/generations"]
        .calls;
    const body = calls[calls.length - 1].requestBodyJson as Record<
      string,
      unknown
    >;
    expect(body.quality).toBe("hd");
  });

  it("should include response metadata", async () => {
    prepareJsonResponse();

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test" });

    expect(result.response.modelId).toBe("cogview-4-250304");
    expect(result.response.timestamp).toBeInstanceOf(Date);
    expect(result.response.headers).toBeDefined();
  });

  it("should pass custom headers", async () => {
    prepareJsonResponse();

    const provider = createZhipu({
      apiKey: TEST_API_KEY,
      headers: { "X-Custom": "custom-value" },
    });

    await provider.imageModel("cogview-4").doGenerate({
      ...BASE_OPTIONS,
      prompt: "Test",
      headers: { "X-Request": "request-value" },
    });

    const calls =
      server.urls["https://open.bigmodel.cn/api/paas/v4/images/generations"]
        .calls;
    const headers = calls[calls.length - 1].requestHeaders;
    expect(headers["x-custom"]).toBe("custom-value");
    expect(headers["x-request"]).toBe("request-value");
  });

  it("should not include warnings when no unsupported features are used", async () => {
    prepareJsonResponse();

    const result = await model.doGenerate({ ...BASE_OPTIONS, prompt: "Test" });

    expect(result.warnings).toStrictEqual([]);
  });
});
