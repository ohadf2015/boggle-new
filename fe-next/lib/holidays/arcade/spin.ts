import { Bodies, Body, Composite, Engine, Events, type IEventCollision } from 'matter-js';
import { mulberry32 } from '@/utils/dailyChallenge/prng';
import type { HolidayRegion } from '../region';

export type DreidelSide = 'nun' | 'gimel' | 'hei' | 'shin' | 'pe';
export type TopColor = 'blue' | 'red' | 'green' | 'purple';

export const ARENA = { x: 384, y: 680, r: 250 };
export const TOP_R = 34;
export const SPIN_ROUNDS = 6;
export const KO_POINTS = 150;
export const GELT_COIN = 25;
const PUSHES = 3;
const KO_WINDOW_S = 1.5;
const MEGA = 1.35;
export const PLACE_POINTS = [300, 100, 30, 0];
const GELT: Record<DreidelSide, number> = { nun: 0, gimel: 40, hei: 20, shin: 5, pe: 5 };
const FALL_SPIN = 4;
const DECAY = 2.1;
const MAX_ROUND_S = 16;
const LANDED_S = 1.8;
const MAX_FLICK = 950;
const MIN_FLICK = 260;

export interface Top {
  id: number;
  body: Body;
  spin: number;
  angle: number;
  you: boolean;
  color: TopColor;
  letter: DreidelSide | null;
  place: number | null;
  r: number;
  mega: boolean;
  bumpedAt: number;
}

export interface Coin {
  id: number;
  x: number;
  y: number;
}

export type SpinEvent =
  | { type: 'launch' }
  | { type: 'clash'; x: number; y: number; power: number }
  | { type: 'land'; id: number; letter: DreidelSide; you: boolean; x: number; y: number }
  | { type: 'winner'; id: number; you: boolean }
  | { type: 'roundScore'; points: number; place: number; letter: DreidelSide }
  | { type: 'round'; round: number }
  | { type: 'rain' }
  | { type: 'gelt'; points: number; x: number; y: number }
  | { type: 'ko'; points: number; x: number; y: number }
  | { type: 'nudge'; x: number; y: number };

export interface SpinGame {
  engine: Engine;
  tops: Top[];
  region: HolidayRegion;
  round: number;
  phase: 'aim' | 'spinning' | 'landed' | 'over';
  t: number;
  score: number;
  wins: number;
  kos: number;
  geltGrabbed: number;
  pushes: number;
  rainRound: number;
  coins: Coin[];
  events: SpinEvent[];
  rng: () => number;
}

export function landingLetter(rng: () => number, region: HolidayRegion): DreidelSide {
  const sides: DreidelSide[] = ['nun', 'gimel', 'hei', region === 'IL' ? 'pe' : 'shin'];
  return sides[Math.min(3, Math.floor(rng() * 4))];
}

export const letterGelt = (side: DreidelSide) => GELT[side];

export function clashSpin(a: number, b: number, power: number): [number, number] {
  const total = Math.max(1, a + b);
  const loss = Math.min(12, power * 1.4);
  return [Math.max(0, a - loss * (b / total)), Math.max(0, b - loss * (a / total))];
}

const START: { x: number; y: number; color: TopColor }[] = [
  { x: ARENA.x, y: ARENA.y + 180, color: 'blue' },
  { x: ARENA.x - 160, y: ARENA.y - 110, color: 'red' },
  { x: ARENA.x + 160, y: ARENA.y - 110, color: 'green' },
  { x: ARENA.x, y: ARENA.y - 190, color: 'purple' },
];

function placeTops(g: SpinGame) {
  for (const t of g.tops) Composite.remove(g.engine.world, t.body);
  const count = g.round === 0 ? 3 : 4;
  const megaId = g.round >= 2 ? 1 + Math.floor(g.rng() * (count - 1)) : -1;
  g.tops = START.slice(0, count).map((s, i) => {
    const mega = i === megaId;
    const r = mega ? TOP_R * MEGA : TOP_R;
    const body = Bodies.circle(s.x, s.y, r, { frictionAir: 0.014, restitution: 0.95, friction: 0, density: mega ? 0.002 : 0.001, label: `top-${i}` });
    Composite.add(g.engine.world, body);
    return { id: i, body, spin: 0, angle: 0, you: i === 0, color: s.color, letter: null, place: null, r, mega, bumpedAt: -10 };
  });
  g.pushes = PUSHES;
  g.coins = [];
}

export function newSpinGame(seed: number, region: HolidayRegion): SpinGame {
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  const walls = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const d = ARENA.r + 20;
    return Bodies.rectangle(ARENA.x + Math.cos(a) * d, ARENA.y + Math.sin(a) * d, 50, 48, { isStatic: true, angle: a, restitution: 1, label: 'wall' });
  });
  Composite.add(engine.world, walls);
  const rng = mulberry32(seed);
  const g: SpinGame = {
    engine, tops: [], region, round: 0, phase: 'aim', t: 0, score: 0, wins: 0, kos: 0, geltGrabbed: 0, pushes: PUSHES,
    rainRound: 1 + Math.floor(rng() * 2), coins: [], events: [], rng,
  };
  placeTops(g);
  Events.on(engine, 'collisionStart', (e: IEventCollision<Engine>) => {
    for (const pair of e.pairs) {
      const a = g.tops.find((t) => t.body === pair.bodyA);
      const b = g.tops.find((t) => t.body === pair.bodyB);
      if (!a || !b || a.letter || b.letter) continue;
      const power = Math.hypot(a.body.velocity.x - b.body.velocity.x, a.body.velocity.y - b.body.velocity.y);
      [a.spin, b.spin] = clashSpin(a.spin, b.spin, power);
      if (a.you) b.bumpedAt = g.t;
      if (b.you) a.bumpedAt = g.t;
      g.events.push({ type: 'clash', x: (a.body.position.x + b.body.position.x) / 2, y: (a.body.position.y + b.body.position.y) / 2, power });
    }
  });
  return g;
}

