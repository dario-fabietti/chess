/**
 * ELO-aware move suggestion.
 *
 * Approach (see docs/elo-coaching.md for the full study): the engine analyzes
 * at full strength with MultiPV; we then pick the move to *coach toward* by
 * combining two rating-dependent ideas:
 *
 *  1. Acceptability window — how much evaluation a player of this level can
 *     afford to give up vs the engine-best move (wide for beginners, ~0 for
 *     experts).
 *  2. Human findability — within the window, prefer moves that are easy to
 *     find and understand: captures (especially of undefended pieces),
 *     checks, castling, development, central pawn play. Quiet engine-subtle
 *     moves rank low for beginners and high for experts (where the window is
 *     tiny anyway, so the engine move wins).
 *
 * The same annotations are fed to the LLM so it can explain candidates in
 * human terms rather than recalculate anything.
 */
import { Chess } from '../vendor/chessjs/chess.js';

export const ELO_MIN = 600;
export const ELO_MAX = 2600;
export const ELO_DEFAULT = 1200;

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const HOME_RANK = { w: '1', b: '8' };
const CENTER = new Set(['d4', 'e4', 'd5', 'e5', 'c4', 'c5', 'f4', 'f5']);

/** How the coaching audience changes with rating. */
export function audienceProfile(elo) {
  if (elo < 1000) return {
    label: 'a beginner',
    guidance: 'Focus on: not hanging pieces, spotting simple captures and checks, and basic opening principles (control the center, develop pieces, castle early). Use no jargon, and no variation longer than one move for each side.',
  };
  if (elo < 1400) return {
    label: 'a developing club player',
    guidance: 'Focus on: simple tactics (forks, pins, skewers), undefended pieces, piece activity and king safety. Keep variations to two or three moves and briefly explain any named concept you use.',
  };
  if (elo < 1800) return {
    label: 'a club player',
    guidance: 'Focus on: plans, weak squares, outposts, pawn breaks, which pieces to trade, and simple endgame goals. Variations up to four or five moves are fine.',
  };
  if (elo < 2200) return {
    label: 'an advanced tournament player',
    guidance: 'Discuss pawn structure, prophylaxis, piece placement subtleties and concrete tactical justifications. Concrete lines are welcome.',
  };
  return {
    label: 'an expert',
    guidance: 'Be concrete and precise; engine-level nuance, exact move orders and evaluations are welcome.',
  };
}

/**
 * Acceptable centipawn loss vs the engine-best move, by rating.
 * ~300cp at 600 Elo decaying smoothly to ~15cp at 2600.
 */
export function windowCp(elo) {
  const t = Math.max(0, Math.min(1, (elo - ELO_MIN) / (ELO_MAX - ELO_MIN)));
  return Math.round(15 + 285 * Math.pow(1 - t, 1.8));
}

/**
 * Annotate engine MultiPV lines with human-relevant features.
 * @param {string} fen  position the lines belong to
 * @param {Array} lines analysis lines ({uci, san, scoreWhiteCp, scoreText, pvSan})
 * @returns {Array} candidates: {rank, uci, san, scoreText, pvSan, deltaCp, features, simplicity}
 */
export function annotateCandidates(fen, lines) {
  const clean = lines.filter(Boolean);
  if (clean.length === 0) return [];
  const mover = new Chess(fen).turn();
  const sign = mover === 'w' ? 1 : -1;
  const bestCp = clean[0].scoreWhiteCp;

  return clean.map((l, rank) => {
    const features = [];
    let simplicity = 0;
    const g = new Chess(fen);
    let move = null;
    try {
      move = g.move({
        from: l.uci.slice(0, 2), to: l.uci.slice(2, 4),
        promotion: l.uci.length > 4 ? l.uci[4] : undefined,
      });
    } catch { /* stale line for another position; keep bare candidate */ }

    if (move) {
      const pre = new Chess(fen);
      if (move.flags.includes('c') || move.flags.includes('e')) {
        const capturedName = PIECE_NAMES[move.captured] ?? 'piece';
        const defenders = pre.attackers(move.to, mover === 'w' ? 'b' : 'w');
        if (defenders.length === 0 && move.captured !== 'p') {
          features.push(`wins an undefended ${capturedName}`);
          simplicity += 2.5;
        } else {
          features.push(`captures a ${capturedName}`);
          simplicity += 1;
        }
      }
      if (move.san.includes('#')) { features.push('delivers checkmate'); simplicity += 10; }
      else if (move.san.includes('+')) { features.push('gives check'); simplicity += 1.2; }
      if (move.flags.includes('k') || move.flags.includes('q')) {
        features.push('castles, tucking the king safe');
        simplicity += 1.5;
      }
      if (move.flags.includes('p')) { features.push('promotes a pawn'); simplicity += 1.5; }
      if ((move.piece === 'n' || move.piece === 'b') && move.from[1] === HOME_RANK[mover]) {
        features.push(`develops a ${PIECE_NAMES[move.piece]}`);
        simplicity += 1;
      }
      if (move.piece === 'p' && CENTER.has(move.to)) {
        features.push('fights for the center');
        simplicity += 0.8;
      }
      if (move.piece === 'q' && !move.captured && !move.san.includes('+')) {
        simplicity -= 0.5; // quiet queen moves are easy to get wrong
      }
      if (features.length === 0) features.push('a quiet positional move');
    }

    return {
      rank,
      uci: l.uci,
      san: l.san ?? move?.san ?? l.uci,
      scoreText: l.scoreText,
      pvSan: l.pvSan,
      deltaCp: Math.max(0, sign * (bestCp - l.scoreWhiteCp)),
      features,
      simplicity,
    };
  });
}

/**
 * Pick the move to coach toward at this rating: the most human-findable
 * candidate inside the acceptability window (rank and eval loss count
 * against a candidate, so the engine move wins unless an alternative is
 * clearly easier to find).
 */
export function recommendForElo(candidates, elo) {
  if (candidates.length === 0) return null;
  const win = windowCp(elo);
  const eligible = candidates.filter((c) => c.deltaCp <= win);
  // Findability matters a lot for beginners and almost not at all for
  // experts — reuse the window decay as the weight so both shrink together.
  const findabilityWeight = win / 300;
  let best = eligible[0] ?? candidates[0];
  let bestScore = -Infinity;
  for (const c of eligible) {
    const score = c.simplicity * findabilityWeight - c.rank * 0.5 - c.deltaCp / 100;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}
