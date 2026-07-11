# Insights & Advanced Stats (Diamond-only analytics)

*The most tightly paywalled learning feature: Diamond only.*

## 1. What Insights shows

([official](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com),
[ChessGoals walkthrough](https://chessgoals.com/chess-com-insights/))

- **Results & rating**: W/L/D trends, accuracy over time.
- **Game phases**: how well you play opening vs middlegame vs endgame
  (accuracy per phase).
- **Openings**: your 10 most-played openings, frequency + score in each
  (plus a dedicated [Opening Insights](https://www.chess.com/news/view/announcing-opening-insights) view).
- **Tactics**: Found vs **Missed** forks, pins, mates; pieces *you* left
  hanging and pieces your opponent left hanging (and whether they were
  punished).
- **Castling**: results split by when/whether you castled.
- **Time**: performance by time of day and day of week (profile timezone).
- **Geography**: map of opponents' countries.

## 2. Advanced Stats

([announcement](https://www.chess.com/news/view/announcing-advanced-stats))

- Relive every **Brilliant move** you've played (chess.com/brilliant).
- Breakdown of openings/tactics/strategy/endgames **by time control**.
- **Comparison against members in your rating range** ("what to train next").

## 3. Replication

Architecture: everything is derivable from (a) a local store of your games
and (b) batch engine analysis — no server required.

1. **Game store**: IndexedDB of PGNs (imported from chess.com/Lichess via
   their free APIs, or played in-app). Both sites export full history free —
   ironically chess.com charges to *analyze* games it gives away raw.
2. **Batch analysis worker**: run each game through Stockfish at fixed depth
   overnight-style (a progress queue; ~1–3 min/game single-threaded, and
   games persist so it's one-time per game).
3. **Derived metrics** (all from data we already produce per move):
   - per-phase accuracy: split plies by phase (opening = book/first N moves,
     endgame = ≤ X pieces or no queens heuristic), average move accuracy;
   - openings table: first book-matched line (ECO from the CC0 openings
     table) → group + score;
   - found/missed tactics: our Miss/Blunder classifications + motif tagging
     (fork/pin/skewer detectable with chess.js attack maps — we already do
     hanging-piece detection in `findHangingPieces()`);
   - hanging pieces left/punished: same scan, aggregated;
   - castling/time-of-day splits: trivial PGN metadata group-bys.
4. **Brilliant-move gallery**: once Brilliant detection lands
   (see [game-review.md](game-review.md)), it's a saved-positions list.
5. **Dashboard UI**: one static page of charts (SVG, no deps) reading the
   local store.

**Not replicable**: "compare to your rating range" needs chess.com's
population data. Partial substitute: Lichess publishes open rating
distributions and per-rating averages, or simply show the user's own trend
lines instead of peer percentiles.

**Claude angle** (beyond chess.com): feed the aggregated insight JSON to the
Claude coach for a narrative training plan ("your endgame accuracy drops 12
points in rook endings; here are three drills") — chess.com's Insights
displays data but doesn't coach from it.
