/**
 * Main controller: game state, engine orchestration (analysis + sparring),
 * coach pipeline, move list, and all UI controls.
 */
import { Chess } from '../vendor/chessjs/chess.js';
import { Engine, scoreToWhiteCp, formatWhiteScore } from './engine.js';
import { Board } from './board.js';
import {
  classifyMove, commentForClassification, findHangingPieces,
  nullMoveFen, uciToSan, pvToSan, greeting,
} from './coach.js';
import { sounds, setSoundEnabled } from './sound.js';
import { buildCoachPrompt, claudeAiUrl, checkBridge, explainViaBridge } from './llm.js';
import {
  annotateCandidates, recommendForElo, audienceProfile, windowCp,
  ELO_MIN, ELO_MAX, ELO_DEFAULT,
} from './levels.js';
import {
  bandForElo, clampLearnerElo, buildLearnerPrompt, localExplanation,
} from './learn.js';

const $ = (sel) => document.querySelector(sel);

const LEVELS = [
  { label: 'Level 1 (~800)',   skill: 0,  movetime: 120 },
  { label: 'Level 2 (~1100)',  skill: 3,  movetime: 200 },
  { label: 'Level 3 (~1400)',  skill: 6,  movetime: 300 },
  { label: 'Level 4 (~1700)',  skill: 9,  movetime: 400 },
  { label: 'Level 5 (~2000)',  skill: 12, movetime: 500 },
  { label: 'Level 6 (~2300)',  skill: 15, movetime: 700 },
  { label: 'Level 7 (~2700)',  skill: 18, movetime: 900 },
  { label: 'Level 8 (Max)',    skill: 20, movetime: 1200 },
];

const CLASSIFY_MIN_DEPTH = 12;

class App {
  constructor() {
    this.startFen = new Chess().fen();
    this.game = new Chess();
    this.viewIndex = 0;          // plies of history currently displayed
    this.mode = 'analysis';      // 'analysis' | 'play'
    this.playerColor = 'w';
    this.levelIndex = 3;
    this.show = { engineArrows: true, threats: true, coach: true, moveEvals: true };
    this.relativeEval = localStorage.getItem('relativeEval') === '1';
    this.explanationElo = clampElo(+(localStorage.getItem('explainElo')) || ELO_DEFAULT);
    this.learnerElo = clampLearnerElo(+(localStorage.getItem('learnerElo')) || this.explanationElo);
    this._learnKey = null;        // fen|elo of the explanation currently shown
    this._learnExplaining = false;
    this.analysisCache = new Map(); // fen -> {depth, lines: [{scoreWhiteCp, score, stm, uci, san, pvSan}]}
    this.pendingReviews = [];       // moves awaiting classification
    this.threat = null;             // {fen, uci, san}
    this.engineThinking = false;
    this._analyzedFen = null;
    this._threatFen = null;
    this._fenBySearch = new Map(); // analyzer searchId -> fen it is analyzing
    this.badges = new Map();       // ply -> {badge, key}
    this.reviewData = new Map();   // ply -> {cpLoss, isBest, mateMissed, mateAllowed} for re-classification

    this.board = new Board($('#board'), {
      onUserMove: (from, to) => this.onUserMove(from, to),
    });

    this.analyzer = new Engine('analyzer');
    this.analyzer.setOption('MultiPV', 5); // top 3 shown; all 5 feed the LLM coach
    this.analyzer.onInfo = (info) => this.onAnalysisInfo(info);

    this.sparring = new Engine('sparring');

    this.bindUI();
    this.renderLearnPanel();
    this.coachSay(greeting(this.mode, this.playerColor), 'intro');
    this.refresh();
    this.setEngineStatus('loading…');
    Promise.all([this.analyzer.ready, this.sparring.ready]).then(() => {
      this.setEngineStatus('Stockfish 18 Lite (WASM) ready');
    });

    this.claudeBridge = false;
    this._explaining = false;
    checkBridge().then((available) => {
      this.claudeBridge = available;
      const btn = $('#btn-explain');
      btn.disabled = !available;
      if (!available) {
        btn.title = 'Needs the local bridge: run the app via serve.py on a machine '
          + 'with Claude Code installed and logged in. Use "claude.ai ↗" instead.';
        $('#btn-personal-explain').title = 'No local Claude bridge — opens claude.ai '
          + 'with the personalized prompt pre-filled instead.';
      }
    });
  }

  // ---- position helpers -------------------------------------------------

  viewGame() {
    const g = new Chess(this.startFen);
    const history = this.game.history({ verbose: true });
    for (let i = 0; i < this.viewIndex; i++) g.move(history[i]);
    return g;
  }

  atLatest() {
    return this.viewIndex === this.game.history().length;
  }

  // ---- UI wiring ----------------------------------------------------------

