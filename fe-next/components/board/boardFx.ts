import { keyOf, type BoardGeometry, type CellRef } from './selectionPath';

export type FeedbackKind = 'ok' | 'bad' | 'dupe';

interface FxState {
  keys: string[];
  word: string;
  at: number;
  timers: number[];
  nodes: Element[];
  anims: Animation[];
  flights: Array<{ el: HTMLElement; anim: Animation | null }>;
}

const states = new WeakMap<HTMLElement, FxState>();

const SHARD_COLORS = ['#bfff00', '#00ffff', '#ffe135', '#ff6bb8', '#ffffff'];

export const FLY_MS = 420;
export const FLY_STAGGER_MS = 30;
const VERDICT_WINDOW_MS = 4000;
const PREVIEW_HOLD_MS = 700;
const LEAVE_MS = 240;
const TILE_FX_MS = 900;

const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
const norm = (w: string) => [...w.toLowerCase()].map((ch) => FINALS[ch] ?? ch).join('');

function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

const empty = (): FxState => ({ keys: [], word: '', at: 0, timers: [], nodes: [], anims: [], flights: [] });

function stateOf(container: HTMLElement): FxState {
  let s = states.get(container);
  if (!s) {
    s = empty();
    states.set(container, s);
  }
  return s;
}

function later(container: HTMLElement, ms: number, fn: () => void) {
  stateOf(container).timers.push(window.setTimeout(fn, ms));
}

