import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { FLIGHT_S, PARTY_S, popHeight, SPLAT_POINTS, type Pop, type PopKind } from '../splat';
import { FIELD, PARTY_HOLES as HOLES } from './field';

const THROW_FROM = { x: FIELD.w / 2, y: FIELD.h + 120 };

export function partyBallAt(b: { x: number; y: number; t: number }) {
  const p = Math.min(1, b.t / FLIGHT_S);
  return { x: THROW_FROM.x + (b.x - THROW_FROM.x) * p, y: THROW_FROM.y + (b.y - THROW_FROM.y) * p - Math.sin(Math.PI * p) * 300, scale: 1 - 0.5 * p };
}
import { comboMult, newPace, stepPace, type Pace } from '../kit/pace';

const BALLS_EACH = 2;
const HIT_S = 0.6;
const POP_S = 0.18;
const LIFE: Record<PopKind, number> = { elf: 1.8, snowman: 2.3, gremlin: 1.1, mascot: 2 };

export interface PartyThrower {
  id: string;
  score: number;
  combo: number;
  hits: number;
}

export interface PartyBall {
  id: number;
  owner: string;
  x: number;
  y: number;
  t: number;
}

export type SplatPartyEvent =
  | { type: 'hit'; player: string; kind: PopKind; points: number; x: number; y: number }
  | { type: 'oops'; player: string; points: number; x: number; y: number }
  | { type: 'miss'; x: number; y: number }
  | { type: 'party' }
  | { type: 'level'; level: number };

export interface SplatParty {
  seconds: number;
  time: number;
  players: PartyThrower[];
  pops: Pop[];
  balls: PartyBall[];
  party: number;
  nextSpawn: number;
  pace: Pace;
  nextId: number;
  over: boolean;
  events: SplatPartyEvent[];
  rng: () => number;
}

export function newSplatParty(seed: number, seconds: number, players: string[]): SplatParty {
  const rng = mulberry32(seed);
  return {
    seconds, time: 0, players: players.map((id) => ({ id, score: 0, combo: 0, hits: 0 })), pops: [], balls: [],
    party: 0, nextSpawn: 0.3, pace: newPace(rng), nextId: 1, over: false, events: [], rng,
  };
}

export function throwAtHole(g: SplatParty, owner: string, hole: number): boolean {
  const h = HOLES[hole];
  return !!h && throwParty(g, owner, h.x, h.y - 100 * h.scale);
}

export function throwParty(g: SplatParty, owner: string, x: number, y: number): boolean {
  if (g.over || !g.players.some((p) => p.id === owner) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
  if (g.balls.filter((b) => b.owner === owner).length >= BALLS_EACH) return false;
  g.balls.push({ id: g.nextId++, owner, x: Math.max(20, Math.min(FIELD.w - 20, x)), y: Math.max(300, Math.min(FIELD.h, y)), t: 0 });
  return true;
}

function kindFor(g: SplatParty): PopKind {
  if (g.party > 0) return 'gremlin';
  const r = g.rng();
  const mascot = g.pace.level >= 3 ? 0.14 : 0.1;
  if (r < mascot) return 'mascot';
  if (r < mascot + 0.12 + g.pace.level * 0.03) return 'gremlin';
  return r < 0.72 ? 'elf' : 'snowman';
}

function spawn(g: SplatParty) {
  const busy = new Set(g.pops.map((p) => p.hole));
  const free = HOLES.map((_, i) => i).filter((i) => !busy.has(i));
  if (!free.length) return;
  const kind = kindFor(g);
  g.pops.push({ id: g.nextId++, hole: free[Math.floor(g.rng() * free.length)], kind, phase: 'rising', t: 0, life: LIFE[kind] * (1 - 0.08 * g.pace.level) });
}

function land(g: SplatParty, b: PartyBall) {
  const target = g.pops
    .filter((p) => p.phase !== 'hit' && popHeight(p) > 0.3)
    .map((p) => ({ p, h: HOLES[p.hole] }))
    .filter(({ h }) => Math.abs(b.x - h.x) < 80 * h.scale + 20 && b.y > h.y - 190 * h.scale - 20 && b.y < h.y + 30)
    .sort((a, c) => Math.abs(b.x - a.h.x) - Math.abs(b.x - c.h.x))[0];
  const who = g.players.find((p) => p.id === b.owner)!;
  if (!target) {
    who.combo = 0;
    g.events.push({ type: 'miss', x: b.x, y: b.y });
    return;
  }
  const { p, h } = target;
  p.phase = 'hit';
  p.t = 0;
  const y = h.y - 110 * h.scale;
  if (p.kind === 'mascot') {
    who.score = Math.max(0, who.score + SPLAT_POINTS.mascot);
    who.combo = 0;
    g.events.push({ type: 'oops', player: who.id, points: SPLAT_POINTS.mascot, x: h.x, y });
    return;
  }
  const points = SPLAT_POINTS[p.kind] * comboMult(who.combo);
  who.combo += 1;
  who.hits += 1;
  who.score += points;
  g.events.push({ type: 'hit', player: who.id, kind: p.kind, points, x: h.x, y });
}

export function stepSplatParty(g: SplatParty, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
    else {
      g.party = PARTY_S;
      g.nextSpawn = 0;
      g.events.push({ type: 'party' });
    }
  }
  g.party = Math.max(0, g.party - dt);
  g.balls = g.balls.filter((b) => {
    b.t += dt;
    if (b.t < FLIGHT_S) return true;
    land(g, b);
    return false;
  });
  g.pops = g.pops.filter((p) => {
    p.t += dt;
    if (p.phase === 'rising' && p.t >= POP_S) [p.phase, p.t] = ['up', 0];
    else if (p.phase === 'up' && p.t >= p.life) [p.phase, p.t] = ['ducking', 0];
    else if (p.phase === 'ducking' && p.t >= POP_S) return false;
    else if (p.phase === 'hit' && p.t >= HIT_S) return false;
    return true;
  });
  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) {
    spawn(g);
    const crowd = 1 + 0.25 * (g.players.length - 1);
    g.nextSpawn = g.party > 0 ? 0.15 : ((0.8 + g.rng() * 0.45) * (1 - 0.1 * g.pace.level)) / crowd;
  }
  if (g.time >= g.seconds) g.over = true;
}

export function splatSnapshot(g: SplatParty) {
  const r = Math.round;
  return {
    t: Math.round(g.time * 10) / 10,
    left: Math.ceil(g.seconds - g.time),
    party: g.party > 0,
    pops: g.pops.map((p) => [p.id, p.hole, p.kind, Math.round(popHeight(p) * 100) / 100, p.phase === 'hit' ? 1 : 0] as const),
    balls: g.balls.map((b) => {
      const at = partyBallAt(b);
      return [b.id, b.owner, r(at.x), r(at.y), Math.round(at.scale * 100) / 100] as const;
    }),
    players: g.players.map((p) => ({ id: p.id, score: p.score, mult: comboMult(p.combo) })),
  };
}

export type SplatSnapshot = ReturnType<typeof splatSnapshot>;
