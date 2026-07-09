# ELO-relative move evaluation — research & thresholds

*Experimental branch `experiment/elo-relative-eval`. Research date: July 2026.*

The baseline coach classifies moves on an **absolute** centipawn-loss (CPL)
scale (≤10 best, ≤40 good, ≤90 inaccuracy, ≤200 mistake, else blunder —
"popular site" thresholds). This document derives an **ELO-relative** scale:
the same 300 cp loss that is a blunder for a 2000-rated player can be a
perfectly normal move in a 400-rated game.

## 1. What the major platforms do

**Lichess** does *not* rate-adjust. It converts engine evals to winning
chances with a logistic curve fitted on games of **2300-rated** players —
`Win% = 50 + 50 · (2 / (1 + e^(−0.00368208·cp)) − 1)` — and classifies on
win-probability loss (≥10% inaccuracy, ≥20% mistake, ≥30% blunder; legacy
raw-CPL cutoffs were 50/100/300). See the [Lichess accuracy
page](https://lichess.org/page/accuracy) and the [forum explanation of the
thresholds](https://lichess.org/forum/game-analysis/computer-analysis-inaccuracies-mistakes-blunders).

**Chess.com** *does* rate-adjust — this is the strongest precedent for our
feature. Their Game Review uses an **Expected Points Model**: winning chances
are estimated *"based on their rating and the engine evaluation"*, then moves
are classified by expected points lost
([help center](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)):

| Classification | Expected points lost |
|---|---|
| Best | 0.00 |
| **Excellent** | 0.00 – 0.02 |
| Good | 0.02 – 0.05 |
| Inaccuracy | 0.05 – 0.10 |
| Mistake | 0.10 – 0.20 |
| Blunder | 0.20 – 1.00 |

The rating-dependence lives inside the eval→expected-points curve: at low
ratings the curve is much flatter (a −300 position is far from lost when both
players hang pieces every few moves), so the same eval swing costs fewer
expected points. Chess.com also states it is *"more generous"* with special
labels (Brilliant/Great) for lower-rated players.

## 2. How big a "typical error" is at each rating

Empirical anchors for how average centipawn loss (ACPL) scales with rating:

- A widely-used regression from Lichess data:
  **Elo ≈ 3100 · e^(−0.01·ACPL)**, i.e. `ACPL(elo) = 100 · ln(3100/elo)`
  ([lichess forum: estimating Elo from ACPL](https://lichess.org/forum/general-chess-discussion/how-to-estimate-your-elo-for-a-game-using-acpl-and-what-it-realistically-means)).
  Reference points: GM (2500+) < 21.5 ACPL, master (2200) ≈ 34, expert
  (1800) ≈ 54, average club (1200) ≈ 95.
- A 22,000-game / 1.5M-move Lichess study confirms the negative ACPL↔Elo
  correlation with a smooth weighted trend
  ([Solis Gonzalez, Medium](https://medium.com/@enzo.leon/data-science-and-chess-centipawn-loss-elo-correlation-e06089efd8b8)).
- Ken Regan's **Intrinsic Performance Ratings** research shows a smooth,
  historically stable correspondence between per-move error and Elo — move
  quality alone predicts rating
  ([Regan & Haworth, AAAI 2011](https://cdn.aaai.org/ojs/7951/7951-13-11479-1-2-20201228.pdf),
  [IPR compendium](https://cse.buffalo.edu/~regan/papers/pdf/Reg12IPRs.pdf)).
- Typical game accuracy by band — beginner 50–70%, intermediate 65–80%,
  advanced 75–85%, expert 80–90%, master 85–95%
  ([chess.rodeo](https://chess.rodeo/blog/understanding-chess-accuracy)).

Evaluating `ACPL(elo) = 100·ln(3100/elo)` at our band midpoints:

| Band midpoint | 500 | 700 | 900 | 1100 | 1300 | 1500 | 1700 | 1900 | 2100 |
|---|---|---|---|---|---|---|---|---|---|
| typical ACPL | ~182 | ~149 | ~124 | ~104 | ~87 | ~73 | ~60 | ~49 | ~39 |

So the characteristic error of a ~500-rated player is **4–5× larger** than a
2000-rated player's. A fixed 200 cp blunder line therefore mislabels beginner
play: a [160k-game Lichess study](https://chessanalysis.co/research/blunder-curve-blunders-by-rating-level)
found that by the *fixed* definition ~75% of games at **every** band contain a
blunder, that at 400–600 the first blunder comes on average by move 16, and
that 46% of beginners' blunders happen in positions they had *already won*
(+6 or better) — i.e. on an absolute scale a beginner's move list is a wall
of red with no learning signal. (Related:
[kwojcicki's blitz analysis](https://kwojcicki.github.io/blog/CHESS-BLUNDERS)
found blunder counts fall with rating while "mistakes" stay roughly flat.)

## 3. The relative threshold table

Design rules, applied to each 200-point band and rounded to friendly numbers:

- **Excellent ≈ 0.5 × band ACPL** — clearly above your typical accuracy;
  mirrors chess.com's 0.02 expected-points band (~20–25 cp at master level).
- **Good ≈ 1.5–1.6 × band ACPL at the low end, tapering to ~1×** — a move
  around your band's typical error is *normal*, not an error. The taper
  reflects the heavier blunder tail at low ratings (the mean sits far above
  the median error).
- **Inaccuracy ≈ 2.8 × band ACPL, Mistake/Blunder line ≈ 4.8 × band ACPL** —
  tempered below pure ACPL proportionality at the bottom so that hanging a
  rook or queen still reads as a blunder even at 400 (real beginner games
  *are* decided by hung queens).
- **2000+ keeps the absolute thresholds** so the relative scale converges to
  the conventional one and the toggle is seamless for strong players.
- Two anchor requirements from the product owner: −300 cp at ~400 ELO ≈
  normal/good move; −300 cp at 2000 = blunder. Both hold (bold cells).

Centipawn loss, upper bound of each class:

| ELO band | Best | Excellent | Good | Inaccuracy | Mistake | Blunder |
|---|---|---|---|---|---|---|
| 400–600 | ≤ 25 | ≤ 100 | **≤ 300** | ≤ 500 | ≤ 800 | > 800 |
| 600–800 | ≤ 25 | ≤ 85 | ≤ 250 | ≤ 425 | ≤ 700 | > 700 |
| 800–1000 | ≤ 20 | ≤ 70 | ≤ 200 | ≤ 360 | ≤ 600 | > 600 |
| 1000–1200 | ≤ 20 | ≤ 60 | ≤ 160 | ≤ 300 | ≤ 500 | > 500 |
| 1200–1400 | ≤ 15 | ≤ 50 | ≤ 130 | ≤ 250 | ≤ 420 | > 420 |
| 1400–1600 | ≤ 15 | ≤ 40 | ≤ 105 | ≤ 210 | ≤ 350 | > 350 |
| 1600–1800 | ≤ 12 | ≤ 32 | ≤ 85 | ≤ 170 | ≤ 290 | > 290 |
| 1800–2000 | ≤ 10 | ≤ 25 | ≤ 60 | ≤ 125 | ≤ 240 | > 240 |
| 2000+ | ≤ 10 | ≤ 20 | ≤ 40 | ≤ 90 | **≤ 200** | > 200 |

The **absolute** scale gains the same Excellent category for parity:
≤10 best, ≤20 excellent, ≤40 good, ≤90 inaccuracy, ≤200 mistake, else
blunder.

Special cases (both modes):

- **Allowing a forced mate** stays a blunder at every rating — "you can lose
  on the spot from here" is exactly the signal a beginner needs, even if the
  opponent may not find it.
- **Missing a forced mate** counts as a mistake ("Missed win") only when the
  eval also dropped past the band's inaccuracy bound; a beginner who misses a
  mate-in-4 but keeps +8 is not scolded.

## 4. Implementation mapping

- `js/coach.js` — `ABSOLUTE_THRESHOLDS`, `RELATIVE_BANDS` (this table) and
  `thresholdsForElo(elo)`; `classifyMove()` takes optional `{elo, relative}`.
- The rating used is the **Learner ELO** slider (learning sidebar), the app's
  existing "who is the student" signal.
- The **"Relative to ELO"** checkbox in the settings toggles the mode;
  toggling (or moving the learner slider while enabled) re-classifies all
  badges of the current game retroactively.

## 5. Known limitations / future refinements

- **No win-probability saturation**: raw CPL over-penalizes swings inside
  already-won/lost positions (+9 → +6 is not an error in practice). The clean
  fix is classifying on rating-conditioned win-probability loss
  (chess.com-style); the per-band tables approximate this near equality.
- The ACPL↔Elo regression is a community fit on Lichess ratings (~FIDE +200
  at club level); good enough for band-level calibration, not for precision.
- No Brilliant / Great / Miss special labels yet; chess.com's rating-generous
  variants would slot naturally into the relative mode.
- Thresholds are a first calibration for this experiment — they live in one
  table in `js/coach.js` and are cheap to tune from playtesting feedback.
