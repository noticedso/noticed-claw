import type { ToolDefinition, AgentContext } from "../types";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function performWebSearch(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return [{ title: "web search unavailable", url: "", snippet: "TAVILY_API_KEY not configured" }];
  }

  // eslint-disable-next-line custom/no-fetch-in-services-hooks-components
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
    }),
  });

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

export const webSearchTool: ToolDefinition = {
  name: "web_search",
  description: "search the web for information using Tavily",
  profile: "standard",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "search query" },
    },
    required: ["query"],
  },
  execute: async (args: Record<string, unknown>, _ctx: AgentContext) => {
    const query = args.query as string;
    return performWebSearch(query);
  },
};
