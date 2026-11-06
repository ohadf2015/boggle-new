import { Container, Graphics } from 'pixi.js';
import type { FoodKind } from '@/lib/wordTowerV2/biomes';

/**
 * More of the sky's jokes: snacks and toys with faces that drift past the
 * tower. Same rules as skyCritters.ts: each part is painted once (ink rim, hard
 * offset shadow, brand fills) and per frame only a transform or alpha moves.
 * `t` is seconds; t=0 (reduced motion) is a calm, eyes-open pose.
 */

export interface FoodCritter {
  root: Container;
  tick: (t: number) => void;
}

const INK = 0x0b0e1c;
const CREAM = 0xfffef0;
const PINK = 0xff4d9d;
const CYAN = 0x37e0ff;
const YELLOW = 0xffe135;
const LIME = 0xbfff00;
const PURPLE = 0xb06cff;
const CHEESE = 0xffc93c;
const CRUST = 0xe08a2e;
const PEPPERONI = 0xe0393e;
const AVO_SKIN = 0x2f6b2a;
const AVO_FLESH = 0xd7f08a;
const PIT = 0x8a4b22;
const DUCK_BILL = 0xff8a1f;

/** Eyes open, with a short blink every few seconds on the prop's own beat. */
export function foodBlink(t: number, phase: number): number {
  if (t <= 0) return 1;
  const cycle = 2.8 + phase * 2.4;
  return (t + phase * 5) % cycle < 0.14 ? 0.12 : 1;
}

/** 0..1 drip length: grows, falls off, starts over. Zero at rest (reduced motion). */
export function dripLength(t: number, phase: number): number {
  if (t <= 0) return 0;
  return ((t + phase * 4) % 2.4) / 2.4;
}

function face(s: number, gap: number, r = 3.5): Graphics {
  const g = new Graphics();
  for (const x of [-gap / 2, gap / 2]) {
    g.ellipse(x * s, 0, r * s, r * 1.3 * s).fill(INK);
    g.circle((x + r * 0.35) * s, -r * 0.45 * s, r * 0.4 * s).fill(CREAM);
  }
  return g;
}

function blush(g: Graphics, s: number, cx: number, cy: number, gap: number): void {
  for (const x of [cx - gap / 2, cx + gap / 2]) g.ellipse(x * s, cy * s, 3.5 * s, 2.2 * s).fill({ color: PINK, alpha: 0.8 });
}

function grin(g: Graphics, s: number, cx: number, cy: number, r: number): void {
  g.arc(cx * s, cy * s, r * s, 0.15 * Math.PI, 0.85 * Math.PI).stroke({ width: 2.5 * s, color: INK, cap: 'round' });
}

function pizza(s: number, phase: number): FoodCritter {
  const root = new Container();
  const body = new Graphics();
  const tri = [-30 * s, -26 * s, 30 * s, -26 * s, 0, 34 * s];
  body.poly(tri.map((v) => v + 5 * s)).fill({ color: INK, alpha: 0.35 });
  body.poly(tri).fill(CHEESE).stroke({ width: 3 * s, color: INK, join: 'round' });
  body.roundRect(-34 * s, -34 * s, 68 * s, 12 * s, 6 * s).fill(CRUST).stroke({ width: 3 * s, color: INK });
  for (const [x, y, r] of [[-14, -12, 5], [13, -10, 4.5], [2, 14, 4]] as const) {
    body.circle(x * s, y * s, r * s).fill(PEPPERONI).stroke({ width: 2 * s, color: INK });
  }
  blush(body, s, 0, 2, 20);
  grin(body, s, 0, -1, 4);
  const drip = new Graphics().roundRect(-3 * s, 0, 6 * s, 12 * s, 3 * s).fill(CHEESE).stroke({ width: 2 * s, color: INK });
  drip.position.set(8 * s, 18 * s);
  const e = face(s, 14);
  e.position.set(0, -6 * s);
  root.addChild(drip, body, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = foodBlink(t, phase);
      const k = dripLength(t, phase);
      drip.scale.y = 0.4 + k;
      drip.alpha = k > 0.9 ? (1 - k) * 10 : 1;
      root.rotation = Math.sin(t * 1.1 + phase * 6) * 0.18;
    },
  };
}

function avocado(s: number, phase: number): FoodCritter {
  const root = new Container();
  const body = new Graphics();
  body.ellipse(5 * s, 9 * s, 26 * s, 34 * s).fill({ color: INK, alpha: 0.35 });
  body.ellipse(0, 4 * s, 26 * s, 34 * s).fill(AVO_SKIN).stroke({ width: 3 * s, color: INK });
  body.circle(0, -18 * s, 17 * s).fill(AVO_SKIN);
  body.circle(0, -18 * s, 17 * s).stroke({ width: 3 * s, color: INK });
  body.ellipse(0, 4 * s, 20 * s, 28 * s).fill(AVO_FLESH);
  body.circle(0, -17 * s, 12 * s).fill(AVO_FLESH);
  body.circle(0, 14 * s, 11 * s).fill(PIT).stroke({ width: 2.5 * s, color: INK });
  body.circle(-3 * s, 10 * s, 3 * s).fill({ color: CREAM, alpha: 0.5 });
  blush(body, s, 0, -8, 18);
  grin(body, s, 0, -11, 3.5);
  const arm = new Graphics().roundRect(-2.5 * s, -14 * s, 5 * s, 16 * s, 2.5 * s).fill(AVO_SKIN).stroke({ width: 2 * s, color: INK });
  arm.position.set(24 * s, 0);
  const e = face(s, 12, 3);
  e.position.set(0, -16 * s);
  root.addChild(arm, body, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = foodBlink(t, phase);
      arm.rotation = 0.6 + (t ? Math.sin(t * 6 + phase * 3) * 0.5 : 0);
      body.scale.set(1 + Math.sin(t * 2.2 + phase * 6) * 0.03, 1 - Math.sin(t * 2.2 + phase * 6) * 0.04);
    },
  };
}

