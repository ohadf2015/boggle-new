/**
 * Pixi building blocks for the arena: the floor slab, a fighter rig (sprite +
 * white "flash" twin + contact shadow), floating callouts and the rings that
 * carry a blow — an expanding shockwave, or a bolt crossing the stage.
 * Drawing only — the beat logic lives in `arenaBeats` / `arenaCommands`.
 */
import { Container, Graphics, Sprite, Text, TextStyle, type Texture } from 'pixi.js';
import type { ArenaLayout } from './arenaLayout';
import { arcAt, floatRise, type ArcPoint } from './arenaBeats';

export const NAVY = 0x0f1b3d;
export const LIME = 0xbfff00;
export const PINK = 0xff3366;
export const CYAN = 0x22d3ee;
export const YELLOW = 0xffd60a;

/** One fighter: body, a hard black offset twin (the neo-brutalist pixel shadow),
 *  a white twin for the hit flash, and the contact shadow it casts. */
export interface Rig {
  root: Container;
  body: Sprite;
  drop: Sprite;
  flash: Sprite;
  shadow: Graphics;
  /** Current knock offset along the facing axis (px). */
  knock: number;
  knockV: number;
  /** 0..1 white-out. */
  flashAmt: number;
  /** Constant offset of the hard pixel shadow behind the body. */
  dropOff: { x: number; y: number };
  pose: 'idle' | 'windup' | 'lunge' | 'hurt' | 'dead';
  poseLeftMs: number;
  /** Seconds of life, for the idle bob phase. */
  t: number;
}

export function createRig(tex: Texture, flip: boolean): Rig {
  const root = new Container();
  const shadow = new Graphics();
  const drop = new Sprite(tex);
  const body = new Sprite(tex);
  const flash = new Sprite(tex);
  for (const s of [drop, body, flash]) {
    s.anchor.set(0.5, 1);
    if (flip) s.scale.x = -1;
  }
  drop.tint = 0x000000;
  drop.alpha = 1;
  flash.tint = 0xffffff;
  flash.alpha = 0;
  flash.blendMode = 'add';
  root.addChild(shadow, drop, body, flash);
  return { root, body, drop, flash, shadow, dropOff: { x: 4, y: 4 }, knock: 0, knockV: 0, flashAmt: 0, pose: 'idle', poseLeftMs: 0, t: 0 };
}

/** Size + place a rig's sprite inside its box, feet on the ground line. */
export function fitRig(rig: Rig, box: { x: number; y: number; w: number; h: number }, groundY: number) {
  const tex = rig.body.texture;
  const ratio = tex.width && tex.height ? tex.width / tex.height : 1;
  const h = box.h;
  const w = Math.min(box.w, h * ratio);
  const scale = h / (tex.height || 1);
  const sx = Math.min(scale, w / (tex.width || 1));
  for (const s of [rig.body, rig.drop, rig.flash]) {
    s.scale.set(s.scale.x < 0 ? -sx : sx, sx);
  }
  // Hard pixel shadow: the same silhouette, offset down-right, no blur.
  rig.dropOff = { x: Math.max(4, Math.round(h * 0.05)), y: Math.max(4, Math.round(h * 0.04)) };
  rig.drop.position.set(rig.dropOff.x, rig.dropOff.y);
  rig.root.position.set(box.x + box.w / 2, groundY);
  rig.shadow.clear();
  rig.shadow.ellipse(0, -2, Math.max(12, w * 0.4), Math.max(4, h * 0.05)).fill({ color: 0x000000, alpha: 0.5 });
}

