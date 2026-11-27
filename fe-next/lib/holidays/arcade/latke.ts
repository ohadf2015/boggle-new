import { mulberry32 } from '@/utils/dailyChallenge/prng';
import { comboMult, newPace, stepPace, type Pace } from './kit/pace';

export type LatkeStage = 'raw' | 'light' | 'golden' | 'dark' | 'burnt';

export interface Latke {
  id: number;
  cook: number;
  side: 0 | 1;
  state: 'cooking' | 'served' | 'burnt';
  rate: number;
  t: number;
  star: boolean;
}

export type LatkeEvent =
  | { type: 'perfect' | 'flip' | 'serve'; slot: number; points: number }
  | { type: 'early' | 'burn' | 'spawn' | 'slot' | 'star'; slot: number }
  | { type: 'level'; level: number }
  | { type: 'mult'; mult: number };

export interface LatkeGame {
  latkes: Latke[];
  seconds: number;
  time: number;
  score: number;
  combo: number;
  bestCombo: number;
  served: number;
  burnt: number;
  perfects: number;
  over: boolean;
  nextId: number;
  starNext: boolean;
  pace: Pace;
  events: LatkeEvent[];
  rng: () => number;
}

export const LATKE_POINTS = { perfect: 40, golden: 25, dark: 10, serve: 20, burn: 25 } as const;
export const STAR_MULT = 3;
export const burnPenalty = (level: number) => (level < 3 ? 0 : 5);
const PERFECT = [0.7, 0.82] as const;
const SERVED_S = 0.6;
const BURNT_S = 1.2;

export function latkeStage(cook: number): LatkeStage {
  if (cook < 0.45) return 'raw';
  if (cook < 0.62) return 'light';
  if (cook < 0.88) return 'golden';
  if (cook < 1) return 'dark';
  return 'burnt';
}

export const isPerfect = (cook: number) => cook >= PERFECT[0] && cook <= PERFECT[1];
export const PERFECT_BAND = PERFECT;

const slotsAt = (g: LatkeGame) => 3 + (g.pace.level >= 1 ? 1 : 0) + (g.pace.level >= 3 ? 1 : 0);
const COOK_S = [5.6, 5.1, 4.4, 4.0, 3.4];

function freshLatke(g: LatkeGame, cook = g.rng() * 0.15): Latke {
  const secondsToCook = COOK_S[Math.min(4, g.pace.level)] * (0.85 + 0.3 * g.rng());
  const star = g.starNext;
  g.starNext = false;
  return { id: g.nextId++, cook, side: 0, state: 'cooking', rate: 1 / (star ? secondsToCook * 1.2 : secondsToCook), t: 0, star };
}

export function newLatkeGame(seed: number, seconds: number): LatkeGame {
  const g: LatkeGame = {
    latkes: [], seconds, time: 0, score: 0, combo: 0, bestCombo: 0, served: 0, burnt: 0, perfects: 0,
    over: false, nextId: 1, starNext: false, pace: newPace(mulberry32(seed ^ 0x5f3759df)), events: [], rng: mulberry32(seed),
  };
  for (let i = 0; i < 3; i++) g.latkes.push(freshLatke(g, i * 0.12));
  return g;
}


export function stepLatke(g: LatkeGame, dt: number): void {
  if (g.over) return;
  g.time = Math.min(g.seconds, g.time + dt);
  for (const e of stepPace(g.pace, g.time)) {
    if (e.type === 'level') g.events.push({ type: 'level', level: e.level });
    else {
      const slot = g.latkes.findIndex((l) => l.state !== 'cooking' || l.side === 0);
      if (slot >= 0) {
        g.starNext = true;
        g.latkes[slot] = freshLatke(g);
        g.events.push({ type: 'star', slot });
      } else g.starNext = true;
    }
  }
  while (g.latkes.length < slotsAt(g)) {
    g.latkes.push(freshLatke(g));
    g.events.push({ type: 'slot', slot: g.latkes.length - 1 });
  }
  g.latkes.forEach((l, slot) => {
    l.t += dt;
    if (l.state === 'cooking') {
      l.cook += l.rate * dt;
      if (l.cook >= 1) {
        l.state = 'burnt';
        l.t = 0;
        g.score = Math.max(0, g.score - burnPenalty(g.pace.level));
        g.combo = 0;
        g.burnt += 1;
        g.events.push({ type: 'burn', slot });
      }
    } else if (l.t >= (l.state === 'served' ? SERVED_S : BURNT_S)) {
      g.latkes[slot] = freshLatke(g);
      g.events.push({ type: 'spawn', slot });
    }
  });
  if (g.time >= g.seconds) g.over = true;
}

export function flipLatke(g: LatkeGame, slot: number): void {
  const l = g.latkes[slot];
  if (g.over || !l || l.state !== 'cooking') return;
  const stage = latkeStage(l.cook);
  if (stage === 'raw' || stage === 'light') {
    g.combo = 0;
    g.events.push({ type: 'early', slot });
    return;
  }
  const perfect = isPerfect(l.cook);
  const base = perfect ? LATKE_POINTS.perfect : stage === 'golden' ? LATKE_POINTS.golden : LATKE_POINTS.dark;
  const points = base * comboMult(g.combo) * (l.star ? STAR_MULT : 1);
  if (perfect) {
    const before = comboMult(g.combo);
    g.combo += 1;
    if (comboMult(g.combo) > before) g.events.push({ type: 'mult', mult: comboMult(g.combo) });
    g.perfects += 1;
  } else if (stage === 'dark') g.combo = 0;
  g.bestCombo = Math.max(g.bestCombo, g.combo);
  g.score += points;
  if (l.side === 0) {
    l.side = 1;
    l.cook = 0;
    l.t = 0;
    g.events.push({ type: perfect ? 'perfect' : 'flip', slot, points });
    return;
  }
  l.state = 'served';
  l.t = 0;
  g.served += 1;
  g.score += LATKE_POINTS.serve;
  g.events.push({ type: perfect ? 'perfect' : 'flip', slot, points });
  g.events.push({ type: 'serve', slot, points: LATKE_POINTS.serve });
}
