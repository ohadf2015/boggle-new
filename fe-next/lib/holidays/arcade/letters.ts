import type { Language } from '@/shared/types/game';
import { applyHebrewFinalLetters, normalizeWord } from '@/shared/utils/wordNormalization';

export function fold(word: string, lang: string): string {
  return normalizeWord(word.trim(), lang as Language).toUpperCase();
}

export function canSpell(word: string, pool: readonly string[], lang: string): boolean {
  const left = new Map<string, number>();
  for (const l of pool) {
    const k = fold(l, lang);
    left.set(k, (left.get(k) ?? 0) + 1);
  }
  for (const ch of fold(word, lang)) {
    const n = left.get(ch);
    if (!n) return false;
    left.set(ch, n - 1);
  }
  return true;
}

export function minWordLength(lang: string): number {
  return lang === 'he' || lang === 'ja' ? 2 : 3;
}

const POINTS = [0, 0, 10, 20, 35, 55, 80, 110, 150, 200];

export function wordPoints(len: number): number {
  return len < POINTS.length ? POINTS[len] : POINTS[POINTS.length - 1] + (len - POINTS.length + 1) * 60;
}

export const wordLength = (word: string, lang: string) => [...fold(word, lang)].length;

export type Precheck = 'ok' | 'short' | 'letters' | 'dup';

export function precheck(word: string, pool: readonly string[], lang: string, used: ReadonlySet<string>): Precheck {
  const f = fold(word, lang);
  if ([...f].length < minWordLength(lang)) return 'short';
  if (used.has(f)) return 'dup';
  return canSpell(f, pool, lang) ? 'ok' : 'letters';
}

export const displayWord = (word: string, lang: string) => (lang === 'he' ? applyHebrewFinalLetters(word) : word);
