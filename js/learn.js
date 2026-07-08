/**
 * Learning section: ELO-tailored explanations.
 *
 * The teaching content is distilled from the research in docs/coaching/
 * (one file per 200-point band, 400–2000). Each band defines:
 *
 *  - skills: what a learner at this level can already do / still gets wrong
 *    (shown as bullets in the learning sidebar);
 *  - goals: what they should be learning right now (bullets);
 *  - an explanation STYLE contract: how deep the shown lines may go
 *    (plies), how many engine candidates to surface, whether evaluations
 *    appear as numbers or words, the allowed vocabulary, what to focus on
 *    and what to avoid, and the one habit the band is building.
 *
 * The same contract drives both outputs:
 *  - buildLearnerPrompt(): the per-ELO prompt for the LLM coach, fed with
 *    engine facts already truncated to the band's depth;
 *  - localExplanation(): an instant rule-based explanation assembled from
 *    the annotated engine candidates (no LLM required).
 *
 * Full strategy rationale: docs/learning-prompts.md.
 */

import { findHangingPieces } from './coach.js';

export const LEARNER_ELO_MIN = 400;
export const LEARNER_ELO_MAX = 2000;
export const LEARNER_ELO_DEFAULT = 800;

/**
 * One entry per 200-ELO band from docs/coaching/elo-*.md.
 * Style fields:
 *   plies       max half-moves shown in any line (2 = one move each side)
 *   candidates  how many engine candidates the explanation may draw on
 *   evals       'none' | 'words' ("wins a knight") | 'pawns' ("about +1")
 *               | 'full' (exact evals and deltas)
 *   wordLimit   hard cap for the LLM answer
 */
