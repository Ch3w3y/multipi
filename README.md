# multipi

> **Multi-agent orchestration for open-source LLMs in [pi](https://pi.dev)**
>
> Route reasoning, architecture, coding, and review to the models that excel at them — with web search for every endpoint.

## Why This Exists

If you're using **local open-source models via Ollama**, you face a problem Claude Pro and GPT-4 users don't:

**No single model does everything well.**

An 8B model codes OK but hallucinates architecture. A 1T model reasons brilliantly but burns tokens on boilerplate. A 70B model is mediocre at both. **You need a team, not a person.**

Pi ships with **no subagents** by design — fair for closed APIs where one model can wear many hats. For Ollama users, that creates five real problems:

1. **Context Pollution** — Research citations bury code logic; the model forgets architecture by the time it writes tests.
2. **No Native Web Search** — Local models can't browse. You need external tools for current docs and benchmarks.
3. **No Tool Propagation** — A child agent spawned with `--tools read,bash` won't inherit `fetch_url` from the parent. Chain breaks at the first link.
4. **Zero Visibility** — A long-running agent might be stuck on a failed fetch, burning GPU hours with no feedback.
5. **Project Lock-In** — Hardcoding paths and architecture into agent prompts means rewriting agents for every repo.

**multipi** solves all five.

## What It Does

### 1. Capability-Based Model Routing

Industry consensus in 2026 is clear: no frontier model dominates every benchmark. Gemini leads abstract reasoning, Sonnet leads expert knowledge, and they tie on coding. The right architecture isn't "pick the best model" — it's **route each request to the model that excels at it**.

| Agent | Purpose | Routes To | Why |
|-------|---------|-----------|-----|
| **orchestrator** | Pipeline conductor, gate enforcement | `kimi-k2.6` (1T) | Tracks S0→S6 state machine, enforces invariants |
| **research** | Deep investigation + citations | `kimi-k2.6` (1T) | 256K context for synthesis; cites URLs + dates |
| **planner** | Architecture, schema DDL, phased plan | `devstral-2` (123B) | Strong structured output; designs without forgetting constraints |
| **implementer** | Code, tests, Docker, Makefile | `devstral-2` (123B) | Purpose-built for implementation; fans out parallel workers |
| **reviewer** | Adversarial QA, red-team checklist | `deepseek-v4-flash` | Fast, cheap, adversarial — catches corner cases in budget |
| **scout** | Narrow lookups, codebase recon | `gemini-3-flash` | Sub-second latency; answers one question with evidence and stops |

Each task goes to the specialist. Isolated context windows mean no pollution between research prose and code logic. This mirrors what Anthropic's multi-agent research demonstrates: **agents with isolated contexts outperform single-agent because each window contains only the information it needs.**

### 2. SearXNG: Web Search for Every Model

Two extensions give **every model** — even 3B param endpoints — the ability to browse:

| Tool | Backend | Best For |
|------|---------|----------|
| `fetch_url` | HTTP + jina.ai markdown extract | Reading docs, API references, changelogs |
| `web_search` | Local SearXNG (`127.0.0.1:8888`) | Finding current info, benchmarks, library versions |

SearXNG is a self-hosted metasearch engine. It queries Google, DuckDuckGo, Brave, and Startpage in parallel, aggregates with deduplication, and returns clean JSON. No API keys. No rate limits. No bot blocks. Just a Docker container on your machine.

### 3. Tool Propagation Across Agent Chains

The `subagent` extension **auto-forwards** all parent extension tools to every child:

```
Parent has:  read, bash, write, edit, fetch_url, web_search, subagent
Child scout declares:  read, grep, ls, bash
Result:  read, grep, ls, bash, fetch_url, web_search
                                        ↑↑↑↑↑↑  auto-propagated
```

A chain of `orchestrator → research → planner → reviewer` never loses tools mid-pipeline. Recursion guard filters out `subagent` so an agent can't spawn itself.

### 4. Live Visibility (Tmux)

When pi runs inside tmux, each subagent gets a dedicated window:

```
0: main*           ← your pi session
1: π-research     ← live tail: "Reading: pgvector docs..."
2: π-scout        ← live tail: "grep -n embedding models..."
3: π-implementer  ← live tail: "writing tests/test_embed.py..."
```

Watch agents work in real time. Kill stuck ones. A powerline dashboard above the editor shows who's running and which model they're on:

```
 π-agents │ ⚡1 orchestrator [kimi-k2.6] │ ⚡2 implementer [devstral-2]
```

### 5. Project-Aware Generic Agents

The 7 agents are **completely generic** — no hardcoded project names or paths. They adapt by reading the local directory:

```
my-project/
├── project.md            ← agent ops manual (connection strings, commands, gotchas)
└── .pi/
    ├── agent_prompts.md  ← project-specific role overrides
    └── artifacts/         ← locked schemas, architecture, contracts
```

**Read order:** `project.md` (immediate context) → `.pi/agent_prompts.md` (role overrides) → `.pi/artifacts/` (locked contracts) → generic defaults.

One `multipi` install works for every project. No agent rewriting. Just a `project.md` at the root.

## The Orchestrator State Machine

Unstructured LLM code generation is non-deterministic: ask twice, get two architectures. **multipi** treats engineering as a **verified state machine**:

```
S0_INTAKE → S1_RESEARCH → S2_PLANNING → S3_IMPLEMENTATION → S4_REVIEW → S5_ITERATE | S6_DONE
```

| State | Agent | Output | Gate |
|-------|-------|--------|------|
| S1 | `research` | `research_dossier.md` | Citations valid, matrices measurable |
| S2 | `planner` | `architecture.md`, `schema.sql`, `phased_plan.md` | Matches locked artifacts |
| S3 | `implementer` | Working repo | Tests pass, lints clean, replay idempotent |
| S4 | `reviewer` | `review_gate<N>.md` | One BLOCK kills the gate; orchestrator re-dispatches |
| S5 | `orchestrator` | — | Routes BLOCK + required-changes back to producer |
| S6 | `orchestrator` | Deliverables checklist | Every gate PASSed |

The reviewer is **adversarial by design** — it assumes the producer cut corners. It red-teams for: service dies mid-batch, 10× volume spikes, duplicate data, PII leaks, license ambiguity. It returns `PASS` or `BLOCK` with ordered required changes. No state transition happens without gate clearance.

Within S3, the orchestrator can dispatch **parallel implementers** for disjoint paths (e.g., `docker/db/**`, `services/embed_worker/**`, `tests/**`), each running in isolation on its own model. Merge at review time.

## Architecture

```
multipi/
├── agents/                    # Generic subagent definitions
│   ├── orchestrator.md       # S0→S6 state machine conductor
│   ├── research.md           # Deep investigation + citations
│   ├── planner.md             # Architecture, schema, phased plan
│   ├── implementer.md         # Code, tests, Docker
│   ├── reviewer.md            # Adversarial QA gates
│   ├── scout.md               # Narrow read-only recon
│   ├── worker.md              # General-purpose executor
│   └── MODEL_ROUTING.md       # Ollama Cloud capability map
│
├── extensions/                # Pi extensions (TypeScript, hot-reload)
│   ├── fetch_url.ts            # HTTP fetch + jina.ai extract
│   ├── web_search.ts           # SearXNG JSON API client
│   └── subagent/
│       ├── index.ts            # Tool registration + propagation
│       ├── agents.ts           # Agent discovery from disk
│       ├── dashboard.ts        # Powerline TUI widget
│       └── tmux.ts            # Tmux window lifecycle
│
├── searxng/                   # Local search infrastructure
│   ├── docker-compose.yml      # Container (port 8888)
│   └── settings.yml            # Engine config (Google, DDG, Brave, Startpage)
│
├── tests/
│   ├── unit/                   # Agent parsing, routing, validation
│   ├── integration/            # End-to-end chain tests
│   └── fixtures/               # Test agent definitions
│
├── bin/
│   └── install-agents.sh      # Manual agent install
│
└── package.json               # Pi package manifest
```

## Quick Start

```bash
# Install
pi install npm:multipi

# Start SearXNG
npm run searxng:start

# Verify search
curl -s 'http://127.0.0.1:8888/search?q=ollama+pgvector&format=json' | jq '.results | length'

# Launch in tmux + pi
tmux new-session -s work
pi
```

Dispatch agents:

```bash
# Single agent with web search
subagent
agent: scout
task: "Search for pgvector HNSW tuning at 100M rows. List 3 key parameters."

# Full orchestrated pipeline
subagent
chain:
  - agent: research
    task: "Research pgvector at scale. Write ~/output/research.md."
  - agent: planner
    task: "Read ~/output/research.md. Write architecture.md + schema.sql."
  - agent: reviewer
    task: "Review both. Return PASS or BLOCK."

# Parallel implementation fan-out
subagent
parallel:
  - agent: implementer
    task: "Implement docker/db/** and Alembic migrations."
  - agent: implementer
    task: "Implement services/embed_worker/**."
  - agent: implementer
    task: "Write tests covering embed and ingest paths."
```

## Model Configuration

### Ollama Cloud (optional)

```bash
export OLLAMA_CLOUD_BASE_URL="https://cloud.ollama.ai/v1"
export OLLAMA_CLOUD_API_KEY="your-key"
```

Subagents route there automatically. The extension generates a temporary provider override for each child process.

### Local Ollama (fallback)

If no cloud env vars are set, subagents fall back to `http://127.0.0.1:11434/v1`.

### Custom model maps

Edit `~/.pi/agent/agents/MODEL_ROUTING.md` or `extensions/subagent/index.ts`:

```typescript
const CAPABILITY_MODEL_MAP: Record<string, string> = {
    orchestrator: "ollama/kimi-k2.6:cloud",
    research:    "ollama/kimi-k2.6:cloud",
    planner:     "ollama/devstral-2:123b-cloud",
    implementer: "ollama/devstral-2:123b-cloud",
    reviewer:    "ollama/deepseek-v4-flash:cloud",
    scout:       "ollama/gemini-3-flash-preview:cloud",
};
```

## Testing

```bash
# Unit tests (no Docker, no tmux, no pi needed)
node --test tests/unit/*.test.ts

# Integration tests (needs Docker + SearXNG running)
./tests/integration/run.sh

# Acceptance test (full pipeline)
pi -p "Run the acceptance test in ~/.pi/agent/ACCEPTANCE_TEST.md"
```

## Comparison

| Feature | multipi | CrewAI | LangChain | LiteLLM Router |
|---------|---------|--------|-----------|----------------|
| **Designed for** | Local/Ollama + Pi IDE | General task automation | Chains & RAG | API routing |
| **Subagent isolation** | Full process per agent | Shared context or threads | Shared context | N/A |
| **Context isolation** | ✅ Per-agent windows | ⚠️ Configurable | ⚠️ Manual | N/A |
| **Web search** | ✅ SearXNG (local) | ❌ External APIs | ⚠️ External tools | N/A |
| **Tool propagation** | ✅ Automatic | ⚠️ Manual wiring | ⚠️ Manual wiring | N/A |
| **State machine gates** | ✅ Built-in S0→S6 | ❌ | ❌ | N/A |
| **Adversarial review** | ✅ Native reviewer | ❌ | ❌ | N/A |
| **Tmux visibility** | ✅ Live windows | ❌ | ❌ | ❌ |
| **Air-gapped viable** | ✅ Fully local | ⚠️ Needs cloud | ⚠️ Needs cloud | ❌ Cloud only |
| **Pi integration** | ✅ Native | ❌ | ❌ | ❌ |

- **multipi**: Coding in Pi, running local models, zero API spend.
- **CrewAI**: General business-task agent teams on cloud APIs.
- **LangChain**: RAG applications, sequential chains, library ecosystem.
- **LiteLLM**: Production API traffic, unified billing across providers.

## Tmux Integration

When pi runs inside tmux, each subagent spawns a `π-{agent}` window. Outside tmux, subagents run normally.

```bash
tmux new-session -s work
pi
```

| Agent | Window |
|-------|--------|
| `scout` | `π-scout` |
| `research` | `π-research` |
| `orchestrator` | `π-orchestrator` |
| `orchestrator-2` | `π-orchestrator-2` (numbered for chains) |

Windows auto-close when the subagent finishes.

**Troubleshooting:**

```bash
echo $TMUX       # If empty, start tmux first
tmux new-session -s pi
```

For separate sessions to avoid collisions:

```bash
tmux new-session -s work1 "cd /project/a && pi"
tmux new-session -s work2 "cd /project/b && pi"
```

**Optional auto-tmux wrapper:**

```bash
# ~/.bashrc or ~/.zshrc
pi() {
    if [ -z "$TMUX" ]; then
        tmux new-session -s multipi "$@" ";"
    else
        command pi "$@"
    fi
}
```

## License

MIT — by [Ch3w3y](https://github.com/Ch3w3y)

---

*Built on [pi](https://pi.dev). Powered by Ollama. Researched with SearXNG.*
