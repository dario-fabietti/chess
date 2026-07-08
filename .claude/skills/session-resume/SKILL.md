---
name: session-resume
description: Resume work in a fresh Claude Code session from a session-summary handoff document (produced by the session-summary skill). Use when the user provides a summary file path, pastes a session handoff document, or asks to "resume from summary", "continue from this summary", "pick up where we left off". Pairs with the session-summary skill.
---

# Session Resume

Reconstruct working context from a handoff document produced by the
`session-summary` skill, so this fresh session can continue the work
without re-deriving decisions or repeating discovery work — while not
blindly trusting a summary that may be stale.

## Steps

1. **Locate the summary.**
   - If the user gave a path, `Read` it directly.
   - If they pasted the text inline, use that.
   - If neither, look in `.claude/session-summaries/` in the current repo
     for the most recent file (sort by filename — they're timestamp
     prefixed) and confirm with the user before using it if more than one
     recent candidate exists.
   - If nothing is found, say so and ask the user for the summary rather
     than guessing or fabricating context.

2. **Read the whole document before doing anything else.** Do not start
   acting on the first bullet you see — the "Open threads" and "Questions
   for the user" sections change what "doing anything else" should mean.

3. **Verify the claimed state against reality.** Summaries can go stale
   (time passes between writing and resuming; someone else may have
   pushed; a PR may have merged or CI finished). Before relying on any
   claim in the "Current state" section, check it:
   - `git status --short`, `git log --oneline -10`, `git branch --show-current`
     — confirm branch and HEAD match what the summary says.
   - If the summary mentions uncommitted changes, confirm they're still
     there (or find out what happened to them if not).
   - If it mentions a PR/issue, and you have the tools to check, verify
     its current status rather than trusting the summary's snapshot.
   - If it mentions running services (dev servers, background tasks),
     assume they are **not** running anymore (fresh session/container) —
     don't act as if they are without checking.

4. **Reconcile discrepancies before proceeding.** If reality contradicts
   the summary (branch moved, PR already merged, uncommitted work is
   gone), tell the user plainly what changed and how it affects the plan,
   then adjust — don't silently paper over it and don't silently proceed
   on stale assumptions either.

5. **Don't re-litigate settled decisions.** The "Key decisions & rationale"
   section exists so you don't have to re-debate choices already made.
   Treat them as established unless reality has since invalidated them.

6. **Resume quietly.** Once loaded and verified, do not narrate the whole
   summary back to the user — they wrote it (or asked for it) and already
   know its contents. A brief confirmation is enough: what you understood
   the goal to be, what's already done, and what you're about to do next.
   Then just continue the work.

7. **Decide what to do first:**
   - If "Open threads / next steps" lists a clear next action, start there.
   - If it lists several with no obvious priority, ask the user which one
     — don't guess at priority among genuinely competing options.
   - If "Questions for the user" is non-empty, surface those before
     proceeding on anything they'd affect.

## What good resumption looks like

The user should not have to repeat anything already covered in the
summary. If you find yourself asking "what were we doing again?" or
re-deriving a fact the document already states, re-read it — the answer
is probably already there.
