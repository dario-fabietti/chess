/**
 * Chessboard UI: square grid, piece layer (drag & drop + click-to-move),
 * and an SVG overlay for colored arrows and circle highlights.
 *
 * Two shape layers:
 *  - auto shapes: set programmatically (engine best move, threats, hints)
 *  - user shapes: drawn with right-click drag (chess.com style), cleared on left click
 */

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export const ARROW_COLORS = {
  green:  '#15781b',
  red:    '#882020',
  blue:   '#003088',
  yellow: '#e68f00',
  orange: '#e68f00',
};

export class Board {
  /**
   * @param {HTMLElement} root
   * @param {object} opts
   *   onUserMove(from, to): called when the user drops/clicks a legal move
   *   onSelect(square|null): selection changed (app provides legal dests)
   */
  constructor(root, opts = {}) {
    this.root = root;
    this.opts = opts;
    this.orientation = 'w';
    this.selected = null;
    this.legalDests = new Map(); // from -> Set(to)
    this.autoShapes = [];
    this.userShapes = [];
    this.position = {}; // square -> {type, color}
    this.lastMove = null;
    this.checkSquare = null;
    this._drag = null;
    this._rightDrag = null;

    root.classList.add('cb-root');
    root.innerHTML = `
      <div class="cb-squares"></div>
      <div class="cb-pieces"></div>
      <svg class="cb-overlay" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
      <div class="cb-coords cb-coords-files"></div>
      <div class="cb-coords cb-coords-ranks"></div>`;
    this.squaresEl = root.querySelector('.cb-squares');
    this.piecesEl = root.querySelector('.cb-pieces');
    this.overlayEl = root.querySelector('.cb-overlay');

    this._buildSquares();
    this._buildCoords();
    this._bindEvents();
  }

  // ---- geometry ---------------------------------------------------------

  /** square name -> {x, y} in 0..7 board coordinates respecting orientation */
  _sqXY(sq) {
    const f = FILES.indexOf(sq[0]);
    const r = parseInt(sq[1], 10) - 1;
    return this.orientation === 'w'
      ? { x: f, y: 7 - r }
      : { x: 7 - f, y: r };
  }

  _xyToSquare(x, y) {
    if (x < 0 || x > 7 || y < 0 || y > 7) return null;
    const f = this.orientation === 'w' ? x : 7 - x;
    const r = this.orientation === 'w' ? 7 - y : y;
    return FILES[f] + (r + 1);
  }

