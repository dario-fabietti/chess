# Lessons, guided path, Coach explanations & Play Coach

*Paywall: 1 lesson/day free; unlimited lessons at Gold. Coach explanations
Diamond-only. Play Coach: 1 game/month free, unlimited from Gold.*

## 1. Lessons & the guided path

Structure ([how lessons work](https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com),
[lessons page](https://www.chess.com/lessons)):

- Four skill levels: **New to Chess → Beginner → Intermediate → Advanced**
  (color-coded path; the guided "New to Chess" guide targets up to ~1200).
- Hierarchy: level → **courses** → **lessons** → each lesson =
  **instructional video + interactive challenges** (positions you must play
  correctly; wrong tries get hints/feedback).
- **Lesson Library**: 350+ lessons, browsable by topic (openings, strategy,
  tactics, endgames, master games), filterable by level, theme, instructor.
- Free tier: one lesson/day + the New to Chess section.

### Replication path

The tech is easy; the content is the moat. Chess.com's lessons are
hand-authored by titled players with studio videos — that part isn't
replicable. What Claude Code *can* do:

1. **Curriculum skeleton**: we already wrote per-200-ELO-band syllabi
   (docs/coaching/*, docs/elo-coaching.md) — that's the course/lesson
   outline layer.
2. **Interactive challenges**: a lesson = intro text (Claude-written, from
   the band's syllabus topic) + a set of challenge FENs with target moves.
   Validation = chess.js legality + engine agreement (target move within
   X cp of best). The retry/hint loop is the same machinery as Game Review's
   "Retry mistakes".
3. **Generation pipeline**: `claude -p` with a topic + band → lesson JSON
   (intro, positions, coaching lines per wrong answer), engine-verified
   offline, committed as static content. Bad generations get caught by the
   verifier (target move must actually be best/good).
4. **Progress tracking**: localStorage per lesson/challenge → the colored
   path UI is just CSS.

Videos: substitute animated board playthroughs (we can script the board to
replay PVs with coach text) — arguably better for a local app.

## 2. Coach explanations (Diamond)

What they are ([Game Review v2](https://www.chess.com/news/view/chesscom-launches-game-review-v2)):
templated text per move that names pieces and threats ("this loses material",
"misses a chance to damage the pawn structure"), plus **interactive arrows —
hovering highlighted words draws arrows/squares on the board**.

Replication: our `coach.js` already produces templated per-class comments and
the Claude bridge produces real explanations grounded in engine facts (a
capability chess.com's templates don't have). The missing piece is the
hover-to-arrows affordance:

- Coach messages carry optional `{text, shapes[]}` spans;
- rendering wraps those spans in `<span data-shapes=…>`;
- hover/click calls `board.setAutoShapes()` — API exists today.

## 3. Play Coach — the teaching opponent

([announcement](https://www.chess.com/news/view/announcing-play-coach))

- An AI opponent that **plays at your level** and teaches *during* the game;
- points out critical moments ("your piece is attacked");
- a **Hint button** that states the goal or highlights pieces;
- unlimited games from Gold, one/month free.

Replication: we have every ingredient —

| Play Coach behavior | Our building block |
|---|---|
| plays at your level | sparring engine, skill 0–20 (Maia-style human moves = future) |
| warns at critical moments | threat detection (null-move search) + hanging-piece scan |
| hint on demand | ELO-aware `recommendForElo()` hint button |
| explains after the game | move review pipeline + Claude |

The remaining work is *orchestration*: an opt-in "teaching mode" during play
vs engine that (a) interjects before you move when your intended piece is
hanging (needs a "are you sure?" pre-move check), (b) pauses after
mistakes to offer an immediate retry instead of only reviewing afterwards.
That interrupt-driven flow is the one genuinely new mechanic.

## 4. Video library (Gold+)

Thousands of titled-player videos. Not replicable (content licensing) and
not worth imitating in a local app; the substitute is scripted interactive
walkthroughs + Claude narration, generated per user level on demand.
