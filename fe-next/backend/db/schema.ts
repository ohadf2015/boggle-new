/**
 * Drizzle ORM schema definitions for the LexiClash database.
 * Based on Supabase migration files (001–064+).
 * This runs alongside the existing Supabase client — gradual migration.
 */
import {
  pgTable,
  text,
  integer,
  bigserial,
  timestamp,
  boolean,
  jsonb,
  uuid,
  date,
  decimal,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ── profiles (001 + 005 + 014) ─────────────────────────────────────
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // references auth.users
  username: text('username').unique().notNull(),
  displayName: text('display_name'),
  avatarEmoji: text('avatar_emoji').default('😀'),
  avatarColor: text('avatar_color').default('#6366f1'),
  profilePictureUrl: text('profile_picture_url'),
  profilePictureProvider: text('profile_picture_provider'),

  // Game statistics
  totalGames: integer('total_games').default(0),
  totalScore: integer('total_score').default(0),
  totalWords: integer('total_words').default(0),
  longestWord: text('longest_word'),
  longestWordLength: integer('longest_word_length').default(0),
  totalTimePlayed: integer('total_time_played').default(0),

  // Game type breakdown
  casualGames: integer('casual_games').default(0),
  rankedGames: integer('ranked_games').default(0),
  rankedWins: integer('ranked_wins').default(0),

  // Ranked MMR
  rankedMmr: integer('ranked_mmr').default(1000),
  peakMmr: integer('peak_mmr').default(1000),

  // Achievements
  achievementCounts: jsonb('achievement_counts').default({}),

  // XP (005 + 014)
  totalXp: integer('total_xp').default(0),
  currentLevel: integer('current_level').default(1),
  totalHintsUsed: integer('total_hints_used').default(0),
  freeHintsAvailable: integer('free_hints_available').default(3),

  // Timestamps
  lastGameAt: timestamp('last_game_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── seasons (20260426160000) ───────────────────────────────────────
export const seasons = pgTable('seasons', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  theme: text('theme').notNull(),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── leaderboard (001 + 005 + 20260426160000 composite UNIQUE) ──────
// Real PK is on `id` (uuid auto-gen). Player×season uniqueness is
// enforced by the composite UNIQUE constraint added in the seasons
// infrastructure migration.
export const leaderboard = pgTable(
  'leaderboard',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    seasonId: integer('season_id')
      .notNull()
      .default(1)
      .references(() => seasons.id),
    username: text('username').notNull(),
    displayName: text('display_name'),
    avatarEmoji: text('avatar_emoji'),
    avatarColor: text('avatar_color'),
    totalScore: integer('total_score').default(0),
    gamesPlayed: integer('games_played').default(0),
    gamesWon: integer('games_won').default(0),
    rankedMmr: integer('ranked_mmr').default(1000),
    rankPosition: integer('rank_position'),
    totalXp: integer('total_xp').default(0),
    currentLevel: integer('current_level').default(1),
    lastUpdated: timestamp('last_updated', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('leaderboard_player_id_season_id_key').on(table.playerId, table.seasonId),
    index('idx_lb_season_score').on(table.seasonId, table.totalScore),
  ]
);

// ── season_leaderboards archive (20260426160000) ───────────────────
export const seasonLeaderboards = pgTable(
  'season_leaderboards',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    seasonId: integer('season_id')
      .notNull()
      .references(() => seasons.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'set null' }),
    username: text('username').notNull(),
    totalScore: integer('total_score').notNull().default(0),
    gamesPlayed: integer('games_played').notNull().default(0),
    gamesWon: integer('games_won').notNull().default(0),
    rankedMmr: integer('ranked_mmr'),
    rankPosition: integer('rank_position').notNull(),
    peakTier: text('peak_tier'),
    archivedAt: timestamp('archived_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_season_lb_player').on(table.seasonId, table.playerId),
    index('idx_season_lb_rank').on(table.seasonId, table.rankPosition),
  ]
);

// ── game_results (001) ─────────────────────────────────────────────
export const gameResults = pgTable('game_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  gameCode: text('game_code').notNull(),
  score: integer('score').default(0),
  wordCount: integer('word_count').default(0),
  longestWord: text('longest_word'),
  placement: integer('placement'),
  isRanked: boolean('is_ranked').default(false),
  language: text('language').default('en'),
  timePlayed: integer('time_played').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ── guest_tokens (001) ─────────────────────────────────────────────
export const guestTokens = pgTable('guest_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  tokenHash: text('token_hash').unique().notNull(),
  stats: jsonb('stats').default({
    games: 0,
    score: 0,
    words: 0,
    timePlayed: 0,
    achievementCounts: {},
  }),
  claimedBy: uuid('claimed_by').references(() => profiles.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── ranked_progress (001) ──────────────────────────────────────────
export const rankedProgress = pgTable('ranked_progress', {
  playerId: uuid('player_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  casualGamesPlayed: integer('casual_games_played').default(0),
  unlockedAt: timestamp('unlocked_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── player_engagement (014) ────────────────────────────────────────
export const playerEngagement = pgTable('player_engagement', {
  playerId: uuid('player_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastLoginDate: date('last_login_date'),
  streakProtectedUntil: date('streak_protected_until'),
  streakFreezesAvailable: integer('streak_freezes_available').default(0),
  calendarMonth: integer('calendar_month'),
  calendarYear: integer('calendar_year'),
  calendarDaysClaimed: jsonb('calendar_days_claimed').default([]),
  lastPlayedAt: timestamp('last_played_at', { withTimezone: true }),
  comebackBonusClaimed: boolean('comeback_bonus_claimed').default(false),
  comebackBonusExpiresAt: timestamp('comeback_bonus_expires_at', {
    withTimezone: true,
  }),
  comebackXpMultiplier: decimal('comeback_xp_multiplier', {
    precision: 3,
    scale: 2,
  }).default('1.0'),
  totalSessions: integer('total_sessions').default(0),
  avgSessionLength: integer('avg_session_length').default(0),
  gamesToday: integer('games_today').default(0),
  lastSessionDate: date('last_session_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── daily_challenges (014) ─────────────────────────────────────────
export const dailyChallenges = pgTable(
  'daily_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    challengeDate: date('challenge_date').notNull(),
    challengeType: text('challenge_type').notNull(),
    challengeTier: text('challenge_tier').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    targetValue: integer('target_value').notNull(),
    currentValue: integer('current_value').default(0),
    xpReward: integer('xp_reward').notNull(),
    bonusReward: jsonb('bonus_reward'),
    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    claimed: boolean('claimed').default(false),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_daily_challenge_player_date_type').on(
      table.playerId,
      table.challengeDate,
      table.challengeType
    ),
  ]
);

// ── weekly_quests (014) ────────────────────────────────────────────
export const weeklyQuests = pgTable(
  'weekly_quests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    weekStart: date('week_start').notNull(),
    questType: text('quest_type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    requirements: jsonb('requirements').notNull(),
    currentProgress: jsonb('current_progress').default({}),
    xpReward: integer('xp_reward').notNull(),
    bonusRewards: jsonb('bonus_rewards'),
    completed: boolean('completed').default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    claimed: boolean('claimed').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_weekly_quest_player_week_type').on(
      table.playerId,
      table.weekStart,
      table.questType
    ),
  ]
);

// ── daily_puzzles (015) ────────────────────────────────────────────
export const dailyPuzzles = pgTable('daily_puzzles', {
  id: uuid('id').primaryKey().defaultRandom(),
  puzzleNumber: integer('puzzle_number').unique().notNull(),
  puzzleDate: date('puzzle_date').unique().notNull(),
  language: text('language').notNull().default('en'),
  gridSeed: text('grid_seed').notNull(),
  totalAttempts: integer('total_attempts').default(0),
  totalCompletions: integer('total_completions').default(0),
  averageScore: decimal('average_score', { precision: 8, scale: 2 }).default(
    '0'
  ),
  averageWords: decimal('average_words', { precision: 6, scale: 2 }).default(
    '0'
  ),
  topScore: integer('top_score').default(0),
  topWordCount: integer('top_word_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── daily_puzzle_attempts (015) ────────────────────────────────────
export const dailyPuzzleAttempts = pgTable('daily_puzzle_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id').references(() => profiles.id, {
    onDelete: 'cascade',
  }),
  guestFingerprint: text('guest_fingerprint'),
  puzzleDate: date('puzzle_date').notNull(),
  puzzleNumber: integer('puzzle_number').notNull(),
  language: text('language').notNull().default('en'),
  score: integer('score').notNull(),
  wordCount: integer('word_count').notNull(),
  wordsByLength: jsonb('words_by_length').default({}),
  timeSeconds: integer('time_seconds'),
  longestWord: text('longest_word'),
  longestWordLength: integer('longest_word_length'),
  shared: boolean('shared').default(false),
  shareMethod: text('share_method'),
  sharedAt: timestamp('shared_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow(),
});

// ── daily_puzzle_streaks (015) ─────────────────────────────────────
export const dailyPuzzleStreaks = pgTable('daily_puzzle_streaks', {
  playerId: uuid('player_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastPlayedDate: date('last_played_date'),
  totalDailiesCompleted: integer('total_dailies_completed').default(0),
  totalScore: integer('total_score').default(0),
  averageScore: decimal('average_score', { precision: 8, scale: 2 }).default(
    '0'
  ),
  bestScore: integer('best_score').default(0),
  bestScorePuzzleNumber: integer('best_score_puzzle_number'),
  bestWordCount: integer('best_word_count').default(0),
  milestonesReached: jsonb('milestones_reached').default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── player_progression (049 + gold upgrades) ───────────────────────
export const playerProgression = pgTable('player_progression', {
  userId: uuid('user_id').primaryKey(), // references auth.users
  playerLevel: integer('player_level').default(1),
  xp: integer('xp').default(0),
  currentWorld: integer('current_world').default(1),
  currentLevel: integer('current_level').default(1),
  totalStars: integer('total_stars').default(0),
  gold: integer('gold').default(0),
  upgrades: jsonb('upgrades').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ── level_completions (049) ────────────────────────────────────────
export const levelCompletions = pgTable(
  'level_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // references auth.users
    world: integer('world').notNull(),
    level: integer('level').notNull(),
    stars: integer('stars').default(0),
    bestScore: integer('best_score').default(0),
    bestWords: integer('best_words').default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_level_completion_user_world_level').on(
      table.userId,
      table.world,
      table.level
    ),
  ]
);

// ── mystery_rewards_log (014) ──────────────────────────────────────
export const mysteryRewardsLog = pgTable('mystery_rewards_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  playerId: uuid('player_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  gameCode: text('game_code'),
  triggerType: text('trigger_type').notNull(),
  rewardType: text('reward_type').notNull(),
  rewardValue: text('reward_value').notNull(),
  awardedAt: timestamp('awarded_at', { withTimezone: true }).defaultNow(),
});
