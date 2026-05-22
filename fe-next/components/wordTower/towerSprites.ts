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

/** (Re)draw a tile's face/shadow/glyph for a given fill + pending (ghost) state. */
export function paintTile(tile: TileSprite, color: number, pending: boolean): void {
  const s = tile.size;
  const half = s / 2;
  const r = Math.max(6, s * 0.18);
  tile.color = color;
  tile.pending = pending;

  tile.shadow.clear().roundRect(-half + 3, -half + 4, s, s, r).fill({ color: 0x000000, alpha: pending ? 0.22 : 0.5 });

  tile.face.clear();
  tile.face.roundRect(-half, -half, s, s, r).fill({ color, alpha: pending ? 0.5 : 1 });
  tile.face.roundRect(-half, -half, s, s, r).stroke({ color: 0x000000, width: 3, alignment: 1, alpha: pending ? 0.85 : 1 });
  if (pending) {
    // bright inner ring → reads as a holographic "about to lock in" preview
    tile.face.roundRect(-half + 4, -half + 4, s - 8, s - 8, Math.max(3, r - 4)).stroke({ color: 0xffffff, width: 1.5, alpha: 0.55 });
  }

  if (tile.glyph) {
    tile.glyph.style.fill = textColorOn(color);
    tile.glyph.alpha = pending ? 0.9 : 1;
  }
}

/** Build a tile. `char === null` → a label-less brick (versus spoiler-free row). */
export function makeTile(char: string | null, size: number, color: number, pending: boolean): TileSprite {
  const tile = new Container() as TileSprite;
  tile.size = size;
  tile.color = color;
  tile.pending = pending;
  tile.anim = 0;
  tile.shadow = new Graphics();
  tile.face = new Graphics();
  tile.glyph = char != null
    ? new Text({ text: char, style: new TextStyle({ fontFamily: FONT, fontSize: Math.min(size * 0.58, 38), fontWeight: '700', fill: 0x000000 }) })
    : null;
  tile.addChild(tile.shadow, tile.face);
  if (tile.glyph) {
    tile.glyph.anchor.set(0.5);
    tile.addChild(tile.glyph);
  }
  paintTile(tile, color, pending);
  return tile;
}

/** Snap a tile to its slot with no animation (resume / reduced-motion / scroll-in). */
export function placeInstant(tile: TileSprite, y: number): void {
  tile.anim++; // cancel any in-flight tween
  tile.y = y;
  tile.alpha = 1;
  tile.scale.set(1);
}

/** Gravity drop entrance: falls from above with an overshoot bounce, fades in. */
export function dropIn(tile: TileSprite, toY: number, delay: number, onLand?: () => void): void {
  const fromY = toY - Math.max(64, tile.size * 1.6);
  tile.y = fromY;
  tile.alpha = 0;
  tile.scale.set(1);
  run(tile, 440, delay, (k) => {
    tile.y = fromY + (toY - fromY) * easeOutBack(k);
    tile.alpha = Math.min(1, k * 2.2);
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
export function recolor(tile: TileSprite, toColor: number, toPending: boolean): void {
  const from = tile.color;
  if (from === toColor && tile.pending === toPending) return;
  run(tile, 340, 0, (k) => paintTile(tile, lerpHex(from, toColor, easeOutCubic(k)), toPending), () => paintTile(tile, toColor, toPending));
}

/** Quick scale pop — landing/lock-in juice. */
export function bumpScale(tile: TileSprite, amount = 0.16): void {
  run(tile, 260, 0, (k) => tile.scale.set(1 + amount * Math.sin(k * Math.PI)), () => tile.scale.set(1));
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
