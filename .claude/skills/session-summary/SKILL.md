---
name: session-summary
description: Summarize the current Claude Code session into a self-contained handoff document so work can continue in a fresh, lower-context session. Use when the user asks to "summarize this session", "wrap up and restart", "create a session summary", "hand off to a new session", or wants to reduce token usage / context bloat by starting clean. Pairs with the session-resume skill.
---

# Session Summary

Turn the current conversation into a compact, self-contained handoff document
that a brand-new session (zero prior context) can read and continue from
without re-deriving anything already established. The point is to let the
user close this session and start a cleaner one — via the `session-resume`
skill — without losing decisions, rationale, or state.

## Ground rules

- **Verify, don't just recall.** Re-check repo/environment facts with real
  commands (`git status`, `git log`, `git branch`, `git remote -v`) rather
  than trusting your memory of what happened earlier in the conversation —
  the two can drift (undo/reset, manual edits outside your tool calls, etc.).
- **Capture the "why", not just the "what".** A list of file names is
  useless without the reasoning behind non-obvious choices. Prioritize
  decisions a fresh session would otherwise have to re-litigate or
  re-research (e.g. "chose X over Y because Z").
- **Be honest about what's unresolved.** Open questions, known bugs,
  half-finished work, and things the user pushed back on all belong in the
  summary — omitting them just moves the context loss to the new session.
- **Optimize for tokens.** This document replaces the conversation, so it
  should be dramatically smaller — a few hundred to ~1500 words for a long
  session. Prefer bullet lists over prose. Don't paste full file contents,
  diffs, or command output; reference paths and line numbers instead.

## Steps

1. **Scope the summary.** Default to the whole conversation. If the user
   says "just summarize since X", scope to that instead.

2. **Gather ground truth about the environment**, run and note the results:
   - `git status --short` (uncommitted work — flag this prominently; it's
     the single most important thing not to lose)
   - `git log --oneline -20` and `git branch --show-current`
   - `git remote -v` (which repo/fork this is)
   - Any PR/issue URLs, trigger IDs, or session IDs mentioned in the
     conversation that the user would otherwise have to hunt for again.

3. **Write the document** using exactly this template (omit a section only
   if it is genuinely empty — say "None" rather than deleting the heading,
   so the resume skill can rely on the structure):

   ```markdown
   # Session summary — <one-line description of the session's purpose>

   Generated: <UTC timestamp>Z · Repo: <owner/repo> · Branch: <branch>
   Original session: <link or ID if known, else "not captured">

   ## Goal
   What the user was trying to accomplish, in their own terms. Include
   constraints or preferences they stated (style, scope, things to avoid).

   ## Current state
   - Branch / commit HEAD is at: <short sha> "<subject>"
   - Uncommitted changes: <none, or exactly what's dirty and why it's
     not committed yet>
   - Pushed to remote: <yes/no, up to date?>
   - Deployed/running services: <e.g. dev servers on which ports, still
     alive or already stopped>
   - Open PR/issue: <link + status, or "none">

   ## What was done (chronological, terse)
   - <bullet per major step or decision — commit-message-length, not
     paragraphs. Group trivial steps; expand anything non-obvious.>

   ## Key decisions & rationale
   - <decision> — <why, especially if a simpler/obvious alternative was
     rejected and why>

   ## Files & artifacts touched
   - `path/to/file` — <one line on what changed and why it matters>
   - (group by directory if long; don't restate the full diff)

   ## Gotchas / environment quirks learned
   - <anything that cost time to discover: blocked tools, proxy quirks,
     flaky commands, required workarounds — so the next session doesn't
     rediscover them the hard way>

   ## Open threads / next steps
   - <ordered list of what should happen next, most important first>
   - <explicitly flag anything the user asked for but is not yet done>

   ## Questions for the user
   - <anything genuinely undecided that blocked you, if applicable, else
     "None">
   ```

4. **Save it** to `.claude/session-summaries/<UTC-yyyyMMdd-HHmm>-<slug>.md`
   in the repo (create the directory if it doesn't exist; keep the slug
   short and kebab-case, derived from the Goal line).

5. **Print the full document in the chat too** — even if you save the
   file, the container is ephemeral and the file only survives if it gets
   committed. Do not assume the user will go find the file.

6. **Handle persistence explicitly.** This summary is only useful in a new
   session if it is actually reachable from there:
   - If this is a remote/cloud environment tied to a git repo (the usual
     case), the file must be **committed and pushed** to survive container
     recycling. Follow the standing git rules: only commit when the user
     asks, or when committing is clearly required to fulfill an explicit
     request (as it is here — the user asked to be able to reuse this
     across sessions). If you're unsure, say so and offer to commit rather
     than doing it silently on a repo you don't own.
   - If a local/persistent filesystem is available instead, saving the file
     is sufficient without a commit.

7. **Tell the user how to use it**: start a new session (in this repo, or
   pointed at this repo) and invoke the `session-resume` skill, passing the
   file path (or pasting the summary text directly if the file didn't
   persist). One line is enough — don't repeat the whole summary back to
   them a second time.

## What good output looks like

A resume session that reads only this document should be able to state
the goal, the current repo state, and the next action correctly — without
asking the user to re-explain anything covered above.
