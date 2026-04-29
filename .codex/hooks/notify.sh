#!/usr/bin/env bash
# Stop hook. Sends a desktop notification when Codex completes a turn.

set -euo pipefail

INPUT="$(cat)"
MESSAGE="Codex turn complete"

if command -v jq >/dev/null 2>&1; then
  LAST="$(printf '%s' "$INPUT" | jq -r '.last_assistant_message // empty' 2>/dev/null || true)"
  if [[ -n "$LAST" ]]; then
    MESSAGE="$(printf '%s' "$LAST" | head -c 120)"
  fi
fi

case "$(uname -s)" in
  Linux)
    if [[ -n "${DISPLAY:-}" || -n "${WAYLAND_DISPLAY:-}" ]]; then
      notify-send "Codex" "$MESSAGE" >/dev/null 2>&1 || true
    fi
    ;;
  Darwin)
    ESCAPED="${MESSAGE//\\/\\\\}"
    ESCAPED="${ESCAPED//\"/\\\"}"
    osascript -e "display notification \"$ESCAPED\" with title \"Codex\"" >/dev/null 2>&1 || true
    ;;
esac

