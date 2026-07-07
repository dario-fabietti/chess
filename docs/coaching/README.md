# Chess teaching by ELO — deep-dive research

This folder is the knowledge base for tuning the AI coach's feedback. It
splits chess teaching into 200-point rating bands from 400 to 2000. Each
child file describes, for its band: what to expect from players, their
realistic depth of thought, and the tactical ideas, strategic ideas,
openings, middlegame skills, checkmate patterns, pawn structures, typical
combinations and endgames that belong at that level — ending with concrete
tuning hints for our coach (`js/levels.js`, `js/llm.js`).

Ratings are online (chess.com/Lichess-style) ratings. OTB/FIDE/USCF numbers
run roughly 100–300 points lower at the low end and converge near the top.
A shorter, earlier summary lives in
[../coaching-research.md](../coaching-research.md); this folder supersedes
it in detail.

## Band index

| File | Band | One-line profile |
|---|---|---|
| [elo-0400-0600.md](elo-0400-0600.md) | 400–600 | Knows the rules, loses to one-move blunders; games decided by hanging pieces on both sides |
| [elo-0600-0800.md](elo-0600-0800.md) | 600–800 | Develops pieces sometimes; hangs pieces most games; falls for scholar's mate and knight forks |
| [elo-0800-1000.md](elo-0800-1000.md) | 800–1000 | Starts spotting mates-in-1/2 and using forks in own plans; endgames and time still chaotic |
| [elo-1000-1200.md](elo-1000-1200.md) | 1000–1200 | Detects one-move threats; basic motifs fluent one way; middlegame plans vague |
| [elo-1200-1400.md](elo-1200-1400.md) | 1200–1400 | "Real chess": small repertoire, 2–4 ply tactics both ways, first named structures and endgame theory |
| [elo-1400-1600.md](elo-1400-1600.md) | 1400–1600 | The tactical-awareness plateau: few one-move blunders, but bleeds eval in complications; planning gap |
| [elo-1600-1800.md](elo-1600-1800.md) | 1600–1800 | Strong club: real positional play, prophylaxis begins, structure-driven plans, technical endgames |
| [elo-1800-2000.md](elo-1800-2000.md) | 1800–2000 | Near-expert: accurate in all phases, deep calculation; loses on small slips, conversion and psychology |

## Cross-cutting research findings

These apply to every band and shape how the per-band advice was written.

1. **Selection beats depth.** De Groot's classic studies found that experts
   and much weaker players examine a similar *number* of moves; experts
   examine the *right* ones via pattern recognition. Masters average ~7–11
   ply of planning in analysis tasks; grandmasters calculate only slightly
   deeper than candidate masters but far more accurately. Teaching
   "calculate deeper" is almost never the right prescription below 1600 —
   teaching "look at checks, captures and threats first" is.
2. **Each rating has a measurable style.** The Maia project trained one
   network per rating bucket; each predicts a same-rated human's actual
   move >50% of the time and the exact blunder ~25% of the time. Mistakes
   are systematic, therefore predictable, therefore coachable.
3. **Blunder economics dominate below 1800.** Community and coaching
   consensus: below ~1200 more games are decided by hanging pieces than by
   everything else combined; under ~1800 most games still turn on a missed
   two-move tactic. Positional advice only becomes the main lever once the
   tactical bleeding slows.
4. **Error size shrinks smoothly with rating** (average centipawn loss
   falls from multi-pawn per-move errors at 500 to ~0.4 pawns/game-move for
   elite blitz). Our engine-side acceptability window
   (`docs/elo-coaching.md`) mirrors this curve.
5. **The reference curricula agree on sequencing.** The Dutch Steps Method
   (Brunia/van Wijgerden), Silman's *Complete Endgame Course* (organized by
   rating class), and Dan Heisman's improvement guides all sequence:
   board vision → counting → basic motifs → thought process → combinations
   → planning/positional play → technique. Heisman explicitly warns that
   opening-line study below ~1300–1400 is counterproductive beyond a few
   moves plus trap awareness.
