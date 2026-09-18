/** Letter-wheel bookkeeping for Word Tower v2. Pure — no React, no DOM. */

import { generateWheel } from '@/lib/wordTower/wordTowerManager';
import type { Language } from '@/shared/types/game';

/**
 * v1's generator draws from UPPERCASE bags while the dictionary and typed input
 * are lowercase. Borrowed raw, every word failed the wheel check and nothing
 * could ever be hoisted. Normalise once, here.
 */
export function spinWheel(language: Language, drawIndex = 0): string[] {
  return generateWheel('word-tower-v2', 'local', language, drawIndex).map((l) => l.toLowerCase());
}

export function canBuildFromWheel(word: string, wheel: string[]): boolean {
  return usedLetterMask(word, wheel).filter(Boolean).length === word.length;
}

/**
 * Which wheel slots the typed word has consumed. Duplicates are taken left to
 * right, so the buttons the player sees disabled are exactly the ones spent.
 */
export function usedLetterMask(word: string, wheel: string[]): boolean[] {
  const used = wheel.map(() => false);
  for (const letter of word) {
    const slot = wheel.findIndex((l, i) => !used[i] && l === letter);
    if (slot !== -1) used[slot] = true;
  }
  return used;
}

export const MIN_WORD_LEN = 3;

/**
 * The one gate a word passes before it becomes a block. The word-craft
 * dictionary keys are UPPERCASE (see addDictKeys) while the wheel and typed
 * input are lowercase — the lookup must cross that boundary here, once.
 */
export function isAcceptedWord(word: string, wheel: string[], dict: Set<string> | null): boolean {
  return (
    word.length >= MIN_WORD_LEN &&
    canBuildFromWheel(word, wheel) &&
    !!dict?.has(word.toUpperCase())
  );
}
