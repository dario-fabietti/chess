# Chess teaching by ELO — deep-dive research

This folder is the knowledge base for tuning the AI coach's feedback. It
splits chess teaching into 200-point rating bands from 400 to 2000. Each
child file describes, for its band: what to expect from players, their
realistic depth of thought, the thought process to teach, and the
tactical ideas, strategic ideas, openings, middlegame skills, checkmate
patterns, pawn structures, typical combinations and endgames that belong
at that level — plus time management, a weekly study plan, a graduation
checklist for the next band, concrete tuning hints for our coach
(`js/levels.js`, `js/llm.js`), and the band's key sources.

Ratings are online (chess.com-style) ratings unless stated otherwise. A
shorter, earlier summary lives in
[../coaching-research.md](../coaching-research.md); this folder
supersedes it in detail.

## Band index

| File | Band | One-line profile |
|---|---|---|
| [elo-0400-0600.md](elo-0400-0600.md) | 400–600 | Knows the rules, loses to one-move blunders; games decided by hanging pieces on both sides |
| [elo-0600-0800.md](elo-0600-0800.md) | 600–800 | Develops pieces sometimes; hangs pieces under light pressure; falls for scholar's mate and knight forks |
| [elo-0800-1000.md](elo-0800-1000.md) | 800–1000 | Starts spotting mates-in-1/2 and using forks in own plans; endgames and time still chaotic |
| [elo-1000-1200.md](elo-1000-1200.md) | 1000–1200 | Detects one-move threats; basic motifs fluent one way; middlegame plans vague |
| [elo-1200-1400.md](elo-1200-1400.md) | 1200–1400 | "Real chess": small repertoire, 2–4 ply tactics both ways, first named structures and endgame theory |
| [elo-1400-1600.md](elo-1400-1600.md) | 1400–1600 | The tactical-awareness plateau: few one-move blunders, but bleeds eval in complications; planning gap |
| [elo-1600-1800.md](elo-1600-1800.md) | 1600–1800 | Strong club: real positional play, prophylaxis begins, structure-driven plans, technical endgames |
| [elo-1800-2000.md](elo-1800-2000.md) | 1800–2000 | Near-expert: accurate in all phases, deep calculation; loses on small slips, conversion and psychology |

## How the reference curricula align with our bands

The three most systematic rating-banded curricula in print, mapped onto
our 200-point bands (details and per-band syllabi in the child files):

| Band | Steps Method (Stappenmethode) | Silman endgame class | Study split (source) |
|---|---|---|---|
| 400–600 | Step 1 (rules, board vision, mate-in-1) | Beginner (unrated–999) | ~90% slow play + vision drills |
| 600–800 | Step 2 first half (double attack, pin, mate-in-2) | Beginner → Class E | ~70% play/review, 25% tactics |
| 800–1000 | Step 2 completing → Step 3 entry | Class E (opposition, what mates) | ~60/30/10 play/tactics/endgame |
| 1000–1200 | Step 3 (thinking ahead, visualization) | Class E → D | 70% tactics / 15% openings / 15% rest (ChessMood 1000–1500) |
| 1200–1400 | Step 3 → Step 4 entry (preparatory move) | Class D → C (Lucena/Philidor intro) | 70/15/15 with growing middlegame slice |
| 1400–1600 | Step 4 (preparatory-move combinations) | Class C (Lucena/Philidor execution) | migrating to 50/30/10/10 (ChessMood 1500–2000) |
| 1600–1800 | Step 5 (strategy pivot; target <2000) | Class B (triangulation, R+2 vs R) | 50% tactics / 30% openings / 10% middle / 10% end |
| 1800–2000 | Step 6 (9–13-ply exercises; target 2000–2100) | Class A → Expert (rook-endgame theory, fortresses) | 50/30/10/10 personalized; ~45% of chess time = playing |

Other consistently used per-band anchors: Silman's *Amateur's Mind*
(1100–1700) and *How to Reassess Your Chess* (1400–2100, sweet spot
1600–2000); Heisman's Novice Nook corpus (written for 1000–1400); GM
Nick Pert's "typical mistakes" video brackets (1000–1600, 1600–1900,
1800–2000); the ChessDojo training program's per-cohort task lists
(0–2500, built around long games + annotation + sparring at every
level); de la Villa's *100 Endgames You Must Know* (working reference
from ~1600).

