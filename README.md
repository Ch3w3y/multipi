# multipi

Multi-agent orchestration system for [pi-coding-agent](https://pi.dev) with subagents, web search, and URL fetching.

## Quick Install

```bash
# Via npm
npm install -g multipi

# Or via pi
pi install npm:multipi

# Or from git
pi install git:github.com/Ch3w3y/multipi

# Or local clone
git clone https://github.com/Ch3w3y/multipi.git ~/multipi
cd ~/multipi
pi install .
```

## What's Included

| Component | File | Purpose |
|-----------|------|---------|
| **Agents** | `agents/{orchestrator,research,planner,implementer,reviewer,scout,worker}.md` | Generic subagent definitions |
| **Extensions** | `extensions/fetch_url.ts` | Web page fetching (with jina.ai extract) |
| | `extensions/web_search.ts` | Local SearXNG search |
| | `extensions/subagent/` | Subagent dispatch with tool propagation |
| **Infra** | `searxng/` | Docker Compose for local search engine |
| **Config** | `agents/MODEL_ROUTING.md` | Ollama Cloud capability map |

## Architecture

```
multipi/
├── agents/              # Generic subagent definitions
│   ├── orchestrator.md
│   ├── research.md
│   ├── planner.md
│   ├── implementer.md
│   ├── reviewer.md
│   ├── scout.md
│   ├── worker.md
│   └── MODEL_ROUTING.md
├── extensions/          # Pi extensions (TypeScript)
│   ├── fetch_url.ts
│   ├── web_search.ts
│   └── subagent/
│       ├── index.ts
│       ├── agents.ts
│       ├── dashboard.ts
│       └── tmux.ts
├── searxng/             # Local search infrastructure
│   ├── docker-compose.yml
│   └── settings.yml
├── bin/
│   └── install-agents.sh  # Manual agent install
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
└── README.md
```

## Install Modes

### Mode 1: `pi install` (recommended)
```bash
pi install npm:multipi
# Or
pi install git:github.com/Ch3w3y/multipi
```

### Mode 2: Symlink (development)
```bash
./bin/install-agents.sh --symlink
# Creates symlinks from ~/.pi/agent/agents/ → multipi/agents/
# Changes are live, no reinstall needed
```

### Mode 3: npm global
```bash
npm install -g multipi
# Pi auto-discovers via package.json "pi" key
```

## Project-Level Config

Each project can override with local `.pi/`:

```
my-project/
├── project.md              # Agent ops manual (required)
└── .pi/
    ├── agent_prompts.md    # Project-specific agent overrides
    └── artifacts/           # Locked architecture, schemas, contracts
```

Generic agents auto-adapt by reading `<cwd>/project.md` first.

## Testing

```bash
# Unit tests (no Docker needed)
npm test

# Integration tests (needs Docker + SearXNG)
npm run test:integration

# Acceptance test
npm run test:acceptance

# Start SearXNG
npm run searxng:start
```

## Publishing

```bash
npm version patch
git push origin main --tags
npm publish --access public
```

## License

MIT

---

## Tmux Integration (Optional)

`multipi` integrates with tmux to show each subagent in its own window. This is **automatic when pi runs inside tmux** and **silent when it doesn't**.

### How it works

| Context | Behavior |
|---------|----------|
| Outside tmux | Subagents run normally. No tmux windows created. |
| Inside tmux | Each subagent spawns a `π-{agent}` tmux window. You watch them work live. |

### Starting tmux + pi

```bash
# Option A: Start tmux, then pi
tmux new-session -s work
pi "your task here"

# Option B: Create detached session, run pi, attach later
tmux new-session -d -s work "cd ~/your-project && pi"
tmux attach -t work
```

### Window naming

| Agent | Tmux window name | Example |
|-------|-------------------|---------|
| `scout` | `π-scout` | Single lookup |
| `research` | `π-research` | Deep research |
| `implementer` | `π-implementer` | Coding task |
| `orchestrator` | `π-orchestrator` | Chain step 1 |
| `orchestrator-2` | `π-orchestrator-2` | Chain step 2 (numbered) |

Windows auto-close when the subagent finishes.

### Dashboard widget

When subagents are running, a powerline-style status bar appears above the pi editor:

```
 π-agents │ ⚡1 orchestrator [kimi-k2.6] │ ⚡2 implementer [devstral-2]
```

This works in both tmux and non-tmux modes.

### Troubleshooting

**"Subagents work but no windows appear"**
```bash
# Check if you're inside tmux
echo $TMUX
# If empty, start tmux first:
tmux new-session -s pi
```

**"Tmux windows from two pi sessions collide"**
Both pi instances are in the same tmux session. Use separate sessions:
```bash
tmux new-session -s work1 "cd /project/a && pi"
tmux new-session -s work2 "cd /project/b && pi"
```

### Optional: auto-tmux wrapper

If you always want pi inside tmux, add this to your shell:

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

Then `pi "your task"` automatically wraps in tmux.
