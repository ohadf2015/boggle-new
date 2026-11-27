import type { ArcadePlay } from './games';
import { wordPoints } from './letters';

export const STACK_COLS = 6;
export const STACK_ROWS = 8;
export const STACK_SECONDS = 90;
const PREFILL = STACK_COLS * 2;
const SPLASH_LEN = 5;

export const dropEvery = (n: number) => Math.max(0.75, 1.8 - 0.012 * n);

export interface Dough {
  id: number;
  letter: string;
}

export interface Cell {
  c: number;
  r: number;
}

export interface StackState {
  cols: Dough[][];
  next: number;
  t: number;
  elapsed: number;
  score: number;
  plays: ArcadePlay[];
  over: boolean;
  won: boolean;
}

type Drop = { letter: string; col: number };

function place(cols: Dough[][], drop: Drop, id: number): Dough[][] {
  return cols.map((c, i) => (i === drop.col ? [...c, { id, letter: drop.letter }] : c));
}

export function newStack(drops: readonly Drop[]): StackState {
  let cols: Dough[][] = Array.from({ length: STACK_COLS }, () => []);
  const n = Math.min(PREFILL, drops.length);
  for (let i = 0; i < n; i++) cols = place(cols, { ...drops[i], col: i % STACK_COLS }, i);
  return { cols, next: n, t: 0, elapsed: 0, score: 0, plays: [], over: false, won: false };
}

export function stackTick(s: StackState, dt: number, drops: readonly Drop[]): StackState {
  if (s.over) return s;
  const n = { ...s, t: s.t + dt, elapsed: s.elapsed + dt };
  if (n.elapsed >= STACK_SECONDS) return { ...n, over: true, won: true };
  if (n.t < dropEvery(n.next) || n.next >= drops.length) return n;
  const drop = drops[n.next];
  if (n.cols[drop.col].length >= STACK_ROWS) return { ...n, over: true, won: false };
  return { ...n, t: 0, next: n.next + 1, cols: place(n.cols, drop, n.next) };
}

export function adjacent(a: Cell, b: Cell): boolean {
  const dc = Math.abs(a.c - b.c);
  const dr = Math.abs(a.r - b.r);
  return dc <= 1 && dr <= 1 && dc + dr > 0;
}

export function chainLetters(s: StackState, path: readonly Cell[]): string {
  return path.map((p) => s.cols[p.c]?.[p.r]?.letter ?? '').join('');
}

export function stackClear(s: StackState, path: readonly Cell[], word: string, len: number): StackState {
  if (s.over) return s;
  const gone = new Set(path.map((p) => `${p.c}:${p.r}`));
  const cols = s.cols.map((col, c) => col.filter((_, r) => !gone.has(`${c}:${r}`)));
  const points = wordPoints(len) * (len >= SPLASH_LEN ? 2 : 1);
  return { ...s, cols, score: s.score + points, plays: [...s.plays, { w: word }] };
}
