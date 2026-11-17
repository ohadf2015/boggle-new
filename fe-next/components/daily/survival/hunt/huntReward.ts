import { praiseKeyFor } from './huntStage';

export const COMBO_WINDOW_MS = 6000;
export const LUCKY_LIFE_BONUS = 8;
const PRAISE_VARIANTS = 4;

export interface ComboState { count: number; at: number }

export function nextCombo(prev: ComboState | null, now: number): ComboState {
  if (!prev || now - prev.at > COMBO_WINDOW_MS) return { count: 1, at: now };
  return { count: prev.count + 1, at: now };
}

export function comboBonus(count: number): number {
  return Math.min(6, Math.max(0, (count - 1) * 2));
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Seeded by the day's puzzle so every player gets the same lucky words: fair on a shared board.
export function isLuckyWord(seed: string, word: string): boolean {
  return hash(`${seed.toUpperCase()}|${word.toUpperCase()}`) % 6 === 0;
}

export function praiseFor(word: string, combo: number, lucky: boolean): { key: string; index: number } {
  if (lucky) return { key: 'wordHunt.survival.stage.lucky', index: 0 };
  if (combo >= 3) return { key: 'wordHunt.survival.stage.combo', index: 0 };
  return { key: praiseKeyFor(Array.from(word).length), index: hash(word.toUpperCase()) % PRAISE_VARIANTS };
}

/** A pool string holds the variants separated by `|`. */
export function pickVariant(pool: string, index: number): string {
  const parts = pool.split('|').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[index % parts.length] : pool;
}
