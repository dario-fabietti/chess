# Next-steps roadmap — from research to features

*Written 2026-07-11, after the research phase closed. This is the working
plan: what we have, what's missing, and the per-feature next steps.
No code has been written for these items yet — this document is the map.*

**Navigation**: feature definitions live in [docs/chesscom/](chesscom/README.md)
(what chess.com sells), formulas/algorithms in [docs/research/](research/README.md),
data sources in [research/open-data-sources.md](research/open-data-sources.md),
coaching content in [docs/coaching/](coaching/README.md).

---

## 1. Inventory review — what we hold today

**Working app (tier 0)**: full rules + board UI, live MultiPV analysis with
eval bar/arrows, move classification incl. Excellent + **ELO-relative bands**
(unique to us), chess.com-style icons, threat/hanging warnings, ELO-aware
hints, play-vs-engine (8 levels), Claude coach (local bridge + claude.ai),
learning sidebar with per-band syllabus, session-only eval cache.

**Specs on paper (research docs)**: exact accuracy formulas (Lichess
source-level), classification/Brilliant/Great algorithms (open-source
reference), puzzle-generation thresholds (lichess-puzzler), spaced-repetition
ladder (Chessable), Stockfish UCI_Elo formula, Maia landscape, competitor
mechanics.

**Data (verified, mostly CC0)**: 6M+ tagged puzzles, openings TSV, 6B+ games,
394M evaluated positions, explorer/tablebase APIs, PD lesson classics.

**Verified this session on this machine**: our bundled
`stockfish-18-lite-single.wasm` **does support `UCI_Elo` / `UCI_LimitStrength`
/ `Skill Level` / `MultiPV`** (string-probed the binary) — honest-Elo levels
need no new engine.

---

## 2. Gap register (the honest list)

| # | Gap | Blocks | Severity / mitigation |
|---|---|---|---|
| G1 | **No persistent storage layer.** Games, evals, badges all die with the tab (localStorage holds only settings). No IndexedDB schema exists. | Game history, Insights, personal puzzles, spaced repetition | High — foundational; design once, early |
| G2 | **No batch/background analysis queue.** Analysis is interactive-only (current position, opportunistic depth). Whole-game evaluation at fixed depth doesn't exist. | Game Report, Insights, puzzle verification | High — core plumbing for everything "review" |
| G3 | **chess.com PubAPI sends no CORS headers** → the browser cannot fetch a user's chess.com history directly ([confirmed](https://www.chess.com/clubs/forum/view/cors-errors-on-monthly-game-archives)). Lichess API *does* allow CORS. | Import-your-games (half of it) | Medium — 3 mitigations: serve.py proxy endpoint (local, like `/api/explain`); manual PGN file upload (works everywhere); Lichess imports unaffected |
| G4 | **GitHub Pages can't set COOP/COEP headers** → no SharedArrayBuffer → no multithreaded engine on the public demo. | Deep/fast batch analysis on Pages | Low-Med — [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker) is a proven service-worker workaround; serve.py can send real headers locally |
| G5 | **Single-view UI.** The app is one analysis screen; Report/Puzzles/Insights/Lessons need a view-switching architecture (tabs or hash-routing) that doesn't exist. | Every new surface | Medium — one-time UI architecture decision |
| G6 | **No data bundled yet.** Openings TSV (~100 KB) and a puzzle subset (~5–10 MB) are chosen but not downloaded/committed; subset criteria (rating spread, popularity floor) undecided. | Book detection, openings naming, puzzle modes | Low — an afternoon + a decision |
| G7 | **No SEE (static exchange evaluation).** chess.js has attack maps but no capture-sequence evaluator; Brilliant's sacrifice test needs one (or the freechess approximation). | Brilliant/Great detection | Medium — port ~100 lines or accept approximation |
| G8 | **Lesson generation pipeline is a concept, not a design.** No prompt templates, no verifier spec, no lesson JSON schema, no quality rubric. Content quality is the actual risk. | Lessons feature | Medium — needs a design doc + prototype cycle |
| G9 | **No spaced-repetition scheduler.** Trivial spec (interval ladder), zero code. | Personal puzzles, repertoire drill | Low |
| G10 | **No human-like engine path packaged.** Maia weights exist but no browser ONNX/lc0-wasm pipeline; desktop lc0 via bridge is unproven. | Human-like sparring | High effort, low urgency — park in stretch tier |
| G11 | **No peer-population data** ("you vs other 1200s"). chess.com proprietary. | Insights comparisons | Accepted gap — substitute self-trends + published Lichess distributions |
| G12 | **CAPS2 exact clone impossible** (proprietary, rating-dependent depth, deliberate smoothing). | Accuracy parity | Accepted — use Lichess formula, documented decision |

