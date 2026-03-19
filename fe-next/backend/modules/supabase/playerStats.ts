/**
 * Player Stats Module
 * Profile stats updates, XP calculation, and level management
 */

import { getSupabase, GameStats, XpInfo, UpdatedUserStats } from './client';
import { calculateGameXp, getLevelFromXp, checkLevelUp, getTitleForLevel } from '../xpManager';
import { addXpToLeague } from '../leagueManager';
import logger from '../../utils/logger';

// Lazy import to avoid circular dependency with botManager
let _generateRandomPlayerName: ((existingUsernames: string[], language: string) => { name: string; avatar: { emoji: string; color: string } }) | null = null;
function getRandomPlayerNameGenerator() {
  if (!_generateRandomPlayerName) {
    _generateRandomPlayerName = require('../botManager').generateRandomPlayerName;
  }
  return _generateRandomPlayerName;
}

/**
 * Ensure a player profile exists in the database.
 * Creates a minimal profile if one doesn't exist.
 * This is needed before recording game results due to FK constraint.
 *
 * @returns true if profile exists (or was created), false on error
 */
export async function ensureProfileExists(playerId: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  // Check if profile exists
  const { data: existingProfile, error: fetchError } = await client
    .from('profiles')
    .select('id')
    .eq('id', playerId)
    .single();

  if (existingProfile) {
    return true; // Profile already exists
  }

  // If error is "not found", create the profile
  if (fetchError?.code === 'PGRST116') {
    logger.info('SUPABASE', `Profile not found for ${playerId}, creating minimal profile for FK constraint`);

    // Fetch auth user metadata to get their name from OAuth provider
    const { data: authUser } = await client.auth.admin.getUserById(playerId);
    const userMetadata = authUser?.user?.user_metadata;

    // Extract first name from OAuth metadata
    const oauthFullName = userMetadata?.full_name || userMetadata?.name;
    const getFirstName = (fullName: string): string => {
      if (!fullName) return '';
      const firstName = fullName.split(' ')[0];
      if (/^[A-Z]+$/.test(firstName)) {
        return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
      }
      return firstName;
    };
    const oauthFirstName = oauthFullName ? getFirstName(oauthFullName) : null;

    let username: string;
    let displayName: string;
    let avatarEmoji: string;
    let avatarColor: string;

    if (oauthFirstName) {
      username = oauthFirstName;
      displayName = oauthFirstName;
      const genericAvatars = [
        { emoji: '😊', color: '#4F46E5' },
        { emoji: '🎮', color: '#059669' },
        { emoji: '⭐', color: '#D97706' },
        { emoji: '🎯', color: '#DC2626' },
        { emoji: '🏆', color: '#7C3AED' },
      ];
      const randomAvatar = genericAvatars[Math.floor(Math.random() * genericAvatars.length)];
      avatarEmoji = randomAvatar.emoji;
      avatarColor = randomAvatar.color;
    } else {
      const generateRandomPlayerName = getRandomPlayerNameGenerator();
      const randomPlayerData = generateRandomPlayerName!([], 'en');
      username = randomPlayerData.name;
      displayName = randomPlayerData.name;
      avatarEmoji = randomPlayerData.avatar.emoji;
      avatarColor = randomPlayerData.avatar.color;
    }

    // Try to create the profile - handle username uniqueness constraint
    let createAttempts = 0;
    const maxAttempts = 3;

    while (createAttempts < maxAttempts) {
      const { error: createError } = await client
        .from('profiles')
        .insert({
          id: playerId,
          username: createAttempts === 0 ? username : `${username}${Math.floor(Math.random() * 10000)}`,
          display_name: displayName,
          avatar_emoji: avatarEmoji,
          avatar_color: avatarColor
        });

      if (!createError) {
        logger.info('SUPABASE', `Created minimal profile for ${playerId}`);
        return true;
      }

      // Check if it's a unique constraint violation on username
      if (createError.code === '23505' && createError.message?.includes('username')) {
        createAttempts++;
        logger.warn('SUPABASE', `Username collision, retrying with suffix (attempt ${createAttempts}/${maxAttempts})`);
        continue;
      }

      logger.error('SUPABASE', `Failed to create profile for ${playerId}`, createError.message);
      return false;
    }

    logger.error('SUPABASE', `Failed to create profile after ${maxAttempts} attempts for ${playerId}`);
    return false;
  }

  // Some other error occurred
  logger.error('SUPABASE', `Error checking profile for ${playerId}`, fetchError?.message);
  return false;
}

/**
 * Update player profile stats after a game
 */
