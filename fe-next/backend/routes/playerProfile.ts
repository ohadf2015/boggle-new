/**
 * Player Profile API Routes
 * Handles /api/player-profile/:id — public profile endpoint
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase } from '../modules/supabaseServer';
import { fetchXpByMode } from '../modules/xpByMode';
import logger from '../utils/logger';

const router: Router = express.Router();

// Public profile columns — NEVER include email, UTM, admin, tokens
const PUBLIC_PROFILE_COLUMNS = [
  'id', 'username', 'display_name', 'avatar_config',
  'country_code', 'current_level', 'total_xp', 'total_games', 'total_score',
  'total_words', 'casual_wins', 'ranked_wins', 'longest_word', 'longest_word_length',
  'achievement_counts', 'created_at', 'ranked_mmr', 'peak_mmr',
].join(', ');

interface ProfileRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_config: unknown | null;
  country_code: string | null;
  current_level: number | null;
  total_xp: number | null;
  total_games: number | null;
  total_score: number | null;
  total_words: number | null;
  casual_wins: number | null;
  ranked_wins: number | null;
  longest_word: string | null;
  longest_word_length: number | null;
  achievement_counts: Record<string, number> | null;
  created_at: string | null;
}

/**
 * Validate player ID format (UUID)
 */
function isValidUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * GET /api/player-profile/:id
 * Returns public profile data for a player by ID (UUID) or username
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id as string;

  // Reject empty, too long, or suspicious identifiers
  if (!id || id.length > 100 || /[<>"';]/.test(id)) {
    res.status(400).json({ error: 'INVALID_PLAYER_ID', message: 'Invalid player identifier' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not available' });
    return;
  }

  try {
    // Look up by UUID if valid, otherwise by username
    const isUuid = isValidUuid(id);
    const query = supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq(isUuid ? 'id' : 'username', id)
      .single();

    const { data: profileRaw, error } = await query;
    const profile = profileRaw as ProfileRow | null;

    if (error || !profile) {
      res.status(404).json({ error: 'PLAYER_NOT_FOUND', message: 'Player not found' });
      return;
    }

    // Compute percentile: count players with higher scores
    const { count: higherCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gt('total_score', profile.total_score || 0);

    const { count: totalPlayers } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('total_games', 1);

    const rank = (higherCount || 0) + 1;
    const total = totalPlayers || 1;
    const percentile = Math.max(1, Math.round((rank / total) * 100));

    // Compute win rate
    const totalGames = profile.total_games || 0;
    const totalWins = (profile.casual_wins || 0) + (profile.ranked_wins || 0);
    const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

    // Format member since as month/year only
    const createdAt = profile.created_at ? new Date(profile.created_at) : new Date();
    const memberSince = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;

    // Estimated XP split across game modes (never throws → [] on any issue)
    const xpByMode = await fetchXpByMode(supabase, profile.id, profile.total_xp || 0);

    const publicProfile = {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name || profile.username,
      customAvatar: profile.avatar_config || null,
      countryCode: profile.country_code || null,
      currentLevel: profile.current_level || 1,
      totalXp: profile.total_xp || 0,
      totalGames,
      totalScore: profile.total_score || 0,
      totalWords: profile.total_words || 0,
      winRate,
      longestWord: profile.longest_word || null,
      longestWordLength: profile.longest_word_length || 0,
      achievementCounts: profile.achievement_counts || {},
      memberSince,
      percentile,
      rankedMmr: (profile as any).ranked_mmr ?? 1000,
      peakMmr: (profile as any).peak_mmr ?? 1000,
      xpByMode,
    };

    res.json(publicProfile);
  } catch (err) {
    logger.error('PLAYER_PROFILE', `Error fetching profile for ${id}`, err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch profile' });
  }
});

export default router;
