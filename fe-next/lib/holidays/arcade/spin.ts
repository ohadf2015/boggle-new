import { Bodies, Body, Composite, Engine, Events, type IEventCollision } from 'matter-js';
import { mulberry32 } from '@/utils/dailyChallenge/prng';
import type { HolidayRegion } from '../region';

export type DreidelSide = 'nun' | 'gimel' | 'hei' | 'shin' | 'pe';
export type TopColor = 'blue' | 'red' | 'green' | 'purple';

export const ARENA = { x: 384, y: 680, r: 250 };
export const TOP_R = 34;
export const SPIN_ROUNDS = 3;
export const PLACE_POINTS = [200, 80, 30, 10];
const GELT: Record<DreidelSide, number> = { nun: 0, gimel: 100, hei: 50, shin: 20, pe: 20 };
const FALL_SPIN = 4;
const DECAY = 2.6;
const MAX_ROUND_S = 14;
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
}

export type SpinEvent =
  | { type: 'launch' }
  | { type: 'clash'; x: number; y: number; power: number }
  | { type: 'land'; id: number; letter: DreidelSide; you: boolean; x: number; y: number }
  | { type: 'winner'; id: number; you: boolean }
  | { type: 'roundScore'; points: number; place: number; letter: DreidelSide };

export interface SpinGame {
  engine: Engine;
  tops: Top[];
  region: HolidayRegion;
  round: number;
  phase: 'aim' | 'spinning' | 'landed' | 'over';
  t: number;
  score: number;
  wins: number;
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
];

function placeTops(g: SpinGame) {
  for (const t of g.tops) Composite.remove(g.engine.world, t.body);
  g.tops = START.map((s, i) => {
    const body = Bodies.circle(s.x, s.y, TOP_R, { frictionAir: 0.014, restitution: 0.95, friction: 0, label: `top-${i}` });
    Composite.add(g.engine.world, body);
    return { id: i, body, spin: 0, angle: 0, you: i === 0, color: s.color, letter: null, place: null };
  });
}

export function newSpinGame(seed: number, region: HolidayRegion): SpinGame {
  const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
  const walls = Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * Math.PI * 2;
    const d = ARENA.r + 20;
    return Bodies.rectangle(ARENA.x + Math.cos(a) * d, ARENA.y + Math.sin(a) * d, 50, 48, { isStatic: true, angle: a, restitution: 1, label: 'wall' });
  });
  Composite.add(engine.world, walls);
  const g: SpinGame = { engine, tops: [], region, round: 0, phase: 'aim', t: 0, score: 0, wins: 0, events: [], rng: mulberry32(seed) };
  placeTops(g);
  Events.on(engine, 'collisionStart', (e: IEventCollision<Engine>) => {
    for (const pair of e.pairs) {
      const a = g.tops.find((t) => t.body === pair.bodyA);
      const b = g.tops.find((t) => t.body === pair.bodyB);
      if (!a || !b || a.letter || b.letter) continue;
      const power = Math.hypot(a.body.velocity.x - b.body.velocity.x, a.body.velocity.y - b.body.velocity.y);
      [a.spin, b.spin] = clashSpin(a.spin, b.spin, power);
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
      t.spin = 20 + speed / 45;
    } else {
      const toward = Math.atan2(ARENA.y - t.body.position.y, ARENA.x - t.body.position.x) + (g.rng() - 0.5);
      const s = 360 + g.rng() * 380;
      Body.setVelocity(t.body, { x: toStep(Math.cos(toward) * s), y: toStep(Math.sin(toward) * s) });
      t.spin = 19 + g.rng() * 12;
    }
  }
  g.phase = 'spinning';
  g.t = 0;
  g.events.push({ type: 'launch' });
  return true;
}

function land(g: SpinGame, t: Top, place: number) {
  t.letter = landingLetter(g.rng, g.region);
  t.place = place;
  t.spin = 0;
  Body.setVelocity(t.body, { x: 0, y: 0 });
  Body.setStatic(t.body, true);
  g.events.push({ type: 'land', id: t.id, letter: t.letter, you: t.you, x: t.body.position.x, y: t.body.position.y });
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
    return;
  }
  Engine.update(g.engine, dt * 1000);
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