## Rating context: scales and percentiles

- **Percentiles** (chess.com rapid, active players, ~2025): ~1000 ≈
  50th percentile; 1200 ≈ top 30%; 1600 ≈ top 7%; 1800 ≈ top 3%;
  2000 ≈ top 1%. The median across *all* accounts is far lower
  (~400–650) — "800 is average" and "800 is beginner" are both true,
  depending on the reference population.
- **Cross-site conversion**: the Lichess scale sits ~100–200 points
  above chess.com overall (Lichess rapid ≈ chess.com rapid has recently
  converged; other pools still differ); Lichess rapid 1800 ≈ 1400 USCF
  ≈ ~1600 FIDE. Offsets are most reliable in the 1200–2000 range —
  they stretch below and compress above. OTB (FIDE/USCF) numbers run
  roughly 100–300 below chess.com at club level and converge near the
  top. When the coach cites a rating, it should name the scale.

## Cross-cutting research findings

These apply to every band and shape how the per-band advice was written.

1. **Selection beats depth.** De Groot's classic studies found that
   experts and much weaker players examine a similar *number* of moves;
   experts examine the *right* ones via pattern recognition. Masters
   average ~7–11 ply in analysis tasks; grandmasters calculate only
   slightly deeper than candidate masters but far more accurately (in
   forced lines they can go 15–20+ moves, but that's not where their
   strength lives). Coaching consensus for amateur depth: ~2–3 moves
   ahead at 1300–1599, 4–5 at 1600–1800, 5–10 at 1900+. Teaching
   "calculate deeper" is almost never the right prescription below 1600
   — teaching "look at checks, captures and threats first" is.
2. **Each rating has a measurable style.** The Maia project trained one
   network per rating bucket (1100–1900, 12M games each); each predicts
   a same-rated human's actual move >50% of the time (52%+ at 1900) and
   systematically predicts the *blunders* (moves losing ≥10% expected
   win-rate). Mistakes are systematic, therefore predictable, therefore
   coachable.
3. **Blunder economics dominate below 1800.** Community and coaching
   consensus: below ~1200 more games are decided by hanging pieces than
   by everything else combined; under ~1800 most games still turn on a
   missed two-move tactic. Positional advice only becomes the main
   lever once the tactical bleeding slows.
4. **Error size shrinks smoothly with rating.** Average centipawn loss
   falls from multi-pawn per-move errors at 500 toward ~50 ACPL for
   solid club play in quiet games (~100 in sharp ones); high blunder
   rates are concentrated below ~1500. Our engine-side acceptability
   window (`docs/elo-coaching.md`) mirrors this curve.
5. **The reference curricula agree on sequencing.** Steps Method,
   Silman's endgame course and Heisman's guides all sequence: board
   vision → counting → basic motifs → thought process → combinations →
   planning/positional play → technique. Heisman explicitly warns that
   opening-line study below ~1300–1400 is counterproductive beyond a
   few moves plus trap awareness; at 1500–2000 the opening share
   legitimately rises to ~30% — as structures and model games, not
   memorized lines.
6. **Long games + own-game annotation are the universal backbone.**
   The ChessDojo program prescribes them at every cohort from 0 to
   2500; every per-band study plan in the child files is built around
   3–5 slow games per week with at least one annotated honestly before
   engine-checking. Time-control guidance by band: rapid (15+10) from
   the start, 30+20 from ~1000, classical from ~1400 up; blitz is
   recreational, never the training staple.
7. **Good feedback practice** (from coaching-quality literature): one
   main lesson per game review at lower levels; ask before telling
   ("what did their move threaten?"); explain *why*, not just *what*;
   adapt tone — encouragement dominates below 1200, judgment-level
   praise by 1600, and directness without sugar is welcome above 1800.
8. **Psychology is curriculum from ~1400 up.** The second error follows
   the first within three moves at every amateur level; post-mistake
   reset routines, one-result-thinking counters and clock-state
   awareness are teachable content, not soft garnish — and at
   1800–2000 they are the difference between 4/8 and 6/8 against equal
   opposition.

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

