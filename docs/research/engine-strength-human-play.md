# Engine strength limiting & human-like play

*How Stockfish gets weakened, why that isn't human, and what actually
models human play at a rating.*

## 1. Stockfish Skill Level — internals

Sources: [Stockfish FAQ/docs](https://official-stockfish.github.io/docs/stockfish-wiki/Stockfish-FAQ.html),
[UCI docs](https://official-stockfish.github.io/docs/stockfish-wiki/UCI-&-Commands.html),
[PR #393](https://github.com/official-stockfish/Stockfish/pull/393),
[issue #4717](https://github.com/official-stockfish/Stockfish/issues/4717).

- With `Skill Level < 20`, Stockfish searches with **MultiPV = 4** and then
  picks among candidates using a **randomized bias added to sub-optimal
  moves' scores** — lower level ⇒ bigger random boosts ⇒ higher chance a
  weaker move is chosen. The pick happens at a shallow depth tied to the
  level (level 0 picks at depth 1).
- `UCI_LimitStrength` + `UCI_Elo` converts Elo → fractional Skill Level:

```
skill = clamp( ((UCI_Elo − 1346.6) / 143.4)^(1/0.806), 0, 20 )
```

  (so ~1347 Elo ⇒ skill 0, ~2864+ ⇒ 20). Calibrated at 60s+0.6s, anchored
  to CCRL 40/4. `UCI_Elo` takes precedence over `Skill Level` if both set.
- Inverse (skill → approx Elo): `Elo ≈ 1346.6 + 143.4 · skill^0.806`.
  Handy table: skill 0 ≈ 1347, 5 ≈ 1871, 10 ≈ 2262, 15 ≈ 2607, 20 ≈ 2864
  (CCRL scale — roughly online-blitz-rating minus a few hundred for humans;
  our in-app level labels are already approximations).

**Why it feels robotic**: the weakening is *random noise*, so low levels mix
GM-level moves with nonsense — unlike humans, who err *systematically*
(miss backward moves, grab material, miss long diagonals). This is the gap
human-like models fill.

## 2. Maia — human move prediction per rating

Papers: [Maia, KDD 2020](https://www.cs.toronto.edu/~ashton/pubs/maia-kdd2020.pdf) ·
[Maia-2, NeurIPS-era 2024](https://arxiv.org/pdf/2409.20553) ·
[per-player Maia, KDD 2022](https://www.cs.toronto.edu/~ashton/pubs/maia-individual-kdd2022.pdf) ·
weights: [maiachess.com](https://www.maiachess.com/), HuggingFace `UofTCSSLab`.

- AlphaZero/lc0-style **policy network trained on human games** from
  specific rating buckets (Maia-1: nine models, 1100…1900). Used
  **without search** (raw policy) to predict the human move.
- Move-matching accuracy: ~51% (Maia-1100) to ~53% (Maia-1900); Maia-2 is a
  single model conditioned on rating (smooth interpolation, no bucket
  jumps); Maia-3 family reports ~57% match.
- Maia-2 also predicts **blunder probability per position** — directly
  useful for "what will a 1200 actually miss here", i.e. ELO-aware coaching
  that knows *which* mistakes are human at a level, not just how large.
- Practicalities for us: weights are lc0 networks (Maia-1 ~free licenses);
  running in-browser needs lc0-wasm or ONNX conversion — real but
  significant work; a `claude -p`-orchestrated local lc0 install is the
  low-effort path (desktop only, like our Claude bridge).

## 3. Noctie — the commercial human-like trainer

[noctie.ai](https://noctie.ai/faq/): proprietary model "trained on billions
of human games"; plays humanlike at an adjustable level; **grades each move
by how it 'looks' from a human perspective** (color scale, not centipawns);
auto-generates **flashcards from your biggest mistakes** after each game.
Take: validates the product direction (human-like sparring + personal
flashcards); their grading axis ("human-plausible") is complementary to
engine truth — our Claude coach can approximate that verbally.

## 4. What this repo does today & upgrade paths

Today: sparring = Stockfish `Skill Level` 0–20 + movetime caps (8 levels);
coach recommendations use our own findability heuristic
(`levels.js: windowCp + simplicity`) rather than a learned model.

Paths, cheap → expensive:
1. **Switch sparring to `UCI_LimitStrength/UCI_Elo`** so level labels are
   honest Elo numbers tied to the formula above (one-line UCI change,
   supported by Stockfish WASM builds).
2. **Human-plausibility via Claude**: at classification time ask "would a
   ~1200 consider this?" using the facts we already send — free, coarse.
3. **Maia-lite**: bundle Maia-1 policy for 2–3 bands via ONNX-web for
   move *prediction only* (blunder-anticipation, "most humans here play X") —
   keep Stockfish for truth.
4. **Full human sparring** (Maia as opponent): needs lc0 runtime; desktop
   bridge first, WASM later.