Everything else in the feature map has **no meaningful gap**: specs + data +
engine capabilities are already sufficient.

---

## 3. Per-feature next steps

Effort: S ≈ ≤1 day · M ≈ 2–4 days · L ≈ 1–2 weeks. "Gaps" reference §2.

### F1. Accuracy score + eval graph — *S/M, gaps: none*
Readiness: spec ✅ (exact constants) · data ✅ (session evals) · UI 🟡
1. `js/accuracy.js`: win% conversion + move accuracy + game accuracy
   (volatility windows, weighted+harmonic means) with unit tests mirroring
   [research/win-probability-accuracy.md](research/win-probability-accuracy.md).
2. Persist per-ply `{cp, mate}` snapshots into game state (feeds F4/F5 later).
3. SVG eval graph above the move list, clickable plies; per-player accuracy
   chip after game end. Absolute scale only (accuracy ≠ classification).

### F2. Key moments + retry mistakes — *M, gaps: G5 (small)*
Readiness: spec ✅ · data ✅ (badges + fenBefore in reviewData) · UI ❌
1. Key-moment selector: plies with blunder/mistake/miss/brilliant badges +
   biggest win%-swings (from F1 data) + last book move (needs F3).
2. "Retry" flow: load fenBefore, user tries, grade attempt vs engine best
   with the *same* classifier (respect ELO-relative toggle), coach feedback
   line, "show solution" fallback.
3. Coach-panel walkthrough mode: previous/next key moment navigation.

### F3. Book detection + opening naming — *S, gaps: G6*
Readiness: spec ✅ · data ✅ (TSV chosen, not bundled) · UI 🟡
1. Commit `vendor/openings/{a..e}.tsv` (CC0) + loader that builds a
   move-sequence → {eco, name} map (~3.5k lines).
2. Tag plies still in book as `book` (📖, before classification); show
   current opening name in the header; expose `lastBookPly` for F2/F4.

### F4. Full Game Report — *L, gaps: G2, G5*
Readiness: spec ✅ · data ✅ · plumbing ❌
1. **Build the batch queue (G2)**: sequential fixed-depth (16–18) evaluation
   of all plies on the *sparring* engine (analyzer stays interactive), with
   progress UI and cancel; cache results into the F1 per-ply store.
2. Report view (first new surface — decide G5 architecture here): accuracy
   per player, classification counts table, eval graph, key moments (F2),
   opening name (F3).
3. Claude narrative: one bridge call with the report JSON → 3-paragraph
   game story at learner's band (reuse llm.js facts pattern).
4. Later: depth upgrade via multithreading (F16).

### F5. Game history + import — *M, gaps: G1 (core), G3*
Readiness: spec ✅ · data ✅ (APIs) · storage ❌
1. **Design the IndexedDB schema (G1) first** — it serves F4/F7/F9:
   `games` (pgn, headers, source, importedAt), `evals` (gameId, ply, cp/mate,
   depth), `reviews` (badges, accuracy), `puzzles` (F7), `srs` (F7).
2. Lichess import: CORS-friendly NDJSON export, paginated, rate-limit aware.
3. chess.com import (G3): add `GET /api/fetch-chesscom?user=&yyyy=&mm=` proxy
   to serve.py (localhost-only, like `/api/explain`); on Pages fall back to
   manual PGN upload (file input + drag-drop, also useful generally).
4. "My games" list view with review status; open any game into analysis.

### F6. Canned puzzles (rated / custom / rush) — *M, gaps: G6, G5*
Readiness: spec ✅ · data ✅ (CC0 DB) · code ❌
1. Decide + script the subset (proposal: Popularity ≥ 70, NbPlays ≥ 100,
   rating 400–2200, stratified ~30k rows ≈ 4–6 MB gz; keep the script in
   `tools/` so the subset is regenerable).
