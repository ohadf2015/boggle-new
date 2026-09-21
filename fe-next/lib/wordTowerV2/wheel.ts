/** Letter-wheel bookkeeping for Word Tower v2. Pure — no React, no DOM. */

import { generateWheel } from '@/lib/wordTower/wordTowerManager';
import { WORD_TOWER_WHEEL_SIZE as WHEEL_SIZE } from '@/shared/constants/wordTowerConstants';
import type { Language } from '@/shared/types/game';
import { isBlockedWord } from './blocked';

/** 2-3 vowels of 7: v1's floor-only rule dealt 4-5, leaving nothing to spell with. */
const MAX_VOWELS = 3;

/**
 * v1's generator draws from UPPERCASE bags while the dictionary and typed input
 * are lowercase. Borrowed raw, every word failed the wheel check and nothing
 * could ever be hoisted. Normalise once, here.
 */
/**
 * Letters that rarely make words. More than one on a 7-letter ring (a real deal
 * was Q,Q,V,C + 3 vowels) leaves nothing to spell. Lowercase, per language.
 */
const RARE: Partial<Record<Language, string>> = { en: 'jqxz', es: 'jkqwxz', sv: 'cjqwxz', ru: 'ёжщъфцэю' };
/** Re-deals tried per draw before settling for the last candidate. */
const DEAL_TRIES = 12;

function playable(wheel: string[], language: Language): boolean {
  const rare = RARE[language] ?? '';
  if (wheel.filter((l) => rare.includes(l)).length > 1) return false;
  return !(wheel.includes('q') && !wheel.includes('u') && (language === 'en' || language === 'es'));
}

export function spinWheel(language: Language, drawIndex = 0, runSeed = 'word-tower-v2'): string[] {
  // runSeed varies per run: a constant opened every run on the same letters.
  // Deterministic re-deals: candidate k of draw d is sub-draw d*DEAL_TRIES+k.
  let wheel: string[] = [];
  for (let k = 0; k < DEAL_TRIES; k += 1) {
    wheel = generateWheel(runSeed, 'local', language, drawIndex * DEAL_TRIES + k, WHEEL_SIZE, 2, MAX_VOWELS).map((l) => l.toLowerCase());
    if (playable(wheel, language)) return wheel;
  }
  // ponytail: 12 misses in a row is vanishingly rare; ship the last deal rather than loop.
  return wheel;
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
    !!dict?.has(word.toUpperCase()) &&
    !isBlockedWord(word)
  );
}
