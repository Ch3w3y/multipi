# Ollama Cloud Model Routing Map

As of **2026-04-26**, the following Ollama Cloud models are available and mapped to subagents by capability.

## Available Models (confirmed via local Ollama → ollama.com:443)

| Model ID | Params | Family | Best For |
|----------|--------|--------|----------|
| `kimi-k2.6:cloud` | 1T (int4) | kimi-k2 | Deep reasoning, long-context orchestration, research synthesis |
| `devstral-2:123b-cloud` | 123B (fp8) | mistral3 | Architecture, structured output, code generation |
| `deepseek-v4-flash:cloud` | — | deepseek | Fast adversarial review, QA gating |
| `gemini-3-flash-preview:cloud` | — | gemini | Ultra-fast lookups, multimodal scout tasks |
| `glm-5.1:cloud` | — | glm | General bilingual reasoning, fallback |

## Agent → Model Mapping

| Agent | Model | Rationale |
|-------|-------|-----------|
| `orchestrator` | `ollama/kimi-k2.6:cloud` | 1T params; best tool-use, state-machine reasoning, long context |
| `research` | `ollama/kimi-k2.6:cloud` | Needs deep synthesis, citation fidelity, 256k context |
| `planner` | `ollama/devstral-2:123b-cloud` | 123B strong at architecture docs, DDL, schema design |
| `implementer` | `ollama/devstral-2:123b-cloud` | Purpose-built for code generation, Docker, Makefile, tests |
| `reviewer` | `ollama/deepseek-v4-flash:cloud` | Fast, adversarial, catches corner cases cheaply |
| `scout` | `ollama/gemini-3-flash-preview:cloud` | Lowest latency, perfect for narrow read-only lookups |
| `worker` | `ollama/glm-5.1:cloud` | General-purpose fallback, full tool access, isolated context |

## Configuration

The **subagent extension** auto-routes to Ollama Cloud when you set:

```bash
export OLLAMA_CLOUD_BASE_URL="https://api.ollama.cloud/v1"
export OLLAMA_CLOUD_API_KEY="your-key"   # optional
```

The extension generates a temporary inline provider override so child `pi` processes hit the cloud endpoint directly. Model metadata is preserved from the agent frontmatter and the `CAPABILITY_MODEL_MAP` constant in `extensions/subagent/index.ts`, not read from `models.json` at runtime.

If no cloud env vars are set, subagents fall back to the local Ollama proxy (`http://127.0.0.1:11434/v1`) using the default provider.