  bindUI() {
    const levelSel = $('#level');
    levelSel.innerHTML = LEVELS.map((l, i) => `<option value="${i}">${l.label}</option>`).join('');
    levelSel.value = String(this.levelIndex);
    levelSel.addEventListener('change', () => { this.levelIndex = +levelSel.value; });

    $('#mode').addEventListener('change', (e) => this.setMode(e.target.value));
    $('#playAs').addEventListener('change', (e) => {
      this.playerColor = e.target.value;
      if (this.mode === 'play') this.newGame();
    });

    $('#btn-new').addEventListener('click', () => this.newGame());
    $('#btn-flip').addEventListener('click', () => this.flip());
    $('#btn-undo').addEventListener('click', () => this.undo());
    $('#btn-hint').addEventListener('click', () => this.hint());
    $('#btn-explain').addEventListener('click', () => this.explainWithClaude());
    $('#btn-ask-claude').addEventListener('click', () => this.askOnClaudeAi());

    const eloSlider = $('#explain-elo');
    const learnerSlider = $('#learner-elo');
    eloSlider.min = ELO_MIN;
    eloSlider.max = ELO_MAX;
    eloSlider.value = this.explanationElo;
    $('#elo-value').textContent = this.explanationElo;
    learnerSlider.value = this.learnerElo;
    $('#learner-elo-value').textContent = this.learnerElo;

    // The two sliders track one idea — the student's level. Moving either
    // updates both (each clamped to its own range).
    const syncEloUi = () => {
      eloSlider.value = this.explanationElo;
      $('#elo-value').textContent = this.explanationElo;
      learnerSlider.value = this.learnerElo;
      $('#learner-elo-value').textContent = this.learnerElo;
      localStorage.setItem('explainElo', String(this.explanationElo));
      localStorage.setItem('learnerElo', String(this.learnerElo));
      this.renderLearnPanel();
      this._learnKey = null;
      this.maybeUpdateLearnExplanation();
      if (this.relativeEval) this.reclassifyAll();
    };
    eloSlider.addEventListener('input', () => {
      this.explanationElo = clampElo(+eloSlider.value);
      this.learnerElo = clampLearnerElo(this.explanationElo);
      syncEloUi();
    });
    learnerSlider.addEventListener('input', () => {
      this.learnerElo = clampLearnerElo(+learnerSlider.value);
      this.explanationElo = clampElo(this.learnerElo);
      syncEloUi();
    });

    $('#btn-personal-explain').addEventListener('click', () => this.personalizedExplain());

    $('#btn-first').addEventListener('click', () => this.goTo(0));
    $('#btn-prev').addEventListener('click', () => this.goTo(this.viewIndex - 1));
    $('#btn-next').addEventListener('click', () => this.goTo(this.viewIndex + 1));
    $('#btn-last').addEventListener('click', () => this.goTo(this.game.history().length));

    $('#btn-copy-fen').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.viewGame().fen());
      this.flashStatus('FEN copied');
    });
    $('#btn-copy-pgn').addEventListener('click', () => {
      navigator.clipboard?.writeText(this.game.pgn());
      this.flashStatus('PGN copied');
    });
    $('#btn-load').addEventListener('click', () => this.loadPosition($('#load-input').value));

    for (const [id, key] of [
      ['toggle-arrows', 'engineArrows'],
      ['toggle-threats', 'threats'],
      ['toggle-coach', 'coach'],
      ['toggle-evals', 'moveEvals'],
    ]) {
      $('#' + id).addEventListener('change', (e) => {
        this.show[key] = e.target.checked;
        this.updateArrows();
        if (key === 'coach') $('#coach-messages').classList.toggle('disabled', !e.target.checked);
      });
    }
    $('#toggle-sound').addEventListener('change', (e) => setSoundEnabled(e.target.checked));

    const relToggle = $('#toggle-relative');
    relToggle.checked = this.relativeEval;
    relToggle.addEventListener('change', (e) => {
      this.relativeEval = e.target.checked;
      localStorage.setItem('relativeEval', this.relativeEval ? '1' : '0');
      this.reclassifyAll();
      this.flashStatus(this.relativeEval
        ? `Judging moves relative to ~${this.learnerElo} ELO`
        : 'Judging moves on the absolute engine scale');
    });

    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.goTo(this.viewIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.goTo(this.viewIndex + 1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); this.goTo(0); }
      if (e.key === 'ArrowDown') { e.preventDefault(); this.goTo(this.game.history().length); }
      if (e.key === 'f') this.flip();
    });
  }

  flip() {
    this.board.setOrientation(this.board.orientation === 'w' ? 'b' : 'w');
    this.refresh();
  }

  setMode(mode) {
    this.mode = mode;
    document.body.classList.toggle('mode-play', mode === 'play');
    this.newGame();
  }

  newGame() {
    this.startFen = new Chess().fen();
    this.game = new Chess();
    this.viewIndex = 0;
    this.pendingReviews = [];
    this.analysisCache.clear();
    this.badges.clear();
    this.reviewData.clear();
    this.threat = null;
    this._threatFen = null;
    this.analyzer.newGame();
    this.sparring.newGame();
    this.clearCoach();
    this.coachSay(greeting(this.mode, this.playerColor), 'intro');
    if (this.mode === 'play') this.board.setOrientation(this.playerColor);
    this.refresh();
    this.maybeEngineMove();
  }

  loadPosition(text) {
    text = (text || '').trim();
    if (!text) return;
    try {
      const g = new Chess();
      if (text.includes('/') && !text.includes('.')) {
        g.load(text); // FEN
        this.startFen = g.fen();
        this.game = new Chess(this.startFen);
      } else {
        g.loadPgn(text);
        this.game = g;
        this.startFen = g.getHeaders?.()['FEN'] ?? new Chess().fen();
      }
    } catch (err) {
      this.flashStatus('Could not parse FEN/PGN');
      return;
    }
    this.viewIndex = this.game.history().length;
    this.pendingReviews = [];
    this.analysisCache.clear();
    this.badges.clear();
    this.reviewData.clear();
    this.threat = null;
    this._threatFen = null;
    this.clearCoach();
    this.coachSay('Position loaded. Let\'s have a look…', 'intro');
    this.refresh();
  }

  // ---- moves ------------------------------------------------------------

  onUserMove(from, to) {
    if (this.mode === 'play') {
      const g = this.viewGame();
      if (!this.atLatest() || g.turn() !== this.playerColor || this.engineThinking) return;
    }
    const g = this.viewGame();
    const candidates = g.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (candidates.length === 0) return;
    if (candidates.some((m) => m.promotion)) {
      this.askPromotion(g.turn(), (piece) => {
        if (piece) this.playMove({ from, to, promotion: piece });
      });
      return;
    }
    this.playMove({ from, to });
  }

  askPromotion(color, cb) {
    const overlay = $('#promo');
    overlay.innerHTML = ['q', 'r', 'b', 'n'].map((p) =>
      `<button data-p="${p}" style="background-image:url('assets/pieces/${color}${p}.svg')"></button>`
    ).join('');
    overlay.classList.add('open');
    const onClick = (e) => {
      const btn = e.target.closest('button');
      overlay.classList.remove('open');
      overlay.removeEventListener('click', onClick);
      cb(btn ? btn.dataset.p : null);
    };
    overlay.addEventListener('click', onClick);
  }

  /** Apply a move to the displayed position (truncating any redo history). */
  playMove(moveSpec, { byEngine = false } = {}) {
    // If we're viewing history, the new move starts from here: truncate.
    if (!this.atLatest()) {
      this.game = this.viewGame();
      this.pendingReviews = this.pendingReviews.filter((r) => r.ply <= this.viewIndex);
      for (const ply of [...this.badges.keys()]) {
        if (ply > this.viewIndex) { this.badges.delete(ply); this.reviewData.delete(ply); }
      }
    }
    const fenBefore = this.game.fen();
    let move;
    try {
      move = this.game.move(moveSpec);
    } catch {
      sounds.illegal();
      return;
    }
    this.viewIndex = this.game.history().length;

    // Queue the move for coach review using the analysis we had before it.
    const snapBefore = this.analysisCache.get(fenBefore);
    this.pendingReviews.push({
      fenBefore,
      fenAfter: this.game.fen(),
      move,
      byEngine,
      before: snapBefore && snapBefore.depth >= 8 ? snapBefore.lines[0] : null,
      ply: this.viewIndex,
    });

    if (this.game.isGameOver()) sounds.gameEnd();
    else if (this.game.isCheck()) sounds.check();
    else if (move.captured) sounds.capture();
    else sounds.move();

    this.refresh();
    this.announceGameState();
    this.maybeEngineMove();
  }

  async maybeEngineMove() {
    if (this.mode !== 'play' || this.game.isGameOver()) return;
    if (this.game.turn() === this.playerColor) return;
    if (this.engineThinking) return;
    this.engineThinking = true;
    this.setEngineStatus('thinking…');
    const level = LEVELS[this.levelIndex];
    this.sparring.setOption('Skill Level', level.skill);
    const fen = this.game.fen();
    try {
      const uci = await this.sparring.bestMove(fen, `go movetime ${level.movetime}`);
      this.engineThinking = false;
      this.setEngineStatus('Stockfish 18 Lite (WASM) ready');
      // Position may have changed (new game, undo) while thinking.
      if (uci && this.game.fen() === fen && this.mode === 'play') {
        this.playMove({
          from: uci.slice(0, 2), to: uci.slice(2, 4),
          promotion: uci.length > 4 ? uci[4] : undefined,
        }, { byEngine: true });
      }
    } catch (err) {
      this.engineThinking = false;
      console.error(err);
    }
  }

  undo() {
    if (this.game.history().length === 0) return;
    this.game.undo();
    // In play mode take back the engine's reply too, so it's the user's turn.
    if (this.mode === 'play' && this.game.turn() !== this.playerColor && this.game.history().length > 0) {
      this.game.undo();
    }
    this.viewIndex = this.game.history().length;
    this.pendingReviews = this.pendingReviews.filter((r) => r.ply <= this.viewIndex);
    for (const ply of [...this.badges.keys()]) {
      if (ply > this.viewIndex) { this.badges.delete(ply); this.reviewData.delete(ply); }
    }
    this.refresh();
  }

  goTo(index) {
    const max = this.game.history().length;
    index = Math.max(0, Math.min(max, index));
    if (index === this.viewIndex) return;
    this.viewIndex = index;
    this.refresh();
  }

  async hint() {
    const g = this.viewGame();
    if (g.isGameOver()) return;
    const snap = this.analysisCache.get(g.fen());
    const lines = (snap?.lines ?? []).filter(Boolean);
    const rec = recommendForElo(annotateCandidates(g.fen(), lines), this.explanationElo);
    if (rec?.uci) {
      this.board.setAutoShapes([
        ...this.currentAutoShapes(),
        { from: rec.uci.slice(0, 2), to: rec.uci.slice(2, 4), color: 'yellow', width: 2.2, opacity: 0.95 },
      ]);
      const why = rec.features.length ? ` — ${rec.features.join(', ')}` : '';
      const alt = rec.rank > 0 && lines[0]?.san
        ? ` (the engine's absolute best is ${lines[0].san}, but this one is easier to handle)` : '';
      this.coachSay(`Hint for ~${this.explanationElo}: try ${rec.san}${why}${alt}.`, 'hint');
    } else {
      this.coachSay('Give me a second to look at the position, then ask again.', 'hint');
    }
  }

  // ---- rendering ----------------------------------------------------------

  refresh() {
    const g = this.viewGame();
    const history = this.game.history({ verbose: true });
    const lastMove = this.viewIndex > 0 ? history[this.viewIndex - 1] : null;

    // board position
    const position = {};
    for (const row of g.board()) {
      for (const cell of row) {
        if (cell) position[cell.square] = { type: cell.type, color: cell.color };
      }
    }
    let checkSquare = null;
    if (g.isCheck()) {
      for (const [sq, p] of Object.entries(position)) {
        if (p.type === 'k' && p.color === g.turn()) checkSquare = sq;
      }
    }
    this.board.setPosition(position, {
      lastMove: lastMove ? { from: lastMove.from, to: lastMove.to } : null,
      checkSquare,
    });

    // legal destinations (in play mode only the player's pieces are movable)
    const dests = new Map();
    const movable = this.mode !== 'play' || (g.turn() === this.playerColor && this.atLatest());
    if (movable && !g.isGameOver()) {
      for (const m of g.moves({ verbose: true })) {
        if (!dests.has(m.from)) dests.set(m.from, new Set());
        dests.get(m.from).add(m.to);
      }
    }
    this.board.setLegalDests(dests);

    this.renderMoveList();
    this.renderStatus(g);
    this.startAnalysis();
    this.maybeUpdateLearnExplanation();
  }

  renderStatus(g) {
    let s;
    if (g.isCheckmate()) s = `Checkmate — ${g.turn() === 'w' ? 'Black' : 'White'} wins`;
    else if (g.isStalemate()) s = 'Draw by stalemate';
    else if (g.isThreefoldRepetition()) s = 'Draw by repetition';
    else if (g.isDraw()) s = 'Draw';
    else s = `${g.turn() === 'w' ? 'White' : 'Black'} to move${g.isCheck() ? ' — check!' : ''}`;
    $('#game-status').textContent = s;

    // player names + material balance from captures, following board orientation
    const topColor = this.board.orientation === 'w' ? 'b' : 'w';
    const bottomColor = this.board.orientation;
    const label = (c) => this.mode === 'play'
      ? (c === this.playerColor ? 'You' : `Stockfish · ${LEVELS[this.levelIndex].label}`)
      : (c === 'w' ? 'White' : 'Black');
    $('#name-top').textContent = label(topColor);
    $('#name-bottom').textContent = label(bottomColor);

    const history = this.game.history({ verbose: true }).slice(0, this.viewIndex);
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    const captured = { w: [], b: [] }; // pieces captured BY each side
    let balance = 0; // positive = White is up material
    for (const m of history) {
      if (!m.captured) continue;
      captured[m.color].push(m.captured);
      balance += (m.color === 'w' ? 1 : -1) * values[m.captured];
    }
    const order = { q: 0, r: 1, b: 2, n: 3, p: 4 };
    const trayFor = (color) => {
      const icons = captured[color]
        .sort((a, b) => order[a] - order[b])
        .map((p) => `<img src="assets/pieces/${color === 'w' ? 'b' : 'w'}${p}.svg" alt="${p}">`)
        .join('');
      const adv = color === 'w' ? balance : -balance;
      return icons + (adv > 0 ? `<span>+${adv}</span>` : '');
    };
    $('#captured-top').innerHTML = trayFor(topColor);
    $('#captured-bottom').innerHTML = trayFor(bottomColor);
  }

  renderMoveList() {
    const el = $('#moves');
    const history = this.game.history({ verbose: true });
    const startMoveNum = new Chess(this.startFen).moveNumber();
    const startTurn = new Chess(this.startFen).turn();
    let html = '';
    let ply = 0;
    while (ply < history.length) {
      const moveNum = startMoveNum + Math.floor((ply + (startTurn === 'b' ? 1 : 0)) / 2);
      html += `<span class="mv-num">${moveNum}.</span>`;
      if (ply === 0 && startTurn === 'b') {
        html += `<span class="mv-cell mv-ellipsis">…</span>${this.moveCell(history[ply], ply)}`;
        ply += 1;
      } else {
        html += this.moveCell(history[ply], ply);
        ply += 1;
        if (ply < history.length) {
          html += this.moveCell(history[ply], ply);
          ply += 1;
        }
      }
    }
    el.innerHTML = html || '<span class="mv-empty">No moves yet</span>';
    el.querySelectorAll('.mv-cell[data-ply]').forEach((cell) => {
      cell.addEventListener('click', () => this.goTo(+cell.dataset.ply + 1));
    });
    const active = el.querySelector(`.mv-cell[data-ply="${this.viewIndex - 1}"]`);
    active?.classList.add('active');
    active?.scrollIntoView({ block: 'nearest' });
  }

  moveCell(move, ply) {
    const b = this.badges.get(ply + 1);
    const badge = b?.badge ? `<i class="badge badge-${b.key}">${b.badge}</i>` : '';
    return `<span class="mv-cell" data-ply="${ply}">${move.san}${badge}</span>`;
  }

  // ---- analysis -----------------------------------------------------------

  async startAnalysis() {
    const g = this.viewGame();
    const fen = g.fen();
    if (this._analyzedFen === fen) { this.updateArrows(); return; }
    this._analyzedFen = fen;

    if (g.isGameOver()) {
      this.updateEvalBar(g.isCheckmate() ? (g.turn() === 'w' ? -100000 : 100000) : 0);
      $('#lines').innerHTML = '';
      this.board.setAutoShapes([]);
      return;
    }
    const { searchId } = await this.analyzer.search(fen, 'go infinite');
    this._fenBySearch.set(searchId, fen);
    if (this._fenBySearch.size > 50) {
      for (const key of [...this._fenBySearch.keys()].slice(0, 25)) this._fenBySearch.delete(key);
    }
    this.computeThreat(fen);
  }

  onAnalysisInfo(info) {
    const fen = this._fenBySearch.get(info.searchId);
    if (!fen) return;
    const g = new Chess(fen);
    const stm = g.turn();

    let snap = this.analysisCache.get(fen);
    if (!snap) { snap = { depth: 0, lines: [] }; this.analysisCache.set(fen, snap); }
    const uci = info.pv[0];
    snap.lines[info.multipv - 1] = {
      depth: info.depth,
      stm,
      score: info.score,
      scoreWhiteCp: scoreToWhiteCp(info.score, stm),
      scoreText: formatWhiteScore(info.score, stm),
      uci,
      san: uciToSan(fen, uci),
      pvSan: pvToSan(fen, info.pv),
    };
    if (info.multipv === 1) snap.depth = info.depth;

    if (fen === this._analyzedFen) {
      this.renderLines(snap, info);
      if (info.multipv === 1) this.updateEvalBar(snap.lines[0].scoreWhiteCp, snap.lines[0].scoreText);
      this.updateArrows();
      this.maybeUpdateLearnExplanation();
    }
    this.processPendingReviews();
  }

  renderLines(snap, info) {
    const rows = snap.lines.filter(Boolean).slice(0, 3).map((l) => `
      <div class="line">
        <span class="line-eval ${l.scoreWhiteCp >= 0 ? 'pos' : 'neg'}">${l.scoreText}</span>
        <span class="line-pv">${l.pvSan}</span>
      </div>`).join('');
    $('#lines').innerHTML = rows;
    $('#engine-depth').textContent = `depth ${snap.depth}${info.nps ? ` · ${(info.nps / 1000).toFixed(0)}k nps` : ''}`;
  }

  currentAutoShapes() {
    const shapes = [];
    const fen = this.viewGame().fen();
    const snap = this.analysisCache.get(fen);
    if (this.show.engineArrows && snap) {
      const widths = [2.0, 1.4, 1.1];
      const opac = [0.85, 0.45, 0.3];
      snap.lines.filter(Boolean).slice(0, 3).forEach((l, i) => {
        if (!l.uci || l.uci.length < 4) return;
        shapes.push({
          from: l.uci.slice(0, 2), to: l.uci.slice(2, 4),
          color: i === 0 ? 'green' : 'blue',
          width: widths[i] ?? 1, opacity: opac[i] ?? 0.3,
          label: this.show.moveEvals ? l.scoreText : null,
        });
      });
    }
    if (this.show.threats && this.threat && this.threat.fen === fen && this.threat.uci) {
      shapes.push({
        from: this.threat.uci.slice(0, 2), to: this.threat.uci.slice(2, 4),
        color: 'red', width: 1.7, opacity: 0.8,
      });
    }
    return shapes;
  }

  updateArrows() {
    this.board.setAutoShapes(this.currentAutoShapes());
  }

  updateEvalBar(whiteCp, text) {
    const bar = $('#eval-fill');
    const label = $('#eval-text');
    const capped = Math.max(-1200, Math.min(1200, whiteCp));
    const pct = 50 + 50 * (2 / (1 + Math.exp(-0.004 * capped)) - 1);
    bar.style.height = `${pct}%`;
    label.textContent = text ?? (Math.abs(whiteCp) >= 90000
      ? (whiteCp > 0 ? '1-0' : '0-1') : (whiteCp / 100).toFixed(1));
    label.classList.toggle('black-ahead', whiteCp < -30);
  }

  // ---- threat detection ---------------------------------------------------

  async computeThreat(fen) {
    if (!this.show.threats) return;
    if (this.mode === 'play' && this.engineThinking) return;
    if (this._threatFen === fen) return;
    this._threatFen = fen;
    const nf = nullMoveFen(fen);
    if (!nf) { this.threat = null; this.updateArrows(); return; }
    try {
      const uci = await this.sparring.bestMove(nf, 'go depth 12');
      if (this._threatFen !== fen) return; // stale
      this.threat = uci ? { fen, uci, san: uciToSan(nf, uci) } : null;
      this.updateArrows();
      this.maybeWarnThreat(fen);
      this._learnKey = null; // threat is part of the explanation — refresh it
      this.maybeUpdateLearnExplanation();
    } catch (err) {
      console.error('threat calc failed', err);
    }
  }

  maybeWarnThreat(fen) {
    if (!this.show.coach || !this.threat || this.threat.fen !== fen) return;
    const g = new Chess(fen);
    // Only warn the side to move (in play mode: only the human).
    if (this.mode === 'play' && g.turn() !== this.playerColor) return;
    if (!this.atLatest()) return;
    const san = this.threat.san;
    if (!san) return;
    if (san.includes('#')) {
      this.coachSay(`⚠️ Careful — the opponent threatens checkmate with ${san}!`, 'warning');
    } else if (san.includes('x') || san.includes('+')) {
      this.coachSay(`⚠️ Watch out: the opponent is threatening ${san}.`, 'warning');
    }
  }

  // ---- coach review pipeline ----------------------------------------------

  processPendingReviews() {
    const done = [];
    for (const review of this.pendingReviews) {
      const after = this.analysisCache.get(review.fenAfter);
      if (!after || after.depth < CLASSIFY_MIN_DEPTH || !after.lines[0]) continue;
      done.push(review);
      if (!review.before) continue; // no baseline eval — skip silently
      this.finalizeReview(review, after.lines[0]);
    }
    this.pendingReviews = this.pendingReviews.filter((r) => !done.includes(r));
  }

  finalizeReview(review, lineAfter) {
    const mover = review.move.color;
    const sign = mover === 'w' ? 1 : -1;
    const before = review.before;
    const cpLoss = Math.max(0, sign * (before.scoreWhiteCp - lineAfter.scoreWhiteCp));
    const isBest = review.move.lan === before.uci
      || `${review.move.from}${review.move.to}${review.move.promotion ?? ''}` === before.uci;
    const mateMissed = before.score.type === 'mate' && before.score.value > 0
      && lineAfter.score.type !== 'mate';
    const mateAllowed = before.score.type !== 'mate'
      && lineAfter.score.type === 'mate'
      && sign * lineAfter.scoreWhiteCp < 0;
    const data = { cpLoss: Math.min(cpLoss, 5000), isBest, mateMissed, mateAllowed };
    this.reviewData.set(review.ply, data);
    const cls = classifyMove({ ...data, elo: this.learnerElo, relative: this.relativeEval });

    // badge on the move list (history() returns copies, so use a side table)
    this.badges.set(review.ply, { badge: cls.badge, key: cls.key });
    this.renderMoveListBadges();

    // coach comment about the *user's* moves (and notable engine moves)
    if (!this.show.coach) return;
    const isUserMove = this.mode !== 'play' || !review.byEngine;
    if (isUserMove && (this.mode === 'play' || (cls.key !== 'good' && cls.key !== 'excellent'))) {
      this.coachSay(
        commentForClassification(cls, {
          san: review.move.san,
          bestSan: isBest ? null : uciToSan(review.fenBefore, before.uci),
          cpLoss,
        }),
        cls.key === 'blunder' || cls.key === 'mistake' ? 'warning'
          : cls.key === 'best' || cls.key === 'excellent' ? 'praise' : 'note'
      );
    }
    // hanging pieces after the user's move
    if (isUserMove && !this.game.isGameOver()) {
      const hanging = findHangingPieces(review.fenAfter, review.move.color)
        .filter((h) => h.value >= 3);
      if (hanging.length > 0 && cls.key !== 'blunder') {
        const h = hanging[0];
        this.coachSay(
          `Your ${h.name} on ${h.square} is ${h.undefended ? 'undefended' : 'attacked by a cheaper piece'} — keep an eye on it.`,
          'warning'
        );
      }
    }
  }

  renderMoveListBadges() {
    for (const [ply, b] of this.badges) {
      const cell = document.querySelector(`#moves .mv-cell[data-ply="${ply - 1}"]`);
      if (cell && !cell.querySelector('.badge') && b.badge) {
        cell.insertAdjacentHTML('beforeend', `<i class="badge badge-${b.key}">${b.badge}</i>`);
      }
    }
  }

  /** Re-run classification of every reviewed move (mode or learner ELO changed). */
  reclassifyAll() {
    for (const [ply, data] of this.reviewData) {
      const cls = classifyMove({ ...data, elo: this.learnerElo, relative: this.relativeEval });
      this.badges.set(ply, { badge: cls.badge, key: cls.key });
    }
    document.querySelectorAll('#moves .badge').forEach((el) => el.remove());
    this.renderMoveListBadges();
  }

  announceGameState() {
    if (!this.game.isGameOver()) return;
    let msg;
    if (this.game.isCheckmate()) {
      const winner = this.game.turn() === 'w' ? 'Black' : 'White';
      msg = `Checkmate! ${winner} wins. ${this.mode === 'play'
        ? (winner === (this.playerColor === 'w' ? 'White' : 'Black')
          ? 'Congratulations — well played! 🎉'
          : 'Tough one. Step back through the moves and check where the eval bar turned.')
        : ''}`;
    } else if (this.game.isStalemate()) {
      msg = 'Stalemate — the game is a draw.';
    } else if (this.game.isThreefoldRepetition()) {
      msg = 'Draw by threefold repetition.';
    } else {
      msg = 'The game is a draw.';
    }
    this.coachSay(msg, 'intro');
  }

  // ---- LLM coach (Claude) ---------------------------------------------------

  /** Structured ground truth for the LLM prompt (engine output + game state). */
  collectFacts() {
    const g = this.viewGame();
    const fen = g.fen();
    const snap = this.analysisCache.get(fen);
    const history = this.game.history().slice(0, this.viewIndex);
    const startNum = new Chess(this.startFen).moveNumber();
    const recent = history.slice(-16);
    const offset = history.length - recent.length;
    const recentMoves = recent.map((san, i) => {
      const ply = offset + i;
      return ply % 2 === 0 ? `${startNum + ply / 2}.${san}` : san;
    }).join(' ');
    const lines = (snap?.lines ?? []).filter(Boolean);
    const candidates = annotateCandidates(fen, lines);
    return {
      fen,
      turn: g.turn(),
      recentMoves,
      lastMoveSan: history[history.length - 1] ?? null,
      evalText: snap?.lines[0]?.scoreText ?? 'unknown',
      lines,
      candidates,
      recommended: recommendForElo(candidates, this.explanationElo),
      elo: this.explanationElo,
      audience: audienceProfile(this.explanationElo),
      windowCp: windowCp(this.explanationElo),
      threatSan: this.threat && this.threat.fen === fen ? this.threat.san : null,
      learnerElo: this.learnerElo,
      gameOver: g.isGameOver(),
    };
  }

  _factsReady(facts) {
    if (facts.lines.length === 0) {
      this.coachSay('Give the engine a moment to analyze first, then ask again.', 'hint');
      return false;
    }
    return true;
  }

  /** Option 1: local bridge — serve.py runs `claude -p` on this machine. */
  async explainWithClaude() {
    if (this._explaining || !this.claudeBridge) return;
    const facts = this.collectFacts();
    if (!this._factsReady(facts)) return;
    this._explaining = true;
    const btn = $('#btn-explain');
    btn.disabled = true;
    const el = this.coachSay('✨ Claude is looking at the position…', 'claude');
    try {
      const text = await explainViaBridge(buildCoachPrompt(facts));
      el.textContent = text || 'Claude returned an empty answer — try again.';
    } catch (err) {
      el.textContent = `Claude bridge error: ${err.message}`;
      el.classList.add('coach-warning');
    } finally {
      this._explaining = false;
      btn.disabled = !this.claudeBridge;
      $('#coach-messages').scrollTop = $('#coach-messages').scrollHeight;
    }
  }

  /** Option 2: open claude.ai with the prompt pre-filled (works anywhere). */
  askOnClaudeAi() {
    const facts = this.collectFacts();
    if (!this._factsReady(facts)) return;
    window.open(claudeAiUrl(buildCoachPrompt(facts)), '_blank', 'noopener');
  }

  // ---- learning sidebar (ELO-tailored explanations) -------------------------

  /** Fill the skills/goals bullets for the current learner band. */
  renderLearnPanel() {
    const band = bandForElo(this.learnerElo);
    $('#learn-band-label').textContent = `${band.min}–${band.max} · ${band.title}`;
    $('#learn-skills').innerHTML = band.skills.map((s) => `<li>${s}</li>`).join('');
    $('#learn-goals').innerHTML = band.goals.map((s) => `<li>${s}</li>`).join('');
  }

  /**
   * Keep the explanation field current: once the engine has looked deep
   * enough at the displayed position, write the rule-based explanation for
   * the current learner ELO (once per fen+elo, so a Claude answer for the
   * same position is not clobbered).
   */
  maybeUpdateLearnExplanation() {
    const g = this.viewGame();
    const fen = g.fen();
    const snap = this.analysisCache.get(fen);
    const ready = g.isGameOver() || (snap && snap.depth >= CLASSIFY_MIN_DEPTH && snap.lines[0]);
    if (!ready) {
      $('#learn-status').textContent = 'engine thinking…';
      return;
    }
    const key = `${fen}|${this.learnerElo}`;
    if (this._learnKey === key) return;
    this._learnKey = key;
    $('#learn-explanation').value = localExplanation(this.collectFacts());
    $('#learn-status').textContent = 'auto · from engine';
  }

  /**
   * "Personalized explanation": send the per-ELO prompt (band profile +
   * style contract + depth-trimmed engine facts) to Claude via the local
   * bridge, or open claude.ai pre-filled when there is no bridge.
   */
  async personalizedExplain() {
    if (this._learnExplaining) return;
    const facts = this.collectFacts();
    if (!this._factsReady(facts)) return;
    const prompt = buildLearnerPrompt(facts);
    if (!this.claudeBridge) {
      window.open(claudeAiUrl(prompt), '_blank', 'noopener');
      return;
    }
    this._learnExplaining = true;
    const btn = $('#btn-personal-explain');
    btn.disabled = true;
    $('#learn-status').textContent = '✨ asking Claude…';
    try {
      const text = await explainViaBridge(prompt);
      $('#learn-explanation').value = text || 'Claude returned an empty answer — try again.';
      $('#learn-status').textContent = '✨ Claude · personalized';
      this._learnKey = `${facts.fen}|${this.learnerElo}`; // keep the auto text from overwriting it
    } catch (err) {
      $('#learn-status').textContent = `bridge error: ${err.message}`;
    } finally {
      this._learnExplaining = false;
      btn.disabled = false;
    }
  }

  // ---- coach chat UI --------------------------------------------------------

  coachSay(text, kind = 'note') {
    if (!text) return null;
    const box = $('#coach-messages');
    const el = document.createElement('div');
    el.className = `coach-msg coach-${kind}`;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 40) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
    return el;
  }

  clearCoach() {
    $('#coach-messages').innerHTML = '';
    this._learnKey = null;
    $('#learn-explanation').value = '';
    $('#learn-status').textContent = '';
  }

  setEngineStatus(text) {
    $('#engine-status').textContent = text;
  }

  flashStatus(text) {
    const el = $('#flash');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this._flashTimer);
    this._flashTimer = setTimeout(() => el.classList.remove('show'), 1500);
  }
}

function clampElo(v) {
  if (!Number.isFinite(v)) return ELO_DEFAULT;
  return Math.max(ELO_MIN, Math.min(ELO_MAX, Math.round(v / 50) * 50));
}

window.app = new App();
