/** * Web Search Extension for Pi - Queries local SearXNG instance */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

const SEARXNG_URL = process.env.SEARXNG_URL ?? "http://127.0.0.1:8888";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description: "Search the web via local SearXNG instance. Returns top result titles, URLs, and snippets.",
    promptSnippet: "Search the web for current information, documentation, or references.",
    promptGuidelines: [
      "Use web_search when the user asks about something that requires current or external information.",
      "Follow up with fetch_url on the most relevant result to read the full content.",
      "web_search is best for finding documentation links, recent updates, or specific pages.",
    ],
    parameters: Type.Object({
      query: Type.String({ description: "Search query (e.g., 'ollama cloud api documentation')" }),
      count: Type.Optional(Type.Number({ description: "Number of results to return (1-15, default 5)", default: 5 })),
    }),

    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const query = encodeURIComponent(params.query);
      const maxResults = Math.min(Math.max(params.count ?? 5, 1), 15);
      const searchUrl = `${SEARXNG_URL}/search?q=${query}&format=json`;
      const timeoutMs = 20000;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      signal?.addEventListener("abort", () => controller.abort(), { once: true });

      try {
        const response = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          return {
            content: [{ type: "text", text: `SearXNG returned HTTP ${response.status}: ${response.statusText}` }],
            details: { status: response.status, url: searchUrl },
            isError: true,
          };
        }

        const data = (await response.json()) as {
          query: string;
          number_of_results: number;
          results: Array<{
            url: string;
            title: string;
            content?: string;
            engine: string;
            engines: string[];
            score: number;
          }>;
          unresponsive_engines?: string[][];
        };

        const results = (data.results ?? []).slice(0, maxResults);

        if (results.length === 0) {
          const enginesDown = (data.unresponsive_engines ?? [])
            .map((e) => e[0])
            .filter(Boolean);
          const reason = enginesDown.length > 0
            ? `No results. Unresponsive engines: ${enginesDown.join(", ")}.`
            : "No results found.";
          return {
            content: [{ type: "text", text: reason }],
            details: { query: params.query, engines_down: enginesDown },
          };
        }

        const lines = results.map(
          (r, i) =>
            `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${(r.content ?? "").replace(/\n+/g, " ").trim().slice(0, 200)}${(r.content ?? "").length > 200 ? "..." : ""}\n`
        );

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: {
            query: params.query,
            results_count: results.length,
            total_available: data.number_of_results,
            engines: [...new Set(results.flatMap((r) => r.engines))],
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Search failed: ${message}\n\nIs SearXNG running? Start it with:\ndocker run -d --name searxng --dns 1.1.1.1 -p 127.0.0.1:8888:8080 -v ~/.pi/agent/searxng/settings.yml:/etc/searxng/settings.yml:ro searxng/searxng:latest` }],
          details: { query: params.query, error: message, searxng_url: SEARXNG_URL },
          isError: true,
        };
      }
    },
  });
}
