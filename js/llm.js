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
  const lines = f.lines
    .map((l, i) => `${i + 1}. eval ${l.scoreText} — ${l.pvSan}`)
    .join('\n');
  return [
    'You are a friendly chess coach talking to a club-level player.',
    'Use the engine facts below as ground truth. Do NOT calculate or invent',
    'lines yourself — explain the *ideas* behind the engine\'s suggestions:',
    'plans, threats, piece activity, pawn structure, king safety.',
    'Answer in plain text (no markdown, no headers), under 180 words.',
    '',
    `Position (FEN): ${f.fen}`,
    `Side to move: ${f.turn === 'w' ? 'White' : 'Black'}`,
    f.recentMoves ? `Recent moves: ${f.recentMoves}` : null,
    f.lastMoveSan ? `Last move played: ${f.lastMoveSan}` : null,
    `Engine evaluation: ${f.evalText} (positive = better for White)`,
    'Engine lines, best first (evals from White\'s point of view):',
    lines,
    f.threatSan ? `If the side to move did nothing, the opponent's threat would be: ${f.threatSan}` : null,
    '',
    'Explain in simple terms what is going on in this position and why the',
    'engine\'s top suggestion is strong. Compare the alternatives briefly.',
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
