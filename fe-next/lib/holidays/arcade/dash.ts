import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { comboMult, newPace, stepPace, type Pace } from './kit/pace';

export const DASH = { sleighX: 220, ceiling: 150, floor: 1040, hitR: 46, plumeHalf: 48, owlR: 52, giftR: 46, starR: 56 } as const;
export const TURBO_S = 4;
const HURT_S = 1.4;
const GRAVITY = 1400;
const THRUST = 1600;
const MAX_UP = 480;
const MAX_DOWN = 640;
const GLIDE_S = 3;
const CRASH_PENALTY = 15;
const NEAR_PX = 42;
const NEAR_BONUS = 40;
const GIFT_POINTS = 15;
const SPAWN_X = 840;

export type DashKind = 'plume' | 'owl';

export interface DashObstacle {
  id: number;
  kind: DashKind;
  x: number;
  y: number;
  baseY: number;
  phase: number;
  top: number;
  passed: boolean;
  near: number;
  hit?: boolean;
}

export interface DashGift {
  id: number;
  x: number;
  y: number;
}

export type DashEvent =
  | { type: 'spawn'; kind: DashKind; id: number }
  | { type: 'gift'; points: number; x: number; y: number }
  | { type: 'crash'; kind: DashKind; points: number }
  | { type: 'near'; points: number }
  | { type: 'bump' }
  | { type: 'star' }
  | { type: 'turbo' }
  | { type: 'turboEnd' }
  | { type: 'level'; level: number }
  | { type: 'mult'; mult: number };

export interface DashGame {
  seconds: number;
  time: number;
  score: number;
  combo: number;
  bestCombo: number;
  collected: number;
  nearMisses: number;
  crashes: number;
  y: number;
  vy: number;
  holding: boolean;
  speed: number;
  dist: number;
  nextObstacle: number;
  nextGifts: number;
  hurt: number;
  turbo: number;
  obstacles: DashObstacle[];
  gifts: DashGift[];
  star: { x: number; y: number } | null;
  pace: Pace;
  nextId: number;
  over: boolean;
  events: DashEvent[];
  rng: () => number;
}

export function newDashGame(seed: number, seconds: number): DashGame {
  const rng = mulberry32(seed);
  return {
    seconds, time: 0, score: 0, combo: 0, bestCombo: 0, collected: 0, nearMisses: 0, crashes: 0,
    y: 560, vy: 0, holding: false, speed: baseSpeed(0), dist: 0, nextObstacle: 700, nextGifts: 120,
    hurt: 0, turbo: 0, obstacles: [], gifts: [], star: null, pace: newPace(rng), nextId: 1, over: false, events: [], rng,
  };
}

export function hold(g: DashGame, on: boolean) {
  g.holding = on;
}

function baseSpeed(level: number) {
  return 300 + level * 62;
}

const obstacleGap = (level: number) => Math.max(380, 640 - level * 55);
const owlChance = (level: number) => (level < 1 ? 0 : level < 3 ? 0.4 : 0.55);

function spawnObstacle(g: DashGame) {
  const level = g.pace.level;
  const kind: DashKind = g.rng() < owlChance(level) ? 'owl' : 'plume';
  const id = g.nextId++;
  if (kind === 'plume') {
    const h = level < 2 ? 130 + g.rng() * 110 : 200 + g.rng() * Math.min(420, 140 + level * 70);
    const top = DASH.floor + 40 - h;
    g.obstacles.push({ id, kind, x: SPAWN_X, y: top, baseY: top, phase: 0, top, passed: false, near: Infinity });
  } else {
    const baseY = 300 + g.rng() * 520;
    g.obstacles.push({ id, kind, x: SPAWN_X, y: baseY, baseY, phase: g.rng() * Math.PI * 2, top: 0, passed: false, near: Infinity });
  }
  g.events.push({ type: 'spawn', kind, id });
  if (level >= 3 && kind === 'owl' && g.rng() < 0.4) {
    const baseY = g.obstacles[g.obstacles.length - 1].baseY > 560 ? 260 : 860;
    g.obstacles.push({ id: g.nextId++, kind: 'owl', x: SPAWN_X + 140, y: baseY, baseY, phase: 0, top: 0, passed: false, near: Infinity });
  }
}

function spawnGifts(g: DashGame) {
  const plume = g.obstacles.filter((o) => o.kind === 'plume' && o.x > SPAWN_X - 200)[0];
  const ceilingY = plume ? Math.min(900, plume.top - 120) : 900;
  const cy = DASH.ceiling + 120 + g.rng() * Math.max(60, ceilingY - DASH.ceiling - 120);
  const n = 3 + Math.floor(g.rng() * 3);
  for (let i = 0; i < n; i++) g.gifts.push({ id: g.nextId++, x: SPAWN_X + 60 + i * 80, y: cy - Math.sin((i / Math.max(1, n - 1)) * Math.PI) * 70 });
}

