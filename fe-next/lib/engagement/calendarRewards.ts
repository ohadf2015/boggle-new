/**
 * The monthly login calendar: one reward per day of the month, shared by the
 * HTTP route the app uses and the Socket.IO handler, so the two can't drift.
 *
 * Mystery boxes (days 7, 14, 21, 30) roll their contents on the server from a
 * hash of (player, date, rarity): the same claim always yields the same box,
 * and nothing the client sends can change it. Only contents the game can
 * actually credit are in the pool: XP (increment_player_xp) and streak freezes
 * (player_engagement.streak_freezes_available). Hints were dropped: nothing in
 * the game spends free_hints_available.
 */

export type CalendarRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CalendarReward {
  day: number;
  type: 'xp' | 'hints' | 'streak_freeze' | 'mystery_box' | 'exclusive_title';
  amount?: number;
  rarity?: CalendarRarity;
  titleId?: string;
  isMilestone?: boolean;
}

export const CALENDAR_REWARDS: CalendarReward[] = [
  { day: 1, type: 'xp', amount: 50 }, { day: 2, type: 'xp', amount: 75 },
  { day: 3, type: 'hints', amount: 2 }, { day: 4, type: 'xp', amount: 100 },
  { day: 5, type: 'xp', amount: 125 }, { day: 6, type: 'hints', amount: 3 },
  { day: 7, type: 'mystery_box', rarity: 'common', isMilestone: true },
  { day: 8, type: 'xp', amount: 150 }, { day: 9, type: 'xp', amount: 175 },
  { day: 10, type: 'streak_freeze', amount: 1 },
  { day: 11, type: 'xp', amount: 200 }, { day: 12, type: 'xp', amount: 225 },
  { day: 13, type: 'hints', amount: 4 },
  { day: 14, type: 'mystery_box', rarity: 'rare', isMilestone: true },
  { day: 15, type: 'xp', amount: 250 }, { day: 16, type: 'xp', amount: 275 },
  { day: 17, type: 'hints', amount: 5 }, { day: 18, type: 'xp', amount: 300 },
  { day: 19, type: 'xp', amount: 325 }, { day: 20, type: 'streak_freeze', amount: 2 },
  { day: 21, type: 'mystery_box', rarity: 'epic', isMilestone: true },
  { day: 22, type: 'xp', amount: 350 }, { day: 23, type: 'xp', amount: 375 },
  { day: 24, type: 'hints', amount: 6 }, { day: 25, type: 'xp', amount: 400 },
  { day: 26, type: 'xp', amount: 425 }, { day: 27, type: 'hints', amount: 7 },
  { day: 28, type: 'exclusive_title', titleId: 'DEDICATED_PLAYER', isMilestone: true },
  { day: 29, type: 'xp', amount: 500 },
  { day: 30, type: 'mystery_box', rarity: 'legendary', isMilestone: true },
  { day: 31, type: 'xp', amount: 750 },
];

export const MYSTERY_BOX_MULTIPLIER: Record<CalendarRarity, number> = { common: 1, rare: 2, epic: 3, legendary: 5 };

/** Equal odds for each entry (no odds are shown to players). */
export const MYSTERY_BOX_POOL = [
  { type: 'xp', base: 100 },
  { type: 'streak_freeze', base: 1 },
] as const;

export interface MysteryBoxContents {
  type: (typeof MYSTERY_BOX_POOL)[number]['type'];
  amount: number;
}

/** FNV-1a 32-bit: stable across runtimes. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The box's contents for this player on this calendar date ("YYYY-MM-DD"). */
export function rollCalendarMysteryBox(playerId: string, date: string, rarity: CalendarRarity): MysteryBoxContents {
  const entry = MYSTERY_BOX_POOL[hash32(`calendar-box|${playerId}|${date}|${rarity}`) % MYSTERY_BOX_POOL.length];
  return { type: entry.type, amount: entry.base * (MYSTERY_BOX_MULTIPLIER[rarity] ?? 1) };
}
