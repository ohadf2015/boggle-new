// Player profile from database
export interface GameProfile {
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
  avatar_config?: import('@/shared/types/customAvatar').CustomAvatarConfig | null;
}

// Unified game data structure
export interface UnifiedGame {
  id: string;
  player_id: string | null;
  guest_session_id: string | null;
  game_code: string;
  score: number;
  word_count: number;
  longest_word: string | null;
  placement: number | null;
  is_ranked: boolean;
  is_guest: boolean;
  mode: string;
  language: string;
  time_played: number;
  created_at: string;
  completed_at?: string | null;
  profiles: GameProfile | null;
  drill_type?: string;
  drill_level?: number;
  // Guest / acquisition metadata (only populated for guests)
  difficulty?: string | null;
  device_type?: string | null;
  browser?: string | null;
  country?: string | null;
  referrer_source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  is_first_game?: boolean;
  player_count?: number | null;
  tokens_earned?: number;
  tokens_spent?: number;
  clues_used?: number;
  life_gained?: number;
  guest_first_visit_at?: string | null;
  guest_last_visit_at?: string | null;
  // Source of the row — lets the UI distinguish the comprehensive analytics feed
  // (includes non-registered players) from the per-product result tables.
  source?: 'analytics' | 'game_results' | 'game_sessions' | 'word_hunt' | 'daily_challenge' | 'drill' | 'blast' | 'word_wheel' | 'practice';
  // Multiplayer detail (populated for analytics-source MP rounds)
  is_multiplayer?: boolean;
  is_winner?: boolean | null;
  role?: string | null;
  bot_count?: number | null;
  os?: string | null;
  user_agent?: string | null;
  guest_name?: string | null;
  game_mode?: string | null;
  // Raw analytics event type (game_started | game_completed | game_abandoned) —
  // needed to merge a player's lifecycle events and derive game status.
  event_type?: string;
  // Runtime platform stamped on the event: 'web' | 'ios' | 'android' (forward-only).
  platform?: string | null;
  // Error/abandon reason captured at game end (forward-only).
  error_reason?: string | null;
}

export type GameLogSource = 'analytics' | 'tables';

export interface ModeBreakdownEntry {
  key: string;
  labelKey: string;
  label: string;
  count: number;
}

// API response structure
export interface GamesResponse {
  success: boolean;
  source?: GameLogSource;
  modeBreakdown?: ModeBreakdownEntry[];
  /** Present when source='analytics': one entry per GAME (players grouped). */
  grouped?: boolean;
  gameGroups?: import('@/lib/admin/gameLog/groupGames').GameGroup[];
  /** Raw gameMode values seen with no type bucket (gap guard for admins). */
  unbucketedModes?: string[];
  /** True when the analytics fetch hit its row cap — narrow the date range. */
  truncated?: boolean;
  /** Legacy per-row feed (still used by source='tables'). */
  games: UnifiedGame[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  breakdown: {
    authenticatedGames: number;
    guestGames: number;
    wordHuntGames: number;
    dailyChallengeGames: number;
    drillGames: number;
    blastGames: number;
    wordWheelGames: number;
    practiceGames: number;
  };
}

// Component props
export interface TodayGamesHistoryProps {
  authToken: string;
}

// Filter and sort types
export type GameTypeFilter =
  | 'all'
  | 'multiplayer'
  | 'word_hunt'
  | 'daily_challenge'
  | 'drill'
  | 'blast'
  | 'word_wheel'
  | 'practice';
export type SortField = 'created_at' | 'score' | 'word_count' | 'time_played';
export type SortOrder = 'asc' | 'desc';

// Stats calculated from breakdown
export interface GamesStats {
  total: number;
  multiplayer: number;
  wordHunt: number;
  daily: number;
  drills: number;
  blast: number;
  wordWheel: number;
  practice: number;
}
