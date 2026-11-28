import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { catchPoints, FRENZY_S, type CatchItem, type CatchKind } from '../catch';
import { CATCH_FIELD as CATCH } from './field';
import { comboMult, newPace, stepPace, type Pace } from '../kit/pace';

const PLATE_SPEED = 2600;
const STUN_S = 0.6;
const BURNT_PENALTY = 60;

export interface PartyPlate {
  id: string;
  x: number;
  target: number;
  stun: number;
  score: number;
  combo: number;
}

export type CatchPartyEvent =
  | { type: 'spawn'; kind: CatchKind }
  | { type: 'catch'; player: string; kind: CatchKind; points: number; x: number }
  | { type: 'burnt'; player: string; x: number }
  | { type: 'splat'; x: number }
  | { type: 'level'; level: number }
  | { type: 'frenzy'; player: string };

export interface CatchParty {
  seconds: number;
  time: number;
  plates: PartyPlate[];
  items: CatchItem[];
  frenzy: number;
  nextSpawn: number;
  pace: Pace;
  nextId: number;
  over: boolean;
  events: CatchPartyEvent[];
  rng: () => number;
}

export function newCatchParty(seed: number, seconds: number, players: string[]): CatchParty {
  const rng = mulberry32(seed);
  const span = CATCH.maxX - CATCH.minX;
  const plates = players.map((id, i) => {
    const x = CATCH.minX + (span * (i + 0.5)) / players.length;
    return { id, x, target: x, stun: 0, score: 0, combo: 0 };
  });
  return { seconds, time: 0, plates, items: [], frenzy: 0, nextSpawn: 0.3, pace: newPace(rng), nextId: 1, over: false, events: [], rng };
}

export function steerCatch(g: CatchParty, id: string, nx: number) {
  const p = g.plates.find((x) => x.id === id);
  if (!p || !Number.isFinite(nx)) return;
  p.target = CATCH.minX + Math.max(0, Math.min(1, nx)) * (CATCH.maxX - CATCH.minX);
}

function spawn(g: CatchParty, kind: CatchKind) {
  const level = g.pace.level;
  const x = CATCH.minX + g.rng() * (CATCH.maxX - CATCH.minX);
  const zig = level >= 2 && kind === 'dough' && g.rng() < 0.35 ? (g.rng() < 0.5 ? -1 : 1) * (90 + level * 20) : 0;
  const vy = (300 + (g.frenzy > 0 ? 1 : level) * 70) * (0.9 + g.rng() * 0.2) * (kind === 'golden' ? 0.8 : 1);
  g.items.push({ id: g.nextId++, kind, x, y: -80, vx: zig, vy, spin: (g.rng() - 0.5) * 6 });
  g.events.push({ type: 'spawn', kind });
}

function land(g: CatchParty, p: PartyPlate, it: CatchItem) {
  if (it.kind === 'burnt') {
    p.score = Math.max(0, p.score - BURNT_PENALTY);
    p.combo = 0;
    p.stun = STUN_S;
    g.events.push({ type: 'burnt', player: p.id, x: it.x });
    return;
  }
  const points = catchPoints(it.kind, p.combo, g.frenzy > 0);
  p.combo += 1;
  p.score += points;
  g.events.push({ type: 'catch', player: p.id, kind: it.kind, points, x: it.x });
  if (it.kind === 'golden') {
    g.frenzy = FRENZY_S;
    g.events.push({ type: 'frenzy', player: p.id });
  }
}

export function stepCatchParty(g: CatchParty, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'surprise' || (e.type === 'level' && e.level === 4)) spawn(g, 'golden');
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
  }
  g.frenzy = Math.max(0, g.frenzy - dt);
  for (const p of g.plates) {
    p.stun = Math.max(0, p.stun - dt);
    const d = p.target - p.x;
    p.x += Math.sign(d) * Math.min(Math.abs(d), PLATE_SPEED * (p.stun > 0 ? 0.25 : 1) * dt);
  }
  g.nextSpawn -= dt;
  if (g.nextSpawn <= 0) {
    const crowd = 1 + 0.3 * (g.plates.length - 1);
    if (g.frenzy > 0) {
      spawn(g, 'dough');
      g.nextSpawn = 0.13 / crowd;
    } else {
      const level = g.pace.level;
      spawn(g, level >= 1 && g.rng() < Math.min(0.34, 0.16 + level * 0.045) ? 'burnt' : 'dough');
      if (level >= 3 && g.rng() < 0.4) spawn(g, 'dough');
      g.nextSpawn = (Math.max(0.42, 0.95 - level * 0.11) * (0.8 + g.rng() * 0.4)) / crowd;
    }
  }
  g.items = g.items.filter((it) => {
    const prevY = it.y;
    it.y += it.vy * dt;
    it.x += it.vx * dt;
    if (it.x < CATCH.minX || it.x > CATCH.maxX) it.vx = -it.vx;
    if (prevY < CATCH.plateY && it.y >= CATCH.plateY) {
      const hit = g.plates
        .filter((p) => Math.abs(it.x - p.x) <= CATCH.halfPlate)
        .sort((a, b) => Math.abs(it.x - a.x) - Math.abs(it.x - b.x))[0];
      if (hit) {
        land(g, hit, it);
        return false;
      }
    }
    if (it.y >= CATCH.floorY) {
      if (it.kind !== 'burnt') g.events.push({ type: 'splat', x: it.x });
      return false;
    }
    return true;
  });
  if (g.time >= g.seconds) g.over = true;
}

export function catchSnapshot(g: CatchParty) {
  const r = Math.round;
  return {
    t: Math.round(g.time * 10) / 10,
    left: Math.ceil(g.seconds - g.time),
    frenzy: g.frenzy > 0,
    items: g.items.map((i) => [i.id, i.kind === 'dough' ? 0 : i.kind === 'golden' ? 1 : 2, r(i.x), r(i.y)] as const),
    plates: g.plates.map((p) => ({ id: p.id, x: r(p.x), stun: p.stun > 0, score: p.score, mult: comboMult(p.combo) })),
  };
}

export type CatchSnapshot = ReturnType<typeof catchSnapshot>;
