import { Container, Graphics } from 'pixi.js';
import { CRITTER_KINDS, type CritterKind, type PropKind } from '@/lib/wordTowerV2/biomes';
import { FOOD_BUILD } from './skyFood';

/**
 * The sky's jokes: props with a face and one moving part each — a blimp that
 * blinks, a whale that spouts, an astronaut who waves, a UFO stealing a cow.
 * Same rules as skyArt.ts: every shape is painted once (ink rim, hard offset
 * shadow, brand fills); per frame only a child's transform or alpha moves.
 * `t` is seconds, and t=0 (reduced motion) is a calm, eyes-open pose.
 */

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const PINK = 0xff4d9d;
const LIME = 0xbfff00;
const CYAN = 0x37e0ff;
const YELLOW = 0xffe135;
const PURPLE = 0xb06cff;
const WHALE = 0x3f6fd8;

const COW_CYCLE_S = 3;

export function isCritter(kind: PropKind): kind is CritterKind {
  return CRITTER_KINDS.includes(kind);
}

/** Eyes open, with a short blink every few seconds; each critter blinks on its own beat. */
export function blinkScale(t: number, phase: number): number {
  if (t <= 0) return 1;
  const cycle = 3.2 + phase * 2;
  return (t + phase * 7) % cycle < 0.14 ? 0.12 : 1;
}

/** 0 = cow on the ground under the beam, 1 = cow at the saucer; then the next cow. */
export function cowLift(t: number): number {
  return (Math.max(0, t) % COW_CYCLE_S) / COW_CYCLE_S;
}

export interface Critter {
  root: Container;
  tick: (t: number) => void;
}

function eyes(s: number, gap: number, r = 4): Graphics {
  const g = new Graphics();
  for (const x of [-gap / 2, gap / 2]) {
    g.ellipse(x * s, 0, r * s, r * 1.3 * s).fill(INK);
    g.circle((x + r * 0.35) * s, -r * 0.45 * s, r * 0.4 * s).fill(CREAM);
  }
  return g;
}

function cheeks(g: Graphics, s: number, cx: number, cy: number, gap: number): void {
  for (const x of [cx - gap / 2, cx + gap / 2]) g.ellipse(x * s, cy * s, 4 * s, 2.5 * s).fill({ color: PINK, alpha: 0.75 });
}

function smile(g: Graphics, s: number, cx: number, cy: number, r: number): void {
  g.arc(cx * s, cy * s, r * s, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5 * s, color: INK, cap: 'round' });
}

function blimp(s: number, phase: number): Critter {
  const root = new Container();
  const body = new Graphics();
  body.ellipse(5 * s, 5 * s, 70 * s, 28 * s).fill({ color: INK, alpha: 0.35 });
  body.poly([-58 * s, 0, -84 * s, -26 * s, -74 * s, 0, -84 * s, 26 * s]).fill(YELLOW).stroke({ width: 3 * s, color: INK, join: 'round' });
  body.roundRect(-16 * s, 22 * s, 32 * s, 12 * s, 4 * s).fill(YELLOW).stroke({ width: 3 * s, color: INK });
  body.ellipse(0, 0, 70 * s, 28 * s).fill(PINK).stroke({ width: 3 * s, color: INK });
  body.ellipse(-8 * s, 0, 34 * s, 28 * s).stroke({ width: 3 * s, color: CREAM, alpha: 0.85 });
  cheeks(body, s, 40, 6, 22);
  smile(body, s, 40, 3, 5);
  const prop = new Graphics().roundRect(-2.5 * s, -14 * s, 5 * s, 28 * s, 2 * s).fill(CREAM).stroke({ width: 2 * s, color: INK });
  prop.position.set(-88 * s, 0);
  const e = eyes(s, 16);
  e.position.set(40 * s, -6 * s);
  root.addChild(body, prop, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = blinkScale(t, phase);
      prop.scale.y = t ? Math.cos(t * 26) : 1;
    },
  };
}

