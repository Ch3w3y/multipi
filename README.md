# multipi

> **Multi-agent orchestration for open-source LLMs in [pi](https://pi.dev)**
>
> Route reasoning, architecture, coding, and review to the models that excel at them — with web search for every endpoint.

## Why This Exists

If you're using **local open-source models via Ollama**, you face a problem that Claude Pro and GPT-4 users don't:

**No single model does everything well.**

| Model Size | Excels at | Struggles with |
|------------|-----------|---------------|
| 3B–8B | Fast lookups, narrow tasks | Architecture, research synthesis, review depth |
| 70B | General coding | Long-context reasoning, state-machine planning |
| 123B | Architecture docs, structured output | Real-time cost, narrow scouts |
| 1T | Deep reasoning, citation fidelity | Speed, token cost per call |

An 8B model codes OK but hallucinates architecture. A 1T model reasons brilliantly but burns tokens on boilerplate. A 70B model is mediocre at both. **You need a team, not a person.**

### The Pi Gap

Pi ships with **no subagents** by design — valid for closed APIs where one model can wear many hats. But for Ollama users this creates five real problems:

**1. Context Pollution**
Asking one model to "research pgvector HNSW tuning, design a schema, write the migration, then review it" buries the code in research citations. The model forgets the architecture by the time it reaches tests.

**2. No Native Web Search**
Claude and Gemini can browse. Local models can't. If your model runs on `127.0.0.1:11434`, you need external tools for current docs, benchmarks, and API references.

**3. No Tool Propagation**
Even if you add `fetch_url` to pi, a subagent spawned with `--tools read,bash` won't inherit it. The parent can search; the child can't. Chain breaks at the first link.

**4. Zero Visibility**
A long-running `research` agent might be stuck on a failed fetch, burning GPU hours. You have no idea until it returns — or times out.

**5. Project-Specific Lock-In**
Hardcoding paths, invariants, and architecture into agent prompts means rewriting agents for every project.

**multipi** solves all five by adding capability-based model routing, web tools with local SearXNG, automatic tool propagation, live tmux visibility, and project-aware generic agents.

## What It Does

### 1. Capability-Based Model Routing

Deploy the right model for the right cognitive load:

| Agent | Purpose | Routes To | Why |
|-------|---------|-----------|-----|
| **orchestrator** | State-machine conductor, gate enforcement | `kimi-k2.6` (1T) | Tracks S0→S6 pipeline, enforces invariants, makes routing decisions |
| **research** | Deep technical investigation, citations | `kimi-k2.6` (1T) | 256K context for synthesis; cites primary sources with URLs + dates |
| **planner** | Architecture, schema DDL, phased plan | `devstral-2` (123B) | Strong structured output; designs DB schemas without forgetting constraints |
| **implementer** | Code, tests, Docker, Makefile | `devstral-2` (123B) | Purpose-built for implementation; can fan out parallel instances |
| **reviewer** | Adversarial QA, red-team checklist | `deepseek-v4-flash` | Fast, cheap, adversarial — catches corner cases in budget |
| **scout** | Narrow lookups, codebase recon | `gemini-3-flash` | Sub-second latency; answers one question with evidence and stops |

Instead of one model doing everything poorly, each task goes to the model that excels at it. Isolated context windows mean no pollution between research prose and code logic.

### 2. SearXNG: Web Search for Every Model

Two extensions give **every model** — even 3B param local ones — the ability to browse:

| Tool | Backend | Best For |
|------|---------|----------|
| `fetch_url` | HTTP + jina.ai markdown extract | Reading docs, API references, changelogs |
| `web_search` | Local SearXNG (`127.0.0.1:8888`) | Finding current info, benchmarks, library versions |

SearXNG is a self-hosted metasearch engine. It queries Google, DuckDuckGo, Brave, and Startpage in parallel, aggregates with deduplication, and returns clean JSON:

```
1. Benchmarking Ollama embeddings on MTEB
   URL: https://ollama.com/blog/embedding-models
   Ollama's embedding models evaluated on the Massive Text Embedding Benchmark...

2. Ollama Embedding Models: Performance Analysis
   URL: https://cookbook.chromadb.dev/ollama-embeddings/
   We benchmark bge-m3, nomic-embed-text, mxbai-embed-large...
```

No API keys. No rate limits. No DuckDuckGo bot blocks. Just a Docker container on your machine.

### 3. Tool Propagation Across Agent Chains

The `subagent` extension **auto-forwards** all parent extension tools to every child:

```
Parent has:  read, bash, write, edit, fetch_url, web_search, subagent
Child scout declares:  read, grep, ls, bash
Result:  read, grep, ls, bash, fetch_url, web_search
                                        ↑↑↑↑↑↑  auto-propagated
```

A chain of `orchestrator → research → planner → reviewer` never loses tools mid-pipeline. The recursion guard filters out `subagent` so an agent can't accidentally spawn itself.

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
│       ├── agents.ts           # agent discovery from disk
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

### 1. Install multipi

```bash
# Via pi
pi install npm:multipi

# Or from source
pi install git:github.com/Ch3w3y/multipi

# Or local clone
git clone https://github.com/Ch3w3y/multipi.git ~/multipi
cd ~/multipi
pi install .
```

### 2. Start SearXNG

```bash
npm run searxng:start  # docker compose up -d

# Verify
curl -s 'http://127.0.0.1:8888/search?q=ollama+pgvector&format=json' | jq '.results | length'
```

### 3. Start tmux + pi

```bash
tmux new-session -s work
pi
```

### 4. Dispatch agents

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
```

## Capabilities Deep Dive

### The Orchestrator State Machine

The orchestrator enforces a strict pipeline where no state is skipped:

```
S0_INTAKE → S1_RESEARCH → S2_PLANNING → S3_IMPLEMENTATION → S4_REVIEW → S5_ITERATE | S6_DONE
```

| State | Agent | Output | Gate |
|-------|-------|--------|------|
| S1 | `research` | `research_dossier.md` | Sections complete, citations valid, matrices measurable |
| S2 | `planner` | `architecture.md`, `schema.sql`, `phased_plan.md`, `risk_register.md` | Architecture matches locked artifacts |
| S3 | `implementer` | Working repo | Tests pass, lints clean, replay idempotent |
| S4 | `reviewer` | `review_gate<N>.md` | One BLOCK kills the gate; orchestrator re-dispatches |
| S5 | `orchestrator` | — | Routes BLOCK + required-changes back to producer |
| S6 | `orchestrator` | Deliverables checklist | Every gate PASSed |

Each transition is status-line logged:
```
[S1→S2] planner produced architecture.md (1.2k lines) — gate passed
```

### Research Agent

The research agent doesn't just search — it **cites**:

- Primary > secondary > blog
- Every benchmark: dataset name, hardware, date
- Sources >18 months old flagged "STALE — verify"
- URL + accessed YYYY-MM-DD on every citation
- Uses `fetch_url` to verify claims older than training data

Target: 4–10K words, structured sections, decision matrices with measurable axes (ms, $/M tokens, GB RAM, MTEB score).

### Reviewer Agent

The reviewer is **adversarial by design** — it assumes the producing agent cut corners:

- Checklists per gate with evidence citations (`file:line`, command output)
- Red-team checklist: service dies mid-batch, 10× volume spike, duplicate data, PII leak, license ambiguity
- Returns `PASS` or `BLOCK` with ordered required changes
- Uses `fetch_url` to verify external claims (licenses, benchmark numbers, API docs)
- Token budget matters — the reviewer reads, doesn't write prose

### Parallel Implementer Fan-Out

Within S3, the orchestrator can dispatch **parallel** implementers for disjoint paths:

```yaml
- docker/db/** + Alembic migrations
- services/common/**
- services/embed_worker/**
- services/extract_worker/**
- services/ingest/sources/{pubmed,who_don}.py
- tests/**
```

Each implementer runs in isolation on its own model (`devstral-2`). No single context pollution. Merge at review time.

### Web Search Architecture

```
Pi process
  → web_search tool
    → fetch → http://127.0.0.1:8888/search?q=...
      → SearXNG container
        → parallel queries to Google, DDG, Brave, Startpage
        → aggregates, deduplicates, scores, returns JSON
      ← JSON results
    ← formatted results
  ← model receives structured search output
```

### Tool Propagation Architecture

```
Parent pi (has fetch_url, web_search, subagent)
  → subagent dispatch: agent = scout, task = "..."
    → subagent extension reads parent tools via pi.getAllTools()
    → filters builtins, keeps extensions (fetch_url, web_search)
    → filters subagent itself (recursion guard)
    → builds --tools read,grep,ls,fetch_url,web_search
    → spawns child pi process
      → child pi auto-discovers extensions from ~/.pi/agent/extensions/
      → --tools allowlist permits fetch_url + web_search
      → scout agent has full web capability
    ← child returns result
  ← result to parent
```

## Model Configuration

### Ollama Cloud (optional)

If you have Ollama Cloud access, subagents route there automatically:

```bash
export OLLAMA_CLOUD_BASE_URL="https://cloud.ollama.ai/v1"
export OLLAMA_CLOUD_API_KEY="your-key"
```

The subagent extension generates a temporary provider override for each child process.

### Local Ollama (fallback)

If no cloud env vars are set, subagents fall back to `http://127.0.0.1:11434/v1`.

### Custom model maps

Edit `~/.pi/agent/agents/MODEL_ROUTING.md` to add your own mappings. The `CAPABILITY_MODEL_MAP` in `extensions/subagent/index.ts` is the source of truth:

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

# Acceptance test (full pipeline: research → planner → reviewer)
pi -p "Run the acceptance test in ~/.pi/agent/ACCEPTANCE_TEST.md"

# Start SearXNG
npm run searxng:start
```

## Who This Is For

| You are... | multipi helps because... |
|------------|--------------------------|
| **Running local models** (Ollama, llama.cpp) | No model does everything. Route by capability. |
| **Hitting context limits** | Research, architecture, code live in separate windows. No pollution. |
| **Using models without web search** | SearXNG gives Google/DuckDuckGo/Brave access to any endpoint. |
| **Building complex systems** | Orchestrator enforces gates. Reviewer blocks bad output. No silent failures. |
| **Working across multiple projects** | Generic agents + per-project `project.md`. One install, infinite projects. |
| **On air-gapped or privacy-sensitive hosts** | SearXNG + Ollama run entirely local. No data leaves your network. |

## License

MIT — by [Ch3w3y](https://github.com/Ch3w3y)

---

## Tmux Integration

When pi runs inside tmux, each subagent spawns a `π-{agent}` window for live visibility. Outside tmux, subagents run normally without windows.

### Starting tmux + pi

```bash
tmux new-session -s work
pi

# Or detached — attach later
tmux new-session -d -s work "cd ~/my-project && pi"
tmux attach -t work
```

### Window naming

| Agent | Window | Example |
|-------|--------|---------|
| `scout` | `π-scout` | Narrow lookup |
| `research` | `π-research` | Deep technical research |
| `orchestrator` | `π-orchestrator` | Chain step 1 |
| `orchestrator-2` | `π-orchestrator-2` | Chain step 2 (numbered) |

Windows auto-close when the subagent finishes.

### Dashboard widget

A powerline-style status bar above the pi editor:

```
 π-agents │ ⚡1 orchestrator [kimi-k2.6] │ ⚡2 implementer [devstral-2]
```

Works in both tmux and non-tmux modes.

### Troubleshooting

**"Subagents work but no windows appear"**
```bash
echo $TMUX       # If empty, start tmux first
tmux new-session -s pi
```

**"Tmux windows from two pi sessions collide"**
Use separate sessions:
```bash
tmux new-session -s work1 "cd /project/a && pi"
tmux new-session -s work2 "cd /project/b && pi"
```

### Optional: auto-tmux wrapper

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
