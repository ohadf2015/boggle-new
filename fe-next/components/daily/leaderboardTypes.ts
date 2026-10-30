import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { DailyModeId } from '@/lib/dailyModes';

export interface DailyParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
  profile_picture_url?: string | null;
  custom_avatar?: CustomAvatarConfig | null;
  country_code?: string | null;
  /** Language the row was played in — set on the cross-language board. */
  language?: string | null;
  score: number;
  word_count: number;
  time_seconds: number;
  completed_at: string;
  rank_position: number;
  // Word Hunt specific fields
  solved?: boolean;
  attempts_used?: number;
  efficiency_score?: number;
  words_discovered?: Array<{ word: string; timestamp: number; lifeGained: number; tokensGained: number }>;
  word_hunt_score?: number;
  word_wheel_score?: number;
  /** Combined board: opaque per-day key from the server (no raw id). */
  row_key?: string;
  /** Combined board: points per mode and which modes were played. */
  by_mode?: Record<DailyModeId, number>;
  played_modes?: DailyModeId[];
  tower_height_m?: number | null;
  /** Combined board: the server matched this row to the viewer / a friend. */
  is_you?: boolean;
  is_friend?: boolean;
}

export interface AllTimeParticipant {
  player_id: string | null;
  guest_fingerprint: string | null;
  player_identifier: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
  profile_picture_url?: string | null;
  custom_avatar?: CustomAvatarConfig | null;
  country_code?: string | null;
  total_efficiency_score: number;
  total_games: number;
  games_won: number;
  avg_attempts: number | null;
  best_efficiency: number;
  last_played_at: string;
  rank_position: number;
}

/** One player's season row, hunt + wheel folded together. */
export interface SeasonParticipant {
  player_id: string;
  player_identifier: string;
  guest_fingerprint: null;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_image?: string | null;
  profile_picture_url?: string | null;
  custom_avatar?: CustomAvatarConfig | null;
  country_code?: string | null;
  season_score: number;
  days_played: number;
  solves: number;
  languages: string[];
  last_played_at: string | null;
  rank_position: number;
  word_hunt_score: number;
  word_wheel_score: number;
}

export interface DailySeasonSummary {
  id: number;
  name: string;
  theme: string;
  startDate: string;
  endDate: string;
  status: string;
  isCurrent: boolean;
}

export type LeaderboardTab = 'today' | 'season' | 'alltime' | 'friends' | 'connections';
export type LeaderboardScope = 'combined' | 'word-hunt' | 'word-wheel';
export type LanguageScope = 'all' | 'mine';

/** The viewer, as the board knows them. */
export interface ViewerIdentity {
  playerId?: string | null;
  guestFingerprint?: string | null;
}

/**
 * The app's `t`: key plus either a fallback string or interpolation params.
 * Declared through a method signature so parameters are checked bivariantly —
 * callers hand in `t`s typed `(key) => string`, `(key, params?) => string` and
 * `(key, fallback?) => string`, all of which are the same runtime function.
 */
export type T = { bivarianceHack(key: string, fallbackOrParams?: string | Record<string, string | number>): string }['bivarianceHack'];
