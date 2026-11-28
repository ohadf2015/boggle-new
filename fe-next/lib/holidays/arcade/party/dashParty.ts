import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { DASH as SIZES, TURBO_S, type DashGift, type DashKind, type DashObstacle } from '../dash';
import { DASH_FIELD, FIELD } from './field';

const DASH = { ...SIZES, ceiling: DASH_FIELD.ceiling, floor: DASH_FIELD.floor };
import { comboMult, newPace, stepPace, type Pace } from '../kit/pace';

export const PARTY_W = FIELD.w;
const SPAWN_X = DASH_FIELD.spawnX;
const HURT_S = 1.4;
const GRAVITY = 1400;
const THRUST = 1600;
const MAX_UP = 480;
const MAX_DOWN = 640;
const GIFT_POINTS = 15;

export interface PartySleigh {
  id: string;
  x: number;
  y: number;
  vy: number;
  holding: boolean;
  hurt: number;
  turbo: number;
  score: number;
  combo: number;
  collected: number;
}

export type DashPartyEvent =
  | { type: 'gift'; player: string; points: number; x: number; y: number }
  | { type: 'crash'; player: string; kind: DashKind }
  | { type: 'turbo'; player: string }
  | { type: 'star' }
  | { type: 'level'; level: number };

export interface DashParty {
  seconds: number;
  time: number;
  speed: number;
  dist: number;
  nextObstacle: number;
  nextGifts: number;
  sleighs: PartySleigh[];
  obstacles: DashObstacle[];
  gifts: DashGift[];
  star: { x: number; y: number } | null;
  pace: Pace;
  nextId: number;
  over: boolean;
  events: DashPartyEvent[];
  rng: () => number;
}

const baseSpeed = (level: number) => 320 + level * 62;

export function newDashParty(seed: number, seconds: number, players: string[]): DashParty {
  const rng = mulberry32(seed);
  const sleighs = players.map((id, i) => ({
    id, x: DASH_FIELD.startX + i * DASH_FIELD.gapX, y: 320 + ((i * 97) % 400), vy: 0, holding: false, hurt: 0, turbo: 0, score: 0, combo: 0, collected: 0,
  }));
  return {
    seconds, time: 0, speed: baseSpeed(0), dist: 0, nextObstacle: 900, nextGifts: 100, sleighs, obstacles: [], gifts: [],
    star: null, pace: newPace(rng), nextId: 1, over: false, events: [], rng,
  };
}

export function holdParty(g: DashParty, id: string, on: boolean) {
  const s = g.sleighs.find((x) => x.id === id);
  if (s) s.holding = !!on;
}

function spawn(g: DashParty) {
  const level = g.pace.level;
  const owl = level >= 1 && g.rng() < (level < 3 ? 0.45 : 0.6);
  const id = g.nextId++;
  if (owl) {
    const baseY = 300 + g.rng() * 440;
    g.obstacles.push({ id, kind: 'owl', x: SPAWN_X, y: baseY, baseY, phase: g.rng() * 6, top: 0, passed: false, near: Infinity });
  } else {
    const top = DASH.floor + 40 - (180 + g.rng() * Math.min(360, 120 + level * 60));
    g.obstacles.push({ id, kind: 'plume', x: SPAWN_X, y: top, baseY: top, phase: 0, top, passed: false, near: Infinity });
  }
}

function hits(o: DashObstacle, s: PartySleigh) {
  if (o.kind === 'owl') return Math.hypot(o.x - s.x, o.y - s.y) < DASH.hitR + DASH.owlR;
  return Math.abs(o.x - s.x) < DASH.plumeHalf + DASH.hitR * 0.8 && s.y + DASH.hitR * 0.8 > o.top;
}

