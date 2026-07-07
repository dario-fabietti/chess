/**
 * Baseline AI coach: turns engine output and simple board heuristics into
 * chess.com-style feedback. This is intentionally template-based — the module
 * is the seam where an LLM coach can be plugged in later.
 */

import { Chess } from '../vendor/chessjs/chess.js';

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/**
 * Classify a played move by centipawn loss (from the mover's perspective).
 * Thresholds are close to the ones commonly used by chess sites.
 */
export function classifyMove({ cpLoss, isBest, mateMissed, mateAllowed }) {
  if (mateAllowed) return { key: 'blunder', badge: '??', label: 'Blunder' };
  if (isBest || cpLoss <= 10) return { key: 'best', badge: '!', label: 'Best move' };
  if (mateMissed && cpLoss > 100) return { key: 'mistake', badge: '?', label: 'Missed win' };
  if (cpLoss <= 40) return { key: 'good', badge: '', label: 'Good move' };
  if (cpLoss <= 90) return { key: 'inaccuracy', badge: '?!', label: 'Inaccuracy' };
  if (cpLoss <= 200) return { key: 'mistake', badge: '?', label: 'Mistake' };
  return { key: 'blunder', badge: '??', label: 'Blunder' };
}

export function commentForClassification(cls, { san, bestSan, cpLoss }) {
  const pawns = (cpLoss / 100).toFixed(1);
  switch (cls.key) {
    case 'best':
      return `${san} — best move! That's exactly what the engine recommends.`;
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
