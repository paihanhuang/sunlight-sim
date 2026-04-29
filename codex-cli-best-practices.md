# Codex CLI Best Practices Summary

> Sources: local `codex --help` / `codex debug prompt-input`, OpenAI Codex
> docs reviewed 2026-04-29, and the Claude template this repository mirrors.

## Core Principle

Context is your most important resource. Codex builds each turn from layered
instructions, environment context, conversation history, tool outputs, and
project guidance from `AGENTS.md`. Every file read and command output consumes
budget. Explore deliberately, summarize aggressively, and keep reusable
guidance small.

## 1. Give Codex a Way to Verify Its Work

The single highest-leverage instruction is a concrete verification target.

- Provide acceptance criteria, expected outputs, or failing examples.
- Ask for targeted tests before broad suites when the change is narrow.
- For UI work, verify visually with screenshots or browser checks.
- Paste actual errors and logs. Do not ask Codex to infer them from symptoms.
- Inspect test logic, not only the fact that tests pass.

## 2. Explore First, Then Plan, Then Code

Use a planning pass when the scope crosses multiple files, the approach is
uncertain, or behavior is risky. Skip ceremony when the diff can be described in
one sentence.

1. Explore with targeted reads and `rg`.
2. Plan when the design matters.
3. Implement the smallest defensible change.
4. Verify against the stated criteria.
5. Commit or open a PR only after verification.

For this template, full V-Model planning is reserved for requests that
explicitly authorize agents or delegation.

## 3. Provide Specific Context in Prompts

Good prompts reduce correction loops.

- Scope the task by files, scenario, and expected behavior.
- Point to existing patterns to reuse.
- Include exact command output for failures.
- State testing preferences and dependency constraints.
- Use images for visual bugs.

Vague prompts are useful for discovery. Precise prompts are better for
execution.

## 4. Configure Codex Deliberately

Codex project guidance is `AGENTS.md`, not `CLAUDE.md`. Codex discovers guidance
from global and project `AGENTS.md` files, with files closer to the working
directory appearing later in the instruction chain.

Useful project-local files:

- `AGENTS.md`: concise operating guidance loaded at session start.
- `.codex/config.toml`: project configuration such as hooks, agents, and search.
- `.codex/hooks.json`: deterministic lifecycle hooks.
- `.codex/agents/*.toml`: custom subagents.
- `.codex/rules/*.rules`: approval rules for commands outside the sandbox.
- `.agents/skills/<name>/SKILL.md`: repo-scoped skills.

Keep `AGENTS.md` concise. Put long phase details, templates, and reference
material in `.codex/docs/` and load them only on demand.

## 5. Use Subagents Intentionally

Subagents preserve main-thread context and enable parallel review, but they cost
extra tokens and coordination. Use them when the user explicitly asks for
agents, delegation, parallel work, or this V-Model workflow.

Good subagent tasks are bounded, independent, and materially useful:

- architecture review of a finished proposal
- implementation of a specific stage with a defined write scope
- QA verification of a specific diff and acceptance criteria
- external research with clear questions and source requirements

Avoid delegating the immediate blocking step when you need the answer before any
local progress can continue.

## 6. Manage Session State

- Use `/clear` between unrelated tasks.
- Use `/compact` with instructions that preserve modified files, current phase,
  and unresolved decisions.
- Use `codex resume` or `codex exec resume` to continue prior sessions.
- Use `.codex/plans/session-state.md` for project-level handoff outside the
  chat transcript.
- After two failed correction attempts, restart with cleaner context and a
  sharper prompt.

## 7. Automate Carefully

Non-interactive Codex:

```bash
codex exec "Summarize the current instructions"
codex exec --json "Review this branch for regressions"
codex exec --output-schema schema.json "Return structured findings"
```

For fan-out work, require structured output, retry handling, and a way to detect
partial failures. Broad automation multiplies the cost of every project
instruction and every startup hook.

## 8. Common Failure Patterns

| Pattern | Symptom | Fix |
|---------|---------|-----|
| Kitchen sink session | Unrelated context pollutes decisions | `/clear` between tasks |
| Correction spiral | Same issue corrected repeatedly | Restart with a better prompt |
| Bloated AGENTS.md | Important rules get ignored | Move details into on-demand docs |
| Trust-then-verify gap | Plausible code misses edge cases | Define and run verification |
| Unscoped investigation | Token-heavy exploration | Bound the search or use subagents |
| Stale workflow docs | Codex follows obsolete paths | Review template files periodically |
| Fan-out partial failure | Some rows fail silently | Use structured status and retries |

## 9. Develop Judgment

These are defaults, not rigid laws. Pay attention to what works in the current
repository. Context, verification, and clear ownership matter more than process
ceremony.