function clearance(g: DashGame, o: DashObstacle): number {
  if (o.kind === 'owl') return Math.hypot(o.x - DASH.sleighX, o.y - g.y) - DASH.hitR - DASH.owlR;
  if (Math.abs(o.x - DASH.sleighX) > DASH.plumeHalf + DASH.hitR) return Infinity;
  const dx = Math.max(0, Math.abs(o.x - DASH.sleighX) - DASH.plumeHalf);
  const dy = Math.max(0, o.top - g.y);
  return Math.hypot(dx, dy) - DASH.hitR;
}

function crash(g: DashGame, o: DashObstacle) {
  o.hit = true;
  if (g.hurt > 0 || g.turbo > 0) return;
  const points = g.pace.level < 2 ? 0 : Math.min(g.score, CRASH_PENALTY);
  g.score -= points;
  g.combo = 0;
  g.crashes += 1;
  g.hurt = HURT_S;
  g.vy = 320;
  g.events.push({ type: 'crash', kind: o.kind, points: -points });
}

function addCombo(g: DashGame) {
  const before = comboMult(g.combo);
  g.combo += 1;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  if (comboMult(g.combo) > before) g.events.push({ type: 'mult', mult: comboMult(g.combo) });
}

export function stepDash(g: DashGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
    else {
      g.star = { x: SPAWN_X, y: 420 + g.rng() * 200 };
      g.events.push({ type: 'star' });
    }
  }
  const wasTurbo = g.turbo > 0;
  g.turbo = Math.max(0, g.turbo - dt);
  if (wasTurbo && g.turbo === 0) g.events.push({ type: 'turboEnd' });
  g.hurt = Math.max(0, g.hurt - dt);
  g.speed = baseSpeed(g.pace.level) * (g.turbo > 0 ? 1.6 : 1);

  const glide = Math.min(1, 0.15 + g.time / GLIDE_S);
  g.vy = Math.max(-MAX_UP, Math.min(MAX_DOWN * glide, g.vy + (g.holding && g.hurt < HURT_S - 0.35 ? -THRUST : GRAVITY * glide) * dt));
  g.y += g.vy * dt;
  if (g.y < DASH.ceiling) [g.y, g.vy] = [DASH.ceiling, Math.max(0, g.vy)];
  if (g.y > DASH.floor) {
    g.y = DASH.floor;
    g.vy = -Math.min(380, Math.abs(g.vy) * 0.5) - 160;
    g.events.push({ type: 'bump' });
  }

  const move = g.speed * dt;
  g.dist += move;
  if (g.dist >= g.nextObstacle) {
    spawnObstacle(g);
    g.nextObstacle = g.dist + obstacleGap(g.pace.level) * (0.85 + g.rng() * 0.3);
  }
  if (g.dist >= g.nextGifts) {
    spawnGifts(g);
    g.nextGifts = g.dist + 520 + g.rng() * 200;
  }

  for (const o of g.obstacles) {
    o.x -= move + (o.kind === 'owl' ? 140 * dt : 0);
    if (o.kind === 'owl') {
      o.phase += dt * 2.4;
      o.y = o.baseY + Math.sin(o.phase) * 120;
    }
    if (o.hit || o.passed) continue;
    const c = clearance(g, o);
    if (c <= 0) crash(g, o);
    else o.near = Math.min(o.near, c);
    if (!o.hit && o.x < DASH.sleighX - DASH.hitR - DASH.plumeHalf) {
      o.passed = true;
      if (o.near < NEAR_PX) {
        g.nearMisses += 1;
        g.score += NEAR_BONUS;
        addCombo(g);
        g.events.push({ type: 'near', points: NEAR_BONUS });
      }
    }
  }
  g.obstacles = g.obstacles.filter((o) => o.x > -200);

  g.gifts = g.gifts.filter((gift) => {
    gift.x -= move;
    if (g.turbo > 0 && Math.abs(gift.x - DASH.sleighX) < 320) {
      gift.y += (g.y - gift.y) * Math.min(1, dt * 6);
      gift.x += (DASH.sleighX - gift.x) * Math.min(1, dt * 3);
    }
    if (Math.hypot(gift.x - DASH.sleighX, gift.y - g.y) < DASH.hitR + DASH.giftR) {
      const points = GIFT_POINTS * comboMult(g.combo) * (g.turbo > 0 ? 2 : 1);
      g.score += points;
      g.collected += 1;
      addCombo(g);
      g.events.push({ type: 'gift', points, x: gift.x, y: gift.y });
      return false;
    }
    return gift.x > -100;
  });

  if (g.star) {
    g.star.x -= move;
    if (Math.hypot(g.star.x - DASH.sleighX, g.star.y - g.y) < DASH.hitR + DASH.starR) {
      g.star = null;
      g.turbo = TURBO_S;
      g.speed = baseSpeed(g.pace.level) * 1.6;
      g.events.push({ type: 'turbo' });
    } else if (g.star.x < -100) g.star = null;
  }
  if (g.time >= g.seconds) g.over = true;
}
