import { keyOf, type BoardGeometry, type CellRef } from './selectionPath';
import { animate, burst, flyFrames, later, spawn, type FxState } from './fxCore';
import fx from './BoardEffects.module.css';

export const LIFT_FLY_MS = 300;
export const LIFT_STAGGER_MS = 28;
const LIFT_TIMEOUT_MS = 1800;
const OK_HOLD_MS = 520;
const BAD_HOLD_MS = 420;
const LEAVE_MS = 260;

const overlays = new WeakMap<HTMLElement, HTMLElement>();

/**
 * Blast clips its board, so the word it lifts lives in a fixed layer on the
 * page: it can rise over the board's edge and fly to the score.
 */
function overlayFor(container: HTMLElement): HTMLElement {
  const known = overlays.get(container);
  if (known?.isConnected) return known;
  const el = container.ownerDocument.createElement('div');
  el.setAttribute('data-board-overlay', '');
  el.setAttribute('aria-hidden', 'true');
  el.className = `${fx.layer} ${fx.overlay}`;
  container.ownerDocument.body.appendChild(el);
  overlays.set(container, el);
  return el;
}

export function disposeOverlay(container: HTMLElement): void {
  overlays.get(container)?.remove();
  overlays.delete(container);
}

function labelOf(container: HTMLElement): HTMLElement | null {
  return overlays.get(container)?.querySelector<HTMLElement>('[data-lift]') ?? null;
}

