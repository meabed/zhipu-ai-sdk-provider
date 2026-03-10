import { describe, expect, it } from "vitest";
import { convertToZhipuChatMessages } from "./convert-to-zhipu-chat-messages";

describe("system messages", () => {
  it("should convert system messages", () => {
    const result = convertToZhipuChatMessages([
      { role: "system", content: "You are a helpful assistant." },
    ]);

    expect(result).toStrictEqual([
      { role: "system", content: "You are a helpful assistant." },
    ]);
  });
});

describe("user messages", () => {
  it("should convert simple text message", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ]);

    expect(result).toStrictEqual([{ role: "user", content: "Hello" }]);
  });

  it("should merge multiple text-only parts into a single string", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Hello " },
          { type: "text", text: "World" },
        ],
      },
    ]);

    expect(result).toStrictEqual([{ role: "user", content: "Hello World" }]);
  });

  it("should convert messages with image parts", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Hello" },
          {
            type: "file",
            data: new Uint8Array([0, 1, 2, 3]),
            mediaType: "image/png",
          },
        ],
      },
    ]);

    expect(result).toMatchSnapshot();
  });

  it("should convert image URL parts", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this" },
          {
            type: "file",
            data: new URL("https://example.com/image.png"),
            mediaType: "image/png",
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this" },
          {
            type: "image_url",
            image_url: { url: "https://example.com/image.png" },
          },
        ],
      },
    ]);
  });

  it("should convert image string data parts", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          {
            type: "file",
            data: "base64-encoded-data",
            mediaType: "image/jpeg",
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: "base64-encoded-data" },
          },
        ],
      },
    ]);
  });

  it("should convert video URL parts as file_url", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this video" },
          {
            type: "file",
            data: new URL("https://example.com/video.mp4"),
            mediaType: "video/mp4",
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this video" },
          {
            type: "file_url",
            file_url: { url: "https://example.com/video.mp4" },
          },
        ],
      },
    ]);
  });

  it("should convert PDF URL parts as file_url", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          { type: "text", text: "Summarize this document" },
          {
            type: "file",
            data: new URL("https://example.com/doc.pdf"),
            mediaType: "application/pdf",
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "user",
        content: [
          { type: "text", text: "Summarize this document" },
          {
            type: "file_url",
            file_url: { url: "https://example.com/doc.pdf" },
          },
        ],
      },
    ]);
  });

  it("should convert audio file parts as file_url", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [
          {
            type: "file",
            data: new URL("https://example.com/audio.mp3"),
            mediaType: "audio/mp3",
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "user",
        content: [
          {
            type: "file_url",
            file_url: { url: "https://example.com/audio.mp3" },
          },
        ],
      },
    ]);
  });
});

describe("assistant messages", () => {
  it("should convert text content", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "assistant",
        content: [{ type: "text", text: "Response text" }],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "assistant",
        content: "Response text",
        prefix: true,
        tool_calls: undefined,
      },
    ]);
  });

  it("should add prefix true to trailing assistant messages", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
      {
        role: "assistant",
        content: [{ type: "text", text: "Hello!" }],
      },
    ]);

    expect(result).toMatchSnapshot();
  });

  it("should not add prefix to non-trailing assistant messages", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "assistant",
        content: [{ type: "text", text: "Previous" }],
      },
      {
        role: "user",
        content: [{ type: "text", text: "Hello" }],
      },
    ]);

    expect(result[0]).toMatchObject({
      role: "assistant",
      prefix: undefined,
    });
  });

  it("should skip reasoning content", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "assistant",
        content: [
          { type: "reasoning", text: "Let me think..." },
          { type: "text", text: "The answer is 42." },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "assistant",
        content: "The answer is 42.",
        prefix: true,
        tool_calls: undefined,
      },
    ]);
  });
});

describe("tool calls", () => {
  it("should stringify arguments to tool calls", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "assistant",
        content: [
          {
            type: "tool-call",
            input: { key: "arg-value" },
            toolCallId: "tool-call-id-1",
            toolName: "tool-1",
          },
        ],
      },
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "tool-call-id-1",
            toolName: "tool-1",
            output: {
              type: "json",
              value: { key: "result-value" },
            },
          },
        ],
      },
    ]);

    expect(result).toMatchSnapshot();
  });

  it("should handle text tool results", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: { type: "text", value: "Text result" },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      { role: "tool", content: "Text result", tool_call_id: "call-1" },
    ]);
  });

  it("should handle error-text tool results", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: { type: "error-text", value: "Something went wrong" },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "tool",
        content: "Something went wrong",
        tool_call_id: "call-1",
      },
    ]);
  });

  it("should handle error-json tool results", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: {
              type: "error-json",
              value: { error: "bad request" },
            },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "tool",
        content: '{"error":"bad request"}',
        tool_call_id: "call-1",
      },
    ]);
  });

  it("should handle execution-denied tool results", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: {
              type: "execution-denied",
              reason: "User denied execution",
            },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "tool",
        content: "User denied execution",
        tool_call_id: "call-1",
      },
    ]);
  });

  it("should handle execution-denied without reason", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: { type: "execution-denied" },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "tool",
        content: "Execution denied",
        tool_call_id: "call-1",
      },
    ]);
  });

  it("should handle content-type tool results", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: "call-1",
            toolName: "tool-1",
            output: {
              type: "content",
              value: [{ type: "text", text: "Rich content" }],
            },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      {
        role: "tool",
        content: '[{"type":"text","text":"Rich content"}]',
        tool_call_id: "call-1",
      },
    ]);
  });

  it("should skip tool-approval-response parts", () => {
    const result = convertToZhipuChatMessages([
      {
        role: "tool",
        content: [
          {
            type: "tool-approval-response",
            toolCallId: "call-1",
            toolName: "tool-1",
            result: "approved",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          {
            type: "tool-result",
            toolCallId: "call-2",
            toolName: "tool-2",
            output: { type: "text", value: "Result" },
          },
        ],
      },
    ]);

    expect(result).toStrictEqual([
      { role: "tool", content: "Result", tool_call_id: "call-2" },
    ]);
  });
});
