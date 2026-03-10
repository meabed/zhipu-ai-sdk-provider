import { describe, it, expect } from "vitest";
import { webSearch, webSearchArgsSchema } from "./zhipu-tools";

describe("webSearch", () => {
  it("creates a valid tool object", () => {
    const tool = webSearch();
    expect(tool).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });

  it("creates a tool with default (empty) config", () => {
    const tool = webSearch();
    expect(tool).toBeDefined();
  });

  it("accepts search engine config", () => {
    const tool = webSearch({ searchEngine: "search_pro" });
    expect(tool).toBeDefined();
  });

  it("accepts all options", () => {
    const tool = webSearch({
      searchEngine: "search_pro_sogou",
      searchIntent: true,
      count: 5,
      searchDomainFilter: "example.com",
      searchRecencyFilter: "oneWeek",
      contentSize: "high",
    });
    expect(tool).toBeDefined();
    expect(tool.inputSchema).toBeDefined();
  });
});

describe("webSearchArgsSchema", () => {
  it("is defined", () => {
    expect(webSearchArgsSchema).toBeDefined();
  });
});