function leave(container: HTMLElement, el: HTMLElement, dy: number) {
  animate(container, el, [
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    { transform: `translate(-50%, calc(-50% + ${dy}px)) scale(0.85)`, opacity: 0 },
  ], { duration: LEAVE_MS, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)', fill: 'forwards' });
  later(container, LEAVE_MS, () => el.remove());
}

/** The released word pops up over the board's top edge and every letter flies off its tile into it. */
export function liftRelease(container: HTMLElement, s: FxState, path: CellRef[], geo: BoardGeometry): void {
  const grid = container.querySelector<HTMLElement>('[role="grid"]');
  if (!grid || !path.length) return;
  const layer = overlayFor(container);
  const g = grid.getBoundingClientRect();
  const cell = geo.cell || g.width / 4;

  const size = Math.round(Math.min(64, Math.max(30, cell * 0.62)));
  const half = size * 0.75;
  const lx = g.left + g.width / 2;
  const ly = Math.max(half + 8, g.top - half - 12);
  const label = spawn(container, layer, 'data-lift');
  label.dir = container.getAttribute('data-word-dir') === 'rtl' ? 'rtl' : 'ltr';
  label.style.left = `${lx}px`;
  label.style.top = `${ly}px`;
  label.style.setProperty('--lift-size', `${size}px`);
  path.forEach((c, i) => {
    const slot = label.ownerDocument.createElement('span');
    slot.setAttribute('data-ll', '');
    slot.style.setProperty('--ll-i', String(i));
    slot.textContent = c.letter;
    label.appendChild(slot);
  });
  const slots = [...label.querySelectorAll<HTMLElement>('[data-ll]')].map((n) => n.getBoundingClientRect());
  animate(container, label, [
    { transform: 'translate(-50%, -50%) translateY(26px) scale(0.55) rotate(-4deg)' },
    { transform: 'translate(-50%, -50%) translateY(-6px) scale(1.14) rotate(2deg)', offset: 0.55 },
    { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)' },
  ], { duration: 240, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)', fill: 'backwards' });

  const n = path.length;
  path.forEach((c, i) => {
    const t = geo.byKey.get(keyOf(c.row, c.col));
    if (!t) return;
    const fly = spawn(container, layer, 'data-fly', c.letter);
    fly.setAttribute('data-ghost-fly', '');
    fly.style.left = `${t.cx}px`;
    fly.style.top = `${t.cy}px`;
    fly.style.setProperty('--fly-size', `${t.size}px`);
    const slot = slots[i];
    const tx = slot && slot.width > 0 ? slot.left + slot.width / 2 : lx + (i - (n - 1) / 2) * t.size * 0.5;
    const ty = slot && slot.height > 0 ? slot.top + slot.height / 2 : ly;
    const anim = animate(container, fly, flyFrames(tx - t.cx, ty - t.cy, -Math.max(18, t.size * 0.4), i % 2 ? 9 : -9, 0.5), {
      duration: LIFT_FLY_MS,
      delay: i * LIFT_STAGGER_MS,
      easing: 'cubic-bezier(0.45, 0, 0.25, 1)',
      fill: 'both',
    });
    s.flights.push({ el: fly, anim });
  });
  later(container, LIFT_FLY_MS + n * LIFT_STAGGER_MS + 40, () => {
    s.flights.forEach((f) => f.el.remove());
    s.flights = [];
  });
  later(container, LIFT_TIMEOUT_MS, () => {
    if (!label.isConnected || label.hasAttribute('data-verdict')) return;
    leave(container, label, -24);
  });
}

function scoreFloat(container: HTMLElement, layer: HTMLElement, label: HTMLElement, score: number) {
  const r = label.getBoundingClientRect();
  const chip = spawn(container, layer, 'data-score-float', `+${score}`);
  chip.style.left = `${r.left + r.width / 2}px`;
  chip.style.top = `${r.top}px`;
  animate(container, chip, [
    { transform: 'translate(-50%, -50%) scale(0.3) rotate(-8deg)', opacity: 0 },
    { transform: 'translate(-50%, calc(-50% - 30px)) scale(1.3) rotate(3deg)', opacity: 1, offset: 0.22 },
    { transform: 'translate(-50%, calc(-50% - 62px)) scale(1) rotate(0deg)', opacity: 1, offset: 0.78 },
    { transform: 'translate(-50%, calc(-50% - 80px)) scale(0.9)', opacity: 0 },
  ], { duration: 1150, easing: 'cubic-bezier(0.2, 0.8, 0.3, 1)', fill: 'forwards' });
}

function flyToScore(container: HTMLElement, label: HTMLElement) {
  const target = [...container.ownerDocument.querySelectorAll<HTMLElement>('[data-board-score-target]')]
    .map((el) => el.getBoundingClientRect())
    .find((r) => r.width > 0);
  if (!target) {
    leave(container, label, -36);
    return;
  }
  const r = label.getBoundingClientRect();
  const dx = target.left + target.width / 2 - (r.left + r.width / 2);
  const dy = target.top + target.height / 2 - (r.top + r.height / 2);
  animate(container, label, [
    { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    { transform: `translate(calc(-50% + ${dx * 0.35}px), calc(-50% + ${dy * 0.2 - 30}px)) scale(0.8)`, opacity: 1, offset: 0.4 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.2)`, opacity: 0.2 },
  ], { duration: 380, easing: 'cubic-bezier(0.55, 0, 0.7, 0.4)', fill: 'forwards' });
  later(container, 380, () => label.remove());
}

/** The lifted word takes the verdict: points and a burst for a word, a shake for a miss. */
export function liftVerdict(container: HTMLElement, s: FxState, kind: 'ok' | 'bad' | 'dupe', score: number | undefined, motion: boolean): void {
  const label = labelOf(container);
  const layer = overlays.get(container);
  if (!label || !layer) return;
  label.setAttribute('data-verdict', kind);
  if (kind !== 'ok') {
    later(container, BAD_HOLD_MS, () => leave(container, label, 40));
    return;
  }
  if (motion) {
    const lastKey = s.keys[s.keys.length - 1];
    const tile = lastKey ? container.querySelector<HTMLElement>(`[data-tile][data-key="${lastKey}"]`) : null;
    const tr = tile?.getBoundingClientRect();
    if (tr) burst(container, layer, tr.left + tr.width / 2, tr.top + tr.height / 2, tr.width || 60, 12);
    if (score && score > 0) scoreFloat(container, layer, label, score);
  }
  later(container, OK_HOLD_MS, () => flyToScore(container, label));
}

