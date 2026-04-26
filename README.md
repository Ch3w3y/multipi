# multipi

Multi-agent orchestration system for [pi-coding-agent](https://pi.dev) with subagents, web search, and URL fetching.

## Quick Install

```bash
# Via npm
npm install -g multipi

# Or via pi
pi install npm:multipi

# Or from git
pi install git:github.com/daryn/multipi

# Or local clone
git clone https://github.com/daryn/multipi.git ~/multipi
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
pi install git:github.com/daryn/multipi
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
