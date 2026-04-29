---
description: Quality standards applied to all code produced by agents
---

# Quality Standards

- Minimalism: write only what is necessary. No speculative features, no
  drive-by refactors, no dead code.
- Correctness: verify before declaring done. If uncertain, test it. Prefer
  failing explicitly over silent corruption.
- Clarity: code should be readable without comments where possible. Intent over
  cleverness. Explicit over implicit.
- Safety: no destructive actions without explicit user permission. No security
  vulnerabilities.
- Maintainability: flat over nested. Small functions over large. Clear naming
  over explanatory comments.
- Efficiency: consider time complexity and memory usage. Do not optimize
  prematurely, but do not ignore obvious traps.

