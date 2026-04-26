#!/usr/bin/env bash
set -euo pipefail

# Install multipi agents into ~/.pi/agent/agents/
# Usage: ./install-agents.sh [--symlink|--copy]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$SCRIPT_DIR/agents"
TARGET_DIR="$HOME/.pi/agent/agents"
MODE="${1:-copy}"

echo "Installing multipi agents from $AGENTS_DIR to $TARGET_DIR (mode: $MODE)"

mkdir -p "$TARGET_DIR"

for agent in "$AGENTS_DIR"/*.md; do
    name=$(basename "$agent")
    # Skip MODEL_ROUTING.md — it's reference, not a dispatchable agent
    if [ "$name" = "MODEL_ROUTING.md" ]; then
        continue
    fi
    
    target="$TARGET_DIR/$name"
    
    if [ "$MODE" = "symlink" ]; then
        if [ -e "$target" ] && [ ! -L "$target" ]; then
            echo "  ⚠️  Backing up existing $name"
            mv "$target" "$target.backup.$(date +%s)"
        fi
        ln -sf "$agent" "$target"
        echo "  🔗 $name (symlink)"
    else
        cp "$agent" "$target"
        echo "  📄 $name (copied)"
    fi
done

echo ""
echo "Done. Agents installed."
echo "Next steps:"
echo "  1. pi install npm:multipi          # Standard install"
echo "  2. pi install git:github.com/daryn/multipi  # From source"
echo "  3. multipi start                  # Optional: start SearXNG"