function puff(s: number, phase: number): Critter {
  const root = new Container();
  const body = new Graphics();
  const lobes: Array<[number, number, number]> = [[-26, 4, 18], [0, -8, 26], [26, 2, 20]];
  for (const [x, y, r] of lobes) body.circle((x + 5) * s, (y + 5) * s, r * s);
  body.fill({ color: INK, alpha: 0.3 });
  for (const [x, y, r] of lobes) body.circle(x * s, y * s, (r + 3) * s);
  body.roundRect(-46 * s, 2 * s, 92 * s, 22 * s, 10 * s).fill(INK);
  for (const [x, y, r] of lobes) body.circle(x * s, y * s, r * s);
  body.roundRect(-43 * s, 5 * s, 86 * s, 16 * s, 8 * s).fill(CREAM);
  cheeks(body, s, 0, 9, 26);
  smile(body, s, 0, 6, 4);
  const e = eyes(s, 16, 3.5);
  e.position.set(0, -2 * s);
  root.addChild(body, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = blinkScale(t, phase);
      body.scale.set(1 + Math.sin(t * 2 + phase * 6) * 0.03, 1 - Math.sin(t * 2 + phase * 6) * 0.04);
    },
  };
}

function whale(s: number, phase: number): Critter {
  const root = new Container();
  const tail = new Graphics()
    .poly([0, 0, -26 * s, -22 * s, -18 * s, 0, -26 * s, 22 * s])
    .fill(WHALE)
    .stroke({ width: 3 * s, color: INK, join: 'round' });
  tail.position.set(-56 * s, -2 * s);
  const body = new Graphics();
  body.ellipse(6 * s, 6 * s, 64 * s, 30 * s).fill({ color: INK, alpha: 0.35 });
  body.ellipse(0, 0, 64 * s, 30 * s).fill(WHALE).stroke({ width: 3 * s, color: INK });
  body.ellipse(8 * s, 14 * s, 46 * s, 13 * s).fill(CREAM);
  body.moveTo(-26 * s, 12 * s).lineTo(40 * s, 12 * s).moveTo(-20 * s, 18 * s).lineTo(34 * s, 18 * s).stroke({ width: 2 * s, color: WHALE, cap: 'round' });
  body.poly([-12 * s, 10 * s, -30 * s, 30 * s, -6 * s, 20 * s]).fill(WHALE).stroke({ width: 2.5 * s, color: INK, join: 'round' });
  cheeks(body, s, 44, 6, 10);
  smile(body, s, 46, 2, 5);
  const e = eyes(s, 0, 4.5);
  e.position.set(36 * s, -6 * s);
  const spout = new Graphics();
  for (const [x, y, r] of [[0, 0, 5], [-9, -10, 4], [9, -10, 4], [0, -18, 4.5]] as const) spout.circle(x * s, y * s, r * s);
  spout.fill(CREAM).stroke({ width: 2 * s, color: INK });
  spout.position.set(26 * s, -34 * s);
  root.addChild(tail, body, e, spout);
  return {
    root,
    tick: (t) => {
      e.scale.y = blinkScale(t, phase);
      tail.rotation = Math.sin(t * 2.4 + phase * 6) * 0.35;
      const k = ((t + phase * 3.5) % 3.5) / 3.5;
      spout.visible = t > 0 && k < 0.35;
      spout.scale.set(Math.min(1, k * 8));
      spout.y = (-34 - k * 20) * s;
    },
  };
}

function astronaut(s: number, phase: number): Critter {
  const root = new Container();
  const body = new Graphics();
  body.roundRect(-20 * s, -10 * s, 12 * s, 26 * s, 3 * s).fill(CYAN).stroke({ width: 2.5 * s, color: INK });
  body.roundRect(-8 * s, 20 * s, 7 * s, 14 * s, 3 * s).roundRect(3 * s, 20 * s, 7 * s, 14 * s, 3 * s).fill(CREAM).stroke({ width: 2.5 * s, color: INK });
  body.roundRect(-13 * s, -6 * s, 26 * s, 30 * s, 8 * s).fill(CREAM).stroke({ width: 3 * s, color: INK });
  body.rect(-6 * s, 4 * s, 12 * s, 7 * s).fill(PINK).stroke({ width: 2 * s, color: INK });
  body.circle(0, -18 * s, 17 * s).fill(CREAM).stroke({ width: 3 * s, color: INK });
  body.ellipse(2 * s, -18 * s, 12 * s, 9 * s).fill(INK);
  body.circle(-3 * s, -22 * s, 2.5 * s).fill({ color: CREAM, alpha: 0.6 });
  const arm = new Graphics().roundRect(-3.5 * s, -20 * s, 7 * s, 22 * s, 3.5 * s).fill(CREAM).stroke({ width: 2.5 * s, color: INK });
  arm.circle(0, -21 * s, 4.5 * s).fill(CREAM).stroke({ width: 2 * s, color: INK });
  arm.position.set(12 * s, 0);
  const e = new Graphics();
  for (const x of [-3, 7]) e.ellipse(x * s, 0, 2.2 * s, 3 * s).fill(LIME);
  e.position.set(0, -18 * s);
  root.addChild(body, arm, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = blinkScale(t, phase);
      arm.rotation = 0.5 + (t ? Math.sin(t * 7) * 0.45 : 0);
      // Lost in space: a slow tumble, never a full spin (the wave stays readable).
      root.rotation = Math.sin(t * 0.45 + phase * 6) * 0.6;
    },
  };
}

