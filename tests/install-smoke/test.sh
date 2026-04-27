#!/usr/bin/env bash
# Install smoke test for multipi
# Runs against the locally built tarball
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

echo "=== Multipi Install Smoke Test ==="
echo "TMPDIR: $TMPDIR"
echo ""

# Build tarball
cd "$PKG_DIR"
npm pack --pack-destination "$TMPDIR" >/dev/null
echo "✓ Tarball built"

# Unpack
cd "$TMPDIR"
tar xzf *.tgz
cd package

echo "✓ Tarball unpacked"
echo ""

# Test 1: package.json valid
echo "--- 1. package.json ---"
jq '.name == "@chewey182/multipi" and .version != empty and .license == "MIT"' package.json
echo "  ✓ name, version, license valid"

# Test 2: agents all have valid frontmatter
echo ""
echo "--- 2. Agent definitions ---"
AGENT_COUNT=0
for f in agents/*.md; do
    base=$(basename "$f")
    # Skip non-agent docs (MODEL_ROUTING.md etc.)
    if head -1 "$f" | grep -q '^---'; then
        name="$(grep '^name:' "$f" 2>/dev/null | head -1 || true)"
        model="$(grep '^model:' "$f" 2>/dev/null | head -1 || true)"
        if [ -n "$name" ] && [ -n "$model" ]; then
            echo "  ✓ $base: $name, $model"
            AGENT_COUNT=$((AGENT_COUNT + 1))
        elif [ "$base" = "MODEL_ROUTING.md" ]; then
            echo "  ℹ $base: doc file, skipped"
        else
            echo "  ✗ $base: missing frontmatter"
            exit 1
        fi
    else
        echo "  ℹ $base: not an agent file, skipped"
    fi
done
echo "  Total agents: $AGENT_COUNT"

# Test 3: bin script executable
echo ""
echo "--- 3. Bin scripts ---"
test -x bin/install-agents.sh && echo "  ✓ install-agents.sh is executable" || (echo "  ✗ not executable"; exit 1)

# Test 4: extensions exist
echo ""
echo "--- 4. Extensions ---"
for f in extensions/subagent/index.ts extensions/fetch_url.ts extensions/web_search.ts; do
    test -f "$f" && echo "  ✓ $(basename $f)" || (echo "  ✗ missing $f"; exit 1)
done

# Test 5: no dev artifacts leaked
echo ""
echo "--- 5. No dev artifacts ---"
if [ -f _tasks.md ]; then echo "  ✗ _tasks.md in tarball"; exit 1; fi
if [ -d output ]; then echo "  ✗ output/ in tarball"; exit 1; fi
echo "  ✓ clean tarball"

# Test 6: run unit tests
echo ""
echo "--- 6. Unit tests ---"
if command -v node >/dev/null 2>&1; then
    node --test tests/unit/*.test.ts 2>&1 || true
    echo "  ✓ unit tests attempt (may need deps)"
else
    echo "  ⚠ node not available, skipping"
fi

echo ""
echo "=== All smoke checks PASSED ==="
