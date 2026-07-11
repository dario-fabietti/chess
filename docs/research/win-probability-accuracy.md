# Win probability & accuracy — exact formulas

## 1. Centipawns → win probability

### Lichess production formula (the one to use)

From [lichess.org/page/accuracy](https://lichess.org/page/accuracy), fitted
by logistic regression on real games of ~2300-rated players:

```
Win% = 50 + 50 · (2 / (1 + e^(−0.00368208 · cp)) − 1)        // cp from mover's POV
```

- Equivalent form: `Win% = 50 + 50·tanh(0.00184104·cp)`.
- Mate scores: treated as cp = ±(huge) → Win% saturates to 0/100.
- Useful derivative at equality: ≈ 0.092 %/cp (≈ 9.2% per pawn).

### Lichess puzzle-generator variant

[lichess-puzzler](https://github.com/ornicar/lichess-puzzler) uses a
slightly steeper constant on a [−1, +1] scale:

```
winning_chances = 2 / (1 + e^(−0.004 · cp)) − 1
```

Both exist in the lichess codebase for different purposes; don't mix the
constants within one feature.

### Fischer/Kannan logistic (computer-game fit, 2007)

From [chessprogramming wiki](https://www.chessprogramming.org/Pawn_Advantage,_Win_Percentage,_and_Elo),
fitted on 405k computer games, `P` = pawn advantage:

```
W(P) = 1 / (1 + 10^(−P/K))          with K = 4
P(W) = K · log10(W / (1 − W))
```

Model equivalence with the Elo expected-score curve (`E = 1/(1+10^(−R/400))`)
gives **R ≈ 100·P Elo per pawn** near equality under K=4; other empirical
fits report the *first* pawn worth ≈ 190 Elo
([win-vector](https://win-vector.com/2026/02/19/what-is-a-centipawn-advantage/)).
Rating-conditioned curves (what chess.com's Expected Points does) flatten
for weaker pools — see [../relative-evaluation.md](../relative-evaluation.md).

## 2. Lichess accuracy (source-level, from `AccuracyPercent.scala`)

Verbatim from [lila](https://github.com/lichess-org/lila) (modules/analyse):

```scala
def fromWinPercents(before: WinPercent, after: WinPercent): AccuracyPercent =
  if after.value >= before.value then 100d
  else
    val winDiff = before.value - after.value
    val raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * winDiff)
              + -3.166924740191411
    (raw + 1).atMost(100).atLeast(0)   // +1 uncertainty bonus, clamp [0,100]
```

**Game accuracy** (per color) — not a plain average:

```scala
// window size: moves/10, clamped to [2, 8]
val windowSize = (cps.size / 10).squeeze(2, 8)
// sliding windows over ALL win% values (both colors' moves)
// weight per move = stdev of its window's win%, clamped to [0.5, 12]   ("volatility")
// gameAccuracy(color) = (weightedMean(moveAccs, weights) + harmonicMean(moveAccs)) / 2
```

Interpretation: volatile phases (sharp positions) count more; the harmonic
mean punishes single terrible moves; the average of the two balances it.

## 3. Move judgement thresholds (Lichess `Advice.scala`)

Winning-chances delta (0..1 scale), from the lila source
([forum confirmation](https://lichess.org/forum/general-chess-discussion/what-constitutes-an-inaccuracy)):

```scala
private val winningChanceJudgements = List(
  .3 -> Blunder,
  .2 -> Mistake,
  .1 -> Inaccuracy)
```

Notes: judged from the mover's perspective; positions already hopeless/won
produce small win%-deltas by construction (the sigmoid saturates), which is
how Lichess avoids flagging "errors" in dead-won games without any special
casing.

## 4. Chess.com CAPS/CAPS2 — what is known

- **CAPS1 (2017)**: aggregated top-move match rate, inaccuracy/blunder
  counts, "patterns of strength". **CAPS2 (2021+)**: same inputs, new math;
  deliberately re-centered (~most scores 50–95, mass around 80, "school
  grading"); smoothing for mate-distance; reduced penalty for repeated
  blunders; **engine depth varies by player rating**, so scores aren't
  cross-comparable. Proprietary.
  ([help center](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined),
  [saychess analysis](https://saychess.substack.com/p/what-chess-players-need-to-know-about))
- **Community reverse-engineering** (rating ↔ accuracy regressions from
  large samples, treat as rough,
  [chess.com forum](https://www.chess.com/forum/view/help-support/caps-conversions)):

```
Elo ≈ 60.2 · CAPS − 3375                                   (linear fit)
Elo ≈ 2.05 + 12.9·Acc − 0.256·Acc² + 0.00401·Acc³           (cubic fit)
```

## 5. ACPL ↔ Elo (recap)

Community regression on Lichess data (see
[../relative-evaluation.md](../relative-evaluation.md) for full sourcing):

```
Elo ≈ 3100 · e^(−0.01 · ACPL)      ⇔      ACPL(elo) = 100 · ln(3100/elo)
```

## Implementation notes for this repo

1. **Per-move accuracy + game accuracy**: implement the Lichess formulas
   exactly (constants above); we already cache per-fen evals — store win%
   alongside and the Game Report gets accuracy for free.
2. **Keep our two scales separate**: classification uses cp-loss tables
   (absolute or ELO-relative); accuracy uses win%-loss. They answer
   different questions ("how bad was that?" vs "how precise was the game?").
3. If we ever want a chess.com-flavored number: rescale Lichess accuracy
   toward the 80-centered distribution and label it clearly as cosmetic.
4. Unit tests: symmetric cases (win% 50→50 = 100%), the 10/20/30 judgement
   boundaries, harmonic-mean sensitivity to one blunder.