export const LEARN_BANDS = [
  {
    min: 400, max: 600, title: 'Absolute beginner', doc: 'elo-0400-0600.md',
    skills: [
      'Knows how the pieces move; shaky on castling, en passant and stalemate',
      'Leaves pieces where they can be taken for free — and misses free captures too',
      'Sees only the move being played, not the opponent’s reply ("hope chess")',
      'Brings the queen out early and pushes side pawns while pieces sleep at home',
      'With a big lead, often stalemates instead of mating',
    ],
    goals: [
      'Before every move ask: "Is my move safe? Can anything of mine be taken?"',
      'Take hanging pieces — free material wins games at this level',
      'Find mate-in-1 for yourself and see it coming against you',
      'Open with a center pawn, develop knights and bishops, castle early',
      'Keep the queen home early; finish K+Q and two-rook mates without stalemate',
    ],
    style: {
      plies: 2, candidates: 2, evals: 'none', wordLimit: 80,
      vocabulary: 'Plain words only: attack, defend, free, safe, take. No motif names (no "fork"/"pin"), no chess jargon, no evaluations in numbers.',
      focus: 'hanging pieces (both sides), free captures, mate-in-1 threats, castling, not bringing the queen out early',
      avoid: 'plans, strategy, pawn structure, openings by name, any line longer than one move for each side',
      habit: 'Before you move: is your move safe, and is anything free to take?',
    },
  },
  {
    min: 600, max: 800, title: 'Beginner', doc: 'elo-0600-0800.md',
    skills: [
      'Develops pieces and castles in most games, from habit more than understanding',
      'Pieces still hang under light pressure; knight forks land constantly',
      'Sees one to two half-moves ahead; recaptures automatically',
      'Loses to back-rank mates while attacking elsewhere',
      'Still tries (and falls for) Scholar’s mate tricks',
    ],
    goals: [
      'Scan checks, captures and threats — the opponent’s first — every move',
      'Spot knight forks both ways; guard the classic fork squares (c2/c7, f2/f7)',
      'Make luft for the king; deliver and prevent back-rank mates',
      'Defend the Scholar’s mate attack correctly, then retire it as White',
      'Count captures on one square before taking; learn mate-in-2 patterns',
    ],
    style: {
      plies: 2, candidates: 2, evals: 'none', wordLimit: 100,
      vocabulary: 'May name "fork" and "pin" but always with a five-word gloss (e.g. "a fork — one move attacking two things"). No numeric evaluations.',
      focus: 'checks/captures/threats, knight forks, back rank and luft, hanging pieces, simple counting on one square',
      avoid: 'strategy talk, pawn-structure names, opening theory beyond "develop and castle", lines longer than one move each side',
      habit: 'Checks, captures, threats — theirs first, then yours.',
    },
  },
  {
    min: 800, max: 1000, title: 'Advancing beginner', doc: 'elo-0800-1000.md',
    skills: [
      'Spots mates-in-1/2 and knight forks in own games — pattern recognition is starting',
      'Misses queen/bishop/rook double attacks (only knight forks are watched)',
      'Follows forced captures two-three half-moves; in-between moves are invisible',
      'Plays a consistent opening setup three to five moves deep',
      'Endgames and the clock are still chaotic',
    ],
    goals: [
      'All basic motifs both ways: fork (every piece), pin, skewer, discovered attack',
      'Remove the defender: capture, chase or overload the one guard',
      'Before recapturing, check checks first (beat the in-between move)',
      'Learn the opposition and the square of the pawn',
      'Stick to one White setup and one defense each vs 1.e4 and 1.d4',
    ],
    style: {
      plies: 3, candidates: 3, evals: 'words', wordLimit: 110,
      vocabulary: 'Basic motif names bare (fork, pin, skewer, discovered attack, back rank). Say "wins a knight", never "+3.2".',
      focus: 'double attacks by every piece, removing the defender, back-rank safety, simple endgame rules (opposition, square of the pawn)',
      avoid: 'positional jargon, structure names, numeric evals, lines beyond three half-moves',
      habit: 'Before recapturing — any check or better move first?',
    },
  },
  {
    min: 1000, max: 1200, title: 'Improving amateur', doc: 'elo-1000-1200.md',
    skills: [
      'Usually sees one-move threats; castles and develops by habit',
      'Solves standard motifs in puzzles but misses them under game pressure',
      'Middlegame plans are vague ("attack something, then see")',
      'Two-move oversights decide most games — the reply-to-the-reply is missed',
      'Clock use is uneven: fast when winning, frozen when worse',
    ],
    goals: [
      'Run the full thought process every move: threat → candidates → blunder-check',
      'Master deflection and overloading (the remove-the-defender family)',
      'Attach a simple plan to every position: open file, outpost, worst piece',
      'Count attackers vs defenders before starting any attack',
      'Be perfect in K+P vs K: opposition used correctly from both sides',
    ],
    style: {
      plies: 4, candidates: 3, evals: 'words', wordLimit: 120,
      vocabulary: 'Basic motifs bare; introduce "deflection" and "overload" with a short gloss. Material in words, numbers only in parentheses ("wins a pawn (+1.1)").',
      focus: 'two-move tactics both ways, the thought process, one simple plan (open file / outpost / improve the worst piece), the opponent’s best threat by name',
      avoid: 'deep strategy, structure lectures, more than one lesson per explanation',
      habit: 'After you pick a move: what is their best check, capture or threat in reply?',
    },
  },
  {
    min: 1200, max: 1400, title: 'Developing club player', doc: 'elo-1200-1400.md',
    skills: [
      'One-move blunders are rare; plays "real chess" with a small repertoire',
      'Sees three to five half-moves; calculation stops one forcing move short',
      'Knows Lucena and Philidor by name; technique still shaky',
      'Loses to 2–3-move tactics, strategic drift, and unconverted wins',
      'Attacks sometimes launched on excitement without counting defenders',
    ],
    goals: [
      'Second-tier motifs to fluency: deflection, decoy, x-ray, clearance, interference',
      'List two or three candidate moves before calculating any of them',
      'Calculate to quiescence — stop only when no checks, captures or threats remain',
      'Learn the Greek gift (Bxh7+) conditions — to play it and to survive it',
      'First named structures: IQP plans and the Carlsbad minority attack',
    ],
    style: {
      plies: 5, candidates: 4, evals: 'pawns', wordLimit: 140,
      vocabulary: 'Full tactical vocabulary bare (zwischenzug, deflection, decoy). Light positional terms (outpost, open file, bishop pair) free; structure names with a one-line gloss. Evals as pawns ("this gives back about 0.8").',
      focus: 'combinations of two motifs, candidate discipline, one tactical + one positional observation, attack prerequisites, endgame pattern names (Lucena/Philidor)',
      avoid: 'dumping full engine lines — show the first two moves and the idea, then the punchline',
      habit: 'Candidates first: name two or three moves before you calculate one.',
    },
  },
  {
    min: 1400, max: 1600, title: 'Club player (tactical plateau)', doc: 'elo-1400-1600.md',
    skills: [
      'Avoids simple blunders but bleeds advantage in complications (~0.8 pawns/move)',
      'Typically one piece sits underactive for long stretches of the middlegame',
      'Plans exist but win quiet positions barely more often than not',
      'Openings respectable; visualization survives one quiet move inside a line',
      'Under time pressure calculation collapses back to two half-moves',
    ],
    goals: [
      'Verify forcing lines to quiescence — every branch, especially the refutation',
      'Every few moves: name your worst piece and a route to improve it',
      'Ask "what does my opponent want?" before committing to your plan',
      'Manage pawn tension: keep it, release it or transform it on purpose',
      'Structure-driven plans: minority attack, IQP both sides, hanging pawns',
    ],
    style: {
      plies: 6, candidates: 4, evals: 'full', wordLimit: 160,
      vocabulary: 'Positional vocabulary open (prophylaxis, tension, blockade) — define a term once if unusual. Engine deltas natural.',
      focus: 'complication entry ("from here every move must be verified"), the underactive piece, plans matched to the structure by name, refutation branches when a line fails',
      avoid: 'move-by-move praise; praise decisions (keeping tension, right trade) instead',
      habit: 'Entering a forcing line? Then every reply — including the ugly one — gets checked.',
    },
  },
  {
    min: 1600, max: 1800, title: 'Strong club player', doc: 'elo-1600-1800.md',
    skills: [
      'Real positional play; a clear plan now wins quiet positions (~68% above 1700)',
      'Calculates five to eight half-moves with decent branch discipline',
      'Loses on transition moments: opening→middlegame, attack→conversion, trades into endings',
      'Signature errors: wrong exchanges, tolerated passive pieces, missed counterplay',
      'Endgame names known; technique not yet automatic under the clock',
    ],
    goals: [
      'Prophylaxis as routine: state the opponent’s plan every single move',
      'The principle of two weaknesses: fix one, create a second, stretch the defense',
      'Full structure fluency: Carlsbad, IQP, hanging pawns, Maroczy, Hedgehog, chains',
      'The positional exchange sacrifice as a real option, judged by compensation',
      'Class B endgames: triangulation, R+2 vs R, Lucena with a rook-pawn, Vancura',
    ],
    style: {
      plies: 8, candidates: 5, evals: 'full', wordLimit: 170,
      vocabulary: 'Unrestricted positional vocabulary; structures referenced by name without gloss.',
      focus: 'the opponent’s plan every time, the structure’s demanded plan, transition moments ("this trade enters a Class-A rook ending — check it first"), full refutation branches',
      avoid: 'sugar-coating; praise only judgment calls (right trade, right transformation moment)',
      habit: 'Before your plan: what does the opponent want, and must it be stopped?',
    },
  },
  {
    min: 1800, max: 2000, title: 'Advanced club / near-expert', doc: 'elo-1800-2000.md',
    skills: [
      'Accurate in all phases; single tactical accidents usually decide games',
      'Calculates seven to ten half-moves in forcing lines; evaluation is the limiter',
      'Loses on small accumulating slips, conversion technique and the clock',
      'Preparation depth matters; psychology (the error after the error) costs points',
      'Theoretical endgames known; queen endings and fortresses still frontier',
    ],
    goals: [
      'Calculation economy: prune by evaluation, know when NOT to calculate',
      'Convert cleanly: choose the boring win, deny counterplay, "do not hurry"',
      'Deep prophylaxis: play against the opponent’s plan, Karpov-style',
      'Rook-endgame theory automatic: Lucena/Philidor families, Vancura, rook in front',
      'Structure transformations as strategy: steer trades between structures',
    ],
    style: {
      plies: 12, candidates: 5, evals: 'full', wordLimit: 180,
      vocabulary: 'Unrestricted, terse, quantified. Full PVs and exact evals welcome.',
      focus: 'precision ("this keeps +1.4, the alternative drops to +0.4"), the demanded plan and the counterplay window, conversion and simplification choices, challenges ("find the refutation of ...Nxe4")',
      avoid: 'praise (unless a genuinely hard resource was found), simplified vocabulary, hidden lines',
      habit: 'Name the ending before you trade into it — and its theoretical result.',
    },
  },
];

