/**
 * Word Tower — imperative Pixi tile factory + drop/slide/recolor physics.
 *
 * Kept out of the React scene component so the orchestrator stays lean (<300
 * lines). Every tween is rAF-driven and cancellable: each tile carries an
 * `anim` token, bumped whenever a new tween starts, so a stale frame loop bails
 * the instant a fresh one supersedes it (re-renders fire constantly while a
 * word is being built).
 */
import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { textColorOn } from '@/lib/wordTower/towerColumn';

const FONT = 'Fredoka, Rubik, sans-serif';

/** A column tile: square face + hard shadow + (optional) glyph. Extra fields
 *  track the live colour/pending state and the cancellation token. */
export type TileSprite = Container & {
  face: Graphics;
  shadow: Graphics;
  glyph: Text | null;
  size: number;
  color: number;
  pending: boolean;
  anim: number;
};

const easeOutCubic = (k: number) => 1 - Math.pow(1 - k, 3);
const easeOutBack = (k: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

const lerpHex = (a: number, b: number, t: number): number => {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
};

/** Cancellable rAF tween bound to a tile's `anim` token. */
function run(tile: TileSprite, dur: number, delay: number, step: (k: number) => void, done?: () => void): void {
  const token = ++tile.anim;
  const t0 = performance.now() + delay;
  const tick = () => {
    if (tile.destroyed || tile.anim !== token) return;
    const now = performance.now();
    if (now < t0) { requestAnimationFrame(tick); return; }
    const k = Math.min(1, (now - t0) / dur);
    step(k);
    if (k < 1) requestAnimationFrame(tick);
    else done?.();
  };
  requestAnimationFrame(tick);
}

/** Darken (f<1, multiply) or lighten (f>1, mix toward white) a packed RGB int. */
function shade(hex: number, f: number): number {
  const r = (hex >> 16) & 0xff, g = (hex >> 8) & 0xff, b = hex & 0xff;
  if (f <= 1) return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f);
  const t = Math.min(1, f - 1);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  return (mix(r) << 16) | (mix(g) << 8) | mix(b);
}

/**
 * (Re)draw a tile as a chunky neo-brutalist building block: solid fill, a lit
 * top edge + shaded base band (flat two-tone → 3D weight without gradients),
 * hard black border, hard drop shadow. `shared` connectors wear a bright ring.
 */
export function paintTile(tile: TileSprite, color: number, pending: boolean, shared = false): void {
  // A queued tween or its `done()` callback can fire after the tile was
  // destroyed mid-build (rapid re-renders retire tiles while a word is typed),
  // leaving `face`/`shadow` torn down. Bail instead of `.clear()` on a null —
  // Sentry JAVASCRIPT-NEXTJS-1CK.
  if (tile.destroyed || !tile.face || !tile.shadow) return;

  const s = tile.size;
  const half = s / 2;
  const r = Math.max(7, s * 0.2);
  const inset = Math.ceil(r * 0.7);
  const a = pending ? 0.5 : 1;
  tile.color = color;
  tile.pending = pending;

  tile.shadow.clear().roundRect(-half + 4, -half + 5, s, s, r).fill({ color: 0x000000, alpha: pending ? 0.2 : 0.5 });

  const g = tile.face;
  g.clear();
  g.roundRect(-half, -half, s, s, r).fill({ color, alpha: a });
  // Flat two-tone block shading: lit top strip + darker base band (inset so the
  // bands never collide with the rounded corners).
  const topH = Math.round(s * 0.15);
  const baseH = Math.round(s * 0.22);
  g.rect(-half + inset, -half + Math.ceil(r * 0.5), s - inset * 2, topH).fill({ color: shade(color, 1.3), alpha: a * 0.9 });
  g.rect(-half + inset, half - Math.ceil(r * 0.5) - baseH, s - inset * 2, baseH).fill({ color: shade(color, 0.6), alpha: a });
  g.roundRect(-half, -half, s, s, r).stroke({ color: 0x000000, width: Math.max(4, s * 0.06), alignment: 1, alpha: pending ? 0.85 : 1 });

  if (shared && !pending) {
    g.roundRect(-half + 4, -half + 4, s - 8, s - 8, Math.max(4, r - 3)).stroke({ color: 0xfffef0, width: 2, alpha: 0.75 });
  }
  if (pending) {
    g.roundRect(-half + 4, -half + 4, s - 8, s - 8, Math.max(4, r - 3)).stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
  }

  if (tile.glyph) {
    tile.glyph.style.fill = textColorOn(color);
    tile.glyph.alpha = pending ? 0.92 : 1;
  }
}

/** Build a tile. `char === null` → a label-less brick (versus spoiler-free row). */
export function makeTile(char: string | null, size: number, color: number, pending: boolean, shared = false): TileSprite {
  const tile = new Container() as TileSprite;
  tile.size = size;
  tile.color = color;
  tile.pending = pending;
  tile.anim = 0;
  tile.shadow = new Graphics();
  tile.face = new Graphics();
  tile.glyph = char != null
    ? new Text({ text: char, style: new TextStyle({ fontFamily: FONT, fontSize: Math.min(size * 0.62, 40), fontWeight: '700', fill: 0x000000 }) })
    : null;
  tile.addChild(tile.shadow, tile.face);
  if (tile.glyph) {
    tile.glyph.anchor.set(0.5);
    tile.glyph.y = -Math.round(size * 0.02); // optical-centre against the base band
    tile.addChild(tile.glyph);
  }
  paintTile(tile, color, pending, shared);
  return tile;
}

