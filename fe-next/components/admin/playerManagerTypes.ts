import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/** A player row as returned by GET /api/admin/players. */
export interface Player {
  id: string;
  username: string;
  display_name: string;
  avatar_emoji: string;
  avatar_color: string;
  avatar_config?: CustomAvatarConfig | null;
  total_games: number;
  total_score: number;
  ranked_mmr: number;
  casual_games: number;
  ranked_games: number;
  last_game_at: string;
  created_at: string;
  blast_access?: boolean;
  user_role?: string;
  is_admin?: boolean;
  /** Music/theme personalization the player picked; `null` = never chose. */
  player_style?: string | null;
}

/**
 * An active curator assignment for a player, as returned by
 * GET /api/admin/curators (one row per language). Used to show + manage a
 * player's curator status inline on the players page.
 */
export interface CuratorAssignmentRow {
  curator_id: string;
  language: string;
  trust_tier: number;
  curator_points: number;
}