function ufo(s: number, phase: number): Critter {
  const root = new Container();
  const beam = new Graphics();
  const cone = [-14 * s, 8 * s, 14 * s, 8 * s, 40 * s, 116 * s, -40 * s, 116 * s];
  beam.poly(cone).fill({ color: LIME, alpha: 0.22 });
  // Hard scan bands and lit edges: a beam that reads on any sky, not a muddy wash.
  for (const k of [0.3, 0.55, 0.8]) beam.rect((-14 - 26 * k) * s, (8 + 108 * k) * s, (28 + 52 * k) * s, 3 * s);
  beam.fill({ color: LIME, alpha: 0.45 });
  beam.moveTo(-14 * s, 8 * s).lineTo(-40 * s, 116 * s).moveTo(14 * s, 8 * s).lineTo(40 * s, 116 * s).stroke({ width: 2.5 * s, color: LIME, alpha: 0.9 });
  const cow = new Graphics();
  cow.roundRect(-12 * s, -7 * s, 24 * s, 14 * s, 4 * s).fill(CREAM).stroke({ width: 2.5 * s, color: INK });
  cow.circle(-4 * s, -2 * s, 3.5 * s).circle(6 * s, 3 * s, 2.5 * s).fill(INK);
  cow.roundRect(9 * s, -12 * s, 10 * s, 10 * s, 3 * s).fill(CREAM).stroke({ width: 2.5 * s, color: INK });
  cow.roundRect(13 * s, -6 * s, 7 * s, 4 * s, 2 * s).fill(PINK);
  for (const x of [-9, -3, 4, 9]) cow.moveTo(x * s, 7 * s).lineTo(x * s, 13 * s);
  cow.stroke({ width: 2.5 * s, color: INK, cap: 'round' });
  const body = new Graphics();
  body.circle(0, -8 * s, 17 * s).fill({ color: CYAN, alpha: 0.85 }).stroke({ width: 3 * s, color: INK });
  body.circle(0, -12 * s, 7 * s).fill(LIME).stroke({ width: 2 * s, color: INK });
  body.ellipse(5 * s, 5 * s, 46 * s, 12 * s).fill({ color: INK, alpha: 0.35 });
  body.ellipse(0, 0, 46 * s, 12 * s).fill(PURPLE).stroke({ width: 3 * s, color: INK });
  const lights = new Graphics();
  for (const x of [-28, -10, 10, 28]) lights.circle(x * s, 1 * s, 3.5 * s);
  lights.fill(YELLOW).stroke({ width: 1.5 * s, color: INK });
  const e = new Graphics();
  for (const x of [-2.8, 2.8]) e.ellipse(x * s, 0, 1.8 * s, 2.6 * s).fill(INK);
  e.position.set(0, -13 * s);
  root.addChild(beam, cow, body, lights, e);
  return {
    root,
    tick: (t) => {
      const lift = cowLift(t);
      cow.y = (104 - lift * 92) * s;
      cow.rotation = t ? lift * Math.PI : 0;
      cow.alpha = lift > 0.9 ? (1 - lift) * 10 : 1;
      beam.alpha = t ? 0.7 + 0.3 * Math.sin(t * 9) : 1;
      lights.alpha = t && Math.floor(t * 4) % 2 ? 0.45 : 1;
      e.scale.y = blinkScale(t, phase);
      root.rotation = Math.sin(t * 1.7 + phase * 6) * 0.07;
    },
  };
}

const BUILD: Record<CritterKind, (s: number, phase: number) => Critter> = { blimp, puff, whale, astronaut, ufo, ...FOOD_BUILD };

export function buildCritter(kind: CritterKind, size: number, phase: number): Critter {
  const critter = BUILD[kind](size, phase);
  // Each part is drawn once and then only moved: render it from a texture
  // instead of re-batching dozens of strokes every frame (halved frame time).
  for (const part of critter.root.children) part.cacheAsTexture({ antialias: true });
  return critter;
}
