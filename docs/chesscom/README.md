# Chess.com paid features → Claude Code replication map

*Research date: July 2026. Companion docs in this folder detail each area;
implementation-grade formulas, source-level algorithms and competitor
analysis live in [docs/research/](../research/README.md).*

- [game-review.md](game-review.md) — Game Review, CAPS2 accuracy, move classifications (Brilliant/Great/…)
- [lessons-learning.md](lessons-learning.md) — Lessons, guided learning path, Coach explanations, Play Coach
- [puzzles-practice.md](puzzles-practice.md) — Puzzles, Puzzle Rush/Battle, Drills, Endgames, Vision, Solo Chess
- [insights-analytics.md](insights-analytics.md) — Insights, Advanced Stats
- [openings-explorer.md](openings-explorer.md) — Opening Explorer, opening practice, master games

## The paywall at a glance

Per the [official membership matrix](https://support.chess.com/en/articles/8562418-what-does-each-level-of-premium-membership-get-me)
(2026 pricing ≈ $4.17 / $6.67 / $12.50 per month billed annually per
[raindropchess](https://www.raindropchess.com/should-you-pay-for-chesscom-diamond-membership-a-realistic-cost-benefit-analysis/)):

| Feature | Free | Gold | Platinum | Diamond |
|---|---|---|---|---|
| Puzzles | 3/day | unlimited | unlimited | unlimited |
| Puzzle Rush / Battle | 1/day each | unlimited | unlimited | unlimited |
| Lessons | 1/day | unlimited | unlimited | unlimited |
| Game Review | 1/day | 1/day | **unlimited** | unlimited |
| Coach (move) explanations | — | — | — | **✓** |
| Insights / Advanced Stats | — | — | — | **✓** |
| Opening Explorer | 4 moves deep | full depth | full | full |
| Endgames / Drills | first position only | all | all | all |
| Video library | — | ✓ | ✓ | ✓ |
| Play Coach (AI teaching opponent) | 1 game/month | unlimited | unlimited | unlimited |
| Bots | 20+ | 100+ | 100+ | 100+ |

## Replication map, ordered by feasibility ÷ complexity

Context: our stack is vanilla JS + chess.js + Stockfish 18 Lite WASM + a
Claude seam (local `claude -p` bridge / claude.ai hand-off). "Already built"
refers to this repo.

### Tier 0 — already built in this prototype

| Chess.com paid feature | Our equivalent |
|---|---|
| Unlimited game analysis (Platinum) | Continuous MultiPV analysis, eval bar, engine lines — free and local |
| Move classifications w/ chess.com icons | `classifyMove()` incl. Excellent, plus **ELO-relative mode they don't have** |
| Coach explanations (Diamond) | Claude explanations via local bridge / claude.ai hand-off |
| Play Coach hints & warnings | Hint button (ELO-aware), threat arrows, hanging-piece warnings |
| Unlimited bots at levels | Stockfish skill 0–20, 8 levels |
| Learner-level guidance | Learning sidebar with per-200-ELO band syllabus (docs/coaching) |

### Tier 1 — low complexity, high feasibility (days)

1. **Accuracy score per game** — chess.com's exact CAPS2 is proprietary, but
   Lichess publishes an [open formula](https://lichess.org/page/accuracy)
   (win%-based, harmonic/volatility-weighted mean). Engine data we already
   collect. → [game-review.md](game-review.md)
2. **Game graph (advantage over time)** — plot stored per-ply evals; we
   already snapshot them for move review.
3. **Key moments + Retry mistakes** — jump to plies classified mistake/blunder,
   restore the FEN, let the user find the better move, check against the
   engine's best. All ingredients exist.
4. **Book move detection** — small bundled ECO table; tag early moves "Book"
   before classification kicks in.
5. **Daily puzzle from your games** — store games locally, pick yesterday's
   worst blunder position as the puzzle.

### Tier 2 — medium complexity (weeks)

6. **Full Game Report** — one-click whole-game review: batch-evaluate every
   ply, per-player accuracy, classification counts, key moments narrative by
   Claude. Compute is the only cost (local Stockfish time).
7. **Puzzles at scale + rated + custom themes** — don't build 500k puzzles;
   Lichess's [CC0 puzzle database](https://database.lichess.org/#puzzles)
   (4M+ puzzles, rated, theme-tagged) can be bundled/subsetted. Glicko-lite
   rating for the user is simple math. Theme/rating filters = the paid
   "Custom Puzzles".
8. **Brilliant / Great / Miss detection** — needs sacrifice detection (SEE /
   material-after-capture-sequence) and only-move detection (MultiPV gap).
   Well understood, fiddly to tune. → [game-review.md](game-review.md)
9. **Insights dashboard** — store all games in IndexedDB, batch-analyze,
   aggregate: phase accuracy, top openings, found/missed forks-pins-mates,
   hanging pieces, castling stats, time-of-day. No server needed.
   → [insights-analytics.md](insights-analytics.md)
10. **Endgame trainer / Drills** — curated FEN sets (public domain theory
    positions) + play-out vs Stockfish + tablebase-style verdicts at low
    piece counts via engine depth.
11. **Opening Explorer** — bundle a stats book built from Lichess's open
    game database, or hit their free explorer API when online.
    → [openings-explorer.md](openings-explorer.md)

### Tier 3 — high complexity but feasible

12. **Guided lessons path** — chess.com has ~350 hand-authored lessons with
    videos. Replicable *differently*: Claude-generated interactive lessons
    from our per-ELO syllabus, with challenge positions validated by the
    engine. Content quality is the risk, not the tech.
    → [lessons-learning.md](lessons-learning.md)
13. **Play Coach (teaching opponent)** — sparring engine that talks: blend
    our threat detection + Claude commentary at critical moments + "are you
    sure?" interventions. Mostly orchestration work we've prototyped pieces of.
14. **Exact CAPS2 clone** — impossible to match exactly (proprietary,
    depth varies by rating, deliberately smoothed toward "school grades"
    per [saychess](https://saychess.substack.com/p/what-chess-players-need-to-know-about));
    approximating with the Lichess formula is the pragmatic call.

### Tier 4 — impractical to replicate

- **Video library** (GM-produced content — a licensing/production problem,
  not a software one; LLM lessons are the substitute)
- **Rating-range population comparisons** ("you vs other 1200s") — needs
  their player-base data; public Lichess aggregates are a partial stand-in
- **Community features** (tournaments, leagues, friends, cheat detection)
  — out of scope for a local coaching app

## Sources

- [Membership tiers matrix](https://support.chess.com/en/articles/8562418-what-does-each-level-of-premium-membership-get-me)
- [Move classifications](https://support.chess.com/en/articles/8572705-how-are-moves-classified-what-is-a-blunder-or-brilliant-etc)
- [How Game Review works](https://support.chess.com/en/articles/8584089-how-does-game-review-work)
- [Accuracy / CAPS2](https://support.chess.com/en/articles/8708970-how-is-accuracy-in-analysis-determined) · [saychess analysis](https://saychess.substack.com/p/what-chess-players-need-to-know-about)
- [Insights](https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com) · [Advanced Stats](https://www.chess.com/news/view/announcing-advanced-stats)
- [Lessons](https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com) · [Play Coach](https://www.chess.com/news/view/announcing-play-coach)
- [Puzzles](https://support.chess.com/en/articles/8608686-how-do-puzzles-work-on-chess-com)
- [Game Report / Retry](https://www.chess.com/blog/News/meet-the-new-analysis-game-report-retry-mistakes-more) · [Features guide](https://www.chess.com/article/view/chesscom-features)
