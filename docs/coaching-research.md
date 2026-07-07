# Chess coaching by rating — research summary

Purpose: reference material for tuning the AI coach's feedback. For each
rating band it collects what research and established coaching curricula say
about how such players think, how they fail, what they can absorb, and how a
good teacher talks to them. The final section translates this into concrete
prompt/algorithm parameters for our coach.

Ratings are approximate online (Lichess/chess.com-style) ratings; OTB/USCF
equivalents run roughly 100–300 points lower at the low end. Sources are
listed at the bottom.

---

## Cross-cutting research findings

**Calculation depth is not what separates levels.** De Groot's classic study
(1946) found masters and weaker tournament players investigate a similar
*number* of positions; what differs is *which* moves they consider — experts
prune to the right candidates immediately via pattern recognition. Masters
averaged ~3.6–5.4 moves (7–11 ply) of planning with maxima around 9 moves;
grandmasters calculate only slightly deeper than candidate masters but far
more accurately. Practical coaching implication: don't teach beginners to
"calculate deeper"; teach them to notice what's on the board first.

**There is a measurable "style" per rating.** The Maia project (Toronto /
Microsoft Research) trained networks per rating bucket (1100–1900) that
predict the *actual* move of a same-rated human >50% of the time — and even
predict the exact blunder ~25% of the time. Mistakes at each level are
systematic and learnable, not random noise. This validates rating-targeted
coaching: an 1100's mistakes are predictable and therefore teachable.

**Error size shrinks smoothly with rating.** Average centipawn loss falls
from multi-pawn errors per game at beginner level to ~40 aCPL for
super-strong blitz players. This supports our engine-side "acceptability
window" that decays with rating (docs/elo-coaching.md).

**Blunder economics.** Below ~1200, more games are decided by hanging pieces
than by everything else combined; the majority of games under ~1800 are
still decided by a missed *two-move* tactic. Strategy talk is wasted words
until the tactical bleeding stops.

**Established curricula agree on sequencing.** The Dutch Steps Method
(Brunia/van Wijgerden, used by federations across Europe) and Silman's
*Complete Endgame Course* both structure content strictly by rating, and
Dan Heisman's improvement guides sequence skills the same way: board vision
→ tactics → thought process → planning/positional play → technique. Heisman
is explicit that studying opening lines before ~1300–1400 is
counterproductive (beyond 4–5 moves and trap avoidance).

---

## Rating band profiles

### ~600–1000 · Beginner

