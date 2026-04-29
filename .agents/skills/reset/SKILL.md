---
name: reset
description: Clear transient Codex V-Model workflow state and start fresh.
---

Clear all transient workflow state so the next task starts from a clean slate.

Delete the following files or directories if they exist:

- `.codex/plans/session-state.md`
- `.codex/plans/current.md`
- `.codex/plans/.approved`
- `.codex/plans/.stage`
- `.codex/index/`

After clearing, confirm what was removed and that the workspace is ready for a
new task.

Do not delete:

- Custom agent definitions in `.codex/agents/`
- Agent memory in `.codex/agent-memory/`
- Hooks, rules, docs, settings, research artifacts, or template infrastructure
