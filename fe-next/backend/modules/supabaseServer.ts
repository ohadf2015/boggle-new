/**
 * Supabase Server Client
 * Backend-only Supabase client with service role key for administrative operations
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const { createClient } = require('@supabase/supabase-js');
const { calculateGameXp, getLevelFromXp, checkLevelUp, getTitleForLevel } = require('./xpManager');
const logger = require('../utils/logger');

// Lazy import to avoid circular dependency with botManager
let _generateRandomPlayerName: ((existingUsernames: string[], language: string) => { name: string; avatar: { emoji: string; color: string } }) | null = null;
function getRandomPlayerNameGenerator() {
  if (!_generateRandomPlayerName) {
    _generateRandomPlayerName = require('./botManager').generateRandomPlayerName;
  }
  return _generateRandomPlayerName;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Log configuration status at startup
logger.info('SUPABASE', `Configuration status: URL=${!!supabaseUrl}, ServiceKey=${!!supabaseServiceKey}`);
if (!supabaseUrl || !supabaseServiceKey) {
  logger.warn('SUPABASE', 'Supabase not fully configured (missing URL or SUPABASE_SERVICE_ROLE_KEY). Stats will not be saved to database.');
}

let supabase: SupabaseClient | null = null;

// Type definitions
export interface GameStats {
  score?: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  achievements?: string[];
  isRanked?: boolean;
  totalPlayers?: number;
  timePlayed?: number;
}

export interface GameResultInput {
  playerId: string;
  gameCode: string;
  score?: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  isRanked?: boolean;
  language?: string;
  timePlayed?: number;
}

export interface PlayerScore {
  username: string;
  score: number;
  wordCount?: number;
  longestWord?: string;
  placement?: number;
  achievements?: string[];
}

export interface GameInfo {
  language?: string;
  isRanked?: boolean;
  timePlayed?: number;
}

export interface UserAuthInfo {
  authUserId?: string | null;
  guestTokenHash?: string | null;
  socketId?: string;
}

export interface WordApprovalInput {
  word: string;
  language: string;
  gameCode: string;
  hostUserId?: string | null;
  promoted?: boolean;
}

export interface PlayerWordInput {
  word: string;
  language: string;
  gameCode: string;
  playerId?: string | null;
}

export interface XpInfo {
  xpEarned: number;
  xpBreakdown: {
    gameCompletion: number;
    scoreXp: number;
    winBonus: number;
    achievementXp: number;
  };
  newTotalXp: number;
  oldLevel: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  newTitles: string[];
}

export interface XpResultWithSocket extends XpInfo {
  socketId?: string;
}

export interface RankedParticipant {
  playerId: string;
  placement: number;
  currentMmr?: number;
  peakMmr?: number;
}

/**
 * Initialize Supabase client (lazy initialization)
 * Uses service role key to bypass RLS for server-side operations
 */
export function getSupabase(): SupabaseClient | null {
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
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}

/**
 * Record a game result for a player
 */
export async function recordGameResult(result: GameResultInput): Promise<{ data: unknown; error: { message: string } | null }> {
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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error recording game result';
    logger.error('SUPABASE', 'Unexpected error recording game result', err);
    return { data: null, error: { message: errorMessage } };
  }
}

/**
 * Update player profile stats after a game
 */