  _eventSquare(e) {
    const rect = this.root.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 8);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 8);
    return this._xyToSquare(x, y);
  }

  // ---- construction -----------------------------------------------------

  _buildSquares() {
    this.squaresEl.innerHTML = '';
    this.squareEls = {};
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const el = document.createElement('div');
        el.className = 'cb-sq';
        this.squaresEl.appendChild(el);
      }
    }
    this._assignSquareNames();
  }

  _assignSquareNames() {
    const els = this.squaresEl.children;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const el = els[y * 8 + x];
        const sq = this._xyToSquare(x, y);
        el.dataset.square = sq;
        // a1 is dark: light squares have even file+rank parity (a=0, rank 1-8)
        const light = (FILES.indexOf(sq[0]) + parseInt(sq[1], 10)) % 2 === 0;
        el.classList.toggle('light', light);
        el.classList.toggle('dark', !light);
        this.squareEls[sq] = el;
      }
    }
  }

  _buildCoords() {
    const filesEl = this.root.querySelector('.cb-coords-files');
    const ranksEl = this.root.querySelector('.cb-coords-ranks');
    const files = this.orientation === 'w' ? FILES : [...FILES].reverse();
    const ranks = this.orientation === 'w'
      ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
    filesEl.innerHTML = files.map((f) => `<span>${f}</span>`).join('');
    ranksEl.innerHTML = ranks.map((r) => `<span>${r}</span>`).join('');
  }

  // ---- public API -------------------------------------------------------

  setOrientation(color) {
    if (this.orientation === color) return;
    this.orientation = color;
    this._assignSquareNames();
    this._buildCoords();
    this._renderPieces();
    this._renderHighlights();
    this._renderShapes();
  }

  /**
   * @param {object} position square -> {type:'p'..'k', color:'w'|'b'}
   * @param {object} state {lastMove: {from,to}|null, checkSquare: sq|null}
   */
  setPosition(position, state = {}) {
    this.position = position;
    this.lastMove = state.lastMove ?? null;
    this.checkSquare = state.checkSquare ?? null;
    this.clearSelection();
    this._renderPieces();
    this._renderHighlights();
  }

  setLegalDests(map) {
    this.legalDests = map;
  }

  setAutoShapes(shapes) {
    this.autoShapes = shapes;
    this._renderShapes();
  }

  clearUserShapes() {
    if (this.userShapes.length === 0) return;
    this.userShapes = [];
    this._renderShapes();
  }

  clearSelection() {
    this.selected = null;
    this._renderHighlights();
  }

  // ---- rendering --------------------------------------------------------

  _renderPieces() {
    this.piecesEl.innerHTML = '';
    this.pieceEls = {};
    for (const [sq, piece] of Object.entries(this.position)) {
      if (!piece) continue;
      const el = document.createElement('div');
      el.className = 'cb-piece';
      el.dataset.square = sq;
      el.style.backgroundImage = `url("assets/pieces/${piece.color}${piece.type}.svg")`;
      const { x, y } = this._sqXY(sq);
      el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
      this.piecesEl.appendChild(el);
      this.pieceEls[sq] = el;
    }
  }

  _renderHighlights() {
    for (const el of Object.values(this.squareEls)) {
      el.classList.remove('sel', 'last', 'check', 'hint', 'capture-hint');
    }
    if (this.lastMove) {
      this.squareEls[this.lastMove.from]?.classList.add('last');
      this.squareEls[this.lastMove.to]?.classList.add('last');
    }
    if (this.checkSquare) this.squareEls[this.checkSquare]?.classList.add('check');
    if (this.selected) {
      this.squareEls[this.selected]?.classList.add('sel');
      const dests = this.legalDests.get(this.selected);
      if (dests) {
        for (const to of dests) {
          const el = this.squareEls[to];
          el?.classList.add(this.position[to] ? 'capture-hint' : 'hint');
        }
      }
    }
  }

  _renderShapes() {
    const svg = this.overlayEl;
    svg.innerHTML = '';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    for (const [name, color] of Object.entries(ARROW_COLORS)) {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `cb-arrowhead-${name}`);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '6');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '2.7');
      marker.setAttribute('markerHeight', '2.7');
      marker.setAttribute('orient', 'auto');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M0,0 L10,5 L0,10 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs.appendChild(marker);
    }
    svg.appendChild(defs);
    const shapes = [...this.autoShapes, ...this.userShapes];
    for (const shape of shapes) {
      svg.appendChild(this._shapeEl(shape));
    }
    // labels last, so they sit on top of every arrow
    for (const shape of shapes) {
      if (shape.label && shape.to) svg.appendChild(this._labelEl(shape));
    }
    if (this._rightDrag?.preview) svg.appendChild(this._shapeEl(this._rightDrag.preview));
  }

  /**
   * Small eval badge in the top-right corner of the shape's target square.
   * When `shape.badgeIcon` is set (move-classification icon, e.g. the
   * engine line's Best/Good/Inaccuracy glyph) it's drawn before the eval
   * text in `shape.badgeColor`.
   */
  _labelEl(shape) {
    const { x, y } = this._sqXY(shape.to);
    const text = String(shape.label);
    const icon = shape.badgeIcon ? String(shape.badgeIcon) : '';
    const full = icon ? `${icon} ${text}` : text;
    const h = 2.5;
    const w = full.length * 1.15 + 1.2;
    const rx = x * 12.5 + 12.5 - w - 0.35;
    const ry = y * 12.5 + 0.35;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', rx); rect.setAttribute('y', ry);
    rect.setAttribute('width', w); rect.setAttribute('height', h);
    rect.setAttribute('rx', 0.6);
    rect.setAttribute('fill', 'rgba(20, 20, 20, 0.62)');
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', rx + w / 2);
    t.setAttribute('y', ry + h / 2);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-size', 1.8);
    t.setAttribute('font-weight', 700);
    t.setAttribute('font-family', 'system-ui, sans-serif');
    if (icon) {
      const iconSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      iconSpan.setAttribute('fill', shape.badgeColor || '#fff');
      iconSpan.textContent = `${icon} `;
      t.appendChild(iconSpan);
      const textSpan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
      textSpan.setAttribute('fill', '#fff');
      textSpan.textContent = text;
      t.appendChild(textSpan);
    } else {
      t.setAttribute('fill', '#fff');
      t.textContent = text;
    }
    g.appendChild(rect);
    g.appendChild(t);
    return g;
  }

  _shapeEl(shape) {
    const colorName = ARROW_COLORS[shape.color] ? shape.color : 'green';
    const color = ARROW_COLORS[colorName];
    const opacity = shape.opacity ?? 0.75;
    const from = this._sqXY(shape.from);
    if (!shape.to || shape.to === shape.from) {
      // circle highlight
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', from.x * 12.5 + 6.25);
      c.setAttribute('cy', from.y * 12.5 + 6.25);
      c.setAttribute('r', 5.4);
      c.setAttribute('fill', 'none');
      c.setAttribute('stroke', color);
      c.setAttribute('stroke-width', 0.9);
      c.setAttribute('opacity', opacity);
      return c;
    }
    const to = this._sqXY(shape.to);
    const dCols = to.x - from.x, dRows = to.y - from.y;
    const isKnightMove = (Math.abs(dCols) === 1 && Math.abs(dRows) === 2)
      || (Math.abs(dCols) === 2 && Math.abs(dRows) === 1);
    const width = shape.width ?? 1.7;
    if (isKnightMove) {
      return this._knightArrowEl(from, to, dCols, color, colorName, opacity, width);
    }
    const x1 = from.x * 12.5 + 6.25, y1 = from.y * 12.5 + 6.25;
    const x2 = to.x * 12.5 + 6.25, y2 = to.y * 12.5 + 6.25;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    // Start slightly away from the center, end short of it to leave room for the head.
    const startOff = 3.2, endOff = 2.4;
    const sx = x1 + (dx / len) * startOff, sy = y1 + (dy / len) * startOff;
    const ex = x2 - (dx / len) * endOff, ey = y2 - (dy / len) * endOff;
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', sx); line.setAttribute('y1', sy);
    line.setAttribute('x2', ex); line.setAttribute('y2', ey);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('opacity', opacity);
    line.setAttribute('marker-end', `url(#cb-arrowhead-${colorName})`);
    return line;
  }

  /**
   * L-shaped arrow for knight moves: bends at the corner square that shares
   * the destination's file/rank with the long (2-square) leg, so the arrow
   * visually traces the knight's actual path instead of cutting a diagonal.
   */
  _knightArrowEl(from, to, dCols, color, colorName, opacity, width) {
    const x1 = from.x * 12.5 + 6.25, y1 = from.y * 12.5 + 6.25;
    const x2 = to.x * 12.5 + 6.25, y2 = to.y * 12.5 + 6.25;
    const longAxisIsCols = Math.abs(dCols) === 2;
    const cx = longAxisIsCols ? x2 : x1;
    const cy = longAxisIsCols ? y1 : y2;
    const d1x = cx - x1, d1y = cy - y1, len1 = Math.hypot(d1x, d1y);
    const startOff = 3.2;
    const sx = x1 + (d1x / len1) * startOff, sy = y1 + (d1y / len1) * startOff;
    const d2x = x2 - cx, d2y = y2 - cy, len2 = Math.hypot(d2x, d2y);
    const endOff = 2.4;
    const ex = x2 - (d2x / len2) * endOff, ey = y2 - (d2y / len2) * endOff;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M${sx},${sy} L${cx},${cy} L${ex},${ey}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', width);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('opacity', opacity);
    path.setAttribute('marker-end', `url(#cb-arrowhead-${colorName})`);
    return path;
  }

  // ---- interaction ------------------------------------------------------

  _bindEvents() {
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());
    this.root.addEventListener('pointerdown', (e) => {
      const sq = this._eventSquare(e);
      if (!sq) return;
      if (e.button === 2) {
        this._rightDrag = { from: sq, preview: null };
        return;
      }
      if (e.button !== 0) return;
      this.clearUserShapes();
      this._onLeftDown(sq, e);
    });
    window.addEventListener('pointermove', (e) => {
      if (this._drag) this._onDragMove(e);
      if (this._rightDrag) this._onRightDragMove(e);
    });
    window.addEventListener('pointerup', (e) => {
      if (this._drag && e.button === 0) this._onLeftUp(e);
      if (this._rightDrag && e.button === 2) this._onRightUp(e);
    });
  }

  _onLeftDown(sq, e) {
    const piece = this.position[sq];
    const dests = this.selected ? this.legalDests.get(this.selected) : null;

    if (this.selected && dests?.has(sq)) {
      const from = this.selected;
      this.clearSelection();
      this.opts.onUserMove?.(from, sq);
      return;
    }
    if (piece && this.legalDests.has(sq)) {
      this.selected = sq;
      this._renderHighlights();
      // begin drag
      const el = this.pieceEls[sq];
      if (el) {
        this._drag = { from: sq, el, moved: false };
        el.classList.add('dragging');
        this._onDragMove(e);
      }
      return;
    }
    this.clearSelection();
  }

  _onDragMove(e) {
    const { el } = this._drag;
    const rect = this.root.getBoundingClientRect();
    const size = rect.width / 8;
    const px = e.clientX - rect.left - size / 2;
    const py = e.clientY - rect.top - size / 2;
    el.style.transform = `translate(${(px / size) * 100}%, ${(py / size) * 100}%)`;
    this._drag.moved = true;
  }

  _onLeftUp(e) {
    const { from, el } = this._drag;
    this._drag = null;
    el.classList.remove('dragging');
    const to = this._eventSquare(e);
    const dests = this.legalDests.get(from);
    if (to && to !== from && dests?.has(to)) {
      this.clearSelection();
      this.opts.onUserMove?.(from, to);
    } else {
      // snap back; keep selection so click-to-move still works
      const { x, y } = this._sqXY(from);
      el.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    }
  }

  _onRightDragMove(e) {
    const to = this._eventSquare(e);
    const { from } = this._rightDrag;
    const color = shapeColorFromEvent(e);
    this._rightDrag.preview = to && to !== from
      ? { from, to, color, opacity: 0.6 }
      : null;
    this._renderShapes();
  }

  _onRightUp(e) {
    const { from } = this._rightDrag;
    this._rightDrag = null;
    const to = this._eventSquare(e);
    const color = shapeColorFromEvent(e);
    const shape = (!to || to === from)
      ? { from, to: from, color }
      : { from, to, color };
    // toggle: drawing the identical shape removes it
    const key = (s) => `${s.from}-${s.to}-${s.color}`;
    const idx = this.userShapes.findIndex((s) => key(s) === key(shape));
    if (idx >= 0) this.userShapes.splice(idx, 1);
    else this.userShapes.push(shape);
    this._renderShapes();
  }
}

function shapeColorFromEvent(e) {
  if (e.shiftKey) return 'red';
  if (e.altKey) return 'blue';
  if (e.ctrlKey || e.metaKey) return 'yellow';
  return 'green';
}
