/**
 * Achievement icons mapping (matches backend achievementManager.js)
 * COMPLETE list of all achievements including elite, competitive/style, and lifetime achievements
 */
export const ACHIEVEMENT_ICONS: Record<string, string> = {
  // Basic achievements
  FIRST_BLOOD: '🎯',
  SPEED_DEMON: '⚡',
  WORD_MASTER: '📚',
  COMBO_KING: '🔥',
  PERFECTIONIST: '✨',
  LEXICON: '🏆',
  WORDSMITH: '🎓',
  QUICK_THINKER: '💨',
  DIVERSE_VOCABULARY: '🌈',
  DOUBLE_TROUBLE: '⚡⚡',
  TREASURE_HUNTER: '💎',

  // Existing achievements
  TRIPLE_THREAT: '🎰',
  UNSTOPPABLE: '🚀',
  COMEBACK_KID: '🔄',
  DICTIONARY_DIVER: '📖',
  LIGHTNING_ROUND: '⚡',
  RARE_GEM: '💠',
  EXPLORER: '🧭',
  STREAK_MASTER: '🔥',
  ANAGRAM_ARTIST: '🔀',

  // New elite achievements
  WORD_ARCHITECT: '🏛️',
  SPEED_LEGEND: '🏎️',
  COMBO_GOD: '👑',
  VOCABULARY_TITAN: '🗿',
  PRECISION_MASTER: '🎯',
  LONG_WORD_CHAIN: '🔗',

  // New competitive/style achievements
  MINIMALIST: '🎯',
  WORD_SNIPER: '🔫',
  PHOTO_FINISH: '📸',
  CLUTCH_PLAYER: '💪',

  // Lifetime/career achievements (tracked across all games)
  VETERAN: '🎖️',
  CENTURION: '💯',
  WORD_COLLECTOR: '📚',
  WORD_HOARDER: '🗃️',
  CHAMPION: '🏅',
  LEGEND: '👑',
  POINT_MASTER: '💰',
  POINT_KING: '💎',
  DEDICATION: '🔥',
  LOYAL_PLAYER: '⭐',
};

/**
 * Get achievement icon by key, with fallback
 */
export function getAchievementIcon(key: string): string {
  return ACHIEVEMENT_ICONS[key] || '🏅';
}

/**
 * Format seconds into human-readable time (e.g., "2h 30m" or "45m")
 */
export function formatTimePlayed(totalSeconds: number | undefined | null): string {
  if (!totalSeconds || totalSeconds <= 0) return '0m';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}