2. Puzzle player: opponent-move animation → user must find each solver move
   (UCI match or engine-equivalent), hint = first move highlight.
3. Rated mode: Glicko-lite user rating (K-factor by RD), serve ±100;
   custom mode: theme/rating filters; rush mode: 3-strikes timer.
   Persist rating/history (G1).

### F7. Personal puzzles + spaced repetition — *M/L, gaps: G1, G9, needs F4*
Readiness: spec ✅ (thresholds verbatim) · pipeline ❌
1. After each reviewed game, mine candidates: plies where win%-swing ≥ 0.3
   and position not already won (mirror lichess-puzzler: ≥200cp, +0.6 jump).
2. Background-verify (batch queue from F4): solution uniqueness via
   MultiPV-2 gap > 0.7 win-chances per solver move; trim to odd length;
   discard <2 plies.
3. Tag themes with cheap ports of cook.py detectors (fork/pin/hanging/mates).
4. SRS scheduler (G9): ladder [4h, 19h, 3d, 1w, 1m, 4m], fail → reset;
   "Daily review" queue surfaced on the home panel.

### F8. Brilliant / Great / Miss — *M, gaps: G7*
Readiness: spec ✅ (full algorithm) · SEE ❌
1. Implement sacrifice scan per the freechess conditions (hanging
   higher-value piece post-move + viability walk); start with their
   approximation, upgrade to real SEE only if false positives annoy.
2. Great: previous-ply blunder + MultiPV line1↔line2 gap ≥ 150cp (data
   already in memory at classification time). Miss: opponent blunder +
   reply returns ≥ half the swing.
3. Respect rating-generosity: scale sacrifice minimum + only-move gap by
   learner band (ties into `RELATIVE_BANDS`).
4. Mate-transition tables from the research doc (fixes current blind spot
   where mate↔cp transitions classify crudely).

### F9. Insights + trainers — *L, gaps: G1, G2, G11; needs F4/F5*
Readiness: spec ✅ · data = user's games · aggregation ❌
1. Aggregations over the IndexedDB store: accuracy by phase (book/≤N
   pieces heuristics), top-10 openings × results (needs F3), found/missed
   tactics (from F8 + theme detectors), hanging pieces left/punished,
   castling and time-of-day splits.
2. Dashboard view: SVG charts, no deps; every stat links to evidence
   (the actual game moments).
3. **The Aimchess lesson — every stat ships with a trainer**: worst-opening
   drill (play it vs engine from book exit), blunder-type replay queue
   (from F7 store), endgame-phase drill. One trainer per headline stat,
   minimum.
4. Claude training plan: insights JSON → prioritized weekly plan at band
   level. Accepted gap G11: self-trends, not peer percentiles.

### F10. Endgame trainer / drills — *M, gaps: none hard*
1. Curate ~40 theory FENs (Lucena, Philidor, K+P opposition ladder, Q vs P,
   basic mates) — PD knowledge, Capablanca examples quotable.
2. Play-out vs sparring engine at full strength; verdict via goal check
   (mate/draw detection) + optional tablebase API confirmation when online.
3. Per-position "explain the method" Claude button with the engine line.

### F11. Opening explorer + practice — *M, gaps: online-only aspect*
1. Online mode: explorer API (`/masters`, `/lichess?ratings=` band-filtered)
   behind a visible "online feature" toggle (same pattern as claude.ai
   hand-off); cache responses per FEN in IndexedDB.
2. Practice mode: "play this opening vs engine" — engine plays book moves
   (from explorer stats or bundled TSV) for N plies, then plays normally;
   deviation feedback via classifier.
3. Offline fallback: bundled TSV gives names/lines but no stats — fine.

