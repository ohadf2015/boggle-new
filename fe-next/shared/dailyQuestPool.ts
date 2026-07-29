/**
 * Daily quest pool — deterministic daily rotation across 5 modes.
 * No adventure. Slot assignment: DB columns word_hunt/adventure/community
 * map to slots 0/1/2 respectively. Which mode fills each slot is computed
 * from a date seed so frontend and backend always agree without storing config.
 */

export type DailyQuestMode =
  | 'wordHunt'
  | 'multiplayer'
  | 'brainDrills';

export const DAILY_QUEST_POOL: DailyQuestMode[] = [
  'wordHunt',
  'multiplayer',
  'brainDrills',
];

export const QUEST_MODE_HREFS: Record<DailyQuestMode, string> = {
  wordHunt: '/daily',
  multiplayer: '/multiplayer',
  brainDrills: '/brain',
};

// LCG shuffle with Murmur3 finalizer to diffuse consecutive integer seeds
// (bare LCG mod 5 with seeds ~20213 is biased — same index every day).
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  // Murmur3 finalizer — turns sequential day numbers into well-distributed states
  let s = seed >>> 0;
  s ^= s >>> 16;
  s = Math.imul(s, 0x85ebca6b) >>> 0;
  s ^= s >>> 13;
  s = Math.imul(s, 0xc2b2ae35) >>> 0;
  s ^= s >>> 16;
  if (s === 0) s = 1; // LCG must not start at 0 (fixed point mod 2^32)
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Returns today's 3 quest modes in slot order (slot 0, 1, 2).
 * Deterministic: same date string → same result on client and server.
 * Date format: 'YYYY-MM-DD'. Defaults to current UTC date.
 */
export function getDailyQuestModes(
  dateStr?: string,
): [DailyQuestMode, DailyQuestMode, DailyQuestMode] {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  // Parse as UTC midnight to avoid timezone drift across locales
  const seed = Math.floor(new Date(`${date}T00:00:00Z`).getTime() / 86_400_000);
  const shuffled = seededShuffle([...DAILY_QUEST_POOL], seed);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

/**
 * Returns the slot index (0-2) that this mode occupies today, or -1 if absent.
 * Slot 0 → word_hunt_completed, 1 → adventure_completed, 2 → community_completed.
 */
export function getSlotForMode(mode: DailyQuestMode, dateStr?: string): number {
  return getDailyQuestModes(dateStr).indexOf(mode);
}