/** Snap a tile to its slot with no animation (resume / reduced-motion / scroll-in). */
export function placeInstant(tile: TileSprite, y: number): void {
  tile.anim++; // cancel any in-flight tween
  tile.y = y;
  tile.alpha = 1;
  tile.scale.set(1);
}

/** Gravity drop entrance: falls a SHORT distance into its slot with a monotonic
 *  ease (no overshoot) so it lands flush against its neighbours — overshoot read
 *  as a gap/jitter in the stacked column. The landing weight comes from
 *  {@link squashLand}, not from the fall easing. */
export function dropIn(tile: TileSprite, toY: number, delay: number, onLand?: () => void): void {
  const fromY = toY - Math.max(36, tile.size * 0.7);
  tile.y = fromY;
  tile.alpha = 0;
  tile.scale.set(1);
  run(tile, 300, delay, (k) => {
    tile.y = fromY + (toY - fromY) * easeOutCubic(k);
    tile.alpha = Math.min(1, k * 2.6);
  }, () => { tile.y = toY; tile.alpha = 1; onLand?.(); });
}

/** Ease a settled tile to a new slot (the stack sliding down/up by a row). */
export function moveTo(tile: TileSprite, toY: number): void {
  if (Math.abs(tile.y - toY) < 0.5) { tile.y = toY; return; }
  const fromY = tile.y;
  run(tile, 300, 0, (k) => { tile.y = fromY + (toY - fromY) * easeOutCubic(k); }, () => { tile.y = toY; });
}

/** Pop a tile out (backspace): floats up, shrinks, fades, then `onDone`. */
export function popOut(tile: TileSprite, onDone: () => void): void {
  const fromY = tile.y;
  run(tile, 220, 0, (k) => {
    tile.y = fromY - 44 * k;
    tile.alpha = 1 - k;
    tile.scale.set(1 - 0.4 * k);
  }, onDone);
}

/** Lerp a tile's fill to a new colour (connector blend / ghost→solid lock-in). */
export function recolor(tile: TileSprite, toColor: number, toPending: boolean, toShared = false): void {
  const from = tile.color;
  if (from === toColor && tile.pending === toPending) { paintTile(tile, toColor, toPending, toShared); return; }
  run(tile, 340, 0, (k) => paintTile(tile, lerpHex(from, toColor, easeOutCubic(k)), toPending, toShared), () => paintTile(tile, toColor, toPending, toShared));
}

/** Quick scale pop — landing/lock-in juice. */
export function bumpScale(tile: TileSprite, amount = 0.16): void {
  run(tile, 260, 0, (k) => tile.scale.set(1 + amount * Math.sin(k * Math.PI)), () => tile.scale.set(1));
}

/** Squash-and-recover on impact — gives a landing tile real weight (wide+short
 *  then a soft tall rebound). Heavier feel than {@link bumpScale}. */
export function squashLand(tile: TileSprite): void {
  run(tile, 240, 0, (k) => {
    const e = easeOutBack(k); // overshoots >1 mid-way → brief stretch on the rebound
    tile.scale.set(1 + 0.22 * (1 - e), 1 - 0.22 * (1 - e));
  }, () => tile.scale.set(1));
}

/** Expanding shockwave ring at an impact point. Self-cleaning (destroys itself
 *  when the tween ends). `scaleMul` lets deeper letters punch a bigger ring. */
export function impactRing(parent: Container, x: number, y: number, baseRadius: number, color: number, scaleMul = 1): void {
  const ring = new Graphics();
  ring.x = x;
  ring.y = y;
  ring.zIndex = 1_000_000; // above every tile (parent sorts by zIndex) so the shockwave isn't occluded
  parent.addChild(ring);
  const dur = 380;
  const t0 = performance.now();
  const from = baseRadius * 0.35;
  const to = baseRadius * 1.6 * scaleMul;
  const tick = () => {
    if (ring.destroyed) return;
    const k = Math.min(1, (performance.now() - t0) / dur);
    const r = from + (to - from) * easeOutCubic(k);
    ring.clear().circle(0, 0, r).stroke({ color, width: Math.max(2, 4 * (1 - k)), alpha: 0.7 * (1 - k) });
    if (k < 1) requestAnimationFrame(tick);
    else { try { ring.destroy(); } catch { /* */ } }
  };
  requestAnimationFrame(tick);
}

/** Brief horizontal shake of a container (rejected word). Fire-and-forget. */
export function shakeX(c: Container, mag = 9, dur = 320): void {
  const x0 = c.x;
  const t0 = performance.now();
  const tick = () => {
    if (c.destroyed) return;
    const k = (performance.now() - t0) / dur;
    if (k >= 1) { c.x = x0; return; }
    c.x = x0 + Math.sin(k * Math.PI * 6) * mag * (1 - k);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
