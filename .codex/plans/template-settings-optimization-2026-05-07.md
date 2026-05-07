# Template Settings Optimization Proposal

Date: 2026-05-07

## Current State

Global Codex config:

- `model = "gpt-5.5"`
- `model_reasoning_effort = "xhigh"`
- `service_tier = "fast"`
- `approval_policy = "never"`
- `sandbox_mode = "danger-full-access"`
- `default_permissions = ":danger-no-sandbox"`
- `web_search = "live"`
- Stable features pinned on: `multi_agent`, `shell_tool`, `shell_snapshot`,
  `skill_mcp_dependency_install`, `enable_request_compression`, `browser_use`,
  `in_app_browser`, `computer_use`
- `hooks = false`
- Broad trusted roots include `C:\Users\midas` and
  `c:\users\midas\onedrive\desktop\projects`

Project template config:

- No project-local `sandbox_mode` or `approval_policy`, so it no longer
  downgrades global yolo/full-access defaults.
- Stable feature flags are pinned locally for portability.
- Agents use `max_threads = 6`, `max_depth = 1`.
- `.codex/hooks.json` has been removed; hook scripts remain as optional legacy
  material.

## Official Guidance Used

- Codex prompting guidance emphasizes concrete verification steps, repro
  instructions, and smaller focused tasks.
- The Codex prompting guide recommends the standard `apply_patch`, shell, and
  `update_plan` harness, with shell calls carrying an explicit working
  directory.
- `AGENTS.md` guidance recommends global instructions for reusable preferences
  and project instructions for repository-specific expectations.
- Security guidance treats sandbox mode and approval policy as the two primary
  safety levers. It also notes that cached web search reduces live-content
  exposure, while yolo/full-access defaults to live search.
- Rules are useful command policy, but the docs mark them experimental.
- Feature maturity guidance says stable features are safe for production use;
  under-development and experimental features should not be default template
  dependencies.
- Subagents only spawn when explicitly requested, inherit current sandbox
  policy, and default to `max_threads = 6`, `max_depth = 1`.

Sources:

- https://developers.openai.com/codex/prompting
- https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/agent-approvals-security
- https://developers.openai.com/codex/rules
- https://developers.openai.com/codex/feature-maturity
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/learn/best-practices

## Recommended Changes

### 1. Add a global `~/.codex/AGENTS.md`

Move reusable working agreements out of each project and into a global
instruction file. Keep project `AGENTS.md` focused on repo-specific workflow.

Recommended global contents:

```markdown
# Global Codex Working Agreements

## Prompt Harness

For non-trivial work, identify the objective, context, constraints,
deliverables, and verification target before editing. If any of those are
missing and a reasonable assumption would be risky, ask a concise clarification.

## Verification

Prefer the smallest meaningful verification loop first. Report exact commands
and results. If verification cannot run, say why.

## Safety

Yolo/full-access may be the default, but destructive operations, broad rewrites,
publishing, force pushes, credential changes, and dependency additions still
require explicit user intent.

## Context

Use targeted reads and `rg` before broad scans. Keep long reference material in
project docs and load it only when needed.
```

Tradeoff: This improves consistency across all projects, but any bad global
instruction affects every session.

### 2. Keep yolo as default, but add explicit downgrade profiles

Keep the requested default:

```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"
default_permissions = ":danger-no-sandbox"
web_search = "live"
```

Add profiles:

```toml
[profiles.workspace]
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

[profiles.readonly]
sandbox_mode = "read-only"
approval_policy = "never"
default_permissions = ":read-only"
web_search = "disabled"
```

Tradeoff: Full access is fast and frictionless, but it removes the main
technical boundary. Profiles give an easy escape hatch for risky repos, reviews,
and research-only work.

### 3. Narrow trusted project roots

Remove broad trust entries such as `C:\Users\midas` and the whole `Projects`
directory. Trust exact repo roots instead.

Tradeoff: More trust prompts when opening new repos, but less chance that a
random cloned repo can load project-local `.codex` config, rules, agents, or
future hook material automatically.

### 4. Add schema comments to config files

Add this at the top of `~/.codex/config.toml` and project `.codex/config.toml`:

```toml
#:schema https://developers.openai.com/codex/config-schema.json
```

Tradeoff: Better editor validation and autocomplete; essentially no runtime
cost.

### 5. Keep stable features pinned, keep hooks disabled

Keep only stable features in global config. Keep:

```toml
hooks = false
```

Do not pin under-development or experimental features in the template.

Tradeoff: Stable defaults are predictable. You may miss early access to new
features until you opt in per session.

### 6. Decide whether project config should be portable or personal

Option A: Keep stable `[features]` in `.codex/config.toml` so the template is
self-contained when copied to another machine.

Option B: Remove project `[features]` and keep all feature settings in
`~/.codex/config.toml`, making project config purely project-specific.

Tradeoff: Option A is portable; Option B is cleaner and avoids config drift.

### 7. Unpin custom agent models from project files

Remove `model = "gpt-5.5"` from `.codex/agents/*.toml` and let agents inherit
the global model. Keep role-specific `model_reasoning_effort` if useful.

Tradeoff: Inheritance keeps future model upgrades automatic. Pinning gives
repeatability and protects a project from accidental global model changes.

### 8. Treat agent sandbox fields as advisory under yolo

The subagent docs state that child agents inherit live runtime overrides such as
`--yolo`. That means project agent files that say `sandbox_mode = "read-only"`
may not provide containment in a yolo session.

Recommendation: keep the sandbox fields for non-yolo profiles, but document in
`AGENTS.md` that V-Model safety is procedural under yolo.

Tradeoff: Clear expectations; no false confidence in read-only agent settings.

### 9. Strengthen `.codex/rules/default.rules`, but do not rely on it alone

Add forbidden or prompt rules for obvious destructive commands:

- `rm -rf`
- `Remove-Item -Recurse -Force`
- `git push --force-with-lease` as prompt, not allow
- `git push --delete`
- `git branch -D`
- `npm publish`
- `winget install`
- `Invoke-Expression`, `iex`, and shell-piped install scripts

Tradeoff: Useful when approvals/rules are active; weaker under yolo and may
create false positives.

### 10. Make verification harness real

Keep `verify.sh`, but add a `verify.ps1` for Windows projects and update
`AGENTS.md` to say:

- Run `./verify.sh` or `./verify.ps1` when present.
- For narrow changes, run the smallest relevant test first.
- For frontend work, run a local browser check when a dev server is needed.

Tradeoff: More setup per project, but this aligns with Codex guidance that work
quality improves when Codex can verify.

### 11. Update stale best-practices docs

`codex-cli-best-practices.md` still lists `.codex/hooks.json` as a useful
project-local file. Update it to say hooks are disabled by default and rules,
features, profiles, and `AGENTS.md` are the primary template surfaces.

Tradeoff: Documentation cleanup only; low risk.

## Suggested Decision Set

Recommended for this template:

1. Approve global `AGENTS.md`.
2. Approve downgrade profiles while keeping yolo default.
3. Approve removing broad trust roots.
4. Approve schema comments.
5. Keep project `[features]` for portability. Approved: Option A.
6. Unpin custom agent models.
7. Add `verify.ps1`.
8. Update stale best-practices docs.

Hold for later:

- Stronger `.rules` expansion, because its usefulness depends on how often you
  use non-yolo profiles.
- Deleting `.codex/hooks/` entirely, because keeping the scripts as strict-mode
  reference material is still useful.