export function clampLearnerElo(v) {
  if (!Number.isFinite(v)) return LEARNER_ELO_DEFAULT;
  return Math.max(LEARNER_ELO_MIN, Math.min(LEARNER_ELO_MAX, Math.round(v / 50) * 50));
}

/** The band a learner ELO falls into (2000 belongs to the top band). */
export function bandForElo(elo) {
  const e = clampLearnerElo(elo);
  return LEARN_BANDS.find((b) => e >= b.min && e < b.max) ?? LEARN_BANDS[LEARN_BANDS.length - 1];
}

/** Truncate a SAN line ("1.e4 e5 2.Nf3 …") to at most `plies` half-moves. */
export function truncatePv(pvSan, plies) {
  if (!pvSan) return '';
  return pvSan.split(' ').slice(0, plies).join(' ');
}

const describeEval = {
  none: () => null,
  words: (c) => (c.deltaCp === 0 ? 'the engine’s top choice'
    : c.deltaCp >= 90 ? 'clearly weaker than the best move'
      : 'almost as good as the best move'),
  pawns: (c) => (c.deltaCp === 0 ? 'engine best'
    : `about ${(c.deltaCp / 100).toFixed(1)} pawns worse than best`),
  full: (c) => (c.deltaCp === 0 ? `engine best (eval ${c.scoreText})`
    : `eval ${c.scoreText}, ${(c.deltaCp / 100).toFixed(2)} pawns off best`),
};

