/**
 * Weekly Seeded Challenge
 *
 * Every week, all players get the same grid (seeded by week number).
 * Players compete on score — ranked on a global leaderboard.
 * Challenge resets every Monday at 00:00 UTC.
 */

/**
 * Get the current week identifier (YYYY-WNN format).
 * Used as the seed for grid generation.
 */
export function getCurrentWeekId(date: Date = new Date()): string {
  // Use ISO week numbering — weeks start on Monday, consistent with getTimeUntilReset
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  // Set to nearest Thursday (ISO week belongs to the year of its Thursday)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get milliseconds until the next Monday 00:00 UTC (weekly reset).
 */
export function getTimeUntilReset(now: Date = new Date()): number {
  // Days until next Monday: Sunday(0)→1, Mon(1)→7, Tue(2)→6, ...
  const day = now.getUTCDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  const nextMonday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilMonday,
    0, 0, 0
  ));
  return nextMonday.getTime() - now.getTime();
}

/**
 * Seeded PRNG (mulberry32) for deterministic grid generation.
 */
function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Convert week ID to a numeric seed for the PRNG.
 */
function weekIdToSeed(weekId: string): number {
  let hash = 0;
  for (let i = 0; i < weekId.length; i++) {
    hash = ((hash << 5) - hash + weekId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Letter frequencies for English grid generation (weighted).
 */
const ENGLISH_LETTERS = 'EEEEEEEEEEEETTTTTTTTTAAAAAAAAOOOOOOOOIIIIIIIINNNNNNNNSSSSSSRRRRRRHHHHHLLLLLDDDDCCCCUUUMMMPPPFFWWYYBBGGVKKJXQZ';

/**
 * Generate a deterministic 5x5 grid for the weekly challenge.
 * Same weekId always produces the same grid.
 */
export function generateWeeklyGrid(weekId: string): string[][] {
  const rng = mulberry32(weekIdToSeed(weekId));
  const size = 5;
  const grid: string[][] = [];

  for (let r = 0; r < size; r++) {
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      const idx = Math.floor(rng() * ENGLISH_LETTERS.length);
      row.push(ENGLISH_LETTERS[idx]);
    }
    grid.push(row);
  }

  return grid;
}

/**
 * Weekly challenge config — fixed for all players.
 */
export interface WeeklyChallengeConfig {
  weekId: string;
  grid: string[][];
  gridSize: 5;
  timerSeconds: 120;
  resetMs: number;
}

/**
 * Get the current weekly challenge config.
 */
export function getWeeklyChallengeConfig(now: Date = new Date()): WeeklyChallengeConfig {
  const weekId = getCurrentWeekId(now);
  return {
    weekId,
    grid: generateWeeklyGrid(weekId),
    gridSize: 5,
    timerSeconds: 120,
    resetMs: getTimeUntilReset(now),
  };
}

/**
 * Leaderboard entry for weekly challenge.
 */
export interface WeeklyLeaderboardEntry {
  rank: number;
  playerName: string;
  score: number;
  wordsFound: number;
  longestWord: string;
  submittedAt: string;
}
