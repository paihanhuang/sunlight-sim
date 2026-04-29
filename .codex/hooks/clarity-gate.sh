#!/usr/bin/env bash
# UserPromptSubmit hook. Adds a reminder for non-trivial prompts.

set -euo pipefail

INPUT="$(cat)"

if command -v jq >/dev/null 2>&1; then
  PROMPT="$(printf '%s' "$INPUT" | jq -r '.prompt // empty')"
else
  exit 0
fi

if [[ ${#PROMPT} -lt 50 ]]; then
  exit 0
fi

if [[ ${#PROMPT} -lt 80 ]] && echo "$PROMPT" | grep -iqE '^(yes|no|y|n|ok|approved|approve|reject|looks good|lgtm|go ahead|proceed)'; then
  exit 0
fi

cat <<'EOF'
CLARITY GATE REMINDER:
- If ambiguous: ask 1-3 clarifying questions and stop.
- If underspecified: list assumptions and get confirmation.
- If clear: state key assumptions and proceed.
- Check whether context indexing is needed before spawning agents.
EOF