/** The floor: a hard neo-brutalist slab with a black edge and a lit top face. */
export function paintFloor(g: Graphics, l: ArenaLayout) {
  g.clear();
  const y = l.groundY;
  // A dark pit behind the fighters so the sprites read against any world backdrop.
  g.rect(0, 0, l.w, y).fill({ color: 0x0b1330, alpha: 0.55 });
  g.rect(0, y - 3, l.w, l.h - y + 3).fill({ color: 0x1b2a5e, alpha: 1 });
  g.rect(0, y - 3, l.w, 3).fill({ color: 0x000000, alpha: 1 });
  g.rect(0, y, l.w, 3).fill({ color: LIME, alpha: 0.55 });
  // Perspective ticks so a knockback reads as travel along a floor.
  for (let x = -12; x < l.w + 24; x += 24) {
    g.rect(x, y + 7, 12, 2).fill({ color: 0xffffff, alpha: 0.1 });
  }
}

const floatStyle = (size: number, fill: number) => new TextStyle({
  fontFamily: 'Fredoka, Rubik, system-ui, sans-serif',
  fontSize: size,
  fontWeight: '900',
  fill,
  align: 'center',
});

export interface Float {
  view: Container;
  lifeMs: number;
  ageMs: number;
  vx: number;
  vy: number;
}

/** A heart, drawn — the ♥ code point is not in Fredoka and rendered as nothing. */
function drawHeart(g: Graphics, cx: number, cy: number, s: number, color: number) {
  g.moveTo(cx, cy + s * 0.52);
  g.bezierCurveTo(cx - s * 1.15, cy - s * 0.3, cx - s * 0.42, cy - s * 1.0, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.42, cy - s * 1.0, cx + s * 1.15, cy - s * 0.3, cx, cy + s * 0.52);
  g.fill({ color });
}

/**
 * A callout: a hard neo chip — solid fill, 3px black border, black label —
 * rather than bare outlined text. It reads across a room, it survives being
 * drawn over a white hit-flash, and it matches the DOM stamps beside it.
 */
export function createFloat(text: string, x: number, y: number, size: number, fill: number, lifeMs = 900, heart = false, maxRisePx?: number): Float {
  const view = new Container();
  const label = new Text({ text, style: floatStyle(size, 0x0b1026) });
  label.anchor.set(0.5);
  const padX = Math.round(size * 0.42);
  const padY = Math.round(size * 0.18);
  const icon = heart ? size * 0.34 : 0;
  const gap = heart ? size * 0.22 : 0;
  const w = label.width + icon * 2 + gap + padX * 2;
  const h = label.height + padY * 2;
  const plate = new Graphics();
  plate.roundRect(-w / 2 + 4, -h / 2 + 4, w, h, Math.round(size * 0.3)).fill({ color: 0x000000, alpha: 0.9 });
  plate.roundRect(-w / 2, -h / 2, w, h, Math.round(size * 0.3)).fill({ color: fill }).stroke({ width: 3, color: 0x000000 });
  label.x = -(icon + gap / 2);
  if (heart) drawHeart(plate, w / 2 - padX - icon, 0, icon, 0x0b1026);
  view.addChild(plate, label);
  view.position.set(x, y);
  return { view, lifeMs, ageMs: 0, vx: 0, vy: floatRise(size, lifeMs, maxRisePx) };
}

export function stepFloat(f: Float, frameMs: number): boolean {
  f.ageMs += frameMs;
  const p = f.ageMs / f.lifeMs;
  f.view.x += f.vx * frameMs;
  f.view.y += f.vy * frameMs * (1 - p * 0.6);
  f.view.alpha = p < 0.7 ? 1 : Math.max(0, 1 - (p - 0.7) / 0.3);
  const pop = p < 0.16 ? 0.5 + (p / 0.16) * 0.7 : 1.2 - Math.min(0.2, (p - 0.16) * 0.5);
  f.view.scale.set(pop);
  return f.ageMs < f.lifeMs;
}

/**
 * The shockwave a landed word leaves on the foe: a hard ring that expands and
 * thins out. The letters themselves are the DOM's job (see `arenaBeats`); this
 * is the canvas saying they connected.
 */
export interface Ring {
  view: Graphics;
  ageMs: number;
  lifeMs: number;
  x: number;
  y: number;
  r0: number;
  r1: number;
  color: number;
  /** Set to make the ring a travelling bolt: it slides here over its life. */
  travel?: { x: number; y: number };
}

