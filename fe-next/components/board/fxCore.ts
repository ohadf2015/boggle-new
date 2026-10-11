export interface FxState {
  keys: string[];
  word: string;
  at: number;
  timers: number[];
  nodes: Element[];
  anims: Animation[];
  flights: Array<{ el: HTMLElement; anim: Animation | null }>;
}

const states = new WeakMap<HTMLElement, FxState>();

export const SHARD_COLORS = ['#bfff00', '#00ffff', '#ffe135', '#ff6bb8', '#ffffff'];

const FINALS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
export const norm = (w: string) => [...w.toLowerCase()].map((ch) => FINALS[ch] ?? ch).join('');

export function reduced(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export const emptyFx = (): FxState => ({ keys: [], word: '', at: 0, timers: [], nodes: [], anims: [], flights: [] });

export function peekFx(container: HTMLElement): FxState | undefined {
  return states.get(container);
}

export function resetFx(container: HTMLElement): void {
  states.set(container, emptyFx());
}

export function stateOf(container: HTMLElement): FxState {
  let s = states.get(container);
  if (!s) {
    s = emptyFx();
    states.set(container, s);
  }
  return s;
}

export function later(container: HTMLElement, ms: number, fn: () => void) {
  stateOf(container).timers.push(window.setTimeout(fn, ms));
}

export function animate(container: HTMLElement, el: Element, frames: Keyframe[], opts: KeyframeAnimationOptions): Animation | null {
  if (typeof (el as HTMLElement).animate !== 'function') return null;
  const a = (el as HTMLElement).animate(frames, opts);
  stateOf(container).anims.push(a);
  return a;
}

export function spawn(container: HTMLElement, parent: Element, attr: string, text = ''): HTMLElement {
  const el = parent.ownerDocument.createElement('div');
  el.setAttribute(attr, '');
  el.setAttribute('aria-hidden', 'true');
  if (text) el.textContent = text;
  parent.appendChild(el);
  stateOf(container).nodes.push(el);
  return el;
}

/** A ring and a spray of shards bursting from (x, y) inside `layer`. */
export function burst(container: HTMLElement, layer: HTMLElement, x: number, y: number, size: number, shards = 10) {
  const ring = spawn(container, layer, 'data-ring');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  animate(container, ring, [
    { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 1 },
    { transform: 'translate(-50%, -50%) scale(2.6)', opacity: 0 },
  ], { duration: 520, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });

  for (let i = 0; i < shards; i++) {
    const shard = spawn(container, layer, 'data-shard');
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.background = SHARD_COLORS[i % SHARD_COLORS.length];
    const a = (i / shards) * Math.PI * 2 + 0.3;
    const r = size * (0.9 + (i % 3) * 0.35);
    animate(container, shard, [
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0.3) rotate(${(i % 2 ? 1 : -1) * 200}deg)`, opacity: 0 },
    ], { duration: 560 + (i % 3) * 90, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });
  }
}

/** Letter chip arc from (x, y) to (tx, ty): lift, swing, shrink in. */
export function flyFrames(dx: number, dy: number, lift: number, tilt: number, endScale = 0.45): Keyframe[] {
  return [
    { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
    { transform: `translate(calc(-50% + ${dx * 0.1}px), calc(-50% + ${lift}px)) scale(1.22) rotate(${tilt}deg)`, opacity: 1, offset: 0.2 },
    { transform: `translate(calc(-50% + ${dx * 0.7}px), calc(-50% + ${dy * 0.7 + lift * 0.4}px)) scale(0.8) rotate(${tilt / 2}deg)`, opacity: 1, offset: 0.75 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${endScale}) rotate(0deg)`, opacity: 0 },
  ];
}
