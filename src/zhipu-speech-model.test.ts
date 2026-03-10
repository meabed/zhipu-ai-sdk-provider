import { describe, it, expect, vi } from "vitest";
import { ZhipuSpeechModel } from "./zhipu-speech-model";

function createMockConfig(overrides = {}) {
  return {
    provider: "zhipu.speech",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    headers: () => ({ Authorization: "Bearer test-key" }),
    fetch: vi.fn(),
    ...overrides,
  };
}

describe("ZhipuSpeechModel", () => {
  it("has correct specificationVersion", () => {
    const model = new ZhipuSpeechModel("glm-tts", {}, createMockConfig());
    expect(model.specificationVersion).toBe("v3");
  });

  it("has correct provider", () => {
    const model = new ZhipuSpeechModel("glm-tts", {}, createMockConfig());
    expect(model.provider).toBe("zhipu.speech");
  });

  it("has correct modelId", () => {
    const model = new ZhipuSpeechModel("glm-tts", {}, createMockConfig());
    expect(model.modelId).toBe("glm-tts");
  });

  it("sends correct request body", async () => {
    const audioData = new Uint8Array([1, 2, 3, 4]);
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(audioData, {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const model = new ZhipuSpeechModel(
      "glm-tts",
      { volume: 1.5 },
      createMockConfig({ fetch: mockFetch }),
    );

    await model.doGenerate({
      text: "Hello world",
      voice: "female",
      speed: 1.2,
      outputFormat: "mp3",
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://open.bigmodel.cn/api/paas/v4/audio/speech");
    const body = JSON.parse(options.body);
    expect(body.model).toBe("glm-tts");
    expect(body.input).toBe("Hello world");
    expect(body.voice).toBe("female");
    expect(body.speed).toBe(1.2);
    expect(body.volume).toBe(1.5);
    expect(body.response_format).toBe("mp3");
  });

  it("defaults outputFormat to wav", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const model = new ZhipuSpeechModel(
      "glm-tts",
      {},
      createMockConfig({ fetch: mockFetch }),
    );

    await model.doGenerate({ text: "Hello" });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.response_format).toBe("wav");
  });

  it("returns warnings for unsupported language option", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const model = new ZhipuSpeechModel(
      "glm-tts",
      {},
      createMockConfig({ fetch: mockFetch }),
    );

    const result = await model.doGenerate({
      text: "Hello",
      language: "en",
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "unsupported",
          feature: "language",
        }),
      ]),
    );
  });

  it("returns warnings for unsupported instructions option", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const model = new ZhipuSpeechModel(
      "glm-tts",
      {},
      createMockConfig({ fetch: mockFetch }),
    );

    const result = await model.doGenerate({
      text: "Hello",
      instructions: "Speak slowly",
    });

    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "unsupported",
          feature: "instructions",
        }),
      ]),
    );
  });

  it("returns audio data and response metadata", async () => {
    const audioData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(audioData, {
        status: 200,
        headers: { "content-type": "audio/wav" },
      }),
    );

    const model = new ZhipuSpeechModel(
      "glm-tts",
      {},
      createMockConfig({ fetch: mockFetch }),
    );

    const result = await model.doGenerate({ text: "Test" });

    expect(result.audio).toBeInstanceOf(Uint8Array);
    expect(result.response).toBeDefined();
    expect(result.response.modelId).toBe("glm-tts");
    expect(result.response.timestamp).toBeInstanceOf(Date);
  });
});
