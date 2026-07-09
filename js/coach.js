/**
 * Baseline AI coach: turns engine output and simple board heuristics into
 * chess.com-style feedback. This is intentionally template-based — the module
 * is the seam where an LLM coach can be plugged in later.
 */

import { Chess } from '../vendor/chessjs/chess.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Classification thresholds (upper bound of centipawn loss per class).
 * Absolute: the fixed "popular site" scale. Relative: per-ELO-band tables
 * derived from how typical move error scales with rating — see
 * docs/relative-evaluation.md for sources and the derivation.
 */
export const ABSOLUTE_THRESHOLDS = { best: 10, excellent: 20, good: 40, inaccuracy: 90, mistake: 200 };

export const RELATIVE_BANDS = [
  { minElo: 400,  label: '400–600',   best: 25, excellent: 100, good: 300, inaccuracy: 500, mistake: 800 },
  { minElo: 600,  label: '600–800',   best: 25, excellent: 85,  good: 250, inaccuracy: 425, mistake: 700 },
  { minElo: 800,  label: '800–1000',  best: 20, excellent: 70,  good: 200, inaccuracy: 360, mistake: 600 },
  { minElo: 1000, label: '1000–1200', best: 20, excellent: 60,  good: 160, inaccuracy: 300, mistake: 500 },
  { minElo: 1200, label: '1200–1400', best: 15, excellent: 50,  good: 130, inaccuracy: 250, mistake: 420 },
  { minElo: 1400, label: '1400–1600', best: 15, excellent: 40,  good: 105, inaccuracy: 210, mistake: 350 },
  { minElo: 1600, label: '1600–1800', best: 12, excellent: 32,  good: 85,  inaccuracy: 170, mistake: 290 },
  { minElo: 1800, label: '1800–2000', best: 10, excellent: 25,  good: 60,  inaccuracy: 125, mistake: 240 },
  { minElo: 2000, label: '2000+',     best: 10, excellent: 20,  good: 40,  inaccuracy: 90,  mistake: 200 },
];

/** Thresholds for a player of this rating (relative mode). */
export function thresholdsForElo(elo) {
  let band = RELATIVE_BANDS[0];
  for (const b of RELATIVE_BANDS) if (elo >= b.minElo) band = b;
  return band;
}

/**
 * Move-class badges and colors, following chess.com's Game Review palette
 * (their icons are graphics; these are the closest single-glyph stand-ins
 * for a no-image-assets app — star for Best, check for Excellent, and the
 * conventional ?! / ? / ?? annotation glyphs chess.com itself overlays for
 * Inaccuracy/Mistake/Blunder).
 */
export const CLASSIFICATION_BADGES = {
  best:       { badge: '★',  color: '#81b64c', label: 'Best move' },
  excellent:  { badge: '✓',  color: '#59a8a0', label: 'Excellent' },
  good:       { badge: '',   color: '#95b776', label: 'Good move' },
  inaccuracy: { badge: '?!', color: '#f7c045', label: 'Inaccuracy' },
  mistake:    { badge: '?',  color: '#e6912c', label: 'Mistake' },
  blunder:    { badge: '??', color: '#fa412d', label: 'Blunder' },
};

/**
 * Classify a played move by centipawn loss (from the mover's perspective).
 * With `relative` and an `elo`, thresholds adapt to the player's level:
 * the same 300cp loss can be a normal move at 400 and a blunder at 2000.
 */
export function classifyMove({ cpLoss, isBest, mateMissed, mateAllowed, elo = null, relative = false }) {
  const t = relative && Number.isFinite(elo) ? thresholdsForElo(elo) : ABSOLUTE_THRESHOLDS;
  const cls = (key) => ({ key, ...CLASSIFICATION_BADGES[key] });
  if (mateAllowed) return cls('blunder');
  if (isBest || cpLoss <= t.best) return cls('best');
  if (mateMissed && cpLoss > t.inaccuracy) return { key: 'mistake', badge: '?', color: CLASSIFICATION_BADGES.mistake.color, label: 'Missed win' };
  if (cpLoss <= t.excellent) return cls('excellent');
  if (cpLoss <= t.good) return cls('good');
  if (cpLoss <= t.inaccuracy) return cls('inaccuracy');
  if (cpLoss <= t.mistake) return cls('mistake');
  return cls('blunder');
}

