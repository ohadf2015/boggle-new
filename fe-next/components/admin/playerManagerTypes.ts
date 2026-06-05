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
}
