# syntax=docker/dockerfile:1
FROM node:22-alpine

# System deps
RUN apk add --no-cache git curl bash python3 jq

# Create clean pi config dir
WORKDIR /root/.pi/agent

# Simulate pi package installation
COPY --from=tmp /tmp/install-test/package.tgz /tmp/package.tgz

# Unpack and validate
RUN echo "=== Unpacking tarball ===" &\
    mkdir -p /tmp/unpacked &\
    cd /tmp/unpacked &\
    tar xzf /tmp/package.tgz &\
    echo "=== Package structure ===" &\
    find . -type f | sort &\
    echo "" &\
    echo "=== Validating package.json ===" &\
    cat package.json | jq '.name, .version, .license' &\
    echo "" &\
    echo "=== Checking agents ===" &\
    for f in agents/*.md; do echo "$f -> $(grep '^name:' $f | head -1)"; done &\
    echo "" &\
    echo "=== Validating bin script ===" &\
    test -x bin/install-agents.sh && echo "✓ install-agents.sh is executable" || echo "✗ not executable" &\
    echo "" &\
    echo "=== Checking extensions ===" &\
    test -f extensions/subagent/index.ts && echo "✓ subagent/index.ts exists" || echo "✗ missing" &\
    test -f extensions/fetch_url.ts && echo "✓ fetch_url.ts exists" || echo "✗ missing" &\
    test -f extensions/web_search.ts && echo "✓ web_search.ts exists" || echo "✗ missing" &\
    echo "" &\
    echo "=== Checking for unwanted files ===" &\
    test -f _tasks.md && echo "✗ _tasks.md present (should be .gitignored)" || echo "✓ _tasks.md not in tarball" &\
    test -d output && echo "✗ output/ present (should be .gitignored)" || echo "✓ output/ not in tarball" &\
    echo "" &\
    echo "=== All checks passed ==="
