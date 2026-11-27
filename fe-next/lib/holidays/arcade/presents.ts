import { Bodies, Body, Composite, Engine } from 'matter-js';
import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { comboMult, newPace, stepPace, type Pace } from './kit/pace';

export type GiftKind = 'red' | 'green' | 'blue' | 'gold';

export const SLEIGH = { x: 368, w: 270, top: 1100 };
export const PIVOT = { x: 384, y: 228 };
export const GIFT_SIZE: Record<GiftKind, { w: number; h: number }> = {
  red: { w: 112, h: 96 },
  green: { w: 104, h: 104 },
  blue: { w: 118, h: 88 },
  gold: { w: 150, h: 120 },
};
export const GOLD_BONUS = 300;
const ROPE = 200;
const SETTLE_S = 0.35;
const SETTLE_MAX_S = 3;
const REST = 0.25;
const PERFECT_PX = 12;
const VIEW_GAP = 620;

export interface Gift {
  id: number;
  kind: GiftKind;
  body: Body;
}

export type PresentsEvent =
  | { type: 'drop' }
  | { type: 'land'; points: number; x: number; y: number }
  | { type: 'perfect'; combo: number; x: number; y: number }
  | { type: 'topple'; lost: number }
  | { type: 'golden'; points: number; x: number; y: number }
  | { type: 'mult'; mult: number }
  | { type: 'level'; level: number }
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
  bestHeight: number;
  combo: number;
  wind: number;
  goldNext: boolean;
  pace: Pace;
  topY: number;
  cam: number;
  over: boolean;
  nextId: number;
  events: PresentsEvent[];
  rng: () => number;
}

const KINDS: GiftKind[] = ['red', 'green', 'blue'];
const nextKind = (g: PresentsGame): GiftKind => {
  if (g.goldNext) {
    g.goldNext = false;
    return 'gold';
  }
  return KINDS[Math.floor(g.rng() * 3)];
};

export function newPresentsGame(seed: number, seconds: number): PresentsGame {
  const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0018 }, enableSleeping: true });
  Composite.add(engine.world, Bodies.rectangle(SLEIGH.x, SLEIGH.top + 30, SLEIGH.w, 60, { isStatic: true, friction: 1, label: 'sleigh' }));
  const rng = mulberry32(seed);
  return {
    engine, gifts: [], hanging: KINDS[Math.floor(rng() * 3)], falling: null, pivot: { ...PIVOT }, swingT: 0, rest: 0, fallT: 0,
    time: 0, seconds, score: 0, stacked: 0, bestHeight: 0, combo: 0, wind: 0, goldNext: false, pace: newPace(rng),
    topY: SLEIGH.top, cam: 0, over: false, nextId: 1, events: [], rng,
  };
}

const swingSpeed = (g: PresentsGame) => 2.1 + Math.min(1.2, g.stacked * 0.1) + g.pace.level * 0.18;
const swingAngle = (g: PresentsGame) => Math.sin(g.swingT * swingSpeed(g)) * 0.62;
const windAt = (g: PresentsGame) => (g.pace.level < 2 ? 0 : Math.sin(g.time * 0.9) * (g.pace.level < 4 ? 50 : 80));

export function hangingAt(g: PresentsGame): { x: number; y: number; angle: number } {
  const a = swingAngle(g);
  return { x: g.pivot.x + g.wind + Math.sin(a) * ROPE, y: g.pivot.y + g.cam + Math.cos(a) * ROPE, angle: a };
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

function hangNext(g: PresentsGame) {
  g.hanging = nextKind(g);
  g.events.push({ type: 'hang', kind: g.hanging });
}

function settle(g: PresentsGame) {
  const gift = g.falling!;
  g.falling = null;
  const lost = g.gifts.some((x) => x.body.position.y > SLEIGH.top + 40 || x.body.position.x < -60 || x.body.position.x > 828);
  if (lost) {
    for (const x of g.gifts) Composite.remove(g.engine.world, x.body);
    g.events.push({ type: 'topple', lost: g.gifts.length });
    g.gifts = [];
    g.stacked = 0;
    g.combo = 0;
    g.topY = SLEIGH.top;
    hangNext(g);
    return;
  }
  const below = g.gifts.filter((x) => x !== gift).sort((a, b) => a.body.bounds.min.y - b.body.bounds.min.y)[0];
  const offset = Math.abs(gift.body.position.x - (below ? below.body.position.x : SLEIGH.x));
  g.stacked += 1;
  g.bestHeight = Math.max(g.bestHeight, g.stacked);
  g.topY = Math.min(...g.gifts.map((x) => x.body.bounds.min.y));
  const perfect = offset < PERFECT_PX;
  const before = comboMult(g.combo);
  g.combo += perfect ? 2 : 1;
  const points = (20 + g.stacked * 5) * comboMult(g.combo) + (perfect ? 50 : 0);
  g.score += points;
  if (comboMult(g.combo) > before) g.events.push({ type: 'mult', mult: comboMult(g.combo) });
  if (perfect) g.events.push({ type: 'perfect', combo: g.combo, x: gift.body.position.x, y: gift.body.bounds.min.y });
  g.events.push({ type: 'land', points, x: gift.body.position.x, y: gift.body.bounds.min.y });
  if (gift.kind === 'gold') {
    g.score += GOLD_BONUS;
    g.events.push({ type: 'golden', points: GOLD_BONUS, x: gift.body.position.x, y: gift.body.bounds.min.y });
  }
  hangNext(g);
}

export function stepPresents(g: PresentsGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
    else g.goldNext = true;
  }
  g.wind = windAt(g);
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
