#!/usr/bin/env bash
set -euo pipefail

# Install multipi agents, SYSTEM.md, and skills into ~/.pi/agent/
# Usage: ./install-agents.sh [--symlink|--copy]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
AGENTS_DIR="$SCRIPT_DIR/agents"
TARGET_AGENTS_DIR="$HOME/.pi/agent/agents"
TARGET_SKILLS_DIR="$HOME/.pi/agent/skills"
MODE="${1:-copy}"

echo "Installing multipi agents from $AGENTS_DIR to $TARGET_AGENTS_DIR (mode: $MODE)"

mkdir -p "$TARGET_AGENTS_DIR"

for agent in "$AGENTS_DIR"/*.md; do
    name=$(basename "$agent")
    # Skip MODEL_ROUTING.md — it's reference, not a dispatchable agent
    if [ "$name" = "MODEL_ROUTING.md" ]; then
        continue
    fi
    
    target="$TARGET_AGENTS_DIR/$name"
    
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

# Install SYSTEM.md
echo ""
echo "Installing SYSTEM.md and skills..."
mkdir -p "$TARGET_SKILLS_DIR/orchestrate"

if [ "$MODE" = "symlink" ]; then
    ln -sf "$SCRIPT_DIR/SYSTEM.md" "$HOME/.pi/agent/SYSTEM.md"
    ln -sf "$SCRIPT_DIR/skills/orchestrate/SKILL.md" "$TARGET_SKILLS_DIR/orchestrate/SKILL.md"
    echo "  🔗 SYSTEM.md (symlink)"
    echo "  🔗 skills/orchestrate/SKILL.md (symlink)"
else
    cp "$SCRIPT_DIR/SYSTEM.md" "$HOME/.pi/agent/SYSTEM.md"
    cp "$SCRIPT_DIR/skills/orchestrate/SKILL.md" "$TARGET_SKILLS_DIR/orchestrate/SKILL.md"
    echo "  📄 SYSTEM.md (copied)"
    echo "  📄 skills/orchestrate/SKILL.md (copied)"
fi

echo ""
echo "Done. All multipi components installed."
echo "Next steps:"
echo "  npm install @chewey182/multipi          # Standard npm install"
echo "  pi install git:github.com/Ch3w3y/multipi  # From source"
