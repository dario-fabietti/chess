/**
 * LLM coach integration.
 *
 * Two transports, one prompt:
 *  - Local bridge: POST api/explain -> serve.py shells out to the Claude Code
 *    CLI (`claude -p`), which authenticates with the user's Claude plan.
 *    Only available when the app is served by serve.py on a machine with
 *    Claude Code installed and logged in.
 *  - Hand-off: open claude.ai/new with the prompt pre-filled; works anywhere
 *    (including the GitHub Pages deployment) on the user's own Claude plan.
 *
 * The prompt feeds Claude the engine's output as ground truth and asks it to
 * explain ideas, not to calculate lines itself — LLMs are unreliable at raw
 * chess calculation.
 */

/** @param {object} f facts collected by the app (see App.collectFacts) */
export function buildCoachPrompt(f) {
  const candidates = (f.candidates ?? []).map((c, i) => {
    const delta = c.deltaCp === 0 ? 'engine best'
      : `${(c.deltaCp / 100).toFixed(2)} pawns worse than best`;
    return `${i + 1}. ${c.san} (eval ${c.scoreText}, ${delta}) — ${c.features.join(', ')}. Line: ${c.pvSan}`;
  }).join('\n');
  const rec = f.recommended;
  return [
    `You are a friendly chess coach. Your student is rated about ${f.elo} Elo — ${f.audience.label}.`,
    f.audience.guidance,
    'Use the engine facts below as ground truth. Do NOT calculate or invent',
    'lines yourself — explain the *ideas*: plans, threats, piece activity,',
    'pawn structure, king safety, at a depth this student can absorb.',
    'Answer in plain text (no markdown, no headers), under 180 words.',
    '',
    `Position (FEN): ${f.fen}`,
    `Side to move: ${f.turn === 'w' ? 'White' : 'Black'}`,
    f.recentMoves ? `Recent moves: ${f.recentMoves}` : null,
    f.lastMoveSan ? `Last move played: ${f.lastMoveSan}` : null,
    `Engine evaluation: ${f.evalText} (positive = better for White)`,
    'Candidate moves, engine order (evals from White\'s point of view):',
    candidates,
    rec ? `Practical recommendation for this student: ${rec.san}`
      + ` (a ~${f.elo}-rated player can realistically find and handle it;`
      + ` moves within about ${(f.windowCp / 100).toFixed(1)} pawns of best are acceptable at this level).`
      : null,
    f.threatSan ? `If the side to move did nothing, the opponent's threat would be: ${f.threatSan}` : null,
    '',
    'Coach the student: explain what is going on, then recommend ONE move',
    'appropriate for their level — prefer the practical recommendation above.',
    'If the engine\'s absolute best move is different, mention it in one',
    'sentence, but do not push the student toward a move they cannot follow up.',
    f.threatSan ? 'Also make sure they see the opponent\'s threat.' : null,
  ].filter((s) => s !== null).join('\n');
}

/** URL that opens claude.ai with the prompt pre-filled (uses the user's plan). */
export function claudeAiUrl(prompt) {
  return 'https://claude.ai/new?q=' + encodeURIComponent(prompt);
}

/** True if the local serve.py bridge reports a usable `claude` CLI. */
export async function checkBridge() {
  try {
    const r = await fetch('api/claude-status');
    if (!r.ok) return false;
    return (await r.json()).available === true;
  } catch {
    return false;
  }
}

/** Ask the local bridge; resolves with Claude's reply text. */
export async function explainViaBridge(prompt) {
  const r = await fetch('api/explain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error) {
    throw new Error(data.error || `bridge returned HTTP ${r.status}`);
  }
  return data.text;
}