function animate(container: HTMLElement, el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation | null {
  if (typeof (el as HTMLElement).animate !== 'function') return null;
  const a = (el as HTMLElement).animate(frames, opts);
  stateOf(container).anims.push(a);
  return a;
}

function spawn(container: HTMLElement, parent: Element, attr: string, text = ''): HTMLElement {
  const el = parent.ownerDocument.createElement('div');
  el.setAttribute(attr, '');
  el.setAttribute('aria-hidden', 'true');
  if (text) el.textContent = text;
  parent.appendChild(el);
  stateOf(container).nodes.push(el);
  return el;
}

function tilesFor(container: HTMLElement, keys: string[]): HTMLElement[][] {
  return keys.map((k) => [...container.querySelectorAll<HTMLElement>(`[data-tile][data-key="${k}"], [data-gk="${k}"]`)]);
}

function markTiles(container: HTMLElement, keys: string[], value: string) {
  tilesFor(container, keys).forEach((els, i) =>
    els.forEach((el) => {
      el.setAttribute('data-fx', value);
      el.style.setProperty('--fx-i', String(i));
    }),
  );
}

function unmarkTiles(container: HTMLElement, keys: string[]) {
  tilesFor(container, keys).forEach((els) => els.forEach((el) => el.removeAttribute('data-fx')));
}

function hidePreview(container: HTMLElement) {
  const preview = container.querySelector<HTMLElement>('[data-board-preview]');
  if (!preview || container.hasAttribute('data-active')) return;
  preview.dataset.state = 'leave';
  later(container, LEAVE_MS, () => {
    if (container.hasAttribute('data-active')) return;
    container.querySelector('[data-preview-word]')?.replaceChildren();
    const count = container.querySelector('[data-preview-count]');
    if (count) count.textContent = '';
    delete preview.dataset.state;
  });
}

/** Cancels every running board effect, so a new word always starts on a clean board. */
export function clearFx(container: HTMLElement): void {
  const s = states.get(container);
  if (!s) return;
  s.timers.forEach((t) => window.clearTimeout(t));
  s.anims.forEach((a) => {
    try { a.cancel(); } catch { /* already finished */ }
  });
  s.nodes.forEach((n) => n.remove());
  unmarkTiles(container, s.keys);
  container.removeAttribute('data-verdict');
  states.set(container, empty());
}

function gridOrigin(grid: HTMLElement) {
  const r = grid.getBoundingClientRect();
  return { left: r.left + grid.clientLeft, top: r.top + grid.clientTop, width: grid.clientWidth || r.width };
}

function flyTargets(container: HTMLElement): { letters: DOMRect[]; box: DOMRect | null; rtl: boolean } {
  const own = [...container.querySelectorAll<HTMLElement>('[data-board-preview] [data-pl]')].map((n) => n.getBoundingClientRect());
  if (own.length) return { letters: own, box: null, rtl: false };
  const ext = container.ownerDocument.querySelector<HTMLElement>('[data-board-fly-target]');
  const box = ext?.getBoundingClientRect();
  const rtl = ext?.closest('[dir]')?.getAttribute('dir') === 'rtl';
  return { letters: [], box: box && box.width > 0 ? box : null, rtl };
}

function echoTrail(container: HTMLElement) {
  const core = container.querySelector<SVGPolylineElement>('[data-trail="core"]');
  const echo = container.querySelector<SVGPolylineElement>('[data-trail-echo]');
  const pts = core?.getAttribute('points');
  if (!core || !echo || !pts) return;
  const w = Number(core.getAttribute('stroke-width')) || 10;
  echo.setAttribute('points', pts);
  echo.setAttribute('stroke-width', String(w));
  animate(container, echo, [
    { opacity: 0.9, strokeWidth: `${w * 1.15}px` },
    { opacity: 0, strokeWidth: `${w * 0.1}px` },
  ], { duration: 260, easing: 'cubic-bezier(0.3, 0, 0.6, 1)', fill: 'forwards' });
}

/**
 * The word leaves the board: the trail snaps away, and each letter lifts off
 * its tile and flies to the word preview (the board's own pill, the mode's
 * word bar, or up off the board) while the tiles give a small release squash.
 */
export function releaseFx(container: HTMLElement, path: CellRef[], geo: BoardGeometry | null): void {
  clearFx(container);
  const s = stateOf(container);
  s.keys = path.map((c) => keyOf(c.row, c.col));
  s.word = norm(path.map((c) => c.letter).join(''));
  s.at = Date.now();
  if (reduced()) return;
  echoTrail(container);
  const ghost = container.hasAttribute('data-ghost');
  const preview = container.querySelector<HTMLElement>('[data-board-preview]');
  if (preview && !ghost) preview.dataset.state = 'sent';
  later(container, PREVIEW_HOLD_MS + 600, () => {
    if (preview?.dataset.state === 'sent') hidePreview(container);
  });
  if (ghost || !geo) return;

  markTiles(container, s.keys, 'sent');
  const layer = container.querySelector<HTMLElement>('[data-board-fx]');
  const grid = container.querySelector<HTMLElement>('[role="grid"]');
  if (!layer || !grid) return;
  const origin = gridOrigin(grid);
  const { letters, box, rtl } = flyTargets(container);
  const n = path.length;

  path.forEach((c, i) => {
    const t = geo.byKey.get(keyOf(c.row, c.col));
    if (!t) return;
    const x = t.cx - origin.left;
    const y = t.cy - origin.top;
    const fly = spawn(container, layer, 'data-fly', c.letter);
    fly.style.left = `${x}px`;
    fly.style.top = `${y}px`;
    fly.style.setProperty('--fly-size', `${t.size}px`);
    const spread = (rtl ? -1 : 1) * (i - (n - 1) / 2) * Math.min(t.size * 0.5, 30);
    let tx: number;
    let ty: number;
    const own = letters[i];
    if (own) {
      tx = own.left + own.width / 2 - origin.left;
      ty = own.top + own.height / 2 - origin.top;
    } else if (box) {
      tx = box.left + box.width / 2 + spread - origin.left;
      ty = box.top + box.height / 2 - origin.top;
    } else {
      tx = origin.width / 2 + spread;
      ty = -t.size * 0.8;
    }
    const dx = tx - x;
    const dy = ty - y;
    const lift = -Math.max(20, t.size * 0.45);
    const tilt = i % 2 ? 10 : -10;
    const anim = animate(container, fly, [
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx * 0.1}px), calc(-50% + ${lift}px)) scale(1.22) rotate(${tilt}deg)`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7 + lift * 0.4}px)) scale(0.8) rotate(${tilt / 2}deg)`, opacity: 1, offset: 0.75 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.45) rotate(0deg)`, opacity: 0 },
    ], { duration: FLY_MS, delay: i * FLY_STAGGER_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)', fill: 'both' });
    s.flights.push({ el: fly, anim });
  });
  later(container, FLY_MS + n * FLY_STAGGER_MS + 60, () => {
    s.flights.forEach((f) => f.el.remove());
    s.flights = [];
  });
}

function dropFlights(container: HTMLElement, s: FxState, kind: FeedbackKind) {
  s.flights.forEach(({ el, anim }, i) => {
    if (!el.isConnected) return;
    el.setAttribute('data-verdict', kind === 'ok' ? 'ok' : 'bad');
    if (kind === 'ok') return;
    anim?.pause();
    const now = getComputedStyle(el).transform;
    anim?.cancel();
    animate(container, el, [
      { transform: now && now !== 'none' ? now : 'translate(-50%, -50%)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(i % 2 ? 1 : -1) * 14}px), calc(-50% + 70px)) rotate(${i % 2 ? 24 : -24}deg) scale(0.7)`, opacity: 0 },
    ], { duration: 420, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' });
  });
}