/**
 * Engine facts trimmed to what a learner of this band should see:
 * fewer candidates, shorter lines, evals per the band's eval mode.
 * This is the "right level of depth" feeding the prompts.
 */
export function factsForBand(facts, band) {
  const s = band.style;
  const candidates = (facts.candidates ?? []).slice(0, s.candidates).map((c) => ({
    san: c.san,
    line: truncatePv(c.pvSan, s.plies),
    evalNote: describeEval[s.evals](c),
    features: c.features,
    deltaCp: c.deltaCp,
    rank: c.rank,
  }));
  const mover = facts.turn;
  const own = findHangingPieces(facts.fen, mover);
  const enemy = findHangingPieces(facts.fen, mover === 'w' ? 'b' : 'w');
  return { candidates, hangingOwn: own, hangingEnemy: enemy };
}

/**
 * The per-ELO prompt. Engine output arrives pre-truncated to the band's
 * depth so the LLM cannot leak deeper lines than the learner can absorb.
 */
export function buildLearnerPrompt(facts) {
  const band = bandForElo(facts.learnerElo);
  const s = band.style;
  const { candidates, hangingOwn, hangingEnemy } = factsForBand(facts, band);
  const moverName = facts.turn === 'w' ? 'White' : 'Black';

  const candidateText = candidates.map((c, i) => {
    const bits = [c.features.join(', ')];
    if (c.evalNote) bits.push(c.evalNote);
    return `${i + 1}. ${c.san} — ${bits.join('; ')}.${c.line ? ` Line: ${c.line}` : ''}`;
  }).join('\n');

  const hangText = (list, whose) => (list.length === 0 ? null
    : `${whose} pieces attacked and not safely defended: `
      + list.map((h) => `${h.name} on ${h.square}${h.undefended ? ' (undefended)' : ''}`).join(', ') + '.');

  return [
    `You are a chess coach. Your student is rated about ${facts.learnerElo} Elo`
      + ` — ${band.title.toLowerCase()} (the ${band.min}–${band.max} band).`,
    '',
    'STUDENT PROFILE (what they can and cannot do yet):',
    ...band.skills.map((x) => `- ${x}`),
    '',
    'CURRENT LEARNING GOALS (teach toward these, one at a time):',
    ...band.goals.map((x) => `- ${x}`),
    '',
    'STYLE CONTRACT for this level — follow it strictly:',
    `- ${s.vocabulary}`,
    `- Never show a line longer than ${s.plies} half-moves`
      + ` (${Math.ceil(s.plies / 2)} move${s.plies > 2 ? 's' : ''} per side).`,
    `- Focus on: ${s.focus}.`,
    `- Avoid: ${s.avoid}.`,
    `- Plain text, no markdown, at most ${s.wordLimit} words.`,
    '',
    'ENGINE GROUND TRUTH (already trimmed to this student’s depth — do not',
    'calculate or invent lines beyond it):',
    `Position (FEN): ${facts.fen}`,
    `Side to move: ${moverName}`,
    facts.recentMoves ? `Recent moves: ${facts.recentMoves}` : null,
    facts.lastMoveSan ? `Last move played: ${facts.lastMoveSan}` : null,
    s.evals === 'full' ? `Engine evaluation: ${facts.evalText} (positive = better for White)` : null,
    'Candidate moves, engine order:',
    candidateText || '(engine still thinking)',
    facts.recommended ? `Most teachable move for this student: ${facts.recommended.san}` : null,
    facts.threatSan ? `If ${moverName} did nothing, the opponent would play: ${facts.threatSan}` : null,
    hangText(hangingOwn, `${moverName}'s own`),
    hangText(hangingEnemy, 'The opponent’s'),
    '',
    `TASK: explain this position to the student and recommend ONE move they`,
    `can find and understand (prefer the "most teachable" move above). Teach`,
    `exactly one lesson — the most valuable one for their goals — not three.`,
    facts.threatSan ? 'Make sure they see the opponent’s threat.' : null,
    `If it fits naturally, end by reinforcing the habit: "${s.habit}"`,
  ].filter((x) => x !== null).join('\n');
}