export function stepDashParty(g: DashParty, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
    else {
      g.star = { x: SPAWN_X, y: 420 + g.rng() * 200 };
      g.events.push({ type: 'star' });
    }
  }
  g.speed = baseSpeed(g.pace.level);
  const glide = Math.min(1, 0.15 + g.time / 3);
  for (const s of g.sleighs) {
    s.hurt = Math.max(0, s.hurt - dt);
    s.turbo = Math.max(0, s.turbo - dt);
    s.vy = Math.max(-MAX_UP, Math.min(MAX_DOWN * glide, s.vy + (s.holding && s.hurt < HURT_S - 0.35 ? -THRUST : GRAVITY * glide) * dt));
    s.y += s.vy * dt;
    if (s.y < DASH.ceiling) [s.y, s.vy] = [DASH.ceiling, Math.max(0, s.vy)];
    if (s.y > DASH.floor) [s.y, s.vy] = [DASH.floor, -Math.min(380, Math.abs(s.vy) * 0.5) - 160];
  }
  const move = g.speed * dt;
  g.dist += move;
  if (g.dist >= g.nextObstacle) {
    spawn(g);
    g.nextObstacle = g.dist + Math.max(300, 560 - g.pace.level * 50) * (0.85 + g.rng() * 0.3);
  }
  if (g.dist >= g.nextGifts) {
    const cy = DASH.ceiling + 80 + g.rng() * 420;
    for (let i = 0; i < 6; i++) g.gifts.push({ id: g.nextId++, x: SPAWN_X + i * 70, y: cy + Math.sin(i) * 60 });
    g.nextGifts = g.dist + 420 + g.rng() * 200;
  }
  for (const o of g.obstacles) {
    o.x -= move + (o.kind === 'owl' ? 140 * dt : 0);
    if (o.kind === 'owl') {
      o.phase += dt * 2.4;
      o.y = o.baseY + Math.sin(o.phase) * 100;
    }
    for (const s of g.sleighs) {
      if (s.hurt > 0 || s.turbo > 0 || !hits(o, s)) continue;
      s.combo = 0;
      s.hurt = HURT_S;
      s.vy = 320;
      g.events.push({ type: 'crash', player: s.id, kind: o.kind });
    }
  }
  g.obstacles = g.obstacles.filter((o) => o.x > -200);
  g.gifts = g.gifts.filter((gift) => {
    gift.x -= move;
    const s = g.sleighs.find((x) => Math.hypot(gift.x - x.x, gift.y - x.y) < DASH.hitR + DASH.giftR);
    if (s) {
      const points = GIFT_POINTS * comboMult(s.combo) * (s.turbo > 0 ? 2 : 1);
      s.score += points;
      s.combo += 1;
      s.collected += 1;
      g.events.push({ type: 'gift', player: s.id, points, x: gift.x, y: gift.y });
      return false;
    }
    return gift.x > -100;
  });
  if (g.star) {
    const star = g.star;
    star.x -= move;
    const s = g.sleighs.find((x) => Math.hypot(star.x - x.x, star.y - x.y) < DASH.hitR + DASH.starR);
    if (s) {
      s.turbo = TURBO_S;
      g.star = null;
      g.events.push({ type: 'turbo', player: s.id });
    } else if (star.x < -100) g.star = null;
  }
  if (g.time >= g.seconds) g.over = true;
}

export function dashSnapshot(g: DashParty) {
  const r = Math.round;
  return {
    t: Math.round(g.time * 10) / 10,
    left: Math.ceil(g.seconds - g.time),
    speed: r(g.speed),
    star: g.star ? [r(g.star.x), r(g.star.y)] : null,
    obstacles: g.obstacles.map((o) => [o.id, o.kind === 'owl' ? 1 : 0, r(o.x), r(o.kind === 'owl' ? o.y : o.top)] as const),
    gifts: g.gifts.map((x) => [x.id, r(x.x), r(x.y)] as const),
    sleighs: g.sleighs.map((s) => ({ id: s.id, x: s.x, y: r(s.y), vy: r(s.vy), hurt: s.hurt > 0, turbo: s.turbo > 0, score: s.score, mult: comboMult(s.combo) })),
  };
}

export type DashSnapshot = ReturnType<typeof dashSnapshot>;
