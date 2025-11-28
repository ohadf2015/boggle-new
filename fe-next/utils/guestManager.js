/**
 * Guest session management utilities
 * Handles guest token creation, stats tracking, and migration to authenticated accounts
 */

const GUEST_SESSION_KEY = 'boggle_guest_session_id';
const GUEST_STATS_KEY = 'boggle_guest_stats';

/**
 * Generate a SHA-256 hash of a token (for server storage)
 */
export async function hashToken(token) {
  if (typeof window === 'undefined') return null;

  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a guest session ID
 */
export function getGuestSessionId() {
  if (typeof window === 'undefined') return null;

  let sessionId = localStorage.getItem(GUEST_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
  }
  return sessionId;
}

/**
 * Check if a guest session exists
 */
export function hasGuestSession() {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(GUEST_SESSION_KEY);
}

/**
 * Get current guest stats from localStorage
 */
export function getGuestStats() {
  if (typeof window === 'undefined') return null;

  try {
    const statsStr = localStorage.getItem(GUEST_STATS_KEY);
    if (!statsStr) {
      return getDefaultGuestStats();
    }
    return JSON.parse(statsStr);
  } catch (error) {
    console.error('Error reading guest stats:', error);
    return getDefaultGuestStats();
  }
}

/**
 * Get default guest stats object
 */
function getDefaultGuestStats() {
  return {
    games: 0,
    score: 0,
    words: 0,
    longestWord: null,
    achievementCounts: {},
    createdAt: Date.now()
  };
}

/**
 * Save guest stats to localStorage
 */
export function saveGuestStats(stats) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GUEST_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving guest stats:', error);
  }
}

/**
 * Update guest stats after a game
 */
export function updateGuestStatsAfterGame(gameResult) {
  if (typeof window === 'undefined') return;

  const stats = getGuestStats();

  stats.games = (stats.games || 0) + 1;
  stats.score = (stats.score || 0) + (gameResult.score || 0);
  stats.words = (stats.words || 0) + (gameResult.wordCount || 0);

  // Update longest word if this game had a longer one
  if (gameResult.longestWord) {
    if (!stats.longestWord || gameResult.longestWord.length > stats.longestWord.length) {
      stats.longestWord = gameResult.longestWord;
    }
  }

  // Update achievement counts
  if (gameResult.achievements && Array.isArray(gameResult.achievements)) {
    stats.achievementCounts = stats.achievementCounts || {};
    for (const achievement of gameResult.achievements) {
      stats.achievementCounts[achievement] = (stats.achievementCounts[achievement] || 0) + 1;
    }
  }

  saveGuestStats(stats);
  return stats;
}

/**
 * Clear all guest data (after account claim or sign in)
 */
export function clearGuestData() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(GUEST_SESSION_KEY);
  localStorage.removeItem(GUEST_STATS_KEY);
}

/**
 * Get guest stats summary for display
 */
export function getGuestStatsSummary() {
  const stats = getGuestStats();

  return {
    gamesPlayed: stats.games || 0,
    totalScore: stats.score || 0,
    wordsFound: stats.words || 0,
    longestWord: stats.longestWord || null,
    achievementCount: Object.keys(stats.achievementCounts || {}).length
  };
}

/**
 * Check if guest has enough games to show upgrade prompt
 */
export function shouldShowUpgradePrompt() {
  const stats = getGuestStats();
  return (stats.games || 0) >= 3; // Show after 3 games
}

/**
 * Get casual games count for ranked unlock progress
 * For guests, this comes from local storage
 */
export function getGuestCasualGamesCount() {
  const stats = getGuestStats();
  return stats.games || 0;
}
