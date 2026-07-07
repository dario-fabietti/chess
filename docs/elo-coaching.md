# ELO-aware move suggestions — algorithm study

Goal: the coach should recommend and explain "the right move **for this
player**", not the engine's absolute best. A 700-rated player told to play a
quiet prophylactic rook shuffle learns nothing; the same player told "take
the free knight" learns everything they need. This document surveys the
approaches we considered and describes what the app implements.

## Options surveyed

### 1. Engine strength limiting (`Skill Level` / `UCI_LimitStrength` + `UCI_Elo`)
Stockfish can *play* at a target rating by randomly choosing among candidate
moves with an error model (Skill Level 0–20 maps to roughly 800–3200 Elo;
`UCI_Elo` is calibrated 1320–3190).

- ✅ Zero implementation cost (we already use Skill Level for the sparring
  opponent).
- ❌ Wrong tool for *coaching*: it models the mistakes a player makes, not
  the moves a player should aim for. Its choices are stochastic and often
  simply bad, with no notion of "instructive".

### 2. Depth/node-limited search
Search to depth 4–6 to approximate what a club player calculates.

- ✅ Trivial to run (`go depth 5`), deterministic-ish.
- ❌ Shallow-search artifacts: the "best move at depth 4" is frequently an
  anti-positional move a human coach would never teach; horizon effects
  produce outright blunders that don't correlate with human play.

### 3. Full-strength MultiPV + rating window + human-findability features ✅ (implemented)
Analyze at full strength with `MultiPV 5`. Then:

1. **Acceptability window** — a rating-dependent budget of evaluation loss
   versus the engine-best move. Implemented in `js/levels.js` as a smooth
   decay from ~300 cp at 600 Elo to ~15 cp at 2600:
   `windowCp(elo) = 15 + 285 · (1 − t)^1.8`, `t = (elo − 600)/2000`.
   The idea follows the average centipawn-loss statistics by rating bracket
   observed in large game databases (beginners average multi-pawn errors per
   move; masters average well under 0.2).
2. **Findability scoring** — every candidate inside the window is annotated
   with human-relevant features computed from the rules library (chess.js):
   captures (extra weight if the captured piece is undefended), checks and
   checkmates, castling, minor-piece development, central pawn play, quiet
   queen moves (small malus). The coach recommends the candidate maximizing
   `simplicity·w − 0.5·rank − deltaCp/100` where `w = windowCp(elo)/300`, so
   findability dominates for beginners and fades to zero for experts — the
   recommendation converges to the engine move as the rating rises.

- ✅ Deterministic, explainable, no extra downloads, reuses the analysis the
  app already runs continuously; the feature annotations double as material
  for the LLM's explanation.
- ❌ Heuristic: "findability" is approximated by move-type features, not by
  a model of human perception. Long-term plans that require a subtle first
  move are still recommended to beginners if nothing simpler is acceptable.

### 4. Maia-style human-move models (future work)
[Maia](https://maiachess.com/) trains a policy network per rating bucket
(maia-1100 … maia-1900) to predict the move a human of that rating would
actually play (~50%+ accuracy). This is the gold standard for modeling human
play at a level.

- ✅ Actual human-behavior model rather than heuristics.
- ❌ Each bucket is a separate Leela-format network requiring an lc0 runtime;
  a WASM lc0 + several nets would add tens of MB and significant complexity.
  Worth revisiting if this prototype grows into a product. A middle ground is
  Stockfish's own `UCI_Elo` search used *only* to rank findability, keeping
  eval truth from the full-strength search.

### 5. Letting the LLM pick the move
Send all five lines to Claude and let it choose what to recommend for the
rating.

- ✅ Zero algorithm code.
- ❌ Unreliable: LLMs mis-evaluate chess positions; the recommendation should
  be grounded before the LLM writes prose. We keep the LLM in the "explain"
  role and hand it a pre-computed recommendation.

## How the pieces fit together

```
analyzer (Stockfish, MultiPV 5, full strength)
        │  five lines with evals
        ▼
annotateCandidates(fen, lines)     js/levels.js — features + Δcp per line
        ▼
recommendForElo(candidates, elo)   acceptability window + findability score
        ▼
buildCoachPrompt(facts)            js/llm.js — audience profile by rating band
        ▼                          (vocabulary, concepts, variation depth)
Claude (local bridge or claude.ai) explains, coaching toward the recommendation
```

The same `recommendForElo` drives the in-app **Hint** button, so hints and
LLM explanations always agree. The **Coach ELO** slider (600–2600, persisted
in localStorage) sets the rating for both.

## Rating bands used for explanation style

| Band      | Audience              | Explanation style |
|-----------|-----------------------|-------------------|
| < 1000    | beginner              | hanging pieces, simple captures/checks, opening principles; no jargon, 1-move lines |
| 1000–1399 | developing club player| basic tactics (forks/pins/skewers), activity, king safety; 2–3 move lines |
| 1400–1799 | club player           | plans, weak squares, pawn breaks, trades, simple endgames |
| 1800–2199 | advanced tournament   | structures, prophylaxis, concrete justifications |
| ≥ 2200    | expert                | engine-level nuance, exact move orders |