function donut(s: number, phase: number): FoodCritter {
  const root = new Container();
  const ring = new Graphics();
  ring.circle(5 * s, 5 * s, 30 * s).fill({ color: INK, alpha: 0.35 });
  ring.circle(0, 0, 30 * s).fill(CRUST).stroke({ width: 3 * s, color: INK });
  ring.circle(0, -2 * s, 25 * s).fill(PINK);
  ring.circle(0, 0, 9 * s).fill(INK);
  ring.circle(0, 0, 7 * s).fill(0x3a2a5e);
  const sprinkles = new Graphics();
  const colours = [CYAN, YELLOW, LIME, CREAM, PURPLE];
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2 + 0.3;
    const r = (i % 2 ? 19 : 14) * s;
    const g = new Graphics().roundRect(-3.5 * s, -1.2 * s, 7 * s, 2.4 * s, 1.2 * s).fill(colours[i % colours.length]);
    g.position.set(Math.cos(a) * r, Math.sin(a) * r - 2 * s);
    g.rotation = a * 1.7;
    sprinkles.addChild(g);
  }
  const mouth = new Graphics();
  grin(mouth, s, 0, 14, 4);
  blush(mouth, s, 0, 15, 22);
  const e = face(s, 30, 3);
  e.position.set(0, -12 * s);
  root.addChild(ring, sprinkles, mouth, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = foodBlink(t, phase);
      root.rotation = Math.sin(t * 0.9 + phase * 6) * 0.25;
    },
  };
}

function duck(s: number, phase: number): FoodCritter {
  const root = new Container();
  const body = new Graphics();
  body.ellipse(5 * s, 10 * s, 32 * s, 18 * s).fill({ color: INK, alpha: 0.35 });
  body.ellipse(0, 6 * s, 32 * s, 18 * s).fill(YELLOW).stroke({ width: 3 * s, color: INK });
  body.circle(14 * s, -14 * s, 15 * s).fill(YELLOW).stroke({ width: 3 * s, color: INK });
  body.ellipse(14 * s, 0, 12 * s, 6 * s).fill(YELLOW);
  body.ellipse(-8 * s, 6 * s, 14 * s, 8 * s).stroke({ width: 2.5 * s, color: INK, alpha: 0.5 });
  body.ellipse(30 * s, -10 * s, 9 * s, 5 * s).fill(DUCK_BILL).stroke({ width: 2.5 * s, color: INK });
  body.ellipse(18 * s, -6 * s, 3.5 * s, 2.2 * s).fill({ color: PINK, alpha: 0.8 });
  const tail = new Graphics().poly([0, 0, -12 * s, -10 * s, -6 * s, 4 * s]).fill(YELLOW).stroke({ width: 2.5 * s, color: INK, join: 'round' });
  tail.position.set(-28 * s, 0);
  const e = new Graphics();
  e.ellipse(0, 0, 3 * s, 4 * s).fill(INK);
  e.circle(1 * s, -1.6 * s, 1.2 * s).fill(CREAM);
  e.position.set(18 * s, -17 * s);
  root.addChild(tail, body, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = foodBlink(t, phase);
      tail.rotation = Math.sin(t * 5 + phase * 6) * 0.3;
      root.rotation = Math.sin(t * 1.6 + phase * 6) * 0.12;
    },
  };
}

function icecream(s: number, phase: number): FoodCritter {
  const root = new Container();
  const cone = new Graphics();
  cone.poly([-16 * s + 5 * s, 2 * s + 5 * s, 16 * s + 5 * s, 2 * s + 5 * s, 5 * s, 44 * s]).fill({ color: INK, alpha: 0.35 });
  cone.poly([-16 * s, 2 * s, 16 * s, 2 * s, 0, 40 * s]).fill(CRUST).stroke({ width: 3 * s, color: INK, join: 'round' });
  cone.moveTo(-10 * s, 8 * s).lineTo(6 * s, 28 * s).moveTo(10 * s, 8 * s).lineTo(-6 * s, 28 * s).stroke({ width: 2 * s, color: INK, alpha: 0.6 });
  const scoop = new Graphics();
  scoop.circle(0, -12 * s, 20 * s).fill(PINK).stroke({ width: 3 * s, color: INK });
  scoop.roundRect(-21 * s, -6 * s, 42 * s, 10 * s, 5 * s).fill(PINK).stroke({ width: 3 * s, color: INK });
  scoop.roundRect(-18 * s, -6 * s, 36 * s, 6 * s, 3 * s).fill(PINK);
  scoop.circle(0, -34 * s, 5 * s).fill(PEPPERONI).stroke({ width: 2 * s, color: INK });
  blush(scoop, s, 0, -6, 18);
  grin(scoop, s, 0, -9, 3.5);
  const e = face(s, 12, 3);
  e.position.set(0, -15 * s);
  root.addChild(cone, scoop, e);
  return {
    root,
    tick: (t) => {
      e.scale.y = foodBlink(t, phase);
      scoop.rotation = Math.sin(t * 2.6 + phase * 6) * 0.08;
      root.rotation = Math.sin(t * 0.8 + phase * 6) * 0.2;
    },
  };
}

export const FOOD_BUILD: Record<FoodKind, (s: number, phase: number) => FoodCritter> = { pizza, avocado, donut, duck, icecream };
