import type { ArcadePlay } from './games';
import { wordPoints } from './letters';

export const SNOW_SECONDS = 75;
const TOSS_POINTS = 15;
const FROST_SECONDS = 1.2;

export const flightFor = (i: number) => Math.max(1.7, 3.4 - 0.05 * i);
export const comboMult = (combo: number) => Math.min(3, 1 + combo * 0.1);

export interface SnowState {
  i: number;
  t: number;
  combo: number;
  best: number;
  score: number;
  plays: ArcadePlay[];
  elapsed: number;
  frost: number;
  over: boolean;
  last: 'caught' | 'tossed' | 'wrong' | 'hit' | null;
  lastPoints: number;
}

export function newSnow(): SnowState {
  return { i: 0, t: 0, combo: 0, best: 0, score: 0, plays: [], elapsed: 0, frost: 0, over: false, last: null, lastPoints: 0 };
}

const next = (s: SnowState, count: number): SnowState => ({ ...s, i: s.i + 1, t: 0, over: s.over || s.i + 1 >= count });

export function snowTick(s: SnowState, dt: number, count: number): SnowState {
  if (s.over) return s;
  const n = { ...s, t: s.t + dt, elapsed: s.elapsed + dt, frost: Math.max(0, s.frost - dt) };
  if (n.elapsed >= SNOW_SECONDS) return { ...n, over: true };
  if (n.t < flightFor(n.i)) return n;
  return next({ ...n, combo: 0, frost: FROST_SECONDS, last: 'hit', lastPoints: 0 }, count);
}

export function snowAnswer(s: SnowState, action: 'catch' | 'toss', balls: readonly { text: string; real: boolean }[]): SnowState {
  const ball = balls[s.i];
  if (s.over || !ball) return s;
  const right = (action === 'catch') === ball.real;
  if (!right) return next({ ...s, combo: 0, frost: FROST_SECONDS, last: 'wrong', lastPoints: 0 }, balls.length);
  const base = ball.real ? wordPoints([...ball.text].length) : TOSS_POINTS;
  const points = Math.round(base * comboMult(s.combo));
  const combo = s.combo + 1;
  return next(
    {
      ...s,
      combo,
      best: Math.max(s.best, combo),
      score: s.score + points,
      plays: ball.real ? [...s.plays, { w: ball.text, i: s.i }] : s.plays,
      last: ball.real ? 'caught' : 'tossed',
      lastPoints: points,
    },
    balls.length,
  );
}
