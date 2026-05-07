# Hooks to Features Transition Proposal

Date: 2026-05-07

## Summary

Use Codex features and configuration as the default cross-project policy surface,
but do not treat feature flags as a one-for-one replacement for lifecycle hooks.
Feature flags enable runtime capabilities. They do not provide arbitrary
deterministic interception of every prompt, patch, command, or stop event.

Approved execution variance: after approving this transition, the user
explicitly requested yolo/full-access as the Codex default. The implemented
global default therefore uses `sandbox_mode = "danger-full-access"`,
`approval_policy = "never"`, `default_permissions = ":danger-no-sandbox"`, and
`web_search = "live"`. Project-local template config was adjusted so it does not
downgrade that global default.

For all projects, move durable policy into:

- `~/.codex/config.toml` for global model, sandbox, approval, web, and feature
  defaults.
- `~/.codex/rules/*.rules` for command approval policy.
- Project `AGENTS.md` for workflow behavior and phase gates.
- Optional `requirements.toml` for non-overridable managed constraints when
  available.
- Optional hooks only for deterministic lifecycle behavior that has no native
  feature/config replacement.

## Current Findings

This template currently depends on `.codex/hooks.json` for:

- `SessionStart`: inject saved workflow state.
- `UserPromptSubmit`: remind the agent to run the clarity gate.
- `PreToolUse`: block risky shell commands and file edits before plan approval.
- `Stop`: save session state and send notifications.

The local user-level Codex config currently defaults to:

- `approval_policy = "never"`
- `sandbox_mode = "danger-full-access"`
- `windows.sandbox = "elevated"`

That is convenient, but it is the wrong default for settings intended to be used
across all projects. It bypasses the main safety boundary the old hooks were
trying to approximate.

The installed CLI is `codex-cli 0.129.0`. `codex features list` reports a stable
`hooks` feature enabled, while the public config reference still documents
`features.codex_hooks`. This is a naming drift to avoid depending on unless
hooks remain necessary.

## Recommended Global Baseline

Put conservative defaults in `~/.codex/config.toml`:

```toml
model = "gpt-5.5"
model_reasoning_effort = "xhigh"
service_tier = "fast"

sandbox_mode = "workspace-write"
approval_policy = { granular = {
  sandbox_approval = true,
  rules = true,
  mcp_elicitations = true,
  request_permissions = true,
  skill_approval = true
} }

default_permissions = ":workspace"
web_search = "cached"
project_doc_max_bytes = 65536

[sandbox_workspace_write]
network_access = false
writable_roots = []

[windows]
# Prefer unelevated if it works on the machine. Keep elevated only if the native
# Windows sandbox requires it for this host.
sandbox = "unelevated"

[features]
multi_agent = true
shell_tool = true
shell_snapshot = true
skill_mcp_dependency_install = true
enable_request_compression = true
browser_use = true
in_app_browser = true
computer_use = true

[profiles.readonly]
sandbox_mode = "read-only"
approval_policy = "never"
default_permissions = ":read-only"
web_search = "disabled"

[profiles.impl]
sandbox_mode = "workspace-write"
approval_policy = { granular = {
  sandbox_approval = true,
  rules = true,
  mcp_elicitations = true,
  request_permissions = true,
  skill_approval = true
} }
default_permissions = ":workspace"
web_search = "cached"

[profiles.full_access]
sandbox_mode = "danger-full-access"
approval_policy = "never"
default_permissions = ":danger-no-sandbox"
web_search = "live"
```

Do not enable under-development, experimental, deprecated, or removed feature
flags globally. Check with:

```powershell
codex features list
```

## Project Template Changes

Replace the current project `.codex/config.toml` shape with:

```toml
sandbox_mode = "workspace-write"
approval_policy = { granular = {
  sandbox_approval = true,
  rules = true,
  mcp_elicitations = true,
  request_permissions = true,
  skill_approval = true
} }
project_doc_max_bytes = 65536
web_search = "cached"

[features]
multi_agent = true
shell_tool = true
shell_snapshot = true
skill_mcp_dependency_install = true
enable_request_compression = true

[agents]
max_threads = 6
max_depth = 1
```

Remove `[features].codex_hooks = true` from project configs unless that project
still has hook behavior that must run.

Use top-level `web_search = "cached"` or `"live"` instead of `[tools] web_search
= true`.

## Behavior Mapping

`SessionStart` state injection:

- Move the requirement into `AGENTS.md`.
- Optional: keep a manual `session-state.md` restore step in the template.
- Do not use experimental memories globally for this yet.

`UserPromptSubmit` clarity gate:

- Move entirely into `AGENTS.md`.
- This is behavioral instruction, not deterministic enforcement.

`PreToolUse` shell guard:

- Move destructive command policy into `.codex/rules/default.rules` and the
  user-level `~/.codex/rules/default.rules`.
- Use `approval_policy` and sandboxing for the actual pause/approval boundary.

`PreToolUse` apply_patch/path guard:

- There is no complete native feature/config replacement for hook-level path
  interception.
- For normal projects, replace it with AGENTS.md workflow rules plus
  workspace-write sandboxing.
- For hard enforcement, keep a small managed hook, use OS filesystem ACLs, or
  enforce through CI/pre-commit/branch protection.

`Stop` save-turn-state:

- Move to AGENTS.md as an end-of-turn obligation.
- If deterministic persistence is mandatory, keep only this hook or centralize
  it as a managed hook.

`Stop` notify:

- Prefer native TUI notifications:

```toml
[tui]
notifications = true
notification_condition = "unfocused"
```

## Hard Enforcement Recommendation

Use three tiers:

1. Default all-project tier: no project-local hooks, stable feature flags only,
   workspace-write sandbox, granular approvals, rules, and AGENTS.md workflow.
2. V-Model template tier: stronger AGENTS.md instructions, project `.rules`,
   plan archive conventions, and explicit approval language.
3. Strict enterprise/personal-managed tier: `requirements.toml` with allowed
   sandbox modes, allowed approval policies, pinned stable features, restrictive
   rules, and managed hooks only for path-level or lifecycle checks that cannot
   be represented elsewhere.

Do not try to preserve the old plan approval gate by pretending feature flags
can block `apply_patch` by path. They cannot. Either accept instruction-level
governance for that gate or keep a minimal hook/external enforcement layer.

## Rollout Plan

1. Update `~/.codex/config.toml` to the conservative baseline and move
   `danger-full-access` into an explicit `full_access` profile.
2. Move reusable command policy into `~/.codex/rules/default.rules`.
3. Update this template to remove hook dependency from the default path.
4. Keep `.codex/hooks/` only as archived legacy material or optional strict-mode
   material.
5. Test on one low-risk repo with:

```powershell
codex features list
codex --profile readonly "Summarize this repo"
codex --profile impl "Make a tiny safe edit and show the diff"
```

6. After the profile behavior is stable, copy the updated template config and
   AGENTS.md language into other projects.
