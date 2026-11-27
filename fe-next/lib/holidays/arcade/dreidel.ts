import type { ArcadePlay } from './games';
import { fold, minWordLength } from './letters';

export type Side = 'nun' | 'gimel' | 'hei' | 'shin';
const SIDES: Side[] = ['nun', 'gimel', 'hei', 'shin'];
export const sideOf = (n: number): Side => SIDES[((n % 4) + 4) % 4];

export const DUEL_GOAL = 10;
export const DUEL_SECONDS = 90;
export const WORD_SECONDS = 15;
const START = 5;
const GELT_POINTS = 20;
const GELT_CAP = 400;
const BOT_ODDS: Record<Side, number> = { nun: 0, gimel: 35, hei: 60, shin: 55 };

export interface DuelState {
  you: number;
  bot: number;
  pot: number;
  turn: 'you' | 'bot';
  k: number;
  elapsed: number;
  wordScore: number;
  plays: ArcadePlay[];
  over: boolean;
  won: boolean;
}

function ante(s: DuelState): DuelState {
  if (s.pot >= 2) return s;
  if (s.you < 1 || s.bot < 1) return { ...s, over: true, won: s.you > s.bot };
  return { ...s, you: s.you - 1, bot: s.bot - 1, pot: s.pot + 2 };
}

export function newDuel(): DuelState {
  return ante({ you: START, bot: START, pot: 0, turn: 'you', k: 0, elapsed: 0, wordScore: 0, plays: [], over: false, won: false });
}

export const longWord = (lang: string) => (minWordLength(lang) === 2 ? 4 : 6);

export function ruleFits(side: Side, word: string, len: number, need: string | null, lang: string): boolean {
  if (side === 'gimel') return len >= longWord(lang);
  if (side === 'shin') return !!need && fold(word, lang).includes(fold(need, lang));
  return side === 'hei';
}

export function applySpin(s: DuelState, side: Side, success: boolean): DuelState {
  if (s.over) return s;
  const who = s.turn;
  const n = { ...s, turn: who === 'you' ? ('bot' as const) : ('you' as const), k: s.k + 1 };
  if (side === 'gimel' && success) {
    n[who] += n.pot;
    n.pot = 0;
  } else if (side === 'hei' && success) {
    const half = Math.ceil(n.pot / 2);
    n[who] += half;
    n.pot -= half;
  } else if (side === 'shin' && !success) {
    if (n[who] < 1) return { ...n, over: true, won: who === 'bot' };
    n[who] -= 1;
    n.pot += 1;
  }
  if (n.you >= DUEL_GOAL || n.bot >= DUEL_GOAL) return { ...n, over: true, won: n.you >= DUEL_GOAL };
  if (n.you < 1 || n.bot < 1) return { ...n, over: true, won: n.bot < 1 };
  return ante(n);
}

export function duelTick(s: DuelState, dt: number): DuelState {
  if (s.over) return s;
  const elapsed = s.elapsed + dt;
  return elapsed >= DUEL_SECONDS ? { ...s, elapsed, over: true, won: s.you > s.bot } : { ...s, elapsed };
}

export function botSucceeds(side: Side, k: number): boolean {
  return ((k * 7919 + 13) % 100) < BOT_ODDS[side];
}

export function finalScore(s: DuelState): number {
  return s.wordScore + Math.min(GELT_CAP, s.you * GELT_POINTS);
}
