# Puzzle generation, tagging & training loops

*How Lichess builds its 4M-puzzle CC0 database, and the lightweight
version of that pipeline for personal puzzles in this app.*

## 1. lichess-puzzler generator — verbatim criteria

Source: [ornicar/lichess-puzzler](https://github.com/ornicar/lichess-puzzler)
(`generator/generator.py`), which mines Lichess games:

**Candidate detection** (position right after an opponent mistake):

```
mate puzzles:      score > Mate(15)  ("mate_soon")
advantage puzzles: score ≥ Cp(200)
                   AND win_chances(score) > win_chances(prev_score) + 0.6
    where win_chances(cp) = 2/(1 + e^(−0.004·cp)) − 1        # [−1, +1]
rejections:        prev_score already > Cp(300)               # was already won
                   side already up in material
                   score < Cp(400) unless recovering material deficit
                   fewer than 2 legal moves
```

**Solution line ("cooking")**:

```
walk the PV; each solver move must be effectively forced:
    is_valid_attack: second-best move is None
                     OR win_chances(best) > win_chances(second) + 0.7
                     OR mate-in-one equivalence
solution must end on the solver's move (odd length after trimming)
minimum 2 plies of solution
```

**Engine budget** (server-grade; scale down locally): candidate pair
analysis at depth 50 / 30s / 25M nodes; mate-defense verification at
depth 15 / 10s / 8M nodes.

## 2. Theme tagging (`tagger/cook.py`)

40+ tags assigned post-generation
([deepwiki overview](https://deepwiki.com/ornicar/lichess-puzzler/3-puzzle-tagging-system)).
Representative detectors, all implementable with chess.js attack maps:

- `fork()` — a moved piece attacks ≥2 valuable targets simultaneously
- `pin()/skewer()` — line-piece geometry through two enemy pieces
- `sacrifice()` — material given up within the solution line for the win
- `hangingPiece()` — undefended capture as the key move
- mate patterns — final-position geometry (back-rank, smothered, …)
- `zugzwang()` — only tag needing extra engine evals (null-move comparison)
- phase/length meta-tags: opening/middlegame/endgame, short/long, oneMove

## 3. The CC0 database (skip generation entirely for canned puzzles)

[database.lichess.org/#puzzles](https://database.lichess.org/#puzzles) —
single CSV, columns:

```
PuzzleId, FEN, Moves(UCI, first move is opponent's), Rating, RatingDeviation,
Popularity, NbPlays, Themes(space-separated), GameUrl, OpeningTags
```

Bundle a filtered subset (e.g. Popularity > 70, plays > 100, rating
400–2200, ~20–50k rows ≈ few MB gzipped) → rated/custom/rush modes offline.

## 4. Personal puzzles from the user's own games (the differentiator)

Pipeline mirroring the generator at local scale, using data our review
pipeline already produces:

```
1. candidate: any ply we classified Mistake/Blunder (opponent's or user's
   missed win = Miss) — we have fenBefore, evals, best line cached
2. verify at depth ~20 (one-off, background): eval swing ≥ 200cp equivalent
   in win_chances (+0.6 rule), position not already won (prev ≤ Cp 300)
3. uniqueness: MultiPV-2 gap ≥ 0.7 win_chances on every solver move; trim
   to odd length; discard if solution < 2 plies
4. tag with the cook.py-style detectors we can port cheaply
   (fork/pin/hanging/mate patterns)
5. store {fen, moves, themes, sourceGame, failCount} in localStorage/IndexedDB
```

## 5. Training loop (Chessable-style spaced repetition)

[MoveTrainer](https://support.chessable.com/en/articles/9043598-how-does-the-spaced-repetition-scheduling-work):
first review due **4h** after learning, then **~19h**, then ever-growing
intervals; **any failure resets the item to the start of the ladder**.
Noctie's variant: auto-generated flashcards from each game's biggest
mistakes ([noctie.ai](https://noctie.ai/faq/)).

Ours: `intervals = [4h, 19h, 3d, 1w, 1m, 4m]` per puzzle, `failCount`
resets to step 0 — a dozen lines over the store from §4, surfaced as a
"Daily review" queue on the home panel.

## Implementation notes for this repo

- Depth budget: our single-threaded WASM does ~1s per depth-16–18 eval;
  verification of a candidate (≤10 plies × 2 evals) ≈ 30s background work
  per game — run it after game end, not live.
- The win_chances constants here (0.004 / +0.6 / +0.7) are the *puzzle*
  scale — don't reuse the accuracy constant 0.00368208 (see
  [win-probability-accuracy.md](win-probability-accuracy.md)).
- Claude's role: explain the solved/failed puzzle from engine facts, and
  name the theme in learner-band language ([docs/coaching](../coaching/README.md)).
