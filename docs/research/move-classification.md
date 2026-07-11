# Move classification — thresholds & the Brilliant/Great algorithms

*The three systems worth knowing, then a full open-source implementation.*

## 1. The three classification systems

| System | Basis | Rating-aware? | Source |
|---|---|---|---|
| Lichess | win-chances delta ≥ .1/.2/.3 → Inaccuracy/Mistake/Blunder | No (sigmoid handles won/lost saturation) | lila `Advice.scala` |
| Chess.com | expected-points-lost bands (Best 0 / Excellent ≤.02 / Good ≤.05 / Inaccuracy ≤.10 / Mistake ≤.20 / Blunder >.20) | **Yes** (EP curve conditioned on rating) | [help center](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc) |
| Ours | cp-loss tables, absolute or per-ELO-band | **Yes** (explicit tables) | [../relative-evaluation.md](../relative-evaluation.md) |

## 2. Full algorithm from open source (WintrCat's freechess)

[github.com/WintrCat/freechess](https://github.com/WintrCat/freechess)
(`src/lib/analysis.ts`) is an abandoned-but-readable MIT implementation of
chess.com-style Game Report. Verified logic, reusable when we build
Brilliant/Great/Miss:

### Base flow (per move, evals from mover's perspective)

```
if only one legal move            → FORCED
if move == engine top move        → BEST (candidate for upgrades below)
else if no mate involved          → first cp-classification whose
                                    threshold ≥ evalLoss (thresholds scale
                                    with how won/lost the position already is)
```

### Mate-transition special tables

```
cp → mate allowed (you blunder into a mating attack against you):
  eval after ≥ −2 pawns  → BLUNDER      // was fine, now getting mated
  eval after ≥ −5        → MISTAKE
  else                   → INACCURACY   // was lost anyway

mate → cp (you had forced mate and lost it):
  still ≥ +4.00  → GOOD
  still ≥ +1.50  → INACCURACY
  ≥ −1.00        → MISTAKE
  else           → BLUNDER

mate → mate (kept the mate): compares mate distance, EXCELLENT…GOOD range
```

### Brilliant (upgrade of BEST)

Conditions (all required):

```
classification == BEST
eval after move ≥ 0 (from mover's POV)            // not brilliant if still losing
NOT already "winning anyways"                     // no brilliants in dead-won positions
move is not a promotion ("=" not in SAN)
sacrifice scan: some own piece (not K, not P) is *hanging* after the move
               with value > captured piece's value
viability check: for each opponent capture of the hanging piece, either an
               equal/greater-value opponent piece hangs in return, or the
               capture runs into mate — otherwise revert to BEST
```

### Great (upgrade path)

```
no mate involved
classification != BRILLIANT
previous opponent move was a BLUNDER
gap between engine line 1 and line 2 ≥ 150 cp     // "only move" flavor
```

### Sanity overrides

```
BLUNDER downgraded to GOOD if position still ≥ +6.00 after the move
BLUNDER downgraded to GOOD if position was already ≤ −6.00 before
opening-book positions → BOOK
```

Known bugs to avoid repeating: promotions falsely flagged brilliant
([issue #13](https://github.com/WintrCat/freechess/issues/13)) — hence the
explicit promotion exclusion; successor project is
[WintrChess](https://github.com/wintrcat/wintrchess) (also open source).

## 3. Chess.com's stated Brilliant/Great semantics (recap)

- Brilliant = *good piece sacrifice*, best-or-nearly-best, not bad after,
  not already completely winning; **sacrifice definition more generous at
  lower rating**.
- Great = changed the game's outcome class (losing→equal, equal→winning) or
  the only good move; also rating-generous.
- Miss = failed to punish opponent's mistake; rating-dependent threshold.

## Implementation notes for this repo

1. **Sacrifice detection** = the crux. Plan: after the move, run our
   `findHangingPieces()` on the mover's own pieces (we already have attack
   maps via chess.js); "hanging" piece value > value captured by the move →
   sacrifice candidate; then the viability check via a 2-ply capture walk
   (chess.js `moves({verbose:true})` filtered to captures of that square).
   A proper SEE is nicer; the freechess approximation shipped and mostly works.
2. **Great**: we already run MultiPV 5 — the line1↔line2 gap and the
   previous-move badge are both in memory when we classify. ~20 lines.
3. **Miss**: previous opponent move classified Mistake/Blunder AND our reply
   gives back ≥ half of the swing (tuneable) → MISS instead of the band label.
4. **Rating-generosity** (chess.com's twist): scale the sacrifice minimum
   value and the only-move gap with the learner band — e.g. at <1000 a
   2-point sacrifice counts, at 2000+ require ≥ 3 points and a ≥ 200cp gap.
   Fits naturally next to `RELATIVE_BANDS` in `coach.js`.
5. Keep upgrades orthogonal: bands decide Good/Inaccuracy/…; Brilliant/Great
   only ever upgrade a BEST/near-BEST move, Miss only relabels a bad one.