6. **Good feedback practice** (from coaching-quality literature): one main
   lesson per game review at lower levels; ask before telling ("what did
   their move threaten?"); explain *why*, not just *what*; adapt tone —
   encouragement dominates below 1200, directness is welcome above 1800.

## How the bands map to our coach

Summary of the per-band tuning hints (details at the end of each file):

| Band | Max line length in explanations | Vocabulary | Coach's #1 job |
|---|---|---|---|
| 400–600 | 1 ply | none (plain words) | "Is anything hanging — yours or theirs?" |
| 600–800 | 2 ply | fork, pin (defined) | checks/captures/threats scan |
| 800–1000 | 2–3 ply | basic motifs bare | spot tactics *for* the player both ways |
| 1000–1200 | 3–4 ply | + remove-the-defender, back rank | thought process + one lesson per review |
| 1200–1400 | 4–5 ply | + decoy, deflection, zwischenzug | combinations & first plans |
| 1400–1600 | 5–6 ply | + positional terms (defined once) | planning, piece activity, complications |
| 1600–1800 | 6–8 ply | full positional vocabulary | prophylaxis & structure-driven plans |
| 1800–2000 | full PV | unrestricted | precision, conversion, psychology |

## Method and sources

Compiled July 2026 from coaching curricula, research papers and reputable
coaching sites, cross-checked against community descriptions of play at
each level. Statistics quoted from single-site datasets (e.g. Lichess game
analyses on coaching blogs) are directional, not peer-reviewed; forum
descriptions are anecdotal consensus, flagged as such where load-bearing.

Primary sources used across the folder:

- **Curricula:** [Steps Method / Stappenmethode](https://www.stappenmethode.nl/en/)
  and [Chess-Steps explained](https://www.chess-steps.com/chess-steps-explained.php);
  [GM Noël Studer on the Steps Method](https://nextlevelchess.com/steps-method-explained/);
  [Silman's Complete Endgame Course — table of contents](https://catdir.loc.gov/catdir/toc/ecip076/2006037884.html)
  ([book](https://www.goodreads.com/book/show/83337.Silman_s_Complete_Endgame_Course));
  [Dan Heisman — Improve/Learn](https://www.danheisman.com/improvelearn.html),
  [Thought Process](https://www.danheisman.com/thought-process-and-general-improvement.html)
- **Research:** [Maia (Introducing Maia)](https://www.maiachess.com/blog/maia-v1),
  [Microsoft Research on Maia](https://www.microsoft.com/en-us/research/blog/the-human-side-of-ai-for-chess/),
  [Maia-2, NeurIPS 2024](https://arxiv.org/pdf/2409.20553);
  [de Groot (chessprogramming wiki)](https://www.chessprogramming.org/Adriaan_de_Groot);
  [Chess players' thinking revisited](https://www.researchgate.net/publication/49399585_Chess_players'_thinking_revisited);
  [Impact of Search Depth on Playing Strength (Ferreira)](https://web.ist.utl.pt/diogo.ferreira/papers/ferreira13impact.pdf)
- **By-rating guides:** [RagChess — Improvement Guide by Rating](https://www.ragchess.com/chess-improvement-guide-based-on-your-rating/);
  [NM Ramirez — Beginner Study Guide 600–1000 (chess.com)](https://www.chess.com/article/view/nm-robert-ramirezs-beginner-study-guide-600-1000-elo);
  [1000ELO — Roadmap 1000→1500](https://1000elo.com/solutions/chess-improvement-roadmap-1000-to-1500);
  [ChessMood study plans](https://chessmood.com/chess-study-plans/for-intermediate-players);
  [TheChessWorld — Mistakes by Rating](https://thechessworld.com/articles/general-information/most-common-chess-mistakes-by-rating-explained-with-fixes/),
  [15 Motifs to reach 1800](https://thechessworld.com/articles/general-information/15-motifs-you-must-know-to-reach-1800-elo-tactics-pattern-checklist/);
  [ChessGameAnalysis — Stuck at 1500](https://www.chessgameanalysis.com/blog/why-you-are-stuck-at-1500);
  [ChessWorld ratings guide](https://www.chessworld.net/chessclubs/openingguide/chess-ratings-guide.asp)
- **Openings:** [ChessAtlas — Openings for Club Players 1200–1800](https://chessatlas.net/blog/opening-guides/the-5-best-chess-openings-for-club-players-1200-1800-elo)
  and [How to Study Openings by Rating](https://chessatlas.net/blog/opening-repertoire-building/how-to-study-chess-openings-the-complete-2026-guide-for-every-rating-level);
  [MyChessPlan — Openings for 1200](https://mychessplan.com/best-chess-openings-1200-elo/)
- **Mates & combinations:** [Chessfox — 36 Checkmate Patterns](https://chessfox.com/checkmate-patterns/);
  [chess.com — Checkmate Patterns](https://www.chess.com/terms/checkmate-chess);
  [Greek gift sacrifice (Wikipedia)](https://en.wikipedia.org/wiki/Greek_gift_sacrifice)
- **Pawn structures:** [Pawn structure (Wikipedia)](https://en.wikipedia.org/wiki/Pawn_structure);
  [TheChessWorld — 10 Pawn Structures](https://thechessworld.com/articles/general-information/10-pawn-structures-in-chess-comprehensive-guide/);
  [Remote Chess Academy — 8 Pawn Structures](https://chess-teacher.com/8-pawn-structures-you-must-know/)
- **Community descriptions per band:** chess.com forum threads on
  [500](https://www.chess.com/forum/view/game-analysis/500-elo-chess-beginner-blunders),
  [800](https://www.chess.com/forum/view/general/how-good-is-800-elo-player) and
  [1600 vs 2000](https://www.chess.com/forum/view/chess-players/difference-between-1600-and-2000-rated-players) play
  (anecdotal); [CircleChess — coaching quality](https://circlechess.com/blog/chess-coaching-quality-how-to-evaluate-online-chess-instruction-platforms/)
