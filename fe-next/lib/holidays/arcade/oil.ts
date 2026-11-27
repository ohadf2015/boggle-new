import { wordPoints } from './letters';

export const OIL_MAX = 100;
export const NIGHT_SECONDS = [12, 11, 10, 10, 9, 9, 8, 8] as const;
const DRAIN_PER_SEC = [6, 7, 8, 9, 10, 11, 12, 13] as const;
const REFILL_PER_LETTER = 7;
const MIRACLE_SECONDS = 3;
const NIGHT_BONUS = 50;
const WIN_BONUS = 200;

export interface OilState {
  oil: number;
  night: number;
  nightT: number;
  miracle: 'unused' | 'active' | 'used';
  miracleLeft: number;
  over: boolean;
  won: boolean;
  score: number;
  words: string[];
}

export function newOil(): OilState {
  return { oil: OIL_MAX, night: 1, nightT: 0, miracle: 'unused', miracleLeft: 0, over: false, won: false, score: 0, words: [] };
}

export function oilTick(s: OilState, dt: number): OilState {
  if (s.over) return s;
  const n = { ...s, nightT: s.nightT + dt };
  if (n.miracle === 'active') {
    n.miracleLeft -= dt;
    if (n.miracleLeft <= 0) return { ...n, miracle: 'used', miracleLeft: 0, over: true };
  } else {
    n.oil = Math.max(0, n.oil - DRAIN_PER_SEC[n.night - 1] * dt);
    if (n.oil === 0) {
      if (n.miracle === 'used') return { ...n, over: true };
      return { ...n, miracle: 'active', miracleLeft: MIRACLE_SECONDS };
    }
  }
  if (n.nightT >= NIGHT_SECONDS[n.night - 1]) {
    n.score += NIGHT_BONUS;
    if (n.night === NIGHT_SECONDS.length) return { ...n, over: true, won: true, score: n.score + WIN_BONUS };
    n.night += 1;
    n.nightT = 0;
  }
  return n;
}

export function oilAccept(s: OilState, word: string, len: number): OilState {
  if (s.over) return s;
  return {
    ...s,
    oil: Math.min(OIL_MAX, s.oil + len * REFILL_PER_LETTER),
    miracle: s.miracle === 'active' ? 'used' : s.miracle,
    miracleLeft: 0,
    score: s.score + wordPoints(len),
    words: [...s.words, word],
  };
}

export function oilBound(lengths: number[]): number {
  return lengths.reduce((a, l) => a + wordPoints(l), 0) + NIGHT_SECONDS.length * NIGHT_BONUS + WIN_BONUS;
}