/**
 * Instant rule-based explanation from the engine facts — same style
 * contract as the LLM prompt, no LLM required. Used to fill the learning
 * sidebar's explanation field live, and as the offline fallback.
 */
export function localExplanation(facts) {
  const band = bandForElo(facts.learnerElo);
  const s = band.style;
  const { candidates, hangingOwn, hangingEnemy } = factsForBand(facts, band);
  const moverName = facts.turn === 'w' ? 'White' : 'Black';
  const out = [];

  if (facts.gameOver) return 'The game is over — step back through the moves to review it.';
  if (candidates.length === 0) return 'The engine is still looking at this position…';

  // 1. Danger first: the opponent's threat, then own loose pieces.
  // Below 1200 a quiet "threat" (a developing move) is noise — mention the
  // opponent's idea only when it takes something or gives check.
  const forcing = /[x+#]/.test(facts.threatSan ?? '');
  if (facts.threatSan && (forcing || facts.learnerElo >= 1200)) {
    out.push(forcing
      ? `Careful: if you do nothing, the opponent plays ${facts.threatSan}.`
      : `The opponent's idea, given a free move, is ${facts.threatSan} — factor it into your choice.`);
  }
  if (hangingOwn.length > 0) {
    const h = hangingOwn[0];
    out.push(`Your ${h.name} on ${h.square} is ${h.undefended ? 'not defended' : 'attacked by a cheaper piece'} — is it safe?`);
  }

  // 2. Opportunity: enemy pieces available for free (the low bands' bread and butter).
  if (hangingEnemy.length > 0 && facts.learnerElo < 1400) {
    const h = hangingEnemy[0];
    out.push(`Look: the opponent's ${h.name} on ${h.square} is ${h.undefended ? 'free to take' : 'poorly defended'}.`);
  }

  // 3. Recommendation, at the band's depth.
  const rec = candidates.find((c) => c.san === facts.recommended?.san) ?? candidates[0];
  const why = rec.features.join(', ');
  let line = '';
  if (s.plies > 2 && rec.line) line = ` Line: ${rec.line}.`;
  const evalNote = rec.evalNote && s.evals !== 'none' ? ` (${rec.evalNote})` : '';
  out.push(`Recommended for ${moverName}: ${rec.san} — ${why}${evalNote}.${line}`);

  // 4. Alternative for club level and up.
  if (facts.learnerElo >= 1200 && candidates.length > 1) {
    const alt = candidates.find((c) => c !== rec);
    if (alt) {
      const altNote = alt.evalNote ? ` (${alt.evalNote})` : '';
      out.push(`Also worth calculating: ${alt.san}${altNote}.`);
    }
  }

  // 5. The band's habit, as the closing reminder.
  out.push(`Habit: ${s.habit}`);
  return out.join('\n\n');
}