| Parameter | Evidence-based profile |
|---|---|
| Realistic thinking depth | 1–2 ply reliably; plays "hope chess" (moves without asking what the opponent's reply threatens — Heisman). Steps 1 exercises are 1–2 ply. |
| Typical blunders | Hanging pieces (the #1 game decider); not *taking* free pieces; missing one-move threats & mate-in-1 (both directions); stalemating with overwhelming material; rushing basic mates; bringing the queen out early and losing tempi; moving the same piece repeatedly. |
| Tactics within reach | Counting (is a capture safe?), loose/undefended pieces, mate in 1, profitable exchanges, simple twofold attack. |
| Strategy within reach | Three rules only: control the center, develop pieces, castle early. Piece values. "Every opening move should serve one of these." |
| Endgame needs (Silman <1000) | K+Q and K+R mates; stalemate awareness; overkill mates. |
| What a good teacher does | Builds one habit: the **safety check** — before moving: "is my move safe? after their reply, what's attacked?" After the game, picks ONE lesson, not ten. No opening theory, no long variations, heavy encouragement — the main risk at this level is quitting. |

### ~1000–1400 · Developing club player

| Parameter | Evidence-based profile |
|---|---|
| Realistic thinking depth | 2–4 ply (Steps 2 exercises are exactly this range). Sees own threats; forgets the opponent's. Still regular one-move blunders, but they're the exception now, not the rule. |
| Typical blunders | Missed simple tactics both ways (forks, pins, back rank); wrong counting on multi-piece exchanges; ignoring development to grab pawns; unprotected back rank; leaving king in center; "auto-recapture" without checking in-between moves. |
| Tactics to train | Fork/double attack (all pieces), pin, skewer, discovered attack, back-rank mate, mate in 2, elimination/removal of the defender (introduction), attacker-vs-defender counting. Daily short tactics drills are the highest-ROI training here. |
| Strategy within reach | Piece activity, open files for rooks, simple pawn weaknesses (doubled/isolated), trading when ahead in material, king safety as a plan. First 4–5 moves of one White and one Black opening — ideas, not lines (Heisman). |
| Endgame needs (Silman 1000–1400) | K+P: opposition, square of the pawn; basic promotion races; which side to trade toward. |
| What a good teacher does | Installs a **thought process** (Heisman's "Real Chess"): every move, scan checks, captures and threats — theirs first. Reviews games around the 2–3 recurring tactical patterns the student misses. Introduces named motifs one at a time; asks "what did their last move threaten?" rather than telling. |

### ~1400–1800 · Club player

| Parameter | Evidence-based profile |
|---|---|
| Realistic thinking depth | 4–6 ply in tactical positions (Steps 3–4; Step 4 introduces the "preparatory move" — tactics that must be set up one move in advance). Vision extends to ~4-move combinations but forcing lines get miscalculated when a quiet move appears mid-sequence. |
| Typical blunders | 2–3-move tactical oversights (zwischenzug, removal of defender); unsound pawn storms; flank attacks while the center is open; attacking with too few pieces; blindly following principles when the position demands concrete play; mishandling technically won or drawn endgames; failing to punish opponent inaccuracies. |
| Tactics to train | Deflection, decoy/attraction, x-ray, discovered/double check, in-between moves, trapping pieces, clearance, a standard mating-pattern library (Greek gift, smothered, Anastasia's…), defensive tactics. |
| Strategy within reach | Weak squares & outposts, pawn breaks, good vs bad bishop, bishop pair, when to trade which pieces, planning from pawn structure, basic imbalances (Silman's *Amateur's Mind* / *Elements of Positional Evaluation* territory per Heisman's ~1600 recommendation). |
| Endgame needs (Silman 1400–1800) | Lucena and Philidor rook endings; outflanking; opposition in depth; minor-piece endings; rook activity ("rooks belong behind passed pawns"). |
| What a good teacher does | Shifts from "what" to **why**: makes the student annotate their own games and verbalize plans; teaches candidate-move discipline; connects openings to middlegame plans; assigns structured endgame technique. Feedback compares the student's plan against the position's demands, not just against the engine. |

### ~1800–2200 · Advanced tournament player

| Parameter | Evidence-based profile |
|---|---|
| Realistic thinking depth | 6–10 ply in forcing lines (Steps 5 exercises are 7–10 ply); depth is now limited by visualization accuracy, not by knowledge of motifs. |
| Typical blunders | Errors deep inside otherwise-correct calculation; evaluation errors at the end of lines; wrong piece trades; neglecting prophylaxis (opponent's plan); poor conversion of winning advantages; time-pressure collapses; over-pressing equal positions. |
| Tactics to train | Combinations requiring quiet preparatory moves; defensive resources and counter-tactics; calculation training proper: candidate moves, comparison, stepping-stone visualization (Kotov-style trees, used critically). |
| Strategy within reach | Pawn-structure families and their plans; prophylactic thinking; the principle of two weaknesses; maneuvering; dynamic compensation for material; converting static advantages. |
| Endgame needs (Silman 1800–2200) | Triangulation, zugzwang technique, fortresses, cat-and-mouse, practical rook-ending technique, building a box. |
| What a good teacher does | Targets the student's **specific recurring weakness** (found by reviewing many of their games, not one); builds a real repertoire around understanding; trains calculation under clock pressure; adds psychology — time management, emotional control after mistakes. Feedback can be direct and concrete; lines are welcome. |

### ~2200+ · Expert / master

| Parameter | Evidence-based profile |
|---|---|
| Realistic thinking depth | 10+ ply in forcing sequences; Carlsen-class players claim 15–20 in forced lines, but selection quality still dominates raw depth. |
| Typical blunders | Small eval slips accumulating; preparation gaps; fatigue and psychological errors; misjudged dynamic/static trade-offs. |
| Training focus | Deep opening preparation with engine + human filtering; endgame theory completion; sparring against equal/stronger opposition; targeted fixing of statistically weak phases. |
| What a good teacher does | Acts as a peer/second: concrete analysis, honest evaluation disputes, preparation help. Engine-level nuance is welcome; motivational scaffolding is not needed. |

---

## Implications for our coach (tuning hooks)

These map directly onto `js/levels.js` (recommendation) and `js/llm.js`
(prompt). Suggested per-band parameters to implement when fine-tuning:

| Band | Max line shown | Coach vocabulary | Blunder checklist to emphasize | Feedback tone |
|---|---|---|---|---|
| <1000 | 1 move each side | no jargon; name pieces and squares | "is anything hanging (yours AND theirs)? any check/capture against you?" | warm, one lesson at a time, praise safe moves |
| 1000–1400 | 2–3 moves | basic motif names, each briefly defined | checks/captures/threats scan; back rank; counting exchanges | encouraging, name the recurring pattern |
| 1400–1800 | 4–5 moves | full tactical vocabulary, light positional terms | in-between moves; premature attacks; endgame technique | balanced praise/criticism, always give the *why* |
| 1800–2200 | full PV | positional vocabulary incl. prophylaxis, structures | deep-line verification; opponent's plan; conversion technique | direct, concrete, engine deltas OK |
| 2200+ | full PV + evals | unrestricted | eval nuances, preparation | peer-level, terse |

Additional hooks the research supports:

1. **Threat-first coaching at low ELO.** Since hanging pieces decide most
   sub-1200 games, the red threat arrow + hanging-piece warnings should be
   the loudest coach output at low slider values, and the LLM prompt should
   ask "point out anything undefended on both sides" before discussing plans.
2. **One-lesson-per-review.** Post-move feedback below ~1400 should pick the
   single most instructive point, not enumerate all inaccuracies (mirrors
   good human coaching and avoids discouragement).
3. **Socratic phrasing option.** Good teachers ask ("what did White's last
   move attack?") before telling; a "quiz me" mode is a natural extension.
4. **Move-quality thresholds by rating.** Our fixed classification
   thresholds (10/40/90/200 cp) could scale with the slider: a 60 cp loss is
   a fine move at 800 and a mistake at 2200 — consistent with the aCPL
   research.
5. **Openings: ideas not lines below 1400** (Heisman). The coach should
   explain opening moves via principles, and only name concrete theory at
   higher slider values.
6. **Endgame flags by band.** When the game reaches a known theoretical
   ending (Lucena/Philidor/opposition), the coach can name it and calibrate
   expectations to the Silman band for the chosen ELO.

---

## Sources

- [Dan Heisman — Improve/Learn](https://www.danheisman.com/improvelearn.html) and
  [Thought Process & General Improvement](https://www.danheisman.com/thought-process-and-general-improvement.html);
  [A Guide to Chess Improvement](https://www.amazon.com/Guide-Chess-Improvement-Best-Novice/dp/1857446496)
  ("Real Chess" thought process, opening-study warning, phase-based book advice)
- [Steps Method / Stappenmethode](https://www.stappenmethode.nl/en/) and
  [Chess-Steps explained](https://www.chess-steps.com/chess-steps-explained.php);
  [GM Noël Studer — The Chess Step Method Explained](https://nextlevelchess.com/steps-method-explained/)
  (per-step content and exercise ply depths)
- [Silman's Complete Endgame Course](https://www.goodreads.com/book/show/83337.Silman_s_Complete_Endgame_Course)
  (endgame knowledge organized by rating class)
- [Maia Chess — Introducing Maia](https://www.maiachess.com/blog/maia-v1);
  [Microsoft Research — The human side of AI for chess](https://www.microsoft.com/en-us/research/blog/the-human-side-of-ai-for-chess/);
  [Maia-2 (NeurIPS 2024)](https://arxiv.org/pdf/2409.20553)
  (rating-specific human move/blunder prediction)
- [De Groot — chessprogramming wiki](https://www.chessprogramming.org/Adriaan_de_Groot);
  [Chess players' thinking revisited (ResearchGate)](https://www.researchgate.net/publication/49399585_Chess_players'_thinking_revisited);
  [Ferreira — The Impact of Search Depth on Chess Playing Strength](https://web.ist.utl.pt/diogo.ferreira/papers/ferreira13impact.pdf)
  (calculation depth research)
- [TheChessWorld — Most Common Chess Mistakes by Rating](https://thechessworld.com/articles/general-information/most-common-chess-mistakes-by-rating-explained-with-fixes/);
  [Premier Chess — 10 Common Beginner and Intermediate Mistakes](https://premierchess.com/chess-pedagogy/10-common-beginner-and-intermediate-mistakes);
  [TheChessWorld — 15 Motifs to Reach 1800](https://thechessworld.com/articles/general-information/15-motifs-you-must-know-to-reach-1800-elo-tactics-pattern-checklist/)
  (blunder and motif breakdowns by level)
- [RagChess — Improvement Guide Based on Your Rating](https://www.ragchess.com/chess-improvement-guide-based-on-your-rating/);
  [ChessWorld — Chess Ratings Guide](https://www.chessworld.net/chessclubs/openingguide/chess-ratings-guide.asp)
  (skill descriptions per rating band)
- [Medium — Centipawn Loss / Elo correlation](https://medium.com/@enzo.leon/data-science-and-chess-centipawn-loss-elo-correlation-e06089efd8b8);
  [Chess Digits — Predicting Rating from Centipawn Loss](https://sites.google.com/view/patrick-coulombe-phd/chess-analytics/predicting-rating-from-centipawn-loss)
  (aCPL-by-rating statistics)
- [CircleChess — Evaluating chess coaching quality](https://circlechess.com/blog/chess-coaching-quality-how-to-evaluate-online-chess-instruction-platforms/)
  (coaching feedback best practices)