export function createRing(x: number, y: number, r0: number, r1: number, color: number, lifeMs = 380): Ring {
  return { view: new Graphics(), ageMs: 0, lifeMs, x, y, r0, r1, color };
}

export function stepRing(ring: Ring, frameMs: number): boolean {
  ring.ageMs += frameMs;
  const p = Math.min(1, ring.ageMs / ring.lifeMs);
  const eased = 1 - (1 - p) ** 3;
  const cx = ring.travel ? ring.x + (ring.travel.x - ring.x) * p : ring.x;
  const cy = ring.travel ? ring.y + (ring.travel.y - ring.y) * p : ring.y;
  // A travelling bolt keeps its body and its glow; a shockwave thins as it grows.
  const r = ring.travel ? ring.r1 : ring.r0 + (ring.r1 - ring.r0) * eased;
  const fade = ring.travel ? 1 : 1 - p;
  ring.view.clear();
  if (ring.travel) {
    ring.view.circle(cx, cy, r * 1.55).fill({ color: ring.color, alpha: 0.22 });
    ring.view.circle(cx, cy, r).fill({ color: ring.color, alpha: 0.95 }).stroke({ width: 3, color: 0x000000 });
  } else {
    ring.view.circle(cx, cy, r).stroke({ width: Math.max(1, 7 * fade), color: ring.color, alpha: 0.85 * fade });
  }
  return ring.ageMs < ring.lifeMs;
}

/**
 * The word in flight: the traced letters, re-thrown as one chunky neo chip that
 * arcs from the hero's hand into the foe and lands on the same frame the punch
 * does. See `arcAt` in `arenaBeats` for why this exists at all.
 */
export interface Missile {
  view: Container;
  ageMs: number;
  lifeMs: number;
  from: ArcPoint;
  to: ArcPoint;
  lift: number;
  spin: number;
}

export function createWordMissile(
  text: string, size: number, from: ArcPoint, to: ArcPoint, lift: number, lifeMs: number, fill = LIME,
): Missile {
  const view = new Container();
  const label = new Text({ text, style: floatStyle(size, 0x0b1026) });
  label.anchor.set(0.5);
  const padX = Math.round(size * 0.42);
  const padY = Math.round(size * 0.2);
  const w = label.width + padX * 2;
  const h = label.height + padY * 2;
  const r = Math.round(size * 0.28);
  const plate = new Graphics();
  // A soft aura so the chip reads while it is over the dark pit, then the hard
  // neo-brutalist body: black drop, solid fill, 3px black border.
  plate.roundRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14, r + 5).fill({ color: fill, alpha: 0.24 });
  plate.roundRect(-w / 2 + 4, -h / 2 + 4, w, h, r).fill({ color: 0x000000, alpha: 0.9 });
  plate.roundRect(-w / 2, -h / 2, w, h, r).fill({ color: fill }).stroke({ width: 3, color: 0x000000 });
  view.addChild(plate, label);
  view.position.set(from.x, from.y);
  return { view, ageMs: 0, lifeMs: Math.max(1, lifeMs), from, to, lift, spin: 0 };
}

export function stepMissile(m: Missile, frameMs: number): boolean {
  m.ageMs += frameMs;
  const p = Math.min(1, m.ageMs / m.lifeMs);
  const at = arcAt(p, m.from, m.to, m.lift);
  m.view.position.set(at.x, at.y);
  // Launch pop, then a slight lean into the target as it dives.
  const pop = p < 0.18 ? 0.55 + (p / 0.18) * 0.55 : 1.1 - (p - 0.18) * 0.12;
  m.view.scale.set(pop);
  m.view.rotation = (m.to.x >= m.from.x ? 1 : -1) * (-0.18 + p * 0.34);
  m.view.alpha = p > 0.92 ? Math.max(0, (1 - p) / 0.08) : 1;
  return m.ageMs < m.lifeMs;
}