function celebrate(container: HTMLElement, s: FxState, score: number | undefined) {
  const layer = container.querySelector<HTMLElement>('[data-board-fx]');
  const grid = container.querySelector<HTMLElement>('[role="grid"]');
  const lastKey = s.keys[s.keys.length - 1];
  const tile = lastKey ? container.querySelector<HTMLElement>(`[data-tile][data-key="${lastKey}"]`) : null;
  if (!layer || !grid || !tile) return;
  const origin = gridOrigin(grid);
  const tr = tile.getBoundingClientRect();
  const x = tr.left + tr.width / 2 - origin.left;
  const y = tr.top + tr.height / 2 - origin.top;
  const size = tr.width || 60;

  const ring = spawn(container, layer, 'data-ring');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  animate(container, ring, [
    { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 },
  ], { duration: 520, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });

  for (let i = 0; i < 10; i++) {
    const shard = spawn(container, layer, 'data-shard');
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.background = SHARD_COLORS[i % SHARD_COLORS.length];
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = size * (0.9 + (i % 3) * 0.35);
    animate(container, shard, [
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0.3) rotate(${(i % 2 ? 1 : -1) * 200}deg)`, opacity: 0 },
    ], { duration: 560 + (i % 3) * 90, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });
  }

  if (score && score > 0 && container.querySelector('[data-board-preview]')) {
    const chip = spawn(container, layer, 'data-chip', `+${score}`);
    chip.style.left = `${x}px`;
    chip.style.top = `${y}px`;
    animate(container, chip, [
      { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 0 },
      { transform: 'translate(-50%, calc(-50% - 22px)) scale(1.25)', opacity: 1, offset: 0.2 },
      { transform: 'translate(-50%, calc(-50% - 54px)) scale(1)', opacity: 1, offset: 0.75 },
      { transform: 'translate(-50%, calc(-50% - 70px)) scale(0.9)', opacity: 0 },
    ], { duration: 1100, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' });
  }
}

/** The verdict on the word that just left: the tiles and letters celebrate or shrug. */
export function feedbackFx(container: HTMLElement, kind: FeedbackKind, score?: number, word?: string): void {
  if (container.hasAttribute('data-active')) return;
  const s = stateOf(container);
  const fresh = s.keys.length > 0 && Date.now() - s.at < VERDICT_WINDOW_MS && (word == null || norm(word) === s.word);
  const preview = container.querySelector<HTMLElement>('[data-board-preview]');
  const ghost = container.hasAttribute('data-ghost');
  const motion = !reduced();
  if (preview && !ghost && preview.dataset.state) {
    preview.dataset.state = kind;
    later(container, PREVIEW_HOLD_MS, () => hidePreview(container));
  }
  if (!fresh) return;
  container.setAttribute('data-verdict', kind);
  if (ghost) return;
  markTiles(container, s.keys, kind);
  const keys = s.keys;
  later(container, TILE_FX_MS, () => unmarkTiles(container, keys));
  if (!motion) return;
  dropFlights(container, s, kind);
  if (kind === 'ok') celebrate(container, s, score);
}
