/**
 * UCI wrapper around the Stockfish WASM worker.
 *
 * Search requests are serialized: a new search always stops the previous one
 * and waits for its `bestmove` before sending the next `go`, as UCI requires.
 */
export class Engine {
  constructor(name = 'engine', path = 'vendor/stockfish/stockfish-18-lite-single.js') {
    this.name = name;
    this.worker = new Worker(path);
    this.searchId = 0;
    this.searching = false;
    this._pendingBest = null; // {promise, resolve} for the running search
    this._readyResolve = null;
    this._initResolve = null;
    this._queue = Promise.resolve();
    this.onInfo = null; // ({searchId, depth, multipv, score, pv, ...}) => void

    this.ready = new Promise((resolve) => { this._initResolve = resolve; });
    this.worker.onmessage = (e) => this._onLine(String(e.data));
    this.worker.onerror = (e) => console.error(`[${this.name}] worker error`, e);
    this._send('uci');
  }

  _send(cmd) {
    this.worker.postMessage(cmd);
  }

  _onLine(line) {
    if (line === 'uciok') {
      this._initResolve?.();
      this._initResolve = null;
      return;
    }
    if (line === 'readyok') {
      this._readyResolve?.();
      this._readyResolve = null;
      return;
    }
    if (line.startsWith('bestmove')) {
      this.searching = false;
      const parts = line.split(/\s+/);
      const pending = this._pendingBest;
      this._pendingBest = null;
      pending?.resolve({ bestmove: parts[1], ponder: parts[3] || null, searchId: this.searchId });
      return;
    }
    if (line.startsWith('info')) {
      const info = parseInfo(line);
      if (info) {
        info.searchId = this.searchId;
        this.onInfo?.(info);
      }
    }
  }

  setOption(name, value) {
    this._send(`setoption name ${name} value ${value}`);
  }

  _isReady() {
    return new Promise((resolve) => {
      this._readyResolve = resolve;
      this._send('isready');
    });
  }

  /** Stop the current search (if any) and wait for its bestmove. */
  stop() {
    if (!this.searching || !this._pendingBest) return Promise.resolve(null);
    const { promise } = this._pendingBest;
    this._send('stop');
    return promise;
  }

  /**
   * Start a search (queued behind any running one). Resolves once `go` has
   * been sent, with {searchId, result} — result is a promise for the
   * bestmove ({bestmove, ponder, searchId}).
   */
  search(fen, go) {
    const run = async () => {
      await this.ready;
      await this.stop();
      await this._isReady();
      this.searchId++;
      this.searching = true;
      let resolve;
      const promise = new Promise((r) => { resolve = r; });
      this._pendingBest = { promise, resolve };
      this._send(`position fen ${fen}`);
      this._send(go);
      return { searchId: this.searchId, result: promise };
    };
    this._queue = this._queue.then(run, run);
    return this._queue;
  }

  /** Convenience: finite search resolving with the bestmove UCI string. */
  async bestMove(fen, go) {
    const { result } = await this.search(fen, go);
    const r = await result;
    return r.bestmove && r.bestmove !== '(none)' ? r.bestmove : null;
  }

  newGame() {
    this._send('ucinewgame');
  }
}

/** Parse a UCI `info` line into a structured object (null if not a PV line). */
export function parseInfo(line) {
  if (!line.includes(' pv ') || !line.includes('score')) return null;
  if (line.includes('lowerbound') || line.includes('upperbound')) return null;
  const tokens = line.split(/\s+/);
  const info = { multipv: 1 };
  for (let i = 1; i < tokens.length; i++) {
    switch (tokens[i]) {
      case 'depth': info.depth = parseInt(tokens[++i], 10); break;
      case 'seldepth': info.seldepth = parseInt(tokens[++i], 10); break;
      case 'multipv': info.multipv = parseInt(tokens[++i], 10); break;
      case 'nodes': info.nodes = parseInt(tokens[++i], 10); break;
      case 'nps': info.nps = parseInt(tokens[++i], 10); break;
      case 'time': info.time = parseInt(tokens[++i], 10); break;
      case 'score': {
        const type = tokens[++i];
        const value = parseInt(tokens[++i], 10);
        info.score = { type, value }; // 'cp' | 'mate', from side-to-move POV
        break;
      }
      case 'pv':
        info.pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
    }
  }
  return info.pv && info.score && info.depth ? info : null;
}

/**
 * Normalize a score to centipawns from White's point of view.
 * Mate in N maps to ±(100000 - N) so it always dominates cp scores.
 */
export function scoreToWhiteCp(score, sideToMove) {
  let cp;
  if (score.type === 'mate') {
    cp = score.value > 0 ? 100000 - score.value : -100000 - score.value;
  } else {
    cp = score.value;
  }
  return sideToMove === 'w' ? cp : -cp;
}

/** Human-readable eval from White's POV, e.g. "+0.34", "-1.20", "M5", "-M3". */
export function formatWhiteScore(score, sideToMove) {
  if (score.type === 'mate') {
    let m = score.value;
    if (sideToMove === 'b') m = -m;
    return m > 0 ? `M${m}` : `-M${-m}`;
  }
  const cp = scoreToWhiteCp(score, sideToMove) / 100;
  return (cp >= 0 ? '+' : '') + cp.toFixed(2);
}
