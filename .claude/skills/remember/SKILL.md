---
name: remember
description: Snapshot the current working session — decisions, changes, state, and next steps — to .claude/sessions/ so it can be restored later with /restore-session. Use when the user says "/remember", "remember this session", "save our progress", "checkpoint", or before ending a long session.
---

# Remember this session

Capture the current session so a future session can pick up with full context.

## Steps

1. Get a timestamp and ensure the folder exists:
   ```bash
   mkdir -p .claude/sessions && date +"%Y-%m-%d-%H%M%S"
   ```
2. Write a snapshot to **`.claude/sessions/<timestamp>.md`** using the template
   below. Also write the **same content** to **`.claude/sessions/latest.md`**
   (this is the pointer `/restore-session` reads first).
3. Fill the template from the actual conversation and repo state — be concrete
   and specific (real file paths, real decisions). Prefer facts that are NOT
   obvious from the code or git history (the "why", open questions, gotchas).
4. Keep it tight but complete — enough that a fresh session could continue with
   no other context. Confirm to the user what was saved and where.

## Snapshot template

```markdown
# Session snapshot — <timestamp>

## Focus
<1–2 sentences: what this session was about.>

## Done this session
- <change/decision> — <file(s)> — <why it mattered>
- ...

## Key decisions & rationale
- <decision> — <why> (include rejected alternatives if relevant)

## Current state
- Dev server: <running? port> · Build/typecheck: <green?>
- Branch: <git branch> · Uncommitted: <yes/no + summary>

## Open threads / next steps
- [ ] <thing not yet done or explicitly deferred>
- ...

## Gotchas / non-obvious context
- <anything that would trip up a fresh session>
```

## Notes
- Never overwrite older timestamped snapshots — only `latest.md` is replaced.
- Don't duplicate the design system here; that lives in
  `docs/design-system.md`. This file is about *session* state.
- If `git` is available, capture the branch and a one-line `git status` summary.