export async function updatePlayerStats(
  playerId: string,
  gameStats: GameStats
): Promise<{ data: unknown; error: { message: string } | null; xpInfo?: XpInfo; updatedStats?: UpdatedUserStats }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // First, get current profile (only fields needed for stats update)
  let { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('id, username, avatar_emoji, avatar_color, total_games, total_score, total_words, casual_games, ranked_games, ranked_wins, casual_wins, ranked_mmr, peak_mmr, longest_word, longest_word_length, total_time_played, total_xp, current_level, player_title, last_game_at, achievement_counts, unique_days_played')
    .eq('id', playerId)
    .single();

  if (fetchError) {
    // Check if the error is "not found" - user authenticated but hasn't set up profile yet
    if (fetchError.code === 'PGRST116') {
      logger.info('SUPABASE', `Profile not found for ${playerId}, creating minimal profile for stats tracking`);

      // Create a minimal profile so we can track stats
      let username: string;
      let displayName: string;
      let avatarEmoji: string;
      let avatarColor: string;

      // Fetch auth user metadata to get their name from OAuth provider
      const { data: authUser } = await client.auth.admin.getUserById(playerId);
      const userMetadata = authUser?.user?.user_metadata;

      // Extract first name from OAuth metadata (full_name or name field)
      const oauthFullName = userMetadata?.full_name || userMetadata?.name;
      const getFirstName = (fullName: string): string => {
        if (!fullName) return '';
        const firstName = fullName.split(' ')[0];
        // Capitalize first letter, lowercase rest for Latin chars
        if (/^[A-Z]+$/.test(firstName)) {
          return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        }
        return firstName;
      };
      const oauthFirstName = oauthFullName ? getFirstName(oauthFullName) : null;

      if (oauthFirstName) {
        username = oauthFirstName;
        displayName = oauthFirstName;
        const genericAvatars = [
          { emoji: '😊', color: '#4F46E5' },
          { emoji: '🎮', color: '#059669' },
          { emoji: '⭐', color: '#D97706' },
          { emoji: '🎯', color: '#DC2626' },
          { emoji: '🏆', color: '#7C3AED' },
        ];
        const randomAvatar = genericAvatars[Math.floor(Math.random() * genericAvatars.length)];
        avatarEmoji = randomAvatar.emoji;
        avatarColor = randomAvatar.color;
        logger.info('SUPABASE', `Using OAuth first name for profile: ${oauthFirstName}`);
      } else {
        const generateRandomPlayerName = getRandomPlayerNameGenerator();
        const randomPlayerData = generateRandomPlayerName!([], 'en');
        username = randomPlayerData.name;
        displayName = randomPlayerData.name;
        avatarEmoji = randomPlayerData.avatar.emoji;
        avatarColor = randomPlayerData.avatar.color;
      }

      const { data: newProfile, error: createError } = await client
        .from('profiles')
        .insert({
          id: playerId,
          username,
          display_name: displayName,
          avatar_emoji: avatarEmoji,
          avatar_color: avatarColor
        })
        .select()
        .single();

      if (createError) {
        logger.error('SUPABASE', `Failed to create profile for ${playerId}`, createError.message);
        return { data: null, error: createError };
      }

      profile = newProfile;
      logger.debug('SUPABASE', `Created minimal profile for ${playerId}`);
    } else {
      logger.error('SUPABASE', `Failed to fetch profile for ${playerId}`, fetchError.message);
      return { data: null, error: fetchError };
    }
  }

  // Safety check - profile should always exist at this point
  if (!profile) {
    return { data: null, error: { message: 'Profile not available' } };
  }

  // Calculate updated stats
  const updates: Record<string, unknown> = {
    total_games: (profile.total_games || 0) + 1,
    total_score: (profile.total_score || 0) + (gameStats.score || 0),
    total_words: (profile.total_words || 0) + (gameStats.wordCount || 0),
    total_time_played: (profile.total_time_played || 0) + (gameStats.timePlayed || 0),
    last_game_at: new Date().toISOString()
  };

  // Update casual/ranked game counts
  if (gameStats.isRanked) {
    updates.ranked_games = (profile.ranked_games || 0) + 1;
  } else {
    updates.casual_games = (profile.casual_games || 0) + 1;
  }

  // Count wins - both casual and ranked
  // Only count as win if placement === 1 AND more than 1 player (no solo wins)
  if (gameStats.placement === 1 && (gameStats.totalPlayers || 0) > 1) {
    if (gameStats.isRanked) {
      updates.ranked_wins = (profile.ranked_wins || 0) + 1;
    } else {
      updates.casual_wins = (profile.casual_wins || 0) + 1;
    }
  }

  // Track unique days played (for DEDICATION and LOYAL_PLAYER achievements)
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastGameDate = profile.last_game_at
    ? new Date(profile.last_game_at).toISOString().split('T')[0]
    : null;

  if (lastGameDate !== today) {
    updates.unique_days_played = (profile.unique_days_played || 0) + 1;
    logger.debug('SUPABASE', `Player ${playerId} played on a new day: ${today} (total: ${updates.unique_days_played})`);
  }

  // Update longest word if this game had a longer one
  if (gameStats.longestWord) {
    const currentLongest = profile.longest_word_length || 0;
    if (gameStats.longestWord.length > currentLongest) {
      updates.longest_word = gameStats.longestWord;
      updates.longest_word_length = gameStats.longestWord.length;
    }
  }

  // Update achievement counts
  if (gameStats.achievements && gameStats.achievements.length > 0) {
    const currentCounts = profile.achievement_counts || {};
    for (const achievement of gameStats.achievements) {
      currentCounts[achievement] = (currentCounts[achievement] || 0) + 1;
    }
    updates.achievement_counts = currentCounts;
  }

  // Calculate XP earned this game
  const isWinner = gameStats.placement === 1 && (gameStats.totalPlayers || 0) > 1;
  const achievementCount = gameStats.achievements?.length || 0;
  const xpResult = calculateGameXp({
    score: gameStats.score || 0,
    isWinner,
    achievementCount,
    playerCount: gameStats.totalPlayers || 1,
  });

  const oldLevel = profile.current_level || getLevelFromXp(profile.total_xp || 0);

  try {
    // First: update non-XP stats
    const { data, error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      logger.error('SUPABASE', `Failed to update profile stats for ${playerId}`, error.message);
      // CRITICAL: Don't return xpInfo/updatedStats when database save fails
      // This prevents "phantom XP" where players see XP gains that weren't persisted
      return { data: null, error };
    }

    // Then: use increment_player_xp RPC for XP update
    // This ensures prestige multiplier is applied and lifetime_xp is tracked
    let newTotalXp = (profile.total_xp || 0) + xpResult.totalXp;
    let newLevel = getLevelFromXp(newTotalXp);
    let actualXpGranted = xpResult.totalXp;

    if (xpResult.totalXp > 0) {
      const { data: xpData, error: xpError } = await client
        .rpc('increment_player_xp', {
          p_player_id: playerId,
          p_xp_amount: xpResult.totalXp,
        });

      if (xpError) {
        logger.error('SUPABASE', `Failed to increment XP for ${playerId}`, xpError.message);
        // Stats were saved but XP wasn't — log but don't fail the whole operation
      } else if (xpData && xpData.length > 0) {
        const xpRow = xpData[0];
        newTotalXp = Number(xpRow.new_total_xp);
        newLevel = xpRow.new_level;
        actualXpGranted = xpRow.xp_granted;
      }

      // Feed XP into the player's weekly league (fire-and-forget)
      addXpToLeague(playerId, actualXpGranted).catch((err) => {
        logger.warn('LEAGUE', `Failed to add league XP for ${playerId}`, err?.message);
      });
    }

    // Check for level up and update title if needed
    const levelUpInfo = checkLevelUp(oldLevel, newLevel);
    if (levelUpInfo.leveledUp) {
      logger.info('XP', `Player ${playerId} leveled up! ${oldLevel} -> ${newLevel}`);
      const newTitle = getTitleForLevel(newLevel);
      if (newTitle && newTitle !== profile.player_title) {
        await client
          .from('profiles')
          .update({ player_title: newTitle })
          .eq('id', playerId);
      }
    }

    // Calculate updated stats for socket emission (only when save succeeded)
    const updatedStats = {
      gamesPlayed: updates.total_games as number,
      gamesWon: ((updates.ranked_wins as number | undefined) || (profile.ranked_wins || 0)) +
                ((updates.casual_wins as number | undefined) || (profile.casual_wins || 0)),
      totalWordsFound: updates.total_words as number,
      totalScore: updates.total_score as number,
      uniqueDaysPlayed: (updates.unique_days_played as number | undefined) || (profile.unique_days_played || 0),
    };

    // Return XP info only when database update succeeded
    return {
      data,
      error: null,
      xpInfo: {
        xpEarned: actualXpGranted,
        xpBreakdown: xpResult.breakdown,
        newTotalXp,
        oldLevel,
        newLevel,
        leveledUp: levelUpInfo.leveledUp,
        levelsGained: levelUpInfo.levelsGained,
        newTitles: levelUpInfo.newTitles,
      },
      updatedStats: updatedStats
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error during profile update';
    logger.error('SUPABASE', `Unexpected error updating profile for ${playerId}`, err);
    return { data: null, error: { message: errorMessage } };
  }
}

// CommonJS exports for backward compatibility
module.exports = {
  updatePlayerStats,
  ensureProfileExists,
};
