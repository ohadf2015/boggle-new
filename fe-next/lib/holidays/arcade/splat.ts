import { mulberry32 } from '@/utils/dailyChallenge/prng';

export type PopKind = 'elf' | 'snowman' | 'gremlin' | 'mascot';

export interface Hole {
  x: number;
  y: number;
  scale: number;
}

export const HOLES: Hole[] = [
  { x: 190, y: 800, scale: 0.86 },
  { x: 430, y: 720, scale: 0.72 },
  { x: 630, y: 700, scale: 0.66 },
  { x: 230, y: 1110, scale: 1.08 },
  { x: 560, y: 1080, scale: 1.02 },
];

export interface Pop {
  id: number;
  hole: number;
  kind: PopKind;
  phase: 'rising' | 'up' | 'ducking' | 'hit';
  t: number;
  life: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  t: number;
}

export type SplatEvent =
  | { type: 'hit'; kind: PopKind; points: number; x: number; y: number }
  | { type: 'oops'; points: number; x: number; y: number }
  | { type: 'miss'; x: number; y: number }
  | { type: 'spawn'; hole: number; kind: PopKind }
  | { type: 'throw' };

export interface SplatGame {
  seconds: number;
  time: number;
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  pops: Pop[];
  balls: Ball[];
  nextSpawn: number;
  nextId: number;
  over: boolean;
  events: SplatEvent[];
  rng: () => number;
}

export const SPLAT_POINTS: Record<PopKind, number> = { elf: 50, snowman: 80, gremlin: 150, mascot: -100 };
export const FLIGHT_S = 0.34;
export const THROW_FROM = { x: 384, y: 1420 };
const POP_MS = 0.18;
const HIT_S = 0.6;
const MAX_BALLS = 3;
const LIFE: Record<PopKind, number> = { elf: 1.6, snowman: 2.1, gremlin: 1.0, mascot: 1.8 };

export function newSplatGame(seed: number, seconds: number): SplatGame {
  return {
    seconds, time: 0, score: 0, combo: 0, bestCombo: 0, hits: 0, pops: [], balls: [],
    nextSpawn: 0.6, nextId: 1, over: false, events: [], rng: mulberry32(seed),
  };
}

function pickKind(r: number): PopKind {
  if (r < 0.5) return 'elf';
  if (r < 0.75) return 'snowman';
  if (r < 0.9) return 'gremlin';
  return 'mascot';
}

function spawn(g: SplatGame) {
  const busy = new Set(g.pops.map((p) => p.hole));
  const free = HOLES.map((_, i) => i).filter((i) => !busy.has(i));
  if (!free.length) return;
  const hole = free[Math.floor(g.rng() * free.length)];
  const kind = pickKind(g.rng());
  const speed = 1 - 0.35 * Math.min(1, g.time / g.seconds);
  g.pops.push({ id: g.nextId++, hole, kind, phase: 'rising', t: 0, life: LIFE[kind] * speed });
  g.events.push({ type: 'spawn', hole, kind });
}

export function popHeight(p: Pop): number {
  if (p.phase === 'rising') return Math.min(1, p.t / POP_MS);
  if (p.phase === 'ducking') return Math.max(0, 1 - p.t / POP_MS);
  return 1;
}

function land(g: SplatGame, b: Ball) {
  const target = g.pops
    .filter((p) => p.phase !== 'hit' && popHeight(p) > 0.3)
    .map((p) => ({ p, h: HOLES[p.hole] }))
    .filter(({ h }) => Math.abs(b.x - h.x) < 80 * h.scale + 20 && b.y > h.y - 190 * h.scale - 20 && b.y < h.y + 30)
    .sort((a, c) => Math.abs(b.x - a.h.x) - Math.abs(b.x - c.h.x))[0];
  if (!target) {
    g.combo = 0;
    g.events.push({ type: 'miss', x: b.x, y: b.y });
    return;
  }
  const { p, h } = target;
  p.phase = 'hit';
  p.t = 0;
  const y = h.y - 110 * h.scale;
  if (p.kind === 'mascot') {
    g.score = Math.max(0, g.score + SPLAT_POINTS.mascot);
    g.combo = 0;
    g.events.push({ type: 'oops', points: SPLAT_POINTS.mascot, x: h.x, y });
    return;
  }
  const points = Math.round(SPLAT_POINTS[p.kind] * (1 + Math.min(g.combo, 4) * 0.25));
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.hits += 1;
  g.score += points;
  g.events.push({ type: 'hit', kind: p.kind, points, x: h.x, y });
}

export function stepSplat(g: SplatGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  g.balls = g.balls.filter((b) => {
    b.t += dt;
    if (b.t < FLIGHT_S) return true;
    land(g, b);
    return false;
  });
  g.pops = g.pops.filter((p) => {
    p.t += dt;
    if (p.phase === 'rising' && p.t >= POP_MS) [p.phase, p.t] = ['up', 0];
    else if (p.phase === 'up' && p.t >= p.life) [p.phase, p.t] = ['ducking', 0];
    else if (p.phase === 'ducking' && p.t >= POP_MS) return false;
    else if (p.phase === 'hit' && p.t >= HIT_S) return false;
    return true;
  });
  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) {
    spawn(g);
    const speed = 1 - 0.4 * Math.min(1, g.time / g.seconds);
    g.nextSpawn = (0.75 + g.rng() * 0.55) * speed;
  }
  if (g.time >= g.seconds) g.over = true;
}

export function throwBall(g: SplatGame, x: number, y: number): boolean {
  if (g.over || g.balls.length >= MAX_BALLS) return false;
  g.balls.push({ id: g.nextId++, x, y, t: 0 });
  g.events.push({ type: 'throw' });
  return true;
}

export function ballAt(b: Ball): { x: number; y: number; scale: number } {
  const p = Math.min(1, b.t / FLIGHT_S);
  const x = THROW_FROM.x + (b.x - THROW_FROM.x) * p;
  const y = THROW_FROM.y + (b.y - THROW_FROM.y) * p - Math.sin(Math.PI * p) * 260;
  return { x: p >= 1 ? b.x : x, y: p >= 1 ? b.y : y, scale: 1 - 0.5 * p };
}
