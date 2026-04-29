#!/usr/bin/env bash
# PreToolUse hook for Codex apply_patch/Edit/Write aliases.

set -euo pipefail

POLICY_INPUT_JSON="$(cat)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=policy-lib.sh
source "$SCRIPT_DIR/policy-lib.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "[guard-apply-patch] ERROR: jq is required to inspect hook input." >&2
  exit 2
fi

PATCH="$(policy_jq '.tool_input.command // empty' 2>/dev/null || true)"

if [[ -z "$PATCH" ]]; then
  exit 0
fi

while IFS= read -r path; do
  [[ -n "$path" ]] || continue
  policy_check_write_target "$path"
done < <(
  printf '%s\n' "$PATCH" |
    sed -nE \
      -e 's/^\*\*\* (Add|Update|Delete) File: (.*)$/\2/p' \
      -e 's/^\*\*\* Move to: (.*)$/\1/p'
)
