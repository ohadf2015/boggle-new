/**
 * Weekly themed board: one seeded classic board per ISO week, the same for
 * everyone, with a light letter bias that gives the week a flavour.
 *
 * No new infra: the theme is a pure function of the week, the board is a
 * Quick Play classic round whose seed is `weekly-<YYYY-Www>`. The server round
 * builder applies the bias from the seed, so submit (which rebuilds the round
 * from the seed) scores against the same board.
 */
import { seededRandom } from './goldenTile';

export type WeeklyThemeId = 'vowelParty' | 'sStorm' | 'bigLetters' | 'goldRush';

export interface WeeklyTheme {
  id: WeeklyThemeId;
  /** Letters sprinkled onto the board this week (lower case). Empty = no bias. */
  letters: string[];
  /** Tiles replaced with theme letters. */
  biasCount: number;
  /** Golden tile chance on this week's board (1 = always). */
  goldenChance: number;
}

const ROTATION: WeeklyThemeId[] = ['vowelParty', 'goldRush', 'sStorm', 'bigLetters'];

/** Theme letters per language. A language without letters for a theme gets Gold Rush. */
const THEME_LETTERS: Partial<Record<WeeklyThemeId, Partial<Record<string, string[]>>>> = {
  vowelParty: {
    en: ['a', 'e', 'i', 'o', 'u'],
    es: ['a', 'e', 'i', 'o', 'u'],
    sv: ['a', 'e', 'i', 'o', 'u', 'ä', 'å'],
    ru: ['а', 'е', 'и', 'о', 'у'],
  },
  sStorm: {
    en: ['s'],
    es: ['s'],
    sv: ['s'],
  },
  bigLetters: {
    en: ['k', 'w', 'y', 'v', 'b'],
    es: ['j', 'v', 'b', 'z', 'ñ'],
    sv: ['k', 'v', 'j', 'y', 'ö'],
  },
};

const PREFIX = 'weekly-';

/** ISO-8601 week key, e.g. 2026-W46. UTC so every player shares the week. */
export function isoWeekKey(now: Date = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekIndex(weekKey: string): number {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!m) return 0;
  return Number(m[1]) * 53 + Number(m[2]);
}

export function weeklyThemeFor(weekKey: string, language: string): WeeklyTheme {
  const id = ROTATION[weekIndex(weekKey) % ROTATION.length];
  const letters = THEME_LETTERS[id]?.[language];
  if (id === 'goldRush' || !letters?.length) {
    return { id: 'goldRush', letters: [], biasCount: 0, goldenChance: 1 };
  }
  return { id, letters, biasCount: id === 'sStorm' ? 3 : 4, goldenChance: 0.6 };
}

export function weeklySeed(weekKey: string = isoWeekKey()): string {
  return `${PREFIX}${weekKey}`;
}

/** The week key inside a weekly seed, or null for any other seed. */
export function parseWeeklySeed(seed: string | null | undefined): string | null {
  if (!seed || !seed.startsWith(PREFIX)) return null;
  const key = seed.slice(PREFIX.length);
  return /^\d{4}-W\d{2}$/.test(key) ? key : null;
}

/** Sprinkle the theme letters onto seeded cells. Returns a new grid. */
export function applyThemeBias(grid: string[][], theme: WeeklyTheme, seed: string): string[][] {
  if (!theme.letters.length || theme.biasCount <= 0) return grid;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (!rows || !cols) return grid;
  const rand = seededRandom(`theme:${seed}`);
  const next = grid.map((row) => row.slice());
  const upper = grid.some((row) => row.some((t) => t && t !== t.toLowerCase()));
  const used = new Set<number>();
  const count = Math.min(theme.biasCount, rows * cols);
  while (used.size < count) {
    const idx = Math.floor(rand() * rows * cols);
    if (used.has(idx)) continue;
    used.add(idx);
    const letter = theme.letters[Math.floor(rand() * theme.letters.length)];
    next[Math.floor(idx / cols)][idx % cols] = upper ? letter.toUpperCase() : letter;
  }
  return next;
}