export async function updatePlayerStats(
  playerId: string,
  gameStats: GameStats
): Promise<{ data: unknown; error: { message: string } | null; xpInfo?: XpInfo }> {
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
      const generateRandomPlayerName = getRandomPlayerNameGenerator();
      const randomPlayerData = generateRandomPlayerName!([], 'en');

      const { data: newProfile, error: createError } = await client
        .from('profiles')
        .insert({
          id: playerId,
          username: randomPlayerData.name,
          display_name: randomPlayerData.name,
          avatar_emoji: randomPlayerData.avatar.emoji,
          avatar_color: randomPlayerData.avatar.color
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
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error during profile update';
    logger.error('SUPABASE', `Unexpected error updating profile for ${playerId}`, err);
    return { data: null, error: { message: errorMessage } };
  }
}

/**
 * Update leaderboard entry for a player
 */
export async function updateLeaderboardEntry(playerId: string): Promise<{ data: unknown; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' } };

  // Get updated profile stats
  const { data: profile, error: fetchError } = await client
    .from('profiles')
    .select('username, display_name, avatar_emoji, avatar_color, total_score, total_games, ranked_wins, casual_wins, ranked_mmr')
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
      games_won: (profile.casual_wins || 0) + (profile.ranked_wins || 0),
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
 */
export async function updateRankedProgress(playerId: string): Promise<{ data: unknown; error: { message: string } | null }> {
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
 */
export async function getOrCreateGuestToken(tokenHash: string): Promise<{ data: unknown; error: { message: string } | null }> {
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
 */
export async function updateGuestStats(tokenHash: string, gameStats: GameStats): Promise<{ data: unknown; error: { message: string } | null }> {
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

  interface GuestStats {
    games: number;
    score: number;
    words: number;
    timePlayed: number;
    longestWord?: string;
    achievementCounts: Record<string, number>;
  }

  const currentStats: GuestStats = token.stats || { games: 0, score: 0, words: 0, timePlayed: 0, achievementCounts: {} };

  // Update stats
  const updatedStats: GuestStats = {
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
 */
export async function processGameResults(
  gameCode: string,
  scores: PlayerScore[],
  gameInfo: GameInfo,
  userAuthMap: Record<string, UserAuthInfo>
): Promise<{ xpResults: Record<string, XpResultWithSocket> }> {
  const xpResults: Record<string, XpResultWithSocket> = {};

  if (!isSupabaseConfigured()) {
    logger.debug('SUPABASE', 'Not configured, skipping game result recording');
    return { xpResults };
  }

  logger.info('SUPABASE', `Processing game results for ${gameCode}, ${scores.length} players`);

  for (const playerScore of scores) {
    const authInfo = userAuthMap[playerScore.username];
    if (!authInfo) continue;

    const gameStats: GameStats = {
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
 */
export async function saveHostApprovedWord(params: WordApprovalInput): Promise<{ data: unknown; error: { message: string } | null; isNewWord: boolean }> {
  const { word, language, gameCode, hostUserId, promoted = false } = params;
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
      logger.error('SUPABASE', `Error checking existing word "${word}"`, fetchError.message);
      return { data: null, error: fetchError, isNewWord: false };
    }

    let wordRecord: unknown;
    let isNewWord = false;

    if (existing) {
      // Word exists - update approval count
      const updates: Record<string, unknown> = {
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
      const wordData = wordRecord as { id: string };
      const { error: approvalError } = await client
        .from('community_word_approvals')
        .insert({
          word_id: wordData.id,
          approved_by: hostUserId,
          game_code: gameCode
        });

      if (approvalError) {
        logger.warn('SUPABASE', `Error recording approval for "${word}"`, approvalError.message);
      }
    }

    const wordData = wordRecord as { approval_count?: number } | null;
    logger.debug('SUPABASE', `${isNewWord ? 'Saved new' : 'Updated'} community word "${word}" (${language}) - approval count: ${wordData?.approval_count || 1}${promoted ? ' - PROMOTED' : ''}`);
    return { data: wordRecord, error: null, isNewWord };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error saving word "${word}"`, err);
    return { data: null, error: { message: errorMessage }, isNewWord: false };
  }
}

/**
 * Save a valid player word to the database for bot learning
 */
export async function savePlayerWord(params: PlayerWordInput): Promise<{ data: unknown; error: { message: string } | null; isNewWord: boolean }> {
  const { word, language, gameCode, playerId } = params;
  const client = getSupabase();
  if (!client) return { data: null, error: { message: 'Supabase not configured' }, isNewWord: false };

  // Normalize word
  const normalizedWord = word.toLowerCase().trim();

  try {
    // Check if word already exists
    const { data: existing, error: fetchError } = await client
      .from('player_words')
      .select('id, times_submitted')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      logger.error('SUPABASE', `Error checking existing player word "${normalizedWord}"`, fetchError.message);
      return { data: null, error: fetchError, isNewWord: false };
    }

    let wordRecord: unknown;
    let isNewWord = false;

    if (existing) {
      // Word exists - update submission count
      const { data: updated, error: updateError } = await client
        .from('player_words')
        .update({
          times_submitted: existing.times_submitted + 1,
          last_submitted_by: playerId,
          last_submitted_in_game: gameCode,
          last_submitted_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        logger.error('SUPABASE', `Error updating player word "${normalizedWord}"`, updateError.message);
        return { data: null, error: updateError, isNewWord: false };
      }

      wordRecord = updated;
    } else {
      // New word - insert
      isNewWord = true;
      const { data: inserted, error: insertError } = await client
        .from('player_words')
        .insert({
          word: normalizedWord,
          language,
          times_submitted: 1,
          first_submitted_by: playerId,
          first_submitted_in_game: gameCode,
          last_submitted_by: playerId,
          last_submitted_in_game: gameCode
        })
        .select()
        .single();

      if (insertError) {
        logger.error('SUPABASE', `Error inserting player word "${normalizedWord}"`, insertError.message);
        return { data: null, error: insertError, isNewWord: false };
      }

      wordRecord = inserted;
    }

    const wordData = wordRecord as { times_submitted?: number } | null;
    logger.debug('SUPABASE', `${isNewWord ? 'Saved new' : 'Updated'} player word "${normalizedWord}" (${language}) - times submitted: ${wordData?.times_submitted || 1}`);
    return { data: wordRecord, error: null, isNewWord };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error saving player word "${normalizedWord}"`, err);
    return { data: null, error: { message: errorMessage }, isNewWord: false };
  }
}

/**
 * Get popular player words for a language (for bot word selection)
 */
export async function getPopularPlayerWords(language: string, limit: number = 500): Promise<{ data: string[]; error: { message: string } | null }> {
  const client = getSupabase();
  if (!client) return { data: [], error: { message: 'Supabase not configured' } };

  try {
    const { data, error } = await client
      .from('player_words')
      .select('word, times_submitted')
      .eq('language', language)
      .order('times_submitted', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('SUPABASE', `Error fetching popular player words for ${language}`, error.message);
      return { data: [], error };
    }

    // Return just the words array
    const words = data.map((row: { word: string }) => row.word);
    logger.debug('SUPABASE', `Fetched ${words.length} popular player words for ${language}`);
    return { data: words, error: null };

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unexpected error';
    logger.error('SUPABASE', `Unexpected error fetching player words`, err);
    return { data: [], error: { message: errorMessage } };
  }
}

/**
 * Increment bot usage counter for a word
 */
export async function incrementBotWordUsage(word: string, language: string): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  const normalizedWord = word.toLowerCase().trim();

  try {
    // Update times_found_by_bots
    await client.rpc('increment_bot_word_usage', {
      p_word: normalizedWord,
      p_language: language
    });
  } catch (err: unknown) {
    // Silently fail - this is not critical
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    logger.debug('SUPABASE', `Could not increment bot usage for "${normalizedWord}": ${errorMessage}`);
  }
}

/**
 * Update MMR for ranked game participants
 */
export async function updateRankedMmr(participants: RankedParticipant[]): Promise<void> {
  const client = getSupabase();
  if (!client) return;

  // Simple MMR calculation
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

// CommonJS exports for backward compatibility
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
  saveHostApprovedWord,
  savePlayerWord,
  getPopularPlayerWords,
  incrementBotWordUsage
};
