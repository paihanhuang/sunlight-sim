#!/usr/bin/env bash
# SessionStart hook. Injects saved workflow state into a new Codex session.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
STATE_FILE="$PROJECT_DIR/.codex/plans/session-state.md"

if [[ -f "$STATE_FILE" ]]; then
  echo "PRIOR CODEX WORKFLOW STATE DETECTED. Read before proceeding:"
  echo ""
  cat "$STATE_FILE"
  echo ""
  echo "Ask the user whether to resume this work or start fresh."
fi

