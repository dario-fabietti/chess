# Competitor analysis — products with similar approaches or outcomes

*Who already does what we're building, how, at what price, and what to take
from each. Research date: July 2026.*

## 1. The map

| Product | Core approach | Price | Closest overlap with us |
|---|---|---|---|
| [Aimchess](https://aimchess.com/) | Import your games → statistical weakness reports → targeted trainers | ~$14/mo (Pro), ~$99/yr | Insights + personal training queue |
| [DecodeChess](https://decodechess.com/) | "Explainable AI": natural-language *why* behind engine moves | freemium | Our Claude coach |
| [Chessable](https://www.chessable.com/) | Spaced-repetition MoveTrainer over authored courses | free + course purchases | Lessons, repertoire drill |
| [Noctie](https://noctie.ai/) | Human-like AI sparring + graded moves + auto flashcards | freemium sub | Play Coach, human-like levels |
| [WintrChess](https://github.com/wintrcat/wintrchess) (ex-freechess) | Free open-source chess.com-style Game Report | free, MIT-ish | Game Report (code reference!) |
| Lichess | Everything free/open-source, server Stockfish, studies, puzzles | free | The entire baseline + data source |
| Aggregator dashboards ([chess.rodeo](https://chess.rodeo/), [Lumichess](https://lumichess.com/insights), [Chessigma](https://www.chessigma.com/)) | Free stats dashboards over chess.com/Lichess APIs | free/freemium | Insights-lite |

## 2. Deep dives

### Aimchess — the analytics benchmark

([review](https://checkmatex.app/blog/aimchess-review-2026-is-it-worth-it),
[chess.com review](https://www.chess.com/blog/SheldonOfOsaka/aimchess-a-review))

- Imports last ~40+ games from chess.com/Lichess APIs (no play surface of
  its own). Produces reports: blunder rate, time management, opening leaks,
  endgame conversion, advantage capitalization.
- **Named trainers map 1:1 to detected weaknesses**: Blunder Preventer,
  Advantage Capitalization, Defender, Opening Improver, 360 Trainer —
  each serves puzzles *generated from your own games*.
- Free tier ≈ single-game analysis; the aggregated reports are the paywall.
- Reviewers' consensus: most valuable at 1600+, 50+ games/month.
- **Take**: the report→trainer loop is the retention mechanic; our Insights
  plan (docs/chesscom/insights-analytics.md) should ship with at least one
  matching trainer per stat, or the stats are trivia.

### DecodeChess — the explanation cautionary tale

([site](https://decodechess.com/), [reviews](https://opentools.ai/tools/decode-chess-ai-chess-coach))

- Pre-LLM "XAI" pipeline: decomposes a position into threats, plans, piece
  roles, relevant concepts; renders templated rich-text explanations of the
  engine's choice. Conceptually exactly our Claude coach.
- Reality per reviews: strong idea, **chronically buggy execution** (stalled
  analyses, import failures); no aggregated reports; shallower engine than
  rivals. Traffic well below Aimchess.
- **Take**: demand for "why" is validated; execution reliability is the
  differentiator, and an LLM grounded in engine facts (our design) is both
  simpler and more flexible than their bespoke XAI — but must stay honest
  (never let the LLM calculate).

### Chessable — the memory system

([spaced repetition docs](https://support.chessable.com/en/articles/9043598-how-does-the-spaced-repetition-scheduling-work))

- MoveTrainer = per-move flashcards inside courses: first review at 4h,
  then ~19h, then growing intervals; failure resets the ladder. Optional
  schedule presets tune the aggressiveness.
- Moat = the authored course marketplace (GM repertoires), not the algorithm
  — the algorithm is a weekend of work.
- **Take**: reuse the interval ladder for personal puzzles and repertoire
  lines (docs/research/puzzle-generation.md §5); don't compete on content.

### Noctie — human-like sparring done as a product

([FAQ](https://noctie.ai/faq/), [sparring positions](https://noctie.ai/chess/creating-sparring-positions-in-noctie/))

- Proprietary human-behavior model ("billions of games"); plays at a chosen
  level with human-like errors/timing; **grades your moves by human
  plausibility** (color scale) rather than centipawns; builds flashcards
  from your worst mistakes automatically; supports custom sparring
  positions.
- **Take**: (a) their grading axis (human-likeness) and ours (ELO-relative
  centipawn tables) are converging ideas — we got there with open data;
  (b) auto-flashcards after each game is cheap for us and clearly loved;
  (c) the sparring gap for us is real human-like play → Maia path in
  [engine-strength-human-play.md](engine-strength-human-play.md).

### WintrChess / freechess — the free clone that matters

- Free chess.com-style Game Report with the full classification zoo
  (Brilliant included); open source; the predecessor's algorithm is
  documented in [move-classification.md](move-classification.md).
- **Take**: proof the paid Game Review can be replicated by one developer;
  read their code before writing ours; also proof that "free clone" alone
  isn't a product — coaching depth (LLM + ELO-awareness) is our edge.

## 3. Positioning summary

Every competitor owns one mechanic: Aimchess = diagnostics, Chessable =
memory, Noctie = human sparring, DecodeChess = explanations, Lichess =
free infrastructure, chess.com = the integrated default. Nobody combines
**local/private, engine-grounded LLM coaching, ELO-relative feedback, and
personal-mistake training loops** — which is precisely the corner this
prototype occupies. The research-backed build order (details in
[docs/chesscom/README.md](../chesscom/README.md) tiers): accuracy + Game
Report → personal puzzles + spaced repetition → insights-with-trainers →
human-like sparring.
