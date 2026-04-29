#!/usr/bin/env bash
# Stop hook. Saves deterministic workflow state without writing to stdout.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd -P)"
PLAN_DIR="$PROJECT_DIR/.codex/plans"
STATE_FILE="$PLAN_DIR/session-state.md"

if [[ ! -f "$PLAN_DIR/current.md" ]]; then
  rm -f "$STATE_FILE"
  exit 0
fi

APPROVED="no"
[[ -f "$PLAN_DIR/.approved" ]] && APPROVED="yes"

STAGE="none"
[[ -f "$PLAN_DIR/.stage" ]] && STAGE="$(cat "$PLAN_DIR/.stage")"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RECENT_COMMITS="$(git -C "$PROJECT_DIR" log --oneline -5 2>/dev/null || echo "no git history")"
UNCOMMITTED="$(git -C "$PROJECT_DIR" diff --stat 2>/dev/null || echo "unknown")"

cat > "$STATE_FILE" <<EOF
# Session State
Saved: $TIMESTAMP

## Workflow Status
- Plan approved: $APPROVED
- Stage progress: $STAGE
- Plan file: .codex/plans/current.md

## Recent Commits
$RECENT_COMMITS

## Uncommitted Changes
$UNCOMMITTED

## Resume Instructions
1. Read .codex/plans/current.md for the full plan
2. If approved=yes, resume Phase 2&3 at stage $STAGE
3. If approved=no, resume Phase 1 and get user approval
4. Check .codex/agent-memory for lessons from prior work
EOF

