# Claude to Codex Mapping

This file documents how the original Claude Code template maps to Codex CLI.

| Claude template | Codex template | Notes |
|-----------------|----------------|-------|
| `CLAUDE.md` | `AGENTS.md` | Codex reads `AGENTS.md` as project instructions. |
| `.claude/settings.json` | `.codex/config.toml` + `.codex/hooks.json` | Codex uses TOML config and JSON or TOML hooks. |
| `.claude/agents/*.md` | `.codex/agents/*.toml` | Codex custom agents are standalone TOML files. |
| `.claude/hooks/*.sh` | `.codex/hooks/*.sh` | Hook payloads differ, so scripts are adapted. |
| `.claude/rules/*.md` | `.codex/docs` and `.codex/rules/*.rules` | Codex command approval rules use Starlark `.rules`. |
| `.claude/skills/*` | `.agents/skills/*` | Repo skills use the open agent skills layout. |
| `.claude/plans` | `.codex/plans` | Same workflow state convention. |
| `.claude/research` | `.codex/research` | Same provenance and index pattern. |
| `.claude/agent-memory` | `.codex/agent-memory` | Template-managed memory, not automatic Codex memory. |

Project-specific active plans, session-state files, and old agent-memory entries
from the Claude repository were intentionally not copied into this template.

