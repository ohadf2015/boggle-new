/**
 * Supabase Server Client
 * Backend-only Supabase client with service role key for administrative operations
 */

const { createClient } = require('@supabase/supabase-js');
const { calculateGameXp, getLevelFromXp, checkLevelUp, getTitleForLevel } = require('./xpManager');
const logger = require('../utils/logger');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS for server-side operations
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log configuration status at startup
logger.info('SUPABASE', `Configuration status: URL=${!!supabaseUrl}, ServiceKey=${!!supabaseServiceKey}`);
if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('SUPABASE', 'Supabase not fully configured (missing URL or SUPABASE_SERVICE_ROLE_KEY). Stats will not be saved to database.');
}

let supabase = null;

/**
 * Initialize Supabase client (lazy initialization)
 * Uses service role key to bypass RLS for server-side operations
 */
function getSupabase() {
  if (!supabase && supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabase;
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured() {
  return !!(supabaseUrl && supabaseServiceKey);
}

/**
 * Record a game result for a player
 * @param {object} result - Game result data
 */
async function recordGameResult(result) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await client
      .from('game_results')
      .insert({
        player_id: result.playerId,
        game_code: result.gameCode,
        score: result.score,
        word_count: result.wordCount || 0,
        longest_word: result.longestWord || null,
        placement: result.placement,
        is_ranked: result.isRanked || false,
        language: result.language || 'en',
        time_played: result.timePlayed || 0
      })
      .select()
      .single();

    if (error) {
      logger.error('SUPABASE', `Failed to record game result for ${result.playerId}`, error.message);
    }

    return { data, error };
  } catch (err) {
    logger.error('SUPABASE', 'Unexpected error recording game result', err);
    return { data: null, error: { message: err.message || 'Unexpected error recording game result' } };
  }
}

/**
 * Update player profile stats after a game
 * @param {string} playerId - Player's UUID
 * @param {object} gameStats - Stats from the game
 */
