import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { comboMult, newPace, stepPace, type Pace } from './kit/pace';

export type CatchKind = 'dough' | 'golden' | 'burnt';

export const CATCH = { plateY: 1150, floorY: 1290, halfPlate: 120, minX: 90, maxX: 678, plateMin: 175, plateMax: 593 } as const;
export const FRENZY_S = 5;
const STUN_S = 0.6;
const PLATE_SPEED = 2600;
const BURNT_PENALTY = 60;

export interface CatchItem {
  id: number;
  kind: CatchKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
}

export type CatchEvent =
  | { type: 'spawn'; kind: CatchKind }
  | { type: 'catch'; kind: CatchKind; points: number; x: number; frenzy: boolean }
  | { type: 'burnt'; points: number; x: number }
  | { type: 'splat'; x: number }
  | { type: 'level'; level: number }
  | { type: 'mult'; mult: number }
  | { type: 'frenzyEnd' };

export interface CatchGame {
  seconds: number;
  time: number;
  score: number;
  combo: number;
  bestCombo: number;
  caught: number;
  plate: { x: number; target: number };
  items: CatchItem[];
  frenzy: number;
  stun: number;
  nextSpawn: number;
  goldenAt: number[];
  pace: Pace;
  nextId: number;
  over: boolean;
  events: CatchEvent[];
  rng: () => number;
}

export function catchPoints(kind: CatchKind, combo: number, frenzy: boolean): number {
  if (kind === 'golden') return 150;
  return (frenzy ? 30 : 20) * comboMult(combo);
}

export function newCatchGame(seed: number, seconds: number): CatchGame {
  const rng = mulberry32(seed);
  const pace = newPace(rng);
  return {
    seconds, time: 0, score: 0, combo: 0, bestCombo: 0, caught: 0,
    plate: { x: 384, target: 384 }, items: [], frenzy: 0, stun: 0, nextSpawn: 0.3,
    goldenAt: [], pace, nextId: 1, over: false, events: [], rng,
  };
}

export function movePlate(g: CatchGame, x: number) {
  g.plate.target = Math.max(CATCH.plateMin, Math.min(CATCH.plateMax, x));
}

const fallSpeed = (level: number) => 300 + level * 70;
const gap = (level: number) => Math.max(0.42, 0.95 - level * 0.11);
const burntChance = (level: number) => (level < 1 ? 0 : Math.min(0.34, 0.16 + level * 0.045));

function spawn(g: CatchGame, kind: CatchKind) {
  const level = g.pace.level;
  const x = CATCH.minX + g.rng() * (CATCH.maxX - CATCH.minX);
  const zig = level >= 2 && kind === 'dough' && g.rng() < 0.35 ? (g.rng() < 0.5 ? -1 : 1) * (90 + level * 20) : 0;
  const vy = (g.frenzy > 0 ? fallSpeed(1) : fallSpeed(level)) * (0.9 + g.rng() * 0.2) * (kind === 'golden' ? 0.8 : 1);
  g.items.push({ id: g.nextId++, kind, x, y: -80, vx: zig, vy, spin: (g.rng() - 0.5) * 6 });
  g.events.push({ type: 'spawn', kind });
}

function land(g: CatchGame, it: CatchItem) {
  if (it.kind === 'burnt') {
    g.score = Math.max(0, g.score - BURNT_PENALTY);
    g.combo = 0;
    g.stun = STUN_S;
    g.events.push({ type: 'burnt', points: -BURNT_PENALTY, x: it.x });
    return;
  }
  const before = comboMult(g.combo);
  const frenzy = g.frenzy > 0;
  const points = catchPoints(it.kind, g.combo, frenzy);
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.caught += 1;
  g.score += points;
  g.events.push({ type: 'catch', kind: it.kind, points, x: it.x, frenzy });
  if (comboMult(g.combo) > before) g.events.push({ type: 'mult', mult: comboMult(g.combo) });
  if (it.kind === 'golden') g.frenzy = FRENZY_S;
}

export function stepCatch(g: CatchGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'surprise' || (e.type === 'level' && e.level === 4)) spawn(g, 'golden');
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
  }
  const wasFrenzy = g.frenzy > 0;
  g.frenzy = Math.max(0, g.frenzy - dt);
  if (wasFrenzy && g.frenzy === 0) g.events.push({ type: 'frenzyEnd' });
  g.stun = Math.max(0, g.stun - dt);
  const speed = PLATE_SPEED * (g.stun > 0 ? 0.25 : 1) * dt;
  const d = g.plate.target - g.plate.x;
  g.plate.x += Math.sign(d) * Math.min(Math.abs(d), speed);

  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) {
    if (g.frenzy > 0) {
      spawn(g, 'dough');
      g.nextSpawn = 0.13;
    } else {
      spawn(g, g.rng() < burntChance(g.pace.level) ? 'burnt' : 'dough');
      if (g.pace.level >= 3 && g.rng() < 0.4) spawn(g, 'dough');
      g.nextSpawn = gap(g.pace.level) * (0.8 + g.rng() * 0.4);
    }
  }

  g.items = g.items.filter((it) => {
    const prevY = it.y;
    it.y += it.vy * dt;
    it.x += it.vx * dt;
    if (it.x < CATCH.minX || it.x > CATCH.maxX) it.vx = -it.vx;
    if (prevY < CATCH.plateY && it.y >= CATCH.plateY && Math.abs(it.x - g.plate.x) <= CATCH.halfPlate) {
      land(g, it);
      return false;
    }
    if (it.y >= CATCH.floorY) {
      if (it.kind !== 'burnt') {
        g.combo = 0;
        g.events.push({ type: 'splat', x: it.x });
      }
      return false;
    }
    return true;
  });
  if (g.time >= g.seconds) g.over = true;
}
