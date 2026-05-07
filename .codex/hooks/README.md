# Legacy Hooks

These scripts are retained as optional strict-mode material. The default
template no longer loads `.codex/hooks.json`, and project workflow policy should
prefer stable Codex features, user-level sandbox and approval settings,
`.codex/rules/*.rules`, and `AGENTS.md`.

Re-enable hooks only when a project needs deterministic lifecycle behavior that
native Codex settings cannot express, such as path-level edit interception or
automatic end-of-turn state persistence.
