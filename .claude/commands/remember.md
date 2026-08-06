---
description: Snapshot the current session (decisions, changes, state, next steps) to .claude/sessions/ for later restore.
---

Save a snapshot of our current working session so a future session can continue
with full context.

Steps:
1. Run: `mkdir -p .claude/sessions && date +"%Y-%m-%d-%H%M%S"`
2. Write the snapshot to `.claude/sessions/<timestamp>.md` AND copy the same
   content to `.claude/sessions/latest.md` (the pointer `/restore-session` reads).
3. Use this template, filled from the actual conversation and repo state — be
   concrete (real file paths, real decisions), and prefer non-obvious context
   (the "why", open questions, gotchas) over what's already visible in the code:

```markdown
# Session snapshot — <timestamp>

## Focus
<what this session was about>

## Done this session
- <change/decision> — <file(s)> — <why>

## Key decisions & rationale
- <decision> — <why> (note rejected alternatives if relevant)

## Current state
- Dev server: <running? port> · Build/typecheck: <green?>
- Branch: <git branch> · Uncommitted: <yes/no + summary>

## Open threads / next steps
- [ ] <deferred or not-yet-done item>

## Gotchas / non-obvious context
- <anything that would trip up a fresh session>
```

4. Confirm to the user what was saved and where. Never overwrite older
   timestamped snapshots — only `latest.md` is replaced. Don't duplicate the
   design system here (that's `docs/design-system.md`); this is session state.
