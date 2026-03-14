/**
 * Player Profile API Routes
 * Handles /api/player/:username — public profile endpoint
 */

import express, { Request, Response, Router } from 'express';
const { getSupabase } = require('../modules/supabaseServer');
const logger = require('../utils/logger');

const router: Router = express.Router();

// Public profile columns — NEVER include email, UTM, admin, tokens
const PUBLIC_PROFILE_COLUMNS = [
  'id', 'username', 'display_name', 'avatar_config', 'profile_picture_url',
  'country_code', 'current_level', 'total_xp', 'total_games', 'total_score',
  'total_words', 'casual_wins', 'ranked_wins', 'longest_word', 'longest_word_length',
  'achievement_counts', 'created_at',
].join(', ');

/**
 * Validate username format
 */
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_\u0590-\u05FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u00C0-\u024F]{2,30}$/.test(username);
}

/**
 * GET /api/player/:username
 * Returns public profile data for a player
 */
router.get('/:username', async (req: Request, res: Response): Promise<void> => {
  const { username } = req.params;

  // Validate username
  if (!username || !isValidUsername(username)) {
    res.status(400).json({ error: 'INVALID_USERNAME', message: 'Invalid username format' });
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not available' });
    return;
  }

  try {
    // Fetch profile by username
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(PUBLIC_PROFILE_COLUMNS)
      .eq('username', username)
      .single();

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

    const publicProfile = {
      username: profile.username,
      displayName: profile.display_name || profile.username,
      customAvatar: profile.avatar_config || null,
      profilePictureUrl: profile.profile_picture_url || null,
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
    };

    res.json(publicProfile);
  } catch (err) {
    logger.error('PLAYER_PROFILE', `Error fetching profile for ${username}`, err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch profile' });
  }
});

export default router;
