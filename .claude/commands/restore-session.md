---
description: Reload the most recent saved session snapshot from .claude/sessions/ and continue where we left off.
argument-hint: "[optional snapshot timestamp]"
---

Restore a saved session so we can continue with full context.

Steps:
1. Run: `ls -1 .claude/sessions/ 2>/dev/null`
   - If the folder or `latest.md` is missing, tell the user there's no saved
     session yet and suggest `/remember` first. Stop.
2. Read `.claude/sessions/latest.md` (the newest snapshot). If the user passed a
   specific timestamp in `$ARGUMENTS`, read that file instead. If they want to
   choose, list the snapshots (filenames are timestamps) and ask which one.
3. Also read `CLAUDE.md` and `docs/design-system.md` if not already in context,
   so project + design conventions are loaded too.
4. Give a BRIEF orientation (don't dump the whole file): what the last session
   focused on, what got done, current state, and the open threads as a short
   checklist.
5. Ask what to tackle first, then continue. This is read-only — do not modify
   any snapshot.
