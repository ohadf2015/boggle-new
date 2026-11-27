import { Bodies, Body, Composite, Engine } from 'matter-js';
import { mulberry32 } from '@/utils/dailyChallenge/prng';

export type GiftKind = 'red' | 'green' | 'blue';

export const SLEIGH = { x: 368, w: 270, top: 1100 };
export const PIVOT = { x: 384, y: 228 };
export const GIFT_SIZE: Record<GiftKind, { w: number; h: number }> = {
  red: { w: 112, h: 96 },
  green: { w: 104, h: 104 },
  blue: { w: 118, h: 88 },
};
const ROPE = 200;
const SETTLE_S = 0.35;
const SETTLE_MAX_S = 3;
const REST = 0.25;
const PERFECT_PX = 12;
const VIEW_GAP = 620;
export const LIVES = 3;

export interface Gift {
  id: number;
  kind: GiftKind;
  body: Body;
}

export type PresentsEvent =
  | { type: 'drop' }
  | { type: 'land'; points: number; x: number; y: number }
  | { type: 'perfect'; combo: number; x: number; y: number }
  | { type: 'topple' }
  | { type: 'miss'; lives: number }
  | { type: 'hang'; kind: GiftKind };

export interface PresentsGame {
  engine: Engine;
  gifts: Gift[];
  hanging: GiftKind | null;
  falling: Gift | null;
  pivot: { x: number; y: number };
  swingT: number;
  rest: number;
  fallT: number;
  time: number;
  seconds: number;
  score: number;
  stacked: number;
  lives: number;
  combo: number;
  topY: number;
  cam: number;
  over: boolean;
  toppled: boolean;
  nextId: number;
  events: PresentsEvent[];
  rng: () => number;
}

const KINDS: GiftKind[] = ['red', 'green', 'blue'];

export function newPresentsGame(seed: number, seconds: number): PresentsGame {
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0018 }, enableSleeping: true });
  Composite.add(engine.world, Bodies.rectangle(SLEIGH.x, SLEIGH.top + 30, SLEIGH.w, 60, { isStatic: true, friction: 1, label: 'sleigh' }));
  const rng = mulberry32(seed);
  return {
    engine, gifts: [], hanging: KINDS[Math.floor(rng() * 3)], falling: null, pivot: { ...PIVOT }, swingT: 0, rest: 0, fallT: 0,
    time: 0, seconds, score: 0, stacked: 0, lives: LIVES, combo: 0, topY: SLEIGH.top, cam: 0, over: false, toppled: false, nextId: 1, events: [], rng,
  };
}

const swingSpeed = (g: PresentsGame) => 2.1 + Math.min(1.6, g.stacked * 0.12);
const swingAngle = (g: PresentsGame) => Math.sin(g.swingT * swingSpeed(g)) * 0.62;

export function hangingAt(g: PresentsGame): { x: number; y: number; angle: number } {
  const a = swingAngle(g);
  return { x: g.pivot.x + Math.sin(a) * ROPE, y: g.pivot.y + g.cam + Math.cos(a) * ROPE, angle: a };
}

export function dropGift(g: PresentsGame): boolean {
  if (g.over || !g.hanging || g.falling) return false;
  const kind = g.hanging;
  const { w, h } = GIFT_SIZE[kind];
  const at = hangingAt(g);
  const body = Bodies.rectangle(at.x, at.y + h / 2, w, h, { friction: 0.9, frictionStatic: 1.2, restitution: 0.05, density: 0.002, label: 'gift' });
  Body.setAngle(body, at.angle * 0.3);
  Composite.add(g.engine.world, body);
  const gift = { id: g.nextId++, kind, body };
  g.gifts.push(gift);
  g.falling = gift;
  g.hanging = null;
  g.rest = 0;
  g.fallT = 0;
  g.events.push({ type: 'drop' });
  return true;
}

function settle(g: PresentsGame) {
  const gift = g.falling!;
  g.falling = null;
  const lost = g.gifts.filter((x) => x.body.position.y > SLEIGH.top + 40 || x.body.position.x < -60 || x.body.position.x > 828);
  if (lost.length) {
    for (const x of lost) Composite.remove(g.engine.world, x.body);
    g.gifts = g.gifts.filter((x) => !lost.includes(x));
    g.lives -= 1;
    g.combo = 0;
    if (g.lives <= 0) {
      g.over = true;
      g.toppled = true;
      g.events.push({ type: 'topple' });
      return;
    }
    g.events.push({ type: 'miss', lives: g.lives });
    g.topY = g.gifts.length ? Math.min(...g.gifts.map((x) => x.body.bounds.min.y)) : SLEIGH.top;
    g.hanging = KINDS[Math.floor(g.rng() * 3)];
    g.events.push({ type: 'hang', kind: g.hanging });
    return;
  }
  const below = g.gifts.filter((x) => x !== gift).sort((a, b) => a.body.bounds.min.y - b.body.bounds.min.y)[0];
  const offset = Math.abs(gift.body.position.x - (below ? below.body.position.x : SLEIGH.x));
  g.stacked += 1;
  g.topY = Math.min(...g.gifts.map((x) => x.body.bounds.min.y));
  const perfect = offset < PERFECT_PX;
  g.combo = perfect ? g.combo + 1 : 0;
  const points = 25 + g.stacked * 5 + (perfect ? 50 * g.combo : 0);
  g.score += points;
  if (perfect) g.events.push({ type: 'perfect', combo: g.combo, x: gift.body.position.x, y: gift.body.bounds.min.y });
  g.events.push({ type: 'land', points, x: gift.body.position.x, y: gift.body.bounds.min.y });
  g.hanging = KINDS[Math.floor(g.rng() * 3)];
  g.events.push({ type: 'hang', kind: g.hanging });
}

export function stepPresents(g: PresentsGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  g.swingT += dt;
  Engine.update(g.engine, dt * 1000);
  const camTarget = Math.min(0, g.topY - (PIVOT.y + VIEW_GAP));
  g.cam += (camTarget - g.cam) * Math.min(1, dt * 3);
  if (g.falling) {
    g.fallT += dt;
    const moving = g.gifts.some((x) => Math.hypot(x.body.velocity.x, x.body.velocity.y) > REST);
    g.rest = moving ? 0 : g.rest + dt;
    const lost = g.falling.body.position.y > SLEIGH.top + 200;
    if (g.rest >= SETTLE_S || g.fallT >= SETTLE_MAX_S || lost) settle(g);
  }
  if (!g.over && g.time >= g.seconds) g.over = true;
}
