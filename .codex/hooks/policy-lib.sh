#!/usr/bin/env bash
# Shared policy helpers for Codex hooks.

set -euo pipefail

policy_input_json() {
  if [[ -n "${POLICY_INPUT_JSON:-}" ]]; then
    printf '%s' "$POLICY_INPUT_JSON"
    return
  fi
  POLICY_INPUT_JSON="$(cat)"
  printf '%s' "$POLICY_INPUT_JSON"
}

policy_jq() {
  local filter="$1"
  if ! command -v jq >/dev/null 2>&1; then
    return 1
  fi
  policy_input_json | jq -r "$filter"
}

policy_find_project_dir() {
  local start
  start="$(policy_jq '.cwd // empty' 2>/dev/null || true)"
  [[ -n "$start" ]] || start="$PWD"

  local dir="$start"
  while [[ "$dir" != "/" ]]; do
    if [[ -d "$dir/.codex" || -f "$dir/AGENTS.md" ]]; then
      printf '%s\n' "$dir"
      return
    fi
    dir="$(dirname "$dir")"
  done

  printf '%s\n' "$start"
}

CODEX_PROJECT_DIR="${CODEX_PROJECT_DIR:-$(policy_find_project_dir)}"
CODEX_DIR="$CODEX_PROJECT_DIR/.codex"
APPROVED_FILE="$CODEX_DIR/plans/.approved"

policy_resolve_path() {
  local target="$1"
  local path
  if [[ "$target" == /* ]]; then
    path="$target"
  else
    path="$CODEX_PROJECT_DIR/$target"
  fi

  local parent base
  parent="$(dirname "$path")"
  base="$(basename "$path")"
  if [[ -d "$parent" ]]; then
    (cd "$parent" && printf '%s/%s\n' "$(pwd -P)" "$base")
  else
    printf '%s\n' "$path"
  fi
}

policy_is_source_adjacent_markdown() {
  local abs_path="$1"
  [[ "$abs_path" == *.md ]] || return 1

  local dir
  for dir in \
    "$CODEX_PROJECT_DIR/src/" \
    "$CODEX_PROJECT_DIR/lib/" \
    "$CODEX_PROJECT_DIR/app/" \
    "$CODEX_PROJECT_DIR/packages/" \
    "$CODEX_PROJECT_DIR/services/"
  do
    [[ "$abs_path" == "$dir"* ]] && return 0
  done

  return 1
}

policy_check_write_target() {
  local target="$1"
  [[ -n "$target" ]] || return 0

  # Ambiguous shell-expanded paths are allowed here; Codex sandbox and approval
  # rules still apply. Hooks are guardrails, not parsers for every shell form.
  if [[ "$target" == *'$'* || "$target" == *'`'* ]]; then
    return 0
  fi

  local abs_path
  abs_path="$(policy_resolve_path "$target")"

  local protected_prefixes=(
    "$CODEX_DIR/agents/"
    "$CODEX_DIR/hooks/"
    "$CODEX_DIR/rules/"
    "$CODEX_DIR/docs/"
    "$CODEX_PROJECT_DIR/.agents/skills/"
  )

  local protected
  for protected in "${protected_prefixes[@]}"; do
    if [[ "$abs_path" == "$protected"* ]]; then
      echo "BLOCKED: $target is protected template infrastructure. Edit it manually outside normal workflow changes." >&2
      exit 2
    fi
  done

  local protected_files=(
    "$CODEX_DIR/config.toml"
    "$CODEX_DIR/hooks.json"
  )

  for protected in "${protected_files[@]}"; do
    if [[ "$abs_path" == "$protected" ]]; then
      echo "BLOCKED: $target is protected Codex configuration. Edit it manually outside normal workflow changes." >&2
      exit 2
    fi
  done

  if [[ "$abs_path" == "$CODEX_DIR/plans/.approved" || "$abs_path" == "$CODEX_DIR/plans/.stage" ]]; then
    echo "BLOCKED: $target is a workflow gate artifact. Gate markers must only be created by the orchestrator after user approval." >&2
    exit 2
  fi

  if [[ "$abs_path" == "$CODEX_DIR/plans/"* || \
        "$abs_path" == "$CODEX_DIR/index/"* || \
        "$abs_path" == "$CODEX_DIR/agent-memory/"* || \
        "$abs_path" == "$CODEX_DIR/research/"* ]]; then
    return 0
  fi

  if [[ "$abs_path" == *.md ]] && ! policy_is_source_adjacent_markdown "$abs_path"; then
    return 0
  fi

  if [[ -f "$APPROVED_FILE" ]]; then
    return 0
  fi

  echo "BLOCKED: write to $target requires an approved implementation plan. Complete Phase 1 and create .codex/plans/.approved first." >&2
  exit 2
}