const toStep = (pxPerSec: number) => pxPerSec / 60;

export function launch(g: SpinGame, vx: number, vy: number): boolean {
  if (g.phase !== 'aim') return false;
  const speed = Math.min(MAX_FLICK, Math.max(MIN_FLICK, Math.hypot(vx, vy)));
  const dir = Math.hypot(vx, vy) > 1 ? Math.atan2(vy, vx) : -Math.PI / 2;
  for (const t of g.tops) {
    if (t.you) {
      Body.setVelocity(t.body, { x: toStep(Math.cos(dir) * speed), y: toStep(Math.sin(dir) * speed) });
      t.spin = 14 + speed / 30;
    } else {
      const toward = Math.atan2(ARENA.y - t.body.position.y, ARENA.x - t.body.position.x) + (g.rng() - 0.5);
      const s = 360 + g.rng() * 380;
      Body.setVelocity(t.body, { x: toStep(Math.cos(toward) * s), y: toStep(Math.sin(toward) * s) });
      t.spin = 19 + g.rng() * 12 + (t.mega ? 8 : 0);
    }
  }
  g.phase = 'spinning';
  g.t = 0;
  g.events.push({ type: 'launch' });
  if (g.round === g.rainRound) {
    g.coins = Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2 + g.rng() * 0.4;
      const d = 60 + g.rng() * (ARENA.r - 90);
      return { id: i, x: ARENA.x + Math.cos(a) * d, y: ARENA.y + Math.sin(a) * d };
    });
    g.events.push({ type: 'rain' });
  }
  return true;
}

export function nudge(g: SpinGame, x: number, y: number): boolean {
  const you = g.tops.find((t) => t.you);
  if (g.phase !== 'spinning' || g.pushes <= 0 || !you || you.letter) return false;
  const dx = x - you.body.position.x;
  const dy = y - you.body.position.y;
  const d = Math.hypot(dx, dy) || 1;
  Body.setVelocity(you.body, { x: you.body.velocity.x + (dx / d) * toStep(560), y: you.body.velocity.y + (dy / d) * toStep(560) });
  g.pushes -= 1;
  g.events.push({ type: 'nudge', x: you.body.position.x, y: you.body.position.y });
  return true;
}

function land(g: SpinGame, t: Top, place: number) {
  t.letter = landingLetter(g.rng, g.region);
  t.place = place;
  t.spin = 0;
  Body.setVelocity(t.body, { x: 0, y: 0 });
  Body.setStatic(t.body, true);
  g.events.push({ type: 'land', id: t.id, letter: t.letter, you: t.you, x: t.body.position.x, y: t.body.position.y });
  if (!t.you && g.t - t.bumpedAt <= KO_WINDOW_S) {
    g.kos += 1;
    g.score += KO_POINTS;
    g.events.push({ type: 'ko', points: KO_POINTS, x: t.body.position.x, y: t.body.position.y });
  }
}

function settleRound(g: SpinGame) {
  const you = g.tops.find((t) => t.you)!;
  const points = PLACE_POINTS[(you.place ?? 3) - 1] + letterGelt(you.letter!);
  g.score += points;
  if (you.place === 1) g.wins += 1;
  g.events.push({ type: 'roundScore', points, place: you.place!, letter: you.letter! });
  g.phase = 'landed';
  g.t = 0;
}

export function stepSpin(g: SpinGame, dt: number): void {
  if (g.phase === 'over' || g.phase === 'aim') return;
  g.t += dt;
  if (g.phase === 'landed') {
    if (g.t < LANDED_S) return;
    g.round += 1;
    if (g.round >= SPIN_ROUNDS) {
      g.phase = 'over';
      return;
    }
    placeTops(g);
    g.phase = 'aim';
    g.t = 0;
    g.events.push({ type: 'round', round: g.round });
    return;
  }
  Engine.update(g.engine, dt * 1000);
  const you = g.tops.find((t) => t.you);
  if (you && !you.letter && g.coins.length) {
    g.coins = g.coins.filter((c) => {
      if (Math.hypot(c.x - you.body.position.x, c.y - you.body.position.y) > you.r + 24) return true;
      g.score += GELT_COIN;
      g.geltGrabbed += 1;
      g.events.push({ type: 'gelt', points: GELT_COIN, x: c.x, y: c.y });
      return false;
    });
  }
  const live = g.tops.filter((t) => !t.letter);
  const winner = live.length === 1 && g.tops.some((t) => t.place === 1) ? null : live.length === 1 ? live[0] : null;
  if (winner) {
    winner.place = 1;
    g.events.push({ type: 'winner', id: winner.id, you: winner.you });
  }
  const rush = g.t > MAX_ROUND_S ? 4 : 1;
  for (const t of live) {
    const speed = Math.hypot(t.body.velocity.x, t.body.velocity.y) * 60;
    const fast = t.place === 1 ? 3 : 1;
    t.spin = Math.max(0, t.spin - (DECAY + speed * 0.0015) * dt * rush * fast);
    t.angle += t.spin * dt;
  }
  const falling = live.filter((t) => t.spin < FALL_SPIN).sort((a, b) => a.spin - b.spin);
  let nextPlace = live.length;
  for (const t of falling) land(g, t, t.place === 1 ? 1 : nextPlace--);
  if (g.tops.every((t) => t.letter)) settleRound(g);
}