Two coach behaviors recur across every band file and deserve first-class
support in the app:

- **The graduation checklists** (end of each band file) are measurable:
  puzzle accuracy by theme, endgame positions executed vs the engine,
  loss-cause statistics. The coach can track these and tell the player
  *why* their level setting should change.
- **Criticality flagging**: at every level the players misallocate
  thought — the coach should mark moments where the position demands
  extra care (captures/checks available, structure about to change,
  liquidation into a known ending) scaled to the band's blind spots.

## Method and sources

Compiled July 2026 from coaching curricula, research papers and
reputable coaching sites, cross-checked against community descriptions
of play at each level. Statistics quoted from single-site datasets
(e.g. Lichess game analyses on coaching blogs) are directional, not
peer-reviewed; forum descriptions are anecdotal consensus, flagged as
such where load-bearing. Each child file ends with its own source list;
the master list:

- **Curricula:** [Steps Method / Stappenmethode](https://www.stappenmethode.nl/en/)
  (per-step pages: [1](https://www.stappenmethode.nl/en/step1.php),
  [2](https://www.stappenmethode.nl/en/step2.php),
  [3](https://www.stappenmethode.nl/en/step3.php),
  [4](https://www.stappenmethode.nl/en/step4.php),
  [5](https://www.stappenmethode.nl/en/step5.php),
  [6](https://www.stappenmethode.nl/en/the-steps.php)) and
  [Chess-Steps explained](https://www.chess-steps.com/chess-steps-explained.php);
  [GM Noël Studer on the Steps Method](https://nextlevelchess.com/steps-method-explained/);
  [Silman's Complete Endgame Course — table of contents](https://catdir.loc.gov/catdir/toc/ecip076/2006037884.html)
  ([book](https://www.goodreads.com/book/show/83337.Silman_s_Complete_Endgame_Course));
  [Dan Heisman — Improve/Learn](https://www.danheisman.com/improvelearn.html),
  [Thought Process](https://www.danheisman.com/thought-process-and-general-improvement.html),
  [Novice Nook archive](https://chesscafe.com/columns/novice-nook/);
  [ChessDojo training program](https://www.chessdojo.club/)
  ([philosophy](https://www.chess.com/blog/ChessDojo/the-real-philosophy-of-the-dojo-training-program),
  [launch post](https://www.chess.com/blog/ChessDojo/launching-the-dojo-training-program-0-2400))
- **Research:** [Maia (Introducing Maia)](https://www.maiachess.com/blog/maia-v1),
  [CSSLab announcement](http://csslab.cs.toronto.edu/blog/2020/08/24/maia_chess_kdd/),
  [Microsoft Research on Maia](https://www.microsoft.com/en-us/research/blog/the-human-side-of-ai-for-chess/),
  [Maia KDD 2020 paper](https://www.cs.toronto.edu/~ashton/pubs/maia-kdd2020.pdf),
  [Maia-2, NeurIPS 2024](https://arxiv.org/pdf/2409.20553);
  [de Groot (chessprogramming wiki)](https://www.chessprogramming.org/Adriaan_de_Groot);
  [Chess players' thinking revisited](https://www.researchgate.net/publication/49399585_Chess_players'_thinking_revisited);
  [Impact of Search Depth on Playing Strength (Ferreira)](https://web.ist.utl.pt/diogo.ferreira/papers/ferreira13impact.pdf)
- **Study plans by rating:** [ChessMood 1000–1500](https://chessmood.com/chess-study-plans/for-intermediate-players),
  [1500–2000](https://chessmood.com/chess-study-plans/for-advanced-players),
  [2000+](https://chessmood.com/chess-study-plans/for-above-2000);
  [WGM Belenkaya — 1000–1400 guide](https://www.chess.com/article/view/wgm-dina-belenkayas-beginner-intermediate-study-guide-1000-1400-elo);
  [NM Ramirez — 600–1000 guide](https://www.chess.com/article/view/nm-robert-ramirezs-beginner-study-guide-600-1000-elo);
  [RagChess — Improvement Guide by Rating](https://www.ragchess.com/chess-improvement-guide-based-on-your-rating/);
  [1000ELO — Roadmap 1000→1500](https://1000elo.com/solutions/chess-improvement-roadmap-1000-to-1500);
  [TheChessWorld — Mistakes by Rating](https://thechessworld.com/articles/general-information/most-common-chess-mistakes-by-rating-explained-with-fixes/),
  [15 Motifs to reach 1800](https://thechessworld.com/articles/general-information/15-motifs-you-must-know-to-reach-1800-elo-tactics-pattern-checklist/);
  [ChessGameAnalysis — Stuck at 1500](https://www.chessgameanalysis.com/blog/why-you-are-stuck-at-1500);
  [GM Pert — typical mistakes brackets (ChessBase)](https://en.chessbase.com/post/typical-mistakes-by-1000-1600-players-2)
- **Openings:** [ChessAtlas — Openings for Club Players 1200–1800](https://chessatlas.net/blog/opening-guides/the-5-best-chess-openings-for-club-players-1200-1800-elo)
  and [How to Study Openings by Rating](https://chessatlas.net/blog/opening-repertoire-building/how-to-study-chess-openings-the-complete-2026-guide-for-every-rating-level);
  [ChessGoals — openings by skill level](https://chessgoals.com/best-chess-openings-for-all-skill-levels/);
  [AttackingChess — openings 1000–1800](https://www.attackingchess.com/chess-openings-for-intermediate-players/);
  [MyChessPlan — Openings for 1200](https://mychessplan.com/best-chess-openings-1200-elo/)
- **Endgames:** de la Villa, *100 Endgames You Must Know*
  ([review](https://www.attackingchess.com/100-endgames-you-must-know-review-the-most-recommended-endgame-book/));
  [ChessGoals — endgame books](https://chessgoals.com/3-best-chess-endgame-books/)
- **Mates & combinations:** [Chessfox — 36 Checkmate Patterns](https://chessfox.com/checkmate-patterns/);
  [chess.com — Checkmate Patterns](https://www.chess.com/terms/checkmate-chess);
  [freeCodeCamp — beginner mate patterns](https://www.freecodecamp.org/news/checkmate-patterns-in-chess-for-beginners/);
  [Checkmate pattern (Wikipedia)](https://en.wikipedia.org/wiki/Checkmate_pattern);
  [Greek gift sacrifice (Wikipedia)](https://en.wikipedia.org/wiki/Greek_gift_sacrifice)
- **Pawn structures:** [Pawn structure (Wikipedia)](https://en.wikipedia.org/wiki/Pawn_structure);
  [chess.com — Carlsbad structure](https://www.chess.com/terms/carlsbad-pawn-structure-chess);
  [TheChessWorld — 10 Pawn Structures](https://thechessworld.com/articles/general-information/10-pawn-structures-in-chess-comprehensive-guide/);
  [Remote Chess Academy — 8 Pawn Structures](https://chess-teacher.com/8-pawn-structures-you-must-know/)
- **Ratings & percentiles:** [ChessGoals rating comparison](https://chessgoals.com/rating-comparison/);
  [ChessGrandMonkey percentile calculator](https://chessgrandmonkey.com/chess-rating-percentile-calculator-graph);
  chess.com forums on
  [rating distribution](https://www.chess.com/forum/view/community/chess-com-rating-distribution)
- **Community descriptions per band** (anecdotal): chess.com forum
  threads on [sub-600](https://www.chess.com/forum/view/for-beginners/differences-between-200-400-600-800),
  [500](https://www.chess.com/forum/view/game-analysis/500-elo-chess-beginner-blunders),
  [800](https://www.chess.com/forum/view/general/how-good-is-800-elo-player),
  [1600 vs 2000](https://www.chess.com/forum/view/chess-players/difference-between-1600-and-2000-rated-players)
  and [1800→2000 journeys](https://www.chess.com/forum/view/general/how-to-move-from-1800-to-2000);
  [CircleChess — coaching quality](https://circlechess.com/blog/chess-coaching-quality-how-to-evaluate-online-chess-instruction-platforms/)
