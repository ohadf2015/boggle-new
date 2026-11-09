/**
 * Coached first Quick Play round.
 *
 * A first-time player's board carries one word they already know, in a straight
 * line down the middle, so the first success lands in seconds. The coach is a
 * property of the SEED (`coach-<id>`), not a request flag: submit rebuilds the
 * round from the seed alone, so the planted word is part of the same board the
 * server bounds the score against.
 *
 * Words mirror lib/tutorial/lesson/starterWords.ts STARTER_WORDS (checked
 * against public/dicts). Kept here so the server round builder does not pull
 * the client path-finder module graph.
 */
import { seededRandom } from './goldenTile';

export const COACH_SEED_PREFIX = 'coach-';

const COACH_WORDS: Record<string, readonly string[]> = {
  en: ['CAT', 'SUN', 'DOG', 'HAT', 'CUP', 'MAP'],
  es: ['SOL', 'MAR', 'PAN', 'LUZ', 'OSO'],
  sv: ['SOL', 'HUS', 'BIL'],
  he: ['בית', 'ספר', 'שיר', 'אור'],
  ru: ['КОТ', 'ДОМ', 'СОН'],
};

export function isCoachSeed(seed: string | null | undefined): boolean {
  return typeof seed === 'string' && seed.startsWith(COACH_SEED_PREFIX);
}

/** Plant a starter word vertically in the middle column. Null when the language has none. */
export function plantCoachWord(
  grid: string[][],
  language: string,
  seed: string,
): { grid: string[][]; word: string } | null {
  const words = COACH_WORDS[language];
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!words?.length || !rows || !cols) return null;
  const fitting = words.filter((w) => [...w].length <= rows);
  if (!fitting.length) return null;
  const rand = seededRandom(`coach-word:${seed}`);
  const word = fitting[Math.floor(rand() * fitting.length) % fitting.length];
  const letters = [...word];
  const col = Math.floor((cols - 1) / 2);
  const top = Math.floor((rows - letters.length) / 2);
  const next = grid.map((row) => row.slice());
  letters.forEach((letter, i) => {
    next[top + i][col] = letter;
  });
  return { grid: next, word };
}
