export type AchievementCategory =
  | 'gameplay'
  | 'career'
  | 'wordFeat'
  | 'rivalry'
  | 'records'
  | 'social'
  | 'progression'
  | 'daily';

export interface ProgressionAchievementDef {
  icon: string;
  category: AchievementCategory;
  /** True when a live event already grants it; false = defined, grantable later. */
  wired: boolean;
}

export const PROGRESSION_ACHIEVEMENTS: Record<string, ProgressionAchievementDef> = {
  RIVALRY_FIRST_WIN: { icon: '⚔️', category: 'rivalry', wired: true },
  RIVALRY_5_WINS: { icon: '🗡️', category: 'rivalry', wired: true },
  RIVALRY_25_WINS: { icon: '😈', category: 'rivalry', wired: true },
  PING_FIRST: { icon: '📣', category: 'rivalry', wired: true },
  PING_25: { icon: '📢', category: 'rivalry', wired: true },
  REMATCH_10: { icon: '🔁', category: 'rivalry', wired: true },

  RECORD_FIRST: { icon: '📈', category: 'records', wired: true },
  RECORD_10: { icon: '🚀', category: 'records', wired: true },
  WORLD_RECORD: { icon: '🌍', category: 'records', wired: true },

  FIRST_FRIEND: { icon: '🤝', category: 'social', wired: true },
  FRIENDS_5: { icon: '👯', category: 'social', wired: true },

  LEVEL_5: { icon: '🌱', category: 'progression', wired: true },
  LEVEL_10: { icon: '🌿', category: 'progression', wired: true },
  LEVEL_25: { icon: '🌳', category: 'progression', wired: true },
  LEVEL_50: { icon: '🏔️', category: 'progression', wired: true },
  LEVEL_75: { icon: '🌋', category: 'progression', wired: true },
  LEVEL_100: { icon: '🌠', category: 'progression', wired: true },
  TITLE_PICKED: { icon: '🏷️', category: 'progression', wired: true },

  DAILY_TOP3: { icon: '🥉', category: 'daily', wired: true },
  DAILY_BOARD_STREAK_7: { icon: '📅', category: 'daily', wired: true },
  DAILY_BOARD_STREAK_30: { icon: '🗓️', category: 'daily', wired: true },
};

/** Achievements that unlock a pickable title, keyed by achievement. */
export const ACHIEVEMENT_TITLE_REWARDS: Record<string, string> = {
  RIVALRY_25_WINS: 'NEMESIS',
  RECORD_10: 'RECORD_BREAKER',
  FRIENDS_5: 'SOCIAL_BUTTERFLY',
  DAILY_BOARD_STREAK_30: 'DAILY_REGULAR',
};

export const PROGRESSION_ACHIEVEMENT_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(PROGRESSION_ACHIEVEMENTS).map(([k, d]) => [k, d.icon]),
);

const LEVEL_MILESTONES: ReadonlyArray<[number, string]> = [
  [5, 'LEVEL_5'],
  [10, 'LEVEL_10'],
  [25, 'LEVEL_25'],
  [50, 'LEVEL_50'],
  [75, 'LEVEL_75'],
  [100, 'LEVEL_100'],
];

const CAREER_KEYS = [
  'VETERAN', 'CENTURION', 'WORD_COLLECTOR', 'WORD_HOARDER', 'CHAMPION', 'LEGEND',
  'POINT_MASTER', 'POINT_KING', 'DEDICATION', 'LOYAL_PLAYER', 'FIRST_GAME_WIN',
];
const WORD_FEAT_KEYS = ['CONSONANT_CULT', 'VOWEL_HOARDER', 'ROGUE_Q', 'LEVIATHAN', 'NO_REPEATS', 'PALINDROME_HUNTER'];

export function categoryFor(key: string): AchievementCategory {
  const def = PROGRESSION_ACHIEVEMENTS[key];
  if (def) return def.category;
  if (CAREER_KEYS.includes(key)) return 'career';
  if (WORD_FEAT_KEYS.includes(key)) return 'wordFeat';
  return 'gameplay';
}

export interface ProgressionStats {
  currentLevel?: number;
}

/** New progression achievement keys earned by these stats, skipping ones already held. */
export function progressionAchievementsFor(stats: ProgressionStats, existing: ReadonlySet<string>): string[] {
  const level = stats.currentLevel ?? 0;
  return LEVEL_MILESTONES.filter(([min, key]) => level >= min && !existing.has(key)).map(([, key]) => key);
}

export type CountLadder = ReadonlyArray<readonly [number, string]>;

/** Count-based achievements: [threshold, key], ascending. */
export const COUNT_LADDERS = {
  rivalWins: [[1, 'RIVALRY_FIRST_WIN'], [5, 'RIVALRY_5_WINS'], [25, 'RIVALRY_25_WINS']],
  pings: [[1, 'PING_FIRST'], [25, 'PING_25']],
  rematches: [[10, 'REMATCH_10']],
  records: [[1, 'RECORD_FIRST'], [10, 'RECORD_10']],
  friends: [[1, 'FIRST_FRIEND'], [5, 'FRIENDS_5']],
  dailyBoardStreak: [[7, 'DAILY_BOARD_STREAK_7'], [30, 'DAILY_BOARD_STREAK_30']],
} as const satisfies Record<string, CountLadder>;

export function achievementsForCount(ladder: CountLadder, count: number): string[] {
  return ladder.filter(([min]) => count >= min).map(([, key]) => key);
}
