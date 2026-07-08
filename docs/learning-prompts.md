# ELO-tailored explanations — strategy and prompt set

How the learning sidebar (`js/learn.js` + the left panel in `index.html`)
turns the research in [docs/coaching/](coaching/README.md) into
move explanations that fit the learner. A 500-rated player and an
1800-rated player need *different explanations of the same position* —
not the same explanation at different lengths.

## The strategy, by ELO

Every 200-point band from the coaching research defines an **explanation
contract** — enforced both on the LLM (via the prompt) and on the engine
facts fed into it (lines are truncated *before* the LLM sees them, so it
cannot leak depth the learner can't absorb):

| Band | Talk about | Max line | Candidates | Evals | Vocabulary | Habit being built |
|---|---|---|---|---|---|---|
| 400–600 | hanging pieces, free captures, mate-in-1, castle early, queen stays home | 1 move each side | 2 | none | plain words only | "Is my move safe? Anything free to take?" |
| 600–800 | checks/captures/threats, knight forks, back rank & luft, Scholar's defense | 1 move each side | 2 | none | fork/pin with a 5-word gloss | "Checks, captures, threats — theirs first" |
| 800–1000 | double attacks by every piece, remove the defender, opposition | 3 half-moves | 3 | words ("wins a knight") | basic motifs bare | "Before recapturing — check checks" |
| 1000–1200 | 2-move tactics both ways, thought process, one simple plan | 4 half-moves | 3 | words (+numbers in parentheses) | + deflection/overload glossed | "What's their best reply to my move?" |
| 1200–1400 | two-motif combinations, candidates first, Greek gift, IQP/Carlsbad intro | 5 half-moves | 4 | pawns ("about 0.8 worse") | full tactical vocab, structures glossed | "Name 2–3 candidates before calculating" |
| 1400–1600 | complication discipline, the underactive piece, plans from the structure | 6 half-moves | 4 | full | positional terms, defined once | "In forcing lines, verify every reply" |
| 1600–1800 | opponent's plan every move, two weaknesses, transitions into known endings | 8 half-moves | 5 | full | unrestricted, structures by name | "What does the opponent want?" |
| 1800–2000 | precision deltas, conversion, counterplay window, challenges | full PV | 5 | full + deltas | terse, quantified | "Name the ending before trading into it" |

Tone shifts with the band too (from the coaching research): warm and
one-lesson-only below 1200; praise for *decisions* rather than moves in
the middle bands; no praise and no simplification at 1800+.

Sources for every row: the per-band files in
[docs/coaching/](coaching/README.md) — especially each file's
"Coach tuning hints" and "Depth of thought" sections.

## The prompt set

One prompt template, instantiated per band from `LEARN_BANDS` in
[`js/learn.js`](../js/learn.js). Structure:

```text
You are a chess coach. Your student is rated about {elo} Elo — {band title}.

STUDENT PROFILE (what they can and cannot do yet):
- {band.skills — the sidebar's "At this level you…" bullets}

CURRENT LEARNING GOALS (teach toward these, one at a time):
- {band.goals — the sidebar's "Learning goals" bullets}

STYLE CONTRACT for this level — follow it strictly:
- {vocabulary rule}
- Never show a line longer than {plies} half-moves.
- Focus on: {band focus list}.
- Avoid: {band avoid list}.
- Plain text, at most {wordLimit} words.

ENGINE GROUND TRUTH (already trimmed to this student's depth — do not
calculate or invent lines beyond it):
Position (FEN) / side to move / recent moves / last move
[eval — only at 1400+]
Candidate moves, engine order:      ← top {candidates} lines only,
1. {san} — {features}; {eval in the    PVs truncated to {plies}
   band's eval language}. Line: {…}
Most teachable move for this student: {recommendation from levels.js}
If side to move did nothing, the opponent would play: {threat}
Hanging pieces, both colors           ← always included; it IS the
                                        lesson below 1000

TASK: explain the position and recommend ONE move they can find and
understand. Teach exactly one lesson — the most valuable one for their
goals — not three. Make sure they see the opponent's threat.
If it fits naturally, end by reinforcing the habit: "{band habit}"
```

### How the engine feeds the prompts at the right depth

The engine always analyzes at full strength (MultiPV 5, `go infinite`).
Depth-fitting happens on the way *out*, in `factsForBand()`:

1. **Candidate count** — a 500-rated learner sees 2 candidates, an
   1800-rated learner all 5.
2. **PV truncation** — `truncatePv()` cuts each line to the band's
   half-move budget (2 → 12) before it enters the prompt, so the LLM
   physically cannot quote a 10-move line to a beginner.
3. **Eval language** — `none` (<1000): evaluations never appear;
   `words` (1000–1200): "wins a knight", "almost as good as best";
   `pawns` (1200–1400): "about 0.8 pawns worse";
   `full` (1400+): exact evals and deltas.
4. **Recommendation** — reuses `recommendForElo()` from `js/levels.js`
   (acceptability window + human findability), so the move being
   explained is one this learner could realistically have found.
5. **Hanging pieces both ways** — computed from the position
   (`findHangingPieces`); below 1000 this is usually the whole lesson.

## UI (left sidebar)

- **Learner ELO slider** (400–2000, the range covered by the coaching
  research). It is two-way synced with the right panel's "Coach ELO":
  both express the same idea — the student's level.
- **"At this level you…"** — the band's `skills` bullets.
- **"Learning goals"** — the band's `goals` bullets.
- **Explanation field** — fills automatically with a rule-based,
  band-styled explanation (`localExplanation()`) as soon as the engine
  reaches review depth on the displayed position; updates when the
  position, the threat, or the slider changes. Works fully offline.
- **"✨ Personalized explanation"** — sends the per-ELO prompt to Claude
  through the local `serve.py` bridge and replaces the field's content
  with the answer; without a bridge (e.g. the GitHub Pages deployment)
  it opens claude.ai with the same prompt pre-filled.

## Worked example — same position, three learners

Position after 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nd4?! (the engine likes 4.Nxd4
and 4.Nxe5 is the famous trap bait):

- **500** (rules: no jargon, 1 move each side, piece safety only):
  *"The knight on d4 attacks your knight on f3. Your knight can just
  take it: Nxd4 wins a knight for free if they don't take back. Before
  you move: is your move safe, and is anything free to take?"*
- **1100** (2-move tactics, threat by name, one plan):
  *"Black's Nd4 looks scary but it's a trick: after 4.Nxe5? Qg5! forks
  g2 and the knight. Simply 4.Nxd4 exd4 keeps an extra central pawn and
  easy development. What's their best reply to your move? — always
  check before grabbing."*
- **1700** (plans, structures, full evals):
  *"4.Nxd4 exd4 (+0.9) concedes nothing: Black's 'attack' evaporates
  and the d4-pawn is weak long-term. Declining with 4.Nxe5 Qg5 5.Nxf7?
  Qxg2 collapses — the Blackburne–Shilling idea. Note the prophylactic
  point: Black *wants* you greedy; take the free tempo instead and
  play c3/d4 next."*

Same engine output, three different explanations — that's the feature.
