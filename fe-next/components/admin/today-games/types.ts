// Player profile from database
export interface GameProfile {
  username: string;
  display_name: string | null;
  avatar_emoji: string | null;
  avatar_color: string | null;
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
  profiles: GameProfile | null;
  drill_type?: string;
  drill_level?: number;
}

// API response structure
export interface GamesResponse {
  success: boolean;
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
  };
}

// Component props
export interface TodayGamesHistoryProps {
  authToken: string;
}

// Filter and sort types
export type GameTypeFilter = 'all' | 'multiplayer' | 'word_hunt' | 'daily_challenge' | 'drill';
export type SortField = 'created_at' | 'score' | 'word_count' | 'time_played';
export type SortOrder = 'asc' | 'desc';

// Stats calculated from breakdown
export interface GamesStats {
  total: number;
  multiplayer: number;
  wordHunt: number;
  daily: number;
  drills: number;
}
