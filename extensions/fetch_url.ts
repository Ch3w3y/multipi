/** * Fetch URL Extension for Pi - Adds a fetch_url tool to browse the web. */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "fetch_url",
    label: "Fetch URL",
    description: "Fetch the content of a web page via HTTP GET. Returns the text content.",
    promptSnippet: "Fetch web pages to read documentation, check APIs, or get current information.",
    promptGuidelines: [
      "Use fetch_url when the user asks about something that may require up-to-date web information.",
      "Use fetch_url to read official documentation, API docs, or changelogs.",
      "Try the URL directly first; if content is messy, retry with extract=true for clean text.",
      "When fetching a page with many links, use fetch_url with extract=true to get readable content.",
    ],
    parameters: Type.Object({
      url: Type.String({ description: "Full URL to fetch (e.g., https://example.com/docs)" }),
      extract: Type.Optional(Type.Boolean({ description: "Use r.jina.ai to extract clean readable text from the URL", default: false })),
      max_length: Type.Optional(Type.Number({ description: "Maximum characters to return (default 8000)", default: 8000 })),
    }),

    async execute(_toolCallId, params, signal, _onUpdate, _ctx) {
      const targetUrl = params.url;
      const useExtract = params.extract ?? false;
      const maxLength = params.max_length ?? 8000;
      const timeoutMs = 30000;

      const fetchUrl = useExtract
        ? `https://r.jina.ai/http://${targetUrl.replace(/^https?:\/\//, "")}`
        : targetUrl;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      signal?.addEventListener("abort", () => controller.abort(), { once: true });

      try {
        const response = await fetch(fetchUrl, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
          },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!response.ok) {
          return {
            content: [{ type: "text", text: `HTTP ${response.status}: ${response.statusText}` }],
            details: { url: targetUrl, status: response.status },
            isError: true,
          };
        }

        const contentType = response.headers.get("content-type") || "";
        let text = "";

        if (contentType.includes("application/json")) {
          const json = await response.json();
          text = JSON.stringify(json, null, 2);
        } else {
          text = await response.text();
        }

        // Truncate if needed
        const truncated = text.length > maxLength ? text.slice(0, maxLength) + "\n\n[...truncated...]" : text;

        return {
          content: [{ type: "text", text: truncated }],
          details: {
            url: targetUrl,
            fetched_url: fetchUrl,
            status: response.status,
            content_type: contentType,
            length: text.length,
            truncated: text.length > maxLength,
          },
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Fetch failed: ${message}` }],
          details: { url: targetUrl, error: message },
          isError: true,
        };
      }
    },
  });
}
