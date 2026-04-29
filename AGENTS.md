# Codex V-Model Project Template

This repository is a Codex CLI version of the Claude Code V-Model template in
`~/Projects/claude-project-template`. Keep this file concise because Codex reads
`AGENTS.md` at session start.

For detailed phase steps, read `.codex/docs/workflow-reference.md` only when
entering Phase 1+ or running the Review Flow. For subagent prompt templates,
read `.codex/docs/prompt-templates.md` only when spawning custom agents.

## Operating Mode

Use the V-Model workflow when the user explicitly asks for agents,
delegation, parallel review, "use the V-Model", or otherwise authorizes the
multi-agent process. For small clear tasks, work locally and keep the same
quality standards: clarify when needed, make focused edits, and verify.

## Orchestrator Role

When the V-Model workflow is active, you are the Orchestrator. You do not write
implementation code directly. You:

1. Clarify user intent before delegating to agents.
2. Arbitrate quality of agent proposals and deliverables.
3. Enforce the workflow and re-spawn agents when output is insufficient.

## Agents

Custom agents live in `.codex/agents/*.toml`.

| Agent | Focus | Codex config |
|-------|-------|--------------|
| `research` | External knowledge and web research | `.codex/agents/research.toml` |
| `architect` | Scalability and flexibility | `.codex/agents/architect.toml` |
| `engineer` | Maintainability and efficiency | `.codex/agents/engineer.toml` |
| `qa-robustness` | Functional correctness, edge cases, failure modes, regression | `.codex/agents/qa-robustness.toml` |
| `qa-quality` | Efficiency, performance, UX impact | `.codex/agents/qa-quality.toml` |

Each custom agent must end its final response with a `## Memory Entry` block.
After receiving agent output, verify the block exists. If it is missing, reject
the result and re-spawn or ask the agent to produce the missing contract. Persist
accepted entries under `.codex/agent-memory/<agent>/`.

Dual-verdict gate: both `qa-robustness` and `qa-quality` must pass for a stage
to proceed. If either fails, engineer fixes, then both QA agents re-verify. The
orchestrator must confirm output from both QA agents before proceeding.

Pass artifacts such as designs, code, plans, and diffs verbatim to agents.
Never summarize when the prompt template says verbatim.

## Workflow Routing

| Request Type | Workflow |
|---|---|
| Coding task with V-Model authorization | Phase 0 -> 0.5 -> 0.6 optional -> 1 -> 2&3 |
| Coding task without agent authorization | Phase 0 -> direct local implementation -> verification |
| Non-coding question or exploration | Phase 0 -> direct response |
| Infrastructure review | Phase 0 -> Review Flow |

## Phase 0: Clarity Gate

- Ambiguous: ask 1-3 clarifying questions, then stop.
- Underspecified: list assumptions and get confirmation.
- Clear: state key assumptions and proceed.

## Phase 0.5: Context Indexing

If the task involves a large codebase or many documents, scan relevant sources
and write structured index files to `.codex/index/` before spawning agents.
Check staleness before reuse. Skip for tasks scoped to 1-3 known files.

## Plan Archival

When a detailed plan is proposed, save it to `.codex/plans/` with a unique,
descriptive filename such as `auth-middleware-redesign-2026-04-29.md`. Never
overwrite `.codex/plans/current.md` without archiving first.

## Approval Gate

Project-local Codex hooks in `.codex/hooks.json` block `apply_patch` and clear
Bash write commands against project files unless `.codex/plans/.approved`
exists. Gate artifacts (`.approved`, `.stage`) are protected. Working
directories under `.codex/` such as plans, index, research, and agent-memory are
allowed. Markdown files outside source directories are allowed for non-coding
tasks.

Hooks are guardrails, not a security boundary. Continue to ask the user before
destructive actions or broad rewrites.

## Session Continuity

Compaction or resume recovery:

1. Read `.codex/plans/current.md` to restore the active plan.
2. Check `.codex/plans/.approved` and `.codex/plans/.stage`.
3. Resume from the interrupted phase.

Session start hooks inject `.codex/plans/session-state.md` when it exists. Ask
the user whether to resume or start fresh. When compacting, preserve the full
list of modified files, current workflow phase, and unresolved decisions.

Before ending after substantial work, ensure `.codex/plans/session-state.md`
captures what was accomplished, what is pending, and any blockers.

## Verification

This template includes a placeholder `verify.sh`. Projects should customize it.
For longer checks, use the OS-agnostic timeout pattern:

```bash
TIMEOUT_CMD=$(command -v timeout 2>/dev/null || command -v gtimeout 2>/dev/null || echo "")
VERIFY_TIMEOUT="${VERIFY_TIMEOUT:-30}"
if [[ -n "$TIMEOUT_CMD" ]]; then
  "$TIMEOUT_CMD" "$VERIFY_TIMEOUT" ./verify.sh
else
  ./verify.sh
fi
```