export function commentForClassification(cls, { san, bestSan, cpLoss }) {
  const pawns = (cpLoss / 100).toFixed(1);
  switch (cls.key) {
    case 'best':
      return `${san} — best move! That's exactly what the engine recommends.`;
    case 'excellent':
      return `${san} is an excellent move — nearly as strong as the engine's top choice.`;
    case 'good':
      return `${san} is a solid move.`;
    case 'inaccuracy':
      return `${san} is a little imprecise (loses about ${pawns} pawns of advantage). ${bestSan ? `${bestSan} was more accurate.` : ''}`;
    case 'mistake':
      return `${san} is a mistake — it gives up around ${pawns} pawns. ${bestSan ? `Consider ${bestSan} instead.` : ''}`;
    case 'blunder':
      return `${san} is a blunder! ${bestSan ? `${bestSan} was much stronger.` : ''} Take a moment to check captures and checks before moving.`;
    default:
      return `${san}.`;
  }
}

/**
 * Find pieces of `color` that are attacked and insufficiently defended.
 * Cheap heuristic: attacked by more pieces than defenders, or attacked by a
 * cheaper piece. Good enough for baseline coaching hints.
 */
export function findHangingPieces(fen, color) {
  const chess = new Chess(fen);
  const enemy = color === 'w' ? 'b' : 'w';
  const hanging = [];
  for (const row of chess.board()) {
    for (const cell of row) {
      if (!cell || cell.color !== color || cell.type === 'k') continue;
      const attackers = chess.attackers(cell.square, enemy);
      if (attackers.length === 0) continue;
      const defenders = chess.attackers(cell.square, color);
      const cheapestAttacker = Math.min(
        ...attackers.map((sq) => PIECE_VALUES[chess.get(sq)?.type ?? 'q'])
      );
      const value = PIECE_VALUES[cell.type];
      if (defenders.length === 0 || cheapestAttacker < value) {
        hanging.push({
          square: cell.square,
          type: cell.type,
          name: PIECE_NAMES[cell.type],
          value,
          undefended: defenders.length === 0,
        });
      }
    }
  }
  return hanging.sort((a, b) => b.value - a.value);
}

/**
 * Build the FEN with the side to move flipped (null move) so the engine can
 * show what the opponent threatens if we do nothing. Returns null when a null
 * move is impossible (side to move is in check).
 */
export function nullMoveFen(fen) {
  const chess = new Chess(fen);
  if (chess.isCheck() || chess.isGameOver()) return null;
  const parts = fen.split(' ');
  parts[1] = parts[1] === 'w' ? 'b' : 'w';
  parts[3] = '-'; // en passant no longer valid after a null move
  return parts.join(' ');
}

/** Convert a UCI move played from `fen` into SAN (null if illegal). */
export function uciToSan(fen, uci) {
  try {
    const chess = new Chess(fen);
    const move = chess.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return move.san;
  } catch {
    return null;
  }
}

/** Convert a PV (list of UCI moves) from `fen` into a SAN line string. */
export function pvToSan(fen, pv, maxMoves = 10) {
  const chess = new Chess(fen);
  const parts = [];
  for (const uci of pv.slice(0, maxMoves)) {
    let move;
    try {
      move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
    } catch {
      break;
    }
    if (move.color === 'w') parts.push(`${chess.moveNumber()}.${move.san}`);
    else if (parts.length === 0) parts.push(`${chess.moveNumber() - 1}...${move.san}`);
    else parts.push(move.san);
  }
  return parts.join(' ');
}

export function greeting(mode, playerColor) {
  if (mode === 'play') {
    return playerColor === 'w'
      ? "Good luck! You're playing White. Develop your pieces, control the center, and I'll flag threats and review every move."
      : "Good luck! You're playing Black. I'll watch the position and flag threats and review every move.";
  }
  return 'Analysis board ready. Make moves for either side — I\'ll evaluate them, show the engine\'s best plans (green/blue arrows) and warn about threats (red arrow). Right-click-drag to draw your own arrows.';
}