async function updatePlayerStats(playerId, gameStats) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // First, get current profile
  let { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('*')
    .eq('id', playerId)
    .single();

  if (fetchError) {
    // Check if the error is "not found" - user authenticated but hasn't set up profile yet
    if (fetchError.code === 'PGRST116') {
      logger.info('SUPABASE', `Profile not found for ${playerId}, creating minimal profile for stats tracking`);

      // Create a minimal profile so we can track stats
      // User will need to complete profile setup later to set username, avatar, etc.
      const { data: newProfile, error: createError } = await client
        .from('profiles')
        .insert({
          id: playerId,
          username: `player_${playerId.substring(0, 8)}`, // Temporary username
          display_name: 'New Player',
          avatar_emoji: '😀',
          avatar_color: '#6366f1'
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

  // Calculate updated stats
  const updates = {
    total_games: (profile.total_games || 0) + 1,
    total_score: (profile.total_score || 0) + (gameStats.score || 0),
    total_words: (profile.total_words || 0) + (gameStats.wordCount || 0),
    total_time_played: (profile.total_time_played || 0) + (gameStats.timePlayed || 0),
    last_game_at: new Date().toISOString()
  };

  // Update casual/ranked game counts
  if (gameStats.isRanked) {
    updates.ranked_games = (profile.ranked_games || 0) + 1;
    // Only count as win if placement === 1 AND more than 1 player (no solo wins)
    if (gameStats.placement === 1 && (gameStats.totalPlayers || 0) > 1) {
      updates.ranked_wins = (profile.ranked_wins || 0) + 1;
    }
  } else {
    updates.casual_games = (profile.casual_games || 0) + 1;
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

  // Update XP and level
  const currentXp = profile.total_xp || 0;
  const newTotalXp = currentXp + xpResult.totalXp;
  const oldLevel = profile.current_level || getLevelFromXp(currentXp);
  const newLevel = getLevelFromXp(newTotalXp);

  updates.total_xp = newTotalXp;
  updates.current_level = newLevel;

  // Check for level up
  const levelUpInfo = checkLevelUp(oldLevel, newLevel);
  if (levelUpInfo.leveledUp) {
    logger.info('XP', `Player ${playerId} leveled up! ${oldLevel} -> ${newLevel}`);
    // Update player title if a new one was unlocked
    const newTitle = getTitleForLevel(newLevel);
    if (newTitle && newTitle !== profile.player_title) {
      updates.player_title = newTitle;
    }
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .update(updates)
      .eq('id', playerId)
      .select()
      .single();

    if (error) {
      logger.error('SUPABASE', `Failed to update profile stats for ${playerId}`, error.message);
    }

    // Return XP info along with data for socket emission
    return {
      data,
      error,
      xpInfo: {
        xpEarned: xpResult.totalXp,
        xpBreakdown: xpResult.breakdown,
        newTotalXp,
        oldLevel,
        newLevel,
        leveledUp: levelUpInfo.leveledUp,
        levelsGained: levelUpInfo.levelsGained,
        newTitles: levelUpInfo.newTitles,
      }
    };
  } catch (err) {
    logger.error('SUPABASE', `Unexpected error updating profile for ${playerId}`, err);
    return { data: null, error: { message: err.message || 'Unexpected error during profile update' } };
  }
}

/**
 * Update leaderboard entry for a player
 * @param {string} playerId - Player's UUID
 */
async function updateLeaderboardEntry(playerId) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get updated profile stats
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('username, display_name, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, ranked_mmr')
    .eq('id', playerId)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  // Upsert leaderboard entry
  const { data, error } = await client
    .from('leaderboard')
    .upsert({
      player_id: playerId,
      username: profile.username,
      display_name: profile.display_name,
      avatar_emoji: profile.avatar_emoji,
      avatar_color: profile.avatar_color,
      total_score: profile.total_score || 0,
      games_played: profile.total_games || 0,
      games_won: profile.ranked_wins || 0,
      ranked_mmr: profile.ranked_mmr || 1000,
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'player_id'
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update ranked progress for a player
 * @param {string} playerId - Player's UUID
 */
async function updateRankedProgress(playerId) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get current profile casual games count
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('casual_games')
    .eq('id', playerId)
    .single();

  if (fetchError) return { data: null, error: fetchError };

  const casualGames = profile.casual_games || 0;
  const isUnlocked = casualGames >= 10;

  // Upsert ranked progress
  const { data, error } = await client
    .from('ranked_progress')
    .upsert({
      player_id: playerId,
      casual_games_played: casualGames,
      unlocked_at: isUnlocked ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'player_id'
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Get or create guest token entry
 * @param {string} tokenHash - SHA-256 hash of guest token
 */
async function getOrCreateGuestToken(tokenHash) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Try to get existing token
  const { data: existing } = await client
    .from('guest_tokens')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .single();

  if (existing) return { data: existing, error: null };

  // Create new token entry
  const { data, error } = await client
    .from('guest_tokens')
    .insert({
      token_hash: tokenHash,
      stats: { games: 0, score: 0, words: 0, achievementCounts: {} }
    })
    .select()
    .single();

  return { data, error };
}

/**
 * Update guest token stats after a game
 * @param {string} tokenHash - SHA-256 hash of guest token
 * @param {object} gameStats - Stats from the game
 */
async function updateGuestStats(tokenHash, gameStats) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get current stats
  const { data: token, error: fetchError } = await client
    .from('guest_tokens')
    .select('stats')
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .single();

  if (fetchError) {
    // Token doesn't exist, create it
    return getOrCreateGuestToken(tokenHash);
  }

  const currentStats = token.stats || { games: 0, score: 0, words: 0, timePlayed: 0, achievementCounts: {} };

  // Update stats
  const updatedStats = {
    games: (currentStats.games || 0) + 1,
    score: (currentStats.score || 0) + (gameStats.score || 0),
    words: (currentStats.words || 0) + (gameStats.wordCount || 0),
    timePlayed: (currentStats.timePlayed || 0) + (gameStats.timePlayed || 0),
    longestWord: gameStats.longestWord &&
      (!currentStats.longestWord || gameStats.longestWord.length > currentStats.longestWord.length)
      ? gameStats.longestWord
      : currentStats.longestWord,
    achievementCounts: { ...currentStats.achievementCounts }
  };

  // Update achievement counts
  if (gameStats.achievements) {
    for (const achievement of gameStats.achievements) {
      updatedStats.achievementCounts[achievement] =
        (updatedStats.achievementCounts[achievement] || 0) + 1;
    }
  }

  const { data, error } = await client
    .from('guest_tokens')
    .update({ stats: updatedStats })
    .eq('token_hash', tokenHash)
    .is('claimed_by', null)
    .select()
    .single();

  return { data, error };
}

/**
 * Process game results for all players after a game ends
 * @param {string} gameCode - Game code
 * @param {array} scores - Array of { username, score, wordCount, longestWord, placement, achievements }
 * @param {object} gameInfo - Game metadata { language, isRanked, timePlayed }
 * @param {object} userAuthMap - Map of username to { authUserId, guestTokenHash }
 */
async function processGameResults(gameCode, scores, gameInfo, userAuthMap) {
  const xpResults = {}; // Store XP results for each player to emit via socket

  if (!isSupabaseConfigured()) {
    logger.debug('SUPABASE', 'Not configured, skipping game result recording');
    return { xpResults };
  }

  logger.info('SUPABASE', `Processing game results for ${gameCode}, ${scores.length} players`);

  for (const playerScore of scores) {
    const authInfo = userAuthMap[playerScore.username];
    if (!authInfo) continue;

    const gameStats = {
      score: playerScore.score,
      wordCount: playerScore.wordCount || 0,
      longestWord: playerScore.longestWord,
      placement: playerScore.placement,
      achievements: playerScore.achievements || [],
      isRanked: gameInfo.isRanked || false,
      totalPlayers: scores.length,
      timePlayed: gameInfo.timePlayed || 0
    };

    try {
      if (authInfo.authUserId) {
        // Authenticated user - update all tables
        logger.debug('SUPABASE', `Recording result for authenticated user: ${playerScore.username}`);

        // Record game result
        const gameResultRes = await recordGameResult({
          playerId: authInfo.authUserId,
          gameCode,
          ...gameStats,
          language: gameInfo.language
        });
        if (gameResultRes.error) {
          logger.error('SUPABASE', `recordGameResult error for ${playerScore.username}`, gameResultRes.error.message);
        }

        // Update profile stats (includes XP calculation)
        const statsRes = await updatePlayerStats(authInfo.authUserId, gameStats);
        if (statsRes.error) {
          logger.error('SUPABASE', `updatePlayerStats error for ${playerScore.username}`, statsRes.error.message);
        }

        // Store XP info for socket emission
        if (statsRes.xpInfo) {
          xpResults[playerScore.username] = {
            ...statsRes.xpInfo,
            socketId: authInfo.socketId,
          };
          logger.debug('XP', `${playerScore.username} earned ${statsRes.xpInfo.xpEarned} XP`);
        }

        // Update leaderboard
        const leaderboardRes = await updateLeaderboardEntry(authInfo.authUserId);
        if (leaderboardRes.error) {
          logger.error('SUPABASE', `updateLeaderboardEntry error for ${playerScore.username}`, leaderboardRes.error.message);
        }

        // Update ranked progress (if casual game)
        if (!gameInfo.isRanked) {
          const rankedRes = await updateRankedProgress(authInfo.authUserId);
          if (rankedRes?.error) {
            logger.error('SUPABASE', `updateRankedProgress error for ${playerScore.username}`, rankedRes.error.message);
          }
        }

      } else if (authInfo.guestTokenHash) {
        // Guest user - update guest token stats
        logger.debug('SUPABASE', `Recording result for guest: ${playerScore.username}`);
        await updateGuestStats(authInfo.guestTokenHash, gameStats);
      }
    } catch (error) {
      logger.error('SUPABASE', `Error processing result for ${playerScore.username}`, error);
    }
  }

  return { xpResults };
}

/**
 * Save a host-approved word that wasn't in the dictionary to Supabase
 * @param {object} params - Word approval data
 * @param {string} params.word - The word that was approved
 * @param {string} params.language - Language code (en, he, sv, ja)
 * @param {string} params.gameCode - Game where approval happened
 * @param {string|null} params.hostUserId - UUID of host who approved (null if guest)
 * @param {boolean} params.promoted - Whether word reached promotion threshold
 * @returns {object} - { data, error, isNewWord }
 */
async function saveHostApprovedWord({ word, language, gameCode, hostUserId, promoted = false }) {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' }, isNewWord: false };

  try {
    // Check if word already exists
    const { data: existing, error: fetchError } = await client
      .from('community_words')
      .select('id, approval_count, promoted_to_dictionary')
      .eq('word', word)
      .eq('language', language)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is fine
      logger.error('SUPABASE', `Error checking existing word "${word}"`, fetchError.message);
      return { data: null, error: fetchError, isNewWord: false };
    }

    let wordRecord;
    let isNewWord = false;

    if (existing) {
      // Word exists - update approval count
      const updates = {
        approval_count: existing.approval_count + 1,
        last_approved_by: hostUserId,
        last_approved_in_game: gameCode,
        last_approved_at: new Date().toISOString()
      };

      // Mark as promoted if threshold reached
      if (promoted && !existing.promoted_to_dictionary) {
        updates.promoted_to_dictionary = true;
        updates.promoted_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await client
        .from('community_words')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('SUPABASE', `Error updating word "${word}"`, updateError.message);
        return { data: null, error: updateError, isNewWord: false };
      }

      wordRecord = updated;
    } else {
      // New word - insert
      isNewWord = true;
      const { data: inserted, error: insertError } = await client
        .from('community_words')
        .insert({
          word,
          language,
          approval_count: 1,
          promoted_to_dictionary: promoted,
          promoted_at: promoted ? new Date().toISOString() : null,
          first_approved_by: hostUserId,
          first_approved_in_game: gameCode,
          last_approved_by: hostUserId,
          last_approved_in_game: gameCode
        })
        .select()
        .single();

      if (insertError) {
        logger.error('SUPABASE', `Error inserting word "${word}"`, insertError.message);
        return { data: null, error: insertError, isNewWord: false };
      }

      wordRecord = inserted;
    }

    // Record the individual approval event
    if (wordRecord) {
      const { error: approvalError } = await client
        .from('community_word_approvals')
        .insert({
          word_id: wordRecord.id,
          approved_by: hostUserId,
          game_code: gameCode
        });

      if (approvalError) {
        logger.warn('SUPABASE', `Error recording approval for "${word}"`, approvalError.message);
        // Don't fail the whole operation for this
      }
    }

    logger.debug('SUPABASE', `${isNewWord ? 'Saved new' : 'Updated'} community word "${word}" (${language}) - approval count: ${wordRecord?.approval_count || 1}${promoted ? ' - PROMOTED' : ''}`);
    return { data: wordRecord, error: null, isNewWord };

  } catch (err) {
    logger.error('SUPABASE', `Unexpected error saving word "${word}"`, err);
    return { data: null, error: { message: err.message || 'Unexpected error' }, isNewWord: false };
  }
}

/**
 * Update MMR for ranked game participants
 * @param {array} participants - Array of { playerId, placement, currentMmr }
 */
async function updateRankedMmr(participants) {
  const client = getSupabase();
  if (!client) return;

  // Simple MMR calculation
  // Winner gets +25, others lose based on placement
  const totalPlayers = participants.length;

  for (const participant of participants) {
    let mmrChange = 0;

    if (participant.placement === 1) {
      mmrChange = 25;
    } else if (participant.placement === 2) {
      mmrChange = totalPlayers > 2 ? 10 : -15;
    } else if (participant.placement === 3) {
      mmrChange = totalPlayers > 3 ? 0 : -20;
    } else {
      mmrChange = -20;
    }

    const currentMmr = participant.currentMmr || 1000;
    const newMmr = Math.max(0, currentMmr + mmrChange);
    const peakMmr = participant.peakMmr || currentMmr;

    try {
      await client
        .from('profiles')
        .update({
          ranked_mmr: newMmr,
          peak_mmr: Math.max(newMmr, peakMmr)
        })
        .eq('id', participant.playerId);
    } catch (error) {
      logger.error('SUPABASE', `Error updating MMR for ${participant.playerId}`, error);
    }
  }
}

module.exports = {
  getSupabase,
  isSupabaseConfigured,
  recordGameResult,
  updatePlayerStats,
  updateLeaderboardEntry,
  updateRankedProgress,
  getOrCreateGuestToken,
  updateGuestStats,
  processGameResults,
  updateRankedMmr,
  saveHostApprovedWord
};
