/**
 * Synthesized move sounds via WebAudio — no audio assets required.
 */
let ctx = null;
let enabled = true;

export function setSoundEnabled(v) { enabled = v; }

function audioCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip(freq, { duration = 0.08, type = 'sine', gain = 0.25, when = 0 } = {}) {
  const ac = audioCtx();
  const t = ac.currentTime + when;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

export const sounds = {
  move()    { if (enabled) blip(520, { duration: 0.06, type: 'triangle' }); },
  capture() { if (enabled) { blip(330, { duration: 0.07, type: 'square', gain: 0.15 }); blip(220, { duration: 0.09, type: 'triangle', when: 0.02 }); } },
  check()   { if (enabled) { blip(660, { duration: 0.09 }); blip(880, { duration: 0.12, when: 0.09 }); } },
  gameEnd() { if (enabled) { blip(523, { duration: 0.15, when: 0 }); blip(659, { duration: 0.15, when: 0.12 }); blip(784, { duration: 0.3, when: 0.24 }); } },
  illegal() { if (enabled) blip(160, { duration: 0.12, type: 'sawtooth', gain: 0.12 }); },
};
