#!/usr/bin/env bash
# PreToolUse hook for Bash commands.

set -euo pipefail

POLICY_INPUT_JSON="$(cat)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=policy-lib.sh
source "$SCRIPT_DIR/policy-lib.sh"

if ! command -v jq >/dev/null 2>&1; then
  echo "[guard-bash] ERROR: jq is required to inspect hook input." >&2
  exit 2
fi

COMMAND="$(policy_jq '.tool_input.command // .tool_input.cmd // empty' 2>/dev/null || true)"

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

BLOCKED_PATTERNS=(
  'rm -rf /'
  'rm -rf ~'
  'rm -rf \.'
  'rm -rf \*'
  'git push --force'
  'git push -f'
  'git reset --hard'
  'git clean -fd'
  'git checkout -- \.'
  'git restore \.'
  'git branch -D'
  'mkfs\.'
  'dd if='
  '> /dev/sd'
  'chmod -R 777'
  ':(){:|:&};:'
  'sudo rm'
  'curl.*[|].*\bsh\b'
  'wget.*[|].*\bsh\b'
)

for pattern in "${BLOCKED_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "[guard-bash] BLOCKED: destructive command detected: $pattern" >&2
    exit 2
  fi
done

if echo "$COMMAND" | grep -qE '\b(python3?|perl|ruby|node)\s+-[ceE]\s'; then
  echo "[guard-bash] WARNING: inline interpreter command may hide file writes. Review carefully." >&2
fi

check_target_list() {
  local targets="$1"
  while IFS= read -r target; do
    [[ -n "$target" ]] || continue
    policy_check_write_target "$target"
  done <<<"$targets"
}

# Heredoc with write operator: <<EOF > path
check_target_list "$(
  echo "$COMMAND" | grep -oE '<<[[:space:]]*['"'"'"]?[[:alnum:]_]+['"'"'"]?[^>]*>>?[[:space:]]*[^[:space:];|&]+' 2>/dev/null |
    sed -E 's/^.*>>?[[:space:]]*([^[:space:];|&]+)$/\1/' || true
)"

# Redirection. Strip quoted regions first to avoid echo "a > b".
STRIPPED_CMD="$(echo "$COMMAND" | sed -e "s/'[^']*'//g" -e 's/"[^"]*"//g')"
check_target_list "$(
  echo "$STRIPPED_CMD" | grep -oE '>>?[[:space:]]*[^[:space:];|&]+' 2>/dev/null |
    sed -E 's/^>>?[[:space:]]*//' || true
)"

# tee and tee -a
check_target_list "$(
  echo "$COMMAND" | grep -oE '\btee[[:space:]]+(-a[[:space:]]+)?[^[:space:];|&]+' 2>/dev/null |
    awk '{print $NF}' || true
)"

# cp/mv/install destination is the last argument in simple command forms.
check_target_list "$(
  echo "$COMMAND" | grep -oE '\b(cp|mv|install)[[:space:]]+(-[[:alnum:]]+[[:space:]]+)*[^;|&]+' 2>/dev/null |
    awk '{print $NF}' || true
)"

# dd of=<path>
check_target_list "$(
  echo "$COMMAND" | grep -oE '\bdd\b[^;|&]*\bof=[^[:space:];|&]+' 2>/dev/null |
    sed -E 's/^.*\bof=([^[:space:];|&]+).*$/\1/' || true
)"
