/**
 * Unit tests for multipi subagent system
 * Run: node --test tests/unit/*.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert";
import * as fs from "node:fs";
import * as path from "node:path";

// ── Agent Frontmatter Parsing ────────────────────────────

function parseFrontmatter(content: string): { frontmatter: Record<string, string>; body: string } {
	const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!match) return { frontmatter: {}, body: content };

	const raw = match[1];
	const body = match[2].trim();
	const frontmatter: Record<string, string> = {};

	for (const line of raw.split("\n")) {
		const [key, ...rest] = line.split(":");
		if (key && rest.length > 0) {
			frontmatter[key.trim()] = rest.join(":").trim();
		}
	}

	return { frontmatter, body };
}

describe("Agent frontmatter parsing", () => {
	it("parses name, description, tools, model", () => {
		const fixture = fs.readFileSync(
			path.join(import.meta.dirname, "../fixtures/test-agent.md"),
			"utf-8",
		);
		const { frontmatter } = parseFrontmatter(fixture);

		assert.strictEqual(frontmatter.name, "test-agent");
		assert.strictEqual(frontmatter.description, "A test agent for unit testing");
		assert.strictEqual(frontmatter.tools, "read, grep, fetch_url, web_search");
		assert.strictEqual(frontmatter.model, "ollama/test-model");
	});

	it("extracts body after frontmatter", () => {
		const fixture = fs.readFileSync(
			path.join(import.meta.dirname, "../fixtures/test-agent.md"),
			"utf-8",
		);
		const { body } = parseFrontmatter(fixture);

		assert.ok(body.includes("# Test Agent"));
		assert.ok(body.includes("This is a test."));
	});
});

// ── Model Capability Routing ──────────────────────────────

const CAPABILITY_MODEL_MAP: Record<string, string> = {
	orchestrator: "ollama/kimi-k2.6:cloud",
	research: "ollama/kimi-k2.6:cloud",
	planner: "ollama/devstral-2:123b-cloud",
	implementer: "ollama/devstral-2:123b-cloud",
	reviewer: "ollama/deepseek-v4-flash:cloud",
	scout: "ollama/gemini-3-flash-preview:cloud",
};

describe("CAPABILITY_MODEL_MAP", () => {
	it("has an entry for every generic agent", () => {
		const requiredAgents = ["orchestrator", "research", "planner", "implementer", "reviewer", "scout"];
		for (const agent of requiredAgents) {
			assert.ok(CAPABILITY_MODEL_MAP[agent], `${agent} should have a model mapping`);
			assert.ok(CAPABILITY_MODEL_MAP[agent].startsWith("ollama/"), `${agent} should use ollama model`);
		}
	});

	it("routes implementer and planner to the same model (code/architecture)", () => {
		assert.strictEqual(CAPABILITY_MODEL_MAP.implementer, CAPABILITY_MODEL_MAP.planner);
	});

	it("routes orchestrator and research to the same model (reasoning/synthesis)", () => {
		assert.strictEqual(CAPABILITY_MODEL_MAP.orchestrator, CAPABILITY_MODEL_MAP.research);
	});

	it("routes scout to a distinct lightweight model", () => {
		assert.notStrictEqual(CAPABILITY_MODEL_MAP.scout, CAPABILITY_MODEL_MAP.orchestrator);
		assert.ok(CAPABILITY_MODEL_MAP.scout.includes("flash"), "scout should use flash/preview model");
	});
});

// ── Agent Tool Lists ───────────────────────────────────────

function getAgentTools(agentDir: string): Record<string, string> {
	const tools: Record<string, string> = {};
	for (const entry of fs.readdirSync(agentDir)) {
		if (!entry.endsWith(".md")) continue;
		const content = fs.readFileSync(path.join(agentDir, entry), "utf-8");
		const { frontmatter } = parseFrontmatter(content);
		if (frontmatter.tools) {
			tools[frontmatter.name ?? entry.replace(".md", "")] = frontmatter.tools;
		}
	}
	return tools;
}

describe("Agent tool lists", () => {
	it("all agents have fetch_url and web_search", () => {
		const agentDir = path.join(import.meta.dirname, "../../agents");
		const tools = getAgentTools(agentDir);

		for (const [name, list] of Object.entries(tools)) {
			assert.ok(list.includes("fetch_url"), `${name} should have fetch_url`);
			assert.ok(list.includes("web_search"), `${name} should have web_search`);
		}
	});

	it("orchestrator has subagent tool", () => {
		const agentDir = path.join(import.meta.dirname, "../../agents");
		const tools = getAgentTools(agentDir);
		assert.ok(tools.orchestrator?.includes("subagent"), "orchestrator must have subagent");
	});

	it("worker has write and edit tools", () => {
		const agentDir = path.join(import.meta.dirname, "../../agents");
		const tools = getAgentTools(agentDir);
		assert.ok(tools.worker?.includes("write"), "worker must have write");
		assert.ok(tools.worker?.includes("edit"), "worker must have edit");
	});
});

// ── No epi- Prefix Remaining ────────────────────────────

describe("Naming convention", () => {
	it("no agent files have epi- prefix", () => {
		const agentDir = path.join(import.meta.dirname, "../../agents");
		const files = fs.readdirSync(agentDir);
		const epiFiles = files.filter((f) => f.startsWith("epi-"));
		assert.strictEqual(epiFiles.length, 0, `Found epi- prefixed files: ${epiFiles.join(", ")}`);
	});

	it("no epi- references in subagent extension", () => {
		const indexPath = path.join(import.meta.dirname, "../../extensions/subagent/index.ts");
		const content = fs.readFileSync(indexPath, "utf-8");
		assert.ok(!content.includes('"epi-'), "subagent/index.ts should not reference epi- prefix");
	});
});

// ── Extension Schemas ────────────────────────────────────

describe("Extension file structure", () => {
	it("fetch_url.ts registers a tool with the right name", () => {
		const extPath = path.join(import.meta.dirname, "../../extensions/fetch_url.ts");
		const content = fs.readFileSync(extPath, "utf-8");
		assert.ok(content.includes('name: "fetch_url"'), "fetch_url.ts must register name: fetch_url");
		assert.ok(content.includes('pi.registerTool'), "must use registerTool");
	});

	it("web_search.ts uses SearXNG not DDG", () => {
		const extPath = path.join(import.meta.dirname, "../../extensions/web_search.ts");
		const content = fs.readFileSync(extPath, "utf-8");
		assert.ok(content.includes("SEARXNG_URL"), "must reference SEARXNG_URL");
		assert.ok(!content.includes("lite.duckduckgo.com"), "should not reference DDG anymore");
		assert.ok(content.includes("searxng"), "must reference searxng");
	});

	it("web_search.ts has Type.Optional wrappers", () => {
		const extPath = path.join(import.meta.dirname, "../../extensions/web_search.ts");
		const content = fs.readFileSync(extPath, "utf-8");
		assert.ok(
			content.includes("Type.Optional(Type.Number"),
			"count parameter must be Type.Optional",
		);
	});
});

// ── Pi Package Manifest ──────────────────────────────────

describe("package.json manifest", () => {
	it("has pi key with extensions array", () => {
		const pkgPath = path.join(import.meta.dirname, "../../package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		assert.ok(pkg.pi, "must have pi key");
		assert.ok(Array.isArray(pkg.pi.extensions), "pi.extensions must be array");
		assert.ok(pkg.pi.extensions.includes("./extensions"), "must reference ./extensions");
	});

	it("has pi-package keyword", () => {
		const pkgPath = path.join(import.meta.dirname, "../../package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		assert.ok(pkg.keywords.includes("pi-package"), "must have pi-package keyword");
	});

	it("has correct repository URL", () => {
		const pkgPath = path.join(import.meta.dirname, "../../package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		assert.strictEqual(pkg.repository?.url, "https://github.com/Ch3w3y/multipi.git");
	});

	it("peerDependencies list core pi packages", () => {
		const pkgPath = path.join(import.meta.dirname, "../../package.json");
		const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
		assert.ok(pkg.peerDependencies["@mariozechner/pi-coding-agent"], "needs pi-coding-agent peerDep");
		assert.ok(pkg.peerDependencies.typebox, "needs typebox peerDep");
	});
});

// ── Install Script ───────────────────────────────────────

describe("install-agents.sh", () => {
	it("is executable", () => {
		const scriptPath = path.join(import.meta.dirname, "../../bin/install-agents.sh");
		const stats = fs.statSync(scriptPath);
		assert.ok(stats.mode & 0o111, "install-agents.sh must be executable");
	});

	it("skips MODEL_ROUTING.md", () => {
		const scriptPath = path.join(import.meta.dirname, "../../bin/install-agents.sh");
		const content = fs.readFileSync(scriptPath, "utf-8");
		assert.ok(content.includes("MODEL_ROUTING.md"), "should reference MODEL_ROUTING.md");
		assert.ok(content.includes("continue"), "should skip MODEL_ROUTING.md");
	});
});