### F12. Lessons pipeline — *L, gaps: G8 (design first)*
1. Write the design doc (schema: lesson = {band, topic, intro, positions[],
   perWrongAnswerCoaching}; prompt templates; **engine-verifier spec**:
   every challenge's target move must classify Best/Excellent at depth 18).
2. Prototype one course ("hanging pieces", 600–800 band) end-to-end via
   `claude -p` generation + verification; human-review the output.
3. Lesson player UI reusing the F2 retry mechanics; progress in localStorage.
4. Scale only after the prototype survives real use; PD classics (Capablanca)
   as seed material for endgame lessons.

### F13. Play Coach (teaching mode) — *M, gaps: none hard*
1. Opt-in toggle in play mode: pre-move "are you sure?" when the intended
   move hangs material (needs a pre-move hook in board.js — small API add).
2. Post-mistake instant-retry offer (reuse F2 flow) instead of silent badge.
3. Claude interjections at key moments, throttled (1 per N moves).

### F14. Honest Elo levels — *S, gaps: none (verified!)*
1. Switch sparring config from `Skill Level` to
   `UCI_LimitStrength+UCI_Elo` (options confirmed present in our WASM);
   relabel the 8 levels with the formula-backed Elo numbers; keep movetime
   caps for pacing.

### F15. Human-like sparring (Maia) — *stretch, gaps: G10*
Park until F1–F9 ship. Then: desktop-first via a serve.py lc0 bridge
(mirrors the Claude bridge pattern); browser ONNX later if ever.

### F16. Multithreaded engine — *M, infra, gaps: G4*
1. Add COOP/COEP headers to serve.py (two lines) → multithreaded build
   works locally.
2. On Pages: ship [coi-serviceworker](https://github.com/gzuidhof/coi-serviceworker);
   feature-detect SharedArrayBuffer and fall back to the single build.
3. Bundle `stockfish-18-lite` multithreaded variant alongside single (GPLv3
   notice already covers Stockfish).

---

## 4. The roadmap — phased order

Rationale: storage and batch analysis (G1/G2) unlock the most features, but
several S-effort wins need neither. Ship visible value while laying plumbing.

```
Phase 0  QUICK WINS (all S, independent)
         F14 honest Elo levels · F3 book/opening names · F1 eval graph+accuracy
         └─ user-visible immediately, zero new infra

Phase 1  MEASURE (the Game Report)
         G2 batch queue → F4 report v1 (+F2 key moments/retry, F8 brilliant/great)
         └─ decides G5 (view architecture) — the template for every later surface

Phase 2  REMEMBER (the data spine)
         G1 IndexedDB schema → F5 imports (lichess CORS ✅, chess.com via
         local proxy/manual upload) → auto-review queue over imported games

Phase 3  TRAIN (puzzles)
         G6 bundle subset → F6 rated/custom/rush → F7 personal puzzles + SRS
         └─ first retention loop; needs Phase 1 (verification) + 2 (storage)

Phase 4  UNDERSTAND (insights)
         F9 dashboard + one trainer per stat → Claude training plan
         └─ needs Phases 1–3; this is the Diamond-tier replica

Phase 5  TEACH (content)
         G8 design doc → F12 lessons prototype (one course) → F13 play coach
         └─ quality-gated: scale only after prototype survives review

Phase 6  DEEPEN (stretch)
         F16 multithreading (coi-serviceworker) · F11 explorer online mode ·
         F10 endgame drills · F15 Maia — order by demand
```

Dependency notes: F10/F11/F13 are phase-independent fillers (any time after
Phase 0); F8 can ride with Phase 1 or 3. Nothing in Phases 0–4 requires
data or specs we don't already hold — the only external risks are G3
(mitigated three ways) and content quality in Phase 5 (gated by design).

---

## 5. Document map (where everything lives)

| Question | Document |
|---|---|
| What does chess.com sell, what's replicable? | [chesscom/README.md](chesscom/README.md) + 5 detail docs |
| Exact formulas/constants/algorithms? | [research/](research/README.md): win-probability-accuracy, move-classification, puzzle-generation, engine-strength-human-play |
| What data exists, licenses, fetch commands? | [research/open-data-sources.md](research/open-data-sources.md) |
| Who else does this, what to learn? | [research/competitors.md](research/competitors.md) |
| Our ELO-relative thresholds? | [relative-evaluation.md](relative-evaluation.md) |
| What to teach per level? | [coaching/](coaching/README.md), [elo-coaching.md](elo-coaching.md) |
| **What to build next and in what order?** | **this file** |
