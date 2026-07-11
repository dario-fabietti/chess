# Documentation index

*Master map of the docs tree. Start here.*

## 🎯 [ROADMAP.md](ROADMAP.md) — what to build next
The working plan: inventory review, **gap register (G1–G12)**, detailed
next steps per feature (F1–F16), and the phased build order
(Quick wins → Measure → Remember → Train → Understand → Teach → Deepen).

## 📋 [chesscom/](chesscom/README.md) — the target feature set
What chess.com sells per tier and how replicable each feature is
(tiers 0–4). Detail docs: [game-review](chesscom/game-review.md) ·
[lessons-learning](chesscom/lessons-learning.md) ·
[puzzles-practice](chesscom/puzzles-practice.md) ·
[insights-analytics](chesscom/insights-analytics.md) ·
[openings-explorer](chesscom/openings-explorer.md)

## 🔬 [research/](research/README.md) — implementation-grade reference
Verified formulas, algorithms, data and market context:
[win-probability-accuracy](research/win-probability-accuracy.md) (exact
Lichess constants, CAPS2) ·
[move-classification](research/move-classification.md) (Brilliant/Great
algorithm) ·
[puzzle-generation](research/puzzle-generation.md) (lichess-puzzler
thresholds, SRS ladder) ·
[engine-strength-human-play](research/engine-strength-human-play.md)
(UCI_Elo formula, Maia) ·
[open-data-sources.md](research/open-data-sources.md) (**all available
databases**: games/openings/puzzles/lessons, licenses, fetch commands) ·
[competitors](research/competitors.md) (Aimchess, DecodeChess, Chessable,
Noctie, WintrChess)

## 🎓 Coaching content (feeds the LLM coach and future lessons)
[coaching/](coaching/README.md) — per-200-ELO-band teaching syllabi
(400–2000) · [elo-coaching.md](elo-coaching.md) — how the ELO-aware move
recommendation works · [coaching-research.md](coaching-research.md) ·
[learning-prompts.md](learning-prompts.md)

## ⚖️ Implemented-feature specs
[relative-evaluation.md](relative-evaluation.md) — ELO-relative move
classification thresholds (shipped behind the "ELO-relative eval" checkbox)
