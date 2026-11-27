import type { ArcadePlay } from './games';
import { wordPoints } from './letters';

export interface LaneRules {
  lives: number;
  seconds: number;
  passFor: (i: number) => number;
  speedBonus: number;
}

export interface LaneState {
  i: number;
  t: number;
  lives: number;
  score: number;
  plays: ArcadePlay[];
  elapsed: number;
  count: number;
  over: boolean;
  won: boolean;
  last: 'hit' | 'miss' | null;
  lastPoints: number;
}

export function newLane(rules: LaneRules, count: number): LaneState {
  return { i: 0, t: 0, lives: rules.lives, score: 0, plays: [], elapsed: 0, count, over: false, won: false, last: null, lastPoints: 0 };
}

function advance(s: LaneState): LaneState {
  const i = s.i + 1;
  return i >= s.count ? { ...s, i, t: 0, over: true, won: true } : { ...s, i, t: 0 };
}

export function laneTick(rules: LaneRules, s: LaneState, dt: number): LaneState {
  if (s.over) return s;
  const n = { ...s, t: s.t + dt, elapsed: s.elapsed + dt };
  if (n.elapsed >= rules.seconds) return { ...n, over: true, won: n.lives > 0 };
  if (n.t < rules.passFor(n.i)) return n;
  const lives = n.lives - 1;
  if (lives <= 0) return { ...n, lives: 0, over: true, last: 'miss' };
  return advance({ ...n, lives, last: 'miss', lastPoints: 0 });
}

export function laneAccept(rules: LaneRules, s: LaneState, word: string, len: number, boost = 1): LaneState {
  if (s.over) return s;
  const speed = 1 + rules.speedBonus * Math.max(0, 1 - s.t / rules.passFor(s.i));
  const points = Math.round(wordPoints(len) * speed * boost);
  return advance({ ...s, score: s.score + points, plays: [...s.plays, { w: word, i: s.i }], last: 'hit', lastPoints: points });
}
