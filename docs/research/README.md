# Research library — formulas, algorithms, competitors

*Deep-dive research (July 2026) meant to be **directly usable when coding**.
Each doc collects verified formulas/constants/pseudo-code with sources.
The build order and gap analysis live in [docs/ROADMAP.md](../ROADMAP.md);
companion folders: [docs/chesscom/](../chesscom/README.md) (what chess.com
sells and the replication map), [docs/relative-evaluation.md](../relative-evaluation.md)
(our ELO-relative thresholds), [docs/coaching/](../coaching/README.md)
(per-ELO syllabi).*

## Documents

| Doc | Contents | Feeds which feature |
|---|---|---|
| [win-probability-accuracy.md](win-probability-accuracy.md) | Exact Lichess win%/accuracy formulas (source-level constants), CAPS2 community regressions, Fischer/Kannan logistic model, ACPL↔Elo | Accuracy score, game graph, Game Report |
| [move-classification.md](move-classification.md) | Lichess advice thresholds, chess.com expected-points recap, **full open-source Brilliant/Great algorithm** (WintrCat) with conditions | Brilliant/Great/Miss/Book detection |
| [engine-strength-human-play.md](engine-strength-human-play.md) | Stockfish Skill Level internals + UCI_Elo formula, Maia/Maia-2 human-move models, Noctie's approach | Play-vs-engine levels, human-like sparring, Play Coach |
| [puzzle-generation.md](puzzle-generation.md) | lichess-puzzler thresholds (verbatim), cook.py theme tagging, CC0 DB schema, our own-blunder puzzle pipeline, spaced repetition intervals | Puzzles, personal tactics trainer, flashcards |
| [competitors.md](competitors.md) | Aimchess, DecodeChess, Chessable, Noctie, WintrChess, smaller tools — approach, pricing, lessons for us | Product positioning, feature priorities |
| [open-data-sources.md](open-data-sources.md) | Catalog of public databases: games (Lichess/TWIC/FICS/APIs), openings, 6M CC0 puzzles, PD lesson content, tablebases, FIDE lists — with sizes, licenses, fetch commands | Every data-backed feature; bundling decisions |

## Conventions

- Constants are quoted **verbatim from source code** where available, with a
  link; approximations and community reverse-engineering are labeled as such.
- Every doc ends with an "Implementation notes for this repo" section tying
  the research to our stack (chess.js + Stockfish WASM + Claude seam).
- When a formula conflicts between sources, both are given with provenance —
  pick at implementation time and note the choice in code comments.
