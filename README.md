# ♞ Chess Coach — prototype

A self-contained chess platform baseline that imitates the chess.com
experience with an AI coach. Everything runs locally in the browser —
no build step, no CDN, no external requests.

![Stack](https://img.shields.io/badge/stack-vanilla%20JS-blue) (no framework, no bundler)

## Run it

```sh
./start.sh            # serves on http://localhost:8000
# or
python3 serve.py 8000
```

Then open <http://localhost:8000>. Any static file server works; `serve.py`
just guarantees the right MIME types for the WASM engine.

> The app must be served over HTTP (not opened as `file://`) because the
> engine runs in a Web Worker.

## Features

- **Full chess rules** — legal moves, castling, en passant, promotion,
  check/checkmate/stalemate/draw detection (via [chess.js]).
- **Chessboard UI** — drag & drop or click-to-move, legal-move hints,
  last-move / check highlights, board flip, coordinates, promotion picker,
  synthesized move/capture/check sounds (WebAudio, no audio files).
- **Engine analysis** — [Stockfish 18 Lite] compiled to WebAssembly, running
  in a Web Worker. Live evaluation bar, top-3 engine lines (MultiPV) with
  evals in SAN, and search depth display.
- **Colored arrows**
  - green: engine best move · blue: alternative engine lines
  - red: what the opponent threatens if you pass (null-move search)
  - knight moves bend into an L to trace the actual path instead of
    cutting a diagonal
  - each suggested move carries a small eval badge (e.g. `★ +0.13`) on its
    destination square — the move-class icon plus the eval (toggleable)
  - user arrows: right-click drag (plain = green, Shift = red, Alt = blue,
    Ctrl = yellow); right-click a square for a circle; left-click clears.
- **AI coach (baseline)** — reviews every move against the engine (Best
  `★` / Excellent `👍` / Good `✓` / Inaccuracy `?!` / Mistake `?` /
  Blunder `??`, chess.com's move-class glyphs and colors, shown in the
  move list and on the board), suggests the better move, warns about
  opponent threats and hanging pieces, and gives hints on demand.
- **ELO-relative evaluation (experimental)** — the "ELO-relative eval"
  checkbox judges moves against the Learner ELO instead of the absolute
  engine scale: a 300 cp slip is a normal move at 400 but a blunder at
  2000. Toggling re-classifies the whole game. Thresholds and sources:
  [docs/relative-evaluation.md](docs/relative-evaluation.md).
- **Play vs engine** — 8 strength levels (Stockfish skill 0–20), play as
  White or Black, undo (takes back a full move pair).
- **Analysis board** — free movement for both sides, navigate the game with
  arrow keys or the move list, import/export FEN and PGN.

## LLM coach — explain positions with your Claude plan

The coach panel has two "ask Claude" buttons. Both feed Claude the engine's
lines and evals as ground truth and ask it to explain the *ideas* (LLMs are
unreliable at raw calculation). Neither needs an Anthropic API key.

1. **✨ Explain (local bridge).** When the app is served by `serve.py` on a
   machine where [Claude Code](https://claude.com/claude-code) is installed
   and logged in, the button sends the position to `POST /api/explain`, which
   runs `claude -p` locally — authenticated by your Claude subscription. The
   endpoint only accepts requests from localhost. Overrides: `CLAUDE_BIN`
   (path to the CLI), `CLAUDE_MODEL` (e.g. `haiku` for faster/cheaper runs).
   If Claude Code isn't found the button is disabled with a hint.
2. **claude.ai ↗ (hand-off).** Opens claude.ai in a new tab with the full
   coaching prompt pre-filled — you just press send. Works anywhere,
   including the GitHub Pages deployment, on your own Claude plan.

The prompt builder lives in `js/llm.js`; the facts it consumes (FEN, recent
moves, MultiPV lines, threat) are collected in `App.collectFacts()`.

### ELO-aware coaching

The **Coach ELO** slider (600–2600) sets who the coach is talking to. The
engine still analyzes at full strength, but the move the coach recommends —
in LLM explanations and in the **Hint** button — is chosen for that rating:
each MultiPV candidate is annotated with human-findability features
(captures, checks, castling, development, …) and the recommendation
maximizes findability within a rating-dependent eval window (~3 pawns of
tolerance at 600 Elo shrinking to ~0.15 at 2600, converging to the engine
move). The explanation style also adapts: beginners get "castle your king,
watch the hanging knight" with no jargon; experts get concrete lines. The
algorithm study (alternatives considered: Skill Level, depth-limited search,
Maia networks) and the exact formulas live in
[docs/elo-coaching.md](docs/elo-coaching.md); implementation in
`js/levels.js`.

### Learning sidebar (explanations by ELO)

The left sidebar turns the coaching research into per-level teaching. Pick a
**Learner ELO** (400–2000, synced with the Coach ELO slider) and the panel
shows what a player of that strength typically can do, what they should be
learning right now, and an **explanation of the current position written for
exactly that level** — a 500 hears "your knight is free to take", a 1700
gets plans, structures and evals. The explanation field fills automatically
from the engine (rule-based, offline); the **✨ Personalized explanation**
button sends a band-specific prompt — student profile, learning goals, a
strict style contract, and engine lines *pre-truncated to the band's depth*
— to Claude via the local bridge (or claude.ai hand-off). Strategy and the
prompt set: [docs/learning-prompts.md](docs/learning-prompts.md); band data
and builders: `js/learn.js`; source research:
[docs/coaching/](docs/coaching/README.md).

## Project layout

```
index.html            single page app
css/style.css         chess.com-inspired dark theme
js/app.js             main controller: game state, engines, coach pipeline, UI
js/board.js           board rendering, drag & drop, SVG arrow/circle overlay
js/engine.js          UCI protocol wrapper around the Stockfish worker
js/coach.js           move classification + coaching heuristics (LLM seam)
js/levels.js          ELO-aware move recommendation (window + findability)
js/learn.js           learning sidebar: per-band skills/goals + ELO-tailored prompts
js/llm.js             Claude prompt builder + bridge/hand-off transports
js/sound.js           synthesized sounds (WebAudio)
vendor/stockfish/     Stockfish 18 Lite single-threaded WASM build (GPLv3)
vendor/chessjs/       chess.js 1.4.0 ESM build (BSD-2-Clause)
assets/pieces/        cburnett piece SVGs (CC BY-SA 3.0)
serve.py / start.sh   zero-dependency static server
docs/                 research: ELO-aware algorithms + coaching-by-rating
docs/coaching/        deep dive: teaching guide per 200-ELO band (400-2000)
```

## Architecture notes

- **Two engine instances** run as separate Web Workers:
  - *analyzer*: continuous `go infinite` with `MultiPV 3` on the displayed
    position; feeds the eval bar, engine lines, arrows and move review.
  - *sparring*: plays moves in "Play vs engine" mode (Skill Level +
    movetime per level) and computes threat arrows via a null-move search
    (side to move flipped, `go depth 12`).
- The UCI wrapper (`js/engine.js`) serializes searches — every new search
  stops the previous one and waits for its `bestmove` — and tags engine
  output with a search id so stale lines are never attributed to the wrong
  position.
- **Move review** is asynchronous: when a move is played, the eval of the
  previous position is snapshotted; the classification is finalized once the
  new position reaches depth ≥ 12. On the absolute scale, centipawn-loss
  thresholds mirror the ones used by popular sites (≤10 best, ≤20 excellent,
  ≤40 good, ≤90 inaccuracy, ≤200 mistake, else blunder; allowing a mate is
  always a blunder). With "ELO-relative eval" on, per-band thresholds from
  [docs/relative-evaluation.md](docs/relative-evaluation.md) apply instead.
- `js/coach.js` is deliberately template-based and isolated — it is the seam
  where an LLM-backed coach can be plugged in later (it already receives
  structured facts: classification, best line, threats, hanging pieces).
- The engine build is `stockfish-18-lite-single` (single-threaded, ~7 MB
  NNUE): it runs in a plain Worker without the COOP/COEP headers that the
  multi-threaded build needs, so any static host can serve it.

## Ideas for next experiments

- Stream the local-bridge explanation into the coach panel as it generates,
  and auto-explain blunders using the same pipeline
- Full game review ("Game Report") with accuracy score per player
- Opening book / opening explorer and named openings
- Clocks and time controls; puzzle mode from blunder positions
- Multi-threaded engine build behind COOP/COEP for deeper analysis

## Licenses

This prototype's own code is MIT. Bundled third-party components keep their
licenses — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
(Stockfish: GPLv3; chess.js: BSD-2-Clause; piece art: CC BY-SA 3.0).
Note that distributing the bundle as a whole is governed by the GPLv3 via
the Stockfish WASM build.

[chess.js]: https://github.com/jhlywa/chess.js
[Stockfish 18 Lite]: https://github.com/official-stockfish/Stockfish
