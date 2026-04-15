import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ToolDefinition, AgentContext } from "../types";

async function fetchAndExtract(url: string): Promise<string> {
  // eslint-disable-next-line custom/no-fetch-in-services-hooks-components
  const response = await fetch(url, {
    headers: { "User-Agent": "noticed-claw/1.0" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article) {
    // Fall back to raw text content
    return dom.window.document.body?.textContent?.trim().slice(0, 5000) ?? "no content extracted";
  }

  return article.textContent.trim().slice(0, 5000);
}

export const webFetchTool: ToolDefinition = {
  name: "web_fetch",
  description: "fetch a URL and extract its readable text content",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      url: { type: "string", description: "URL to fetch" },
    },
    required: ["url"],
  },
  execute: async (args: Record<string, unknown>, _ctx: AgentContext) => {
    const url = args.url as string;
    const content = await fetchAndExtract(url);
    return { url, content };
  },
};
