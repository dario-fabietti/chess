# Session summary — ELO-relative eval, chess.com UI parity, research library & roadmap

Generated: 2026-07-11 21:28Z · Repo: dario-fabietti/chess · Branch: claude/chess-platform-ai-engine-3k5iwv
Original session: local Claude Code session on Windows machine (dLap), not captured

## Goal
Evolve the local-first chess coach prototype toward replicating chess.com's
paid learning features. This session: (1) implement ELO-relative move
evaluation (a -300cp move is normal at 400 ELO, a blunder at 2000) behind a
checkbox; (2) chess.com-style UI polish; (3) build a thorough research
library on chess.com paid features, formulas, competitors, and open data;
(4) produce a gap analysis + phased roadmap. **User explicitly said: write
the roadmap only, do NOT start coding the roadmap features.**

## Current state
- Branch `claude/chess-platform-ai-engine-3k5iwv` at `141304b` "Roadmap: gap
  analysis and phased next steps from research to features"
- Pushed to remote: yes, up to date. Pushes to this branch auto-deploy
  GitHub Pages (https://dario-fabietti.github.io/chess/)
- `experiment/elo-relative-eval` branch (local + origin) fully merged into
  the main working branch — could be deleted, user hasn't asked
- Uncommitted (intentionally untracked): `start.bat` (user's Windows
  launcher: git pull + serve.py + open browser), `.claude/launch.json`
  (preview server config, name "chess", python serve.py port 8000), `nul`
  (junk file from a bash redirect mishap; user said leave it)
- No dev servers running (preview server was stopped)
- Open PR/issue: none

## What was done (chronological, terse)
1. Created `start.bat` Windows launcher (git pull → claude CLI check →
   python serve.py → auto-open browser). Verified working; user confirmed
   claude CLI found on their PATH (it wasn't visible in my sandbox).
2. **ELO-relative evaluation** (commit `5a1bcf0`): researched centipawn-loss
   vs rating (lichess win% formula, chess.com Expected Points, ACPL↔Elo
   regression `Elo≈3100·e^(−0.01·ACPL)`, Regan IPR); wrote
   `docs/relative-evaluation.md` with per-200-ELO-band threshold tables
   incl. Excellent; implemented `RELATIVE_BANDS`/`thresholdsForElo()` in
   `js/coach.js`, "ELO-relative eval" checkbox (uses Learner ELO slider),
   retroactive re-classification (`reclassifyAll()` in app.js), 65 browser
   assertions passed. User anchors honored: 300cp@400=Good, 300cp@2000=Blunder.
3. **UI parity** (commits `c75d110`, `fad4dd5`): CLASSIFICATION_BADGES in
   coach.js — final icon set ★ Best (green) / 👍 Excellent (teal) / ✓ Good
   (sage) / ?! / ? / ?? matching chess.com (user corrected: thumbs-up =
   Excellent, check = Good); icons shown in move list AND on-board eval
   badges (tspan coloring in board.js `_labelEl`); **L-shaped knight arrows**
   (`_knightArrowEl` bends at the long-leg corner); code-point (not UTF-16)
   width fix for the emoji badge.
4. Merged experiment branch to main working branch (fast-forward) and pushed
   on user request; Pages auto-deployed.
5. **Research library** (commits `f09bdc0`, `47866d4`, `8ec2e7c`):
   - `docs/chesscom/` (6 docs): paid-tier matrix, Game Review/CAPS2,
     move classifications, lessons/Play Coach, puzzles/practice, Insights,
     openings explorer — each with replication plan, tiers 0–4.
   - `docs/research/` (7 docs): exact Lichess accuracy constants
     (AccuracyPercent.scala verbatim), Advice thresholds (.1/.2/.3 win
     chances), WintrCat freechess Brilliant/Great algorithm (full
     conditions), Stockfish UCI_Elo formula
     `clamp(((Elo−1346.6)/143.4)^(1/0.806),0,20)`, Maia papers, lichess-
     puzzler generation thresholds (Cp200/+0.6/+0.7 win-chances, cook.py
     themes), Chessable SRS ladder (4h→19h→…, reset on fail), competitors
     (Aimchess $14/mo report→trainer loop, DecodeChess buggy XAI,
     Noctie humanlike+flashcards, WintrChess open-source clone),
     open-data-sources catalog (Lichess CC0: 6M puzzles/6B games/394M
     evals; openings TSV; TWIC/Lumbra/FICS; Syzygy; FIDE lists; PD books).
6. **Roadmap** (commit `141304b`): `docs/ROADMAP.md` — gap register G1–G12,
   per-feature next steps F1–F16 with effort tags, phased order (0 quick
   wins → 1 Measure/Game Report → 2 Remember/storage+imports → 3
   Train/puzzles+SRS → 4 Understand/insights → 5 Teach/lessons → 6 stretch);
   `docs/README.md` master index; cross-links everywhere.

## Key decisions & rationale
- **Relative eval = per-band cp tables, not win-prob curves** — transparent,
  matches existing cpLoss pipeline, user's two anchor examples define the
  extremes; win-prob saturation noted as future refinement.
- **Top band (2000+) relative ≡ absolute thresholds** so the toggle is
  seamless for strong players; absolute mode gained Excellent (≤20cp) for parity.
- **Excellent=👍 / Good=✓** per user correction of my initial guess (✓ was
  on Excellent first).
- **Accuracy: use Lichess open formula, not CAPS2 clone** — CAPS2 is
  proprietary + deliberately smoothed; decision recorded in research docs.
- **Puzzles: bundle subset of Lichess CC0 DB, don't generate** — 6M tagged
  puzzles freely available; generation only for personal-blunder puzzles.
- **Lessons = the one category to LLM-generate** (no open lesson data
  exists); gated behind a design doc + one prototype course (quality risk).
- **Git identity set repo-local** to Dario Fabietti <dario.fabietti@gmail.com>
  (no global identity on this machine; prior commits were cloud-authored
  "Claude").

## Files & artifacts touched
- `js/coach.js` — RELATIVE_BANDS, thresholdsForElo, CLASSIFICATION_BADGES,
  classifyMove({elo,relative}), excellent comment
- `js/app.js` — relativeEval state+checkbox wiring, reviewData map,
  reclassifyAll, badge icons on arrow labels (currentAutoShapes)
- `js/board.js` — _knightArrowEl (L-shape), _labelEl icon tspans,
  code-point width
- `index.html` — #toggle-relative checkbox; `css/style.css` — badge colors
- `docs/relative-evaluation.md`, `docs/chesscom/*` (6), `docs/research/*`
  (7), `docs/ROADMAP.md`, `docs/README.md`, README.md updates
- Untracked: `start.bat`, `.claude/launch.json`

## Gotchas / environment quirks learned
- **No Node.js on this machine** — test JS in the browser via preview_eval
  (dynamic `import('/js/x.js?v='+Date.now())` beats module cache).
- **Preview browser caches ES modules hard** — server restart doesn't help;
  cache-busted import + prototype patching works for verification.
- **preview_screenshot intermittently times out** (30s) while the tab stays
  responsive — fall back to DOM/SVG inspection via preview_eval.
- **`gh` CLI not installed**; git push works (credentials configured).
- **Windows `nul`**: bash `2>nul` creates a literal file needing `\\?\`
  prefix to delete; user said leave it.
- **GitHub Pages env protection**: only allowed branches can deploy;
  experiment-branch deploy was rejected until user adjusted (they then
  merged to the allowed branch instead).
- **Bundled stockfish-18-lite-single.wasm supports UCI_Elo/UCI_LimitStrength**
  (verified by binary string probe) — honest Elo levels need no new engine.
- **chess.com PubAPI has NO CORS** (browser import impossible → serve.py
  proxy or manual PGN); **Lichess API has CORS** (`Access-Control-Allow-Origin:*`).
- **coi-serviceworker** = proven COOP/COEP workaround for multithreaded
  WASM on GitHub Pages.
- Engine review pipeline skips a move played before any baseline eval
  exists (e.g. first move right after newGame) — pre-existing, benign.

## Open threads / next steps
1. **Execute docs/ROADMAP.md Phase 0** (all S-effort, no infra): F14 honest
   Elo levels via UCI_Elo; F3 bundle openings TSV + book badge + opening
   name; F1 accuracy module + eval graph (exact formulas in
   docs/research/win-probability-accuracy.md).
2. Then Phase 1 (Game Report: batch queue G2 + report view deciding the
   view-architecture G5), per roadmap.
3. Housekeeping candidates (unrequested): delete merged
   `experiment/elo-relative-eval` branch; commit start.bat/.claude/launch.json
   if user wants them versioned; delete `nul` (user said keep).
4. ELO-relative thresholds are a first calibration — user may want tuning
   after playtesting (single table in js/coach.js).

## Questions for the user
- None blocking. Minor: should start.bat and .claude/launch.json be
  committed? Should the merged experiment branch be deleted?
