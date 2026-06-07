/**
 * Play Games Services resource IDs
 *
 * Real IDs of the Draft leaderboards + achievements created in Play Console
 * (project 921426916910). The bridge (`utils/nativePGS.ts`) takes IDs as
 * arguments and has none hardcoded; this is the single source of truth that
 * callers import. Override per-environment via NEXT_PUBLIC_* if the IDs ever
 * change (e.g. a fresh project), else these Draft defaults are used.
 *
 * NOTE: these are Draft and "available to testers" only until the PGS project
 * is published. Incremental achievements (Word Smith=500 steps,
 * Daily Devotee=30 steps) are advanced via `incrementAchievement`.
 */

const env = (key: string, fallback: string): string =>
  (process.env[key] && String(process.env[key])) || fallback;

export const PLAY_GAMES_LEADERBOARDS = {
  allTimeScore: env('NEXT_PUBLIC_PGS_LB_ALL_TIME', 'CgkIruzLyugaEAIQAg'),
  dailyChallenge: env('NEXT_PUBLIC_PGS_LB_DAILY', 'CgkIruzLyugaEAIQAw'),
} as const;

export const PLAY_GAMES_ACHIEVEMENTS = {
  firstWord: env('NEXT_PUBLIC_PGS_ACH_FIRST_WORD', 'CgkIruzLyugaEAIQBA'),
  firstVictory: env('NEXT_PUBLIC_PGS_ACH_FIRST_VICTORY', 'CgkIruzLyugaEAIQBQ'),
  onARoll: env('NEXT_PUBLIC_PGS_ACH_ON_A_ROLL', 'CgkIruzLyugaEAIQBg'),
  polyglot: env('NEXT_PUBLIC_PGS_ACH_POLYGLOT', 'CgkIruzLyugaEAIQBw'),
  wordSmith: env('NEXT_PUBLIC_PGS_ACH_WORD_SMITH', 'CgkIruzLyugaEAIQCA'),
  dailyDevotee: env('NEXT_PUBLIC_PGS_ACH_DAILY_DEVOTEE', 'CgkIruzLyugaEAIQCQ'),
} as const;

/** Incremental achievements: total steps needed to unlock (mirrors Console config). */
export const PLAY_GAMES_INCREMENTAL_STEPS = {
  wordSmith: 500,
  dailyDevotee: 30,
} as const;

export type PlayGamesLeaderboardKey = keyof typeof PLAY_GAMES_LEADERBOARDS;
export type PlayGamesAchievementKey = keyof typeof PLAY_GAMES_ACHIEVEMENTS;
