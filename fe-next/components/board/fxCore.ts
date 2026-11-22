import { jitter, lowEndMotion, pick, type Rand } from '@/lib/animation/variety';

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

const SHARD_TOKENS = ['lime', 'pink', 'cyan', 'purple', 'yellow', 'orange'].map((c) => `var(--neo-${c})`);

/**
 * A ring and a spray of shards bursting from (x, y) inside `layer`. Each burst rolls its lead colour,
 * rotation, reach and spin; about 1 in 6 is a star or an upward fountain. Never more than `shards` nodes.
 */
export function burst(container: HTMLElement, layer: HTMLElement, x: number, y: number, size: number, shards = 10, rand: Rand = Math.random) {
  const count = lowEndMotion() ? Math.ceil(shards / 2) : shards - Math.floor(rand() * 3);
  const shape = rand() < 1 / 6 ? pick(['fountain', 'star'] as const, rand) : 'ring';
  const turn = rand() * Math.PI * 2;
  const hue = Math.floor(rand() * SHARD_TOKENS.length);

  const ring = spawn(container, layer, 'data-ring');
  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;
  ring.style.width = `${size}px`;
  ring.style.height = `${size}px`;
  ring.style.borderColor = SHARD_TOKENS[hue];
  animate(container, ring, [
    { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 1 },
    { transform: `translate(-50%, -50%) scale(${jitter(2.6, 0.3, rand).toFixed(2)})`, opacity: 0 },
  ], { duration: 520, easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });

  for (let i = 0; i < count; i++) {
    const shard = spawn(container, layer, 'data-shard');
    shard.style.left = `${x}px`;
    shard.style.top = `${y}px`;
    shard.style.background = SHARD_TOKENS[(hue + i) % SHARD_TOKENS.length];
    const a = shape === 'fountain'
      ? -Math.PI / 2 + (i / Math.max(count - 1, 1) - 0.5) * 2.2 + jitter(0, 0.12, rand)
      : (i / count) * Math.PI * 2 + turn + jitter(0, 0.15, rand);
    const r = size * (shape === 'star' ? (i % 2 ? 0.7 : 1.7) : jitter(1.25, 0.35, rand));
    const spin = (i % 2 ? 1 : -1) * Math.round(jitter(200, 60, rand));
    animate(container, shard, [
      { transform: 'translate(-50%, -50%) scale(1) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${(Math.cos(a) * r).toFixed(1)}px), calc(-50% + ${(Math.sin(a) * r).toFixed(1)}px)) scale(0.3) rotate(${spin}deg)`, opacity: 0 },
    ], { duration: Math.round(jitter(620, 80, rand)), easing: 'cubic-bezier(0.1, 0.7, 0.3, 1)', fill: 'forwards' });
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

/** Points chip: pops in at full strength (a fade-in reads muddy over navy), rises, then fades out. */
export function pointsFrames(rise: number, tilt = 0): Keyframe[] {
  return [
    { transform: `translate(-50%, -50%) scale(0.3) rotate(${-tilt}deg)`, opacity: 1 },
    { transform: `translate(-50%, calc(-50% - ${Math.round(rise * 0.4)}px)) scale(1.3) rotate(${tilt / 2}deg)`, opacity: 1, offset: 0.2 },
    { transform: `translate(-50%, calc(-50% - ${Math.round(rise * 0.78)}px)) scale(1) rotate(0deg)`, opacity: 1, offset: 0.78 },
    { transform: `translate(-50%, calc(-50% - ${rise}px)) scale(0.9)`, opacity: 0 },
  ];
}
