# Puzzles, Puzzle Rush/Battle, Drills, Endgames, Vision, Solo Chess

*Paywall: 3 puzzles/day free (Rush/Battle 1/day each); everything unlimited
from Gold. Endgames/Drills: first position only free.*

## 1. Rated puzzles

([how puzzles work](https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com))

- Pool of **500k+ puzzles**, each with its own rating.
- Solving is Elo-like: your **puzzle rating** goes up/down based on the
  puzzle's rating vs yours; the next puzzle is served near your level
  (adaptive difficulty).
- Puzzles are **theme-tagged** (fork, pin, mate-in-2, endgame type, …) and
  your per-theme averages are tracked, weakest themes surfaced first.

## 2. Custom Puzzles (the paid "Learning mode")

- Pick **themes** and a **rating range**; untimed; unrated.
- Can filter to "puzzles that tricked you in the past".

## 3. Puzzle Rush & Puzzle Battle

- **Rush**: 3 or 5 minutes (or survival), solve escalating puzzles, three
  strikes and it ends. Doesn't affect puzzle rating.
- **Battle**: the same, head-to-head vs another player, 3 minutes.

## 4. Daily Puzzle

One curated puzzle/day (free), with **explanations for premium**; 10+ years
of archive.

## 5. Practice modes

([features guide](https://www.chess.com/article/view/chesscom-features))

- **Drills**: play out set positions vs the engine (all unlocked from Gold).
- **Endgames**: theory positions by category (K+P, rook endings, …); free
  users get the first position of each section only.
- **Vision trainer**: coordinates/notation speed drills (name the square,
  find the piece). Free.
- **Solo Chess**: capture-only solitaire puzzles. Free.
- **Master Games / Openings practice**: play the engine *from* classic-game
  or opening positions ("play as Capablanca / Morphy / Carlsen").

## Replication

The single most important fact: **Lichess publishes an open CC0 puzzle
database** — 4M+ rated, theme-tagged puzzles
([database.lichess.org](https://database.lichess.org/#puzzles)). That
removes the content moat entirely. Plan:

1. **Bundle a subset** (e.g. 20–50k spread across ratings/themes; a few MB
   compressed CSV) or lazy-load shards. Each row: FEN, moves, rating, themes.
2. **Rated mode**: serve puzzles ±100 of user's puzzle rating; simple
   Elo/Glicko-lite update on solve/fail. localStorage persistence.
3. **Custom mode**: theme + rating-range filters over the same data;
   "puzzles that tricked you" = failed-puzzle log, replayed.
4. **Rush**: same pool sorted by rating ascending, 3-strikes timer loop —
   pure UI work.
5. **Puzzles from your own games** (chess.com's Game Review "missed tactic"
   + Aimchess-style): our review pipeline already flags Miss/Blunder plies;
   store them, verify a unique winning line with the engine (single best
   move by ≥150cp margin), and serve them back as personal puzzles. This is
   *better* than canned puzzles for retention and is fully local.
6. **Endgames/Drills**: curated FEN lists are public-domain theory
   (Lucena, Philidor, K+P wins/draws…); play-out vs sparring engine with a
   goal checker (win/draw detection via game state + eval). Vision/Solo
   Chess are small standalone UI games — trivial but low priority for a
   coaching-focused app.
7. **Daily puzzle + explanation**: pick from the bundled pool by date hash;
   the explanation is our Claude coach fed the solution line (engine ground
   truth), not a hand-written text.

Puzzle *generation* from scratch (mining tactics out of arbitrary games with
the engine) is also feasible offline — that's how Lichess built the database
— but pointless while the CC0 set exists.
