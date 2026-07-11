# Game Review, CAPS2 accuracy & move classifications

*How chess.com's flagship learning feature works, and how to replicate it.
Paywall: 1 review/day free; unlimited at Platinum; coach explanations at
Diamond.*

## 1. The Expected Points Model (the core)

Everything in Game Review hangs off **Expected Points**: the likely game
outcome (1.00 = certain win, 0.50 = even, 0.00 = certain loss) estimated
from **the engine evaluation AND the player's rating**
([source](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)).
A move is judged by how much expected points it lost — which is why the same
centipawn drop is judged more kindly at 600 than at 2100. (Our
[ELO-relative evaluation](../relative-evaluation.md) implements the same
idea with per-band centipawn tables.)

Classification bands (expected points lost):

| Class | Range |
|---|---|
| Best | 0.00 |
| Excellent | 0.00–0.02 |
| Good | 0.02–0.05 |
| Inaccuracy | 0.05–0.10 |
| Mistake | 0.10–0.20 |
| Blunder | 0.20–1.00 |

## 2. Special classifications (beyond the bands)

- **Brilliant (!!)** — "when you find a good piece sacrifice." All stated
  conditions: the move must be the best or nearly-best move; you must not be
  in a bad position after it; you must not already be completely winning
  without it; sacrifice detection is **more generous for lower-rated
  players**.
- **Great (!)** — "critical to the outcome": turns a losing position equal,
  or an equal one winning, or is the **only good move** in the position.
  Also rating-generous for newer players.
- **Miss (X)** — failing to capitalize on the opponent's mistake (e.g. not
  punishing a blunder, missing a winning tactic). Threshold varies by rating.
- **Book (📖)** — a move still inside established opening theory; classified
  before the eval-based bands apply.

### Replication notes

- *Bands*: done in this repo (with the Excellent category and ELO-relative
  tables).
- *Book*: bundle a compact ECO/opening TSV (Lichess publishes
  [openings data, CC0](https://github.com/lichess-org/chess-openings)); tag
  moves while the position is still in the table.
- *Great*: with MultiPV ≥ 2 we already have the data — flag when line 1 is
  fine and line 2 falls off a cliff (only-move), or when the eval crosses
  from losing→equal / equal→winning bands.
- *Brilliant*: hardest. Needs sacrifice detection: the moved (or left-hanging)
  piece can be captured with material loss for us on the best capture
  sequence (a Static Exchange Evaluation), and yet the engine keeps the eval
  ≥ nearly-best. Approximate SEE with chess.js legal-move walks, or detect
  "material down over the next N plies of the PV while eval stays winning".
- *Miss*: previous opponent move classified mistake/blunder + our reply loses
  most of the swing back. Both numbers are in our review pipeline already.

## 3. CAPS2 accuracy score

What chess.com discloses ([help center](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined),
[saychess deep-dive](https://saychess.substack.com/p/what-chess-players-need-to-know-about)):

- Measures closeness to "best possible play against your opponent's specific
  moves"; roughly an average over per-move scores derived from the
  classifications.
- Deliberately re-tuned ("school test grading"): most scores land ~50–95,
  centered near 80, so casual players aren't discouraged.
- Smoothing: adjusts for mate-distance, reduces the penalty for repeated
  blunders in lost positions.
- **Engine depth varies with player rating and settings**, so scores are not
  comparable across players — and the exact formula is proprietary.

### Replication: use the Lichess formula instead

Lichess publishes everything ([accuracy page](https://lichess.org/page/accuracy)):

```
Win%      = 50 + 50 · (2 / (1 + e^(−0.00368208·cp)) − 1)
MoveAcc%  = 103.1668 · e^(−0.04354·(Win%_before − Win%_after)) − 3.1669
GameAcc%  = mean(volatility-weighted mean, harmonic mean) of move accuracies
```

We already store per-ply evals; this is an afternoon of work and gives a
consistent, explainable number. If we want chess.com-like "friendlier"
scores, rescale the output — but document it.

## 4. Game Review UX pieces

([how it works](https://support.chess.com/en/articles/8584089-how-does-game-review-work),
[Game Report announcement](https://www.chess.com/blog/News/meet-the-new-analysis-game-report-retry-mistakes-more))

- **Game graph** — advantage plot over the whole game; clickable.
- **Key moments** — the coach walks through: last book move, brilliants,
  worst moves, missed tactics.
- **Retry mistakes** — replay the position of each mistake, guess again,
  coach feedback on the attempt; shows "what your accuracy would have been."
- **Coach explanations (Diamond)** — templated natural-language text per
  move: names the pieces and threats, says *why* a move is good/bad, and
  highlights arrows/squares when you hover the highlighted words.
- **Master games in this position** — related master games listed from the
  position (see [openings-explorer.md](openings-explorer.md)).

### Replication notes

- *Graph*: trivial (evals already cached per fen).
- *Key moments / Retry*: state machine over our badges map; "retry" = load
  fenBefore, compare the user's try to engine best / good thresholds.
- *Explanations*: chess.com's are **templates**, not an LLM — our
  `coach.js` seam does the same, and the Claude bridge already goes beyond
  it. The arrows-on-hover trick: our board API (`setAutoShapes`) supports
  this today; we'd emit shape lists alongside coach text.
- *Whole-game batch analysis*: iterate plies through the analyzer at fixed
  depth (e.g. 16–18) while showing progress; single-threaded WASM will take
  ~1–2 s/ply — acceptable for a "Game Report" button, and the COOP/COEP
  multithreaded build is the upgrade path.
