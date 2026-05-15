#!/usr/bin/env bash

set -euo pipefail

TIMEOUT_CMD=$(command -v timeout 2>/dev/null || command -v gtimeout 2>/dev/null || echo "")
VERIFY_TIMEOUT="${VERIFY_TIMEOUT:-180}"

run_step() {
  local name="$1"
  shift
  echo "==> ${name}"
  if [[ -n "$TIMEOUT_CMD" ]]; then
    "$TIMEOUT_CMD" "$VERIFY_TIMEOUT" "$@"
  else
    "$@"
  fi
}

run_step "Typecheck" npm run typecheck
run_step "Lint" npm run lint
run_step "Unit tests" npm run test
run_step "Headed Playwright e2e" npm run test:e2e:headed
