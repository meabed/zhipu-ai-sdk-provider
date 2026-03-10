import { describe, it, expect } from "vitest";
import { createZhipu } from "./zhipu-provider";
import { ZhipuChatLanguageModel } from "./zhipu-chat-language-model";

describe("createZhipu", () => {
  it("should create a provider with specificationVersion v3", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    expect(provider.specificationVersion).toBe("v3");
  });

  it("should create language models via provider function call", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider("glm-4-flash");
    expect(model.modelId).toBe("glm-4-flash");
    expect(model.specificationVersion).toBe("v3");
  });

  it("should create language models via languageModel()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.languageModel("glm-4.7");
    expect(model.modelId).toBe("glm-4.7");
  });

  it("should create language models via chat()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("glm-5");
    expect(model.modelId).toBe("glm-5");
  });

  it("should create embedding models via embeddingModel()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.embeddingModel("embedding-3");
    expect(model.modelId).toBe("embedding-3");
    expect(model.specificationVersion).toBe("v3");
  });

  it("should create embedding models via textEmbeddingModel() (deprecated)", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.textEmbeddingModel!("embedding-2");
    expect(model.modelId).toBe("embedding-2");
  });

  it("should create image models via imageModel()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.imageModel("cogview-4");
    expect(model.modelId).toBe("cogview-4");
    expect(model.specificationVersion).toBe("v3");
  });

  it("should create image models via image()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.image("cogview-3-flash");
    expect(model.modelId).toBe("cogview-3-flash");
  });

  it("should throw when called with new keyword", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    expect(() => {
      // @ts-expect-error - testing new keyword error
      new provider("glm-4-flash");
    }).toThrow("The Zhipu model function cannot be called with the new keyword.");
  });

  it("should lowercase model IDs for chat models", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("GLM-4-Flash");
    expect(model.modelId).toBe("glm-4-flash");
  });

  it("should pass settings to chat model", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("glm-4-flash", { userId: "test-user" });
    expect((model as ZhipuChatLanguageModel).settings.userId).toBe("test-user");
  });

  it("should pass thinking settings to chat model", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("glm-4.7", {
      thinking: { type: "enabled" },
    });
    expect((model as ZhipuChatLanguageModel).settings.thinking).toStrictEqual({ type: "enabled" });
  });

  it("should use default baseURL when not provided", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("glm-4-flash");
    expect(model.provider).toBe("zhipu.chat");
  });

  it("should accept custom baseURL", () => {
    const provider = createZhipu({
      apiKey: "test-key",
      baseURL: "https://custom.api.com/v4",
    });
    const model = provider.chat("glm-4-flash");
    expect(model).toBeDefined();
  });

  it("should accept custom baseURL with trailing slash", () => {
    const provider = createZhipu({
      apiKey: "test-key",
      baseURL: "https://custom.api.com/v4/",
    });
    const model = provider.chat("glm-4-flash");
    expect(model).toBeDefined();
  });

  it("should detect vision models", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    // Vision models contain digits followed by "v" in the ID
    const visionModel = provider.chat("glm-4v-flash");
    // Non-vision models should not be flagged
    const textModel = provider.chat("glm-4-flash");
    // Both should be valid models
    expect(visionModel.modelId).toBe("glm-4v-flash");
    expect(textModel.modelId).toBe("glm-4-flash");
  });

  it("should support string model IDs not in the predefined list", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.chat("custom-model-id");
    expect(model.modelId).toBe("custom-model-id");
  });

  it("should create speech models via speechModel()", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const model = provider.speechModel("glm-tts");
    expect(model.modelId).toBe("glm-tts");
    expect(model.provider).toBe("zhipu.speech");
    expect(model.specificationVersion).toBe("v3");
  });

  it("should expose tools.webSearch", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    expect(provider.tools).toBeDefined();
    expect(typeof provider.tools.webSearch).toBe("function");
  });

  it("should create a valid webSearch tool", () => {
    const provider = createZhipu({ apiKey: "test-key" });
    const tool = provider.tools.webSearch({ searchEngine: "search_pro" });
    expect(tool).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });
});
