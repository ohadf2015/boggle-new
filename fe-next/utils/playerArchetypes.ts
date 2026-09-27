/**
 * Player Archetypes System
 * Determines personality-based archetypes for players based on their game performance
 * Each player gets assigned the archetype that best matches their playstyle
 */

import { SPEED_PATTERNS, type SpeedPattern } from './gameInsights';

export interface PlayerStats {
  username: string;
  score: number;
  totalWords: number;
  validWords: number;
  accuracy: number;
  wordsPerMinute: number;
  averageWordLength: number;
  longestWordLength: number;
  highestWordScore: number;
  uniqueWordsCount: number; // Words only this player found
  aiVerifiedCount: number;
  speedPattern: SpeedPattern;
}

export interface PlayerArchetype {
  id: string;
  name: string;
  description: string;
  emoji: string; // Fallback emoji
  color: string; // Tailwind color class
  bgColor: string; // Background color class
  icon?: string; // Path to custom icon image
}

// Archetype definitions with personality-focused names and descriptions
export const ARCHETYPES: Record<string, PlayerArchetype> = {
  STRATEGIST: {
    id: 'strategist',
    name: 'The Strategist',
    description: 'Calculated moves, maximum impact',
    emoji: '♟️',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    icon: '/archetypes/strategist.png',
  },
  SPEEDSTER: {
    id: 'speedster',
    name: 'The Speedster',
    description: 'Lightning fast reflexes',
    emoji: '⚡',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: '/archetypes/speedster.png',
  },
  SCHOLAR: {
    id: 'scholar',
    name: 'The Scholar',
    description: 'Master of complex vocabulary',
    emoji: '🦉',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: '/archetypes/scholar.png',
  },
  EXPLORER: {
    id: 'explorer',
    name: 'The Explorer',
    description: 'Finds what others miss',
    emoji: '🦊',
    color: 'text-orange-500',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: '/archetypes/explorer.png',
  },
  PERFECTIONIST: {
    id: 'perfectionist',
    name: 'The Perfectionist',
    description: 'Every word counts',
    emoji: '🎯',
    color: 'text-pink-500',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    icon: '/archetypes/perfectionist.png',
  },
  MAVERICK: {
    id: 'maverick',
    name: 'The Maverick',
    description: 'Bold and unconventional',
    emoji: '🃏',
    color: 'text-red-500',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: '/archetypes/maverick.png',
  },
  WORKHORSE: {
    id: 'workhorse',
    name: 'The Workhorse',
    description: 'Relentless and tireless',
    emoji: '💪',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: '/archetypes/workhorse.png',
  },
  CLOSER: {
    id: 'closer',
    name: 'The Closer',
    description: 'Thrives under pressure',
    emoji: '🏁',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: '/archetypes/closer.png',
  },
  TRAILBLAZER: {
    id: 'trailblazer',
    name: 'The Trailblazer',
    description: 'Goes for the big wins',
    emoji: '🚀',
    color: 'text-violet-500',
    bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    icon: '/archetypes/trailblazer.png',
  },
};

// Default archetype when no clear match
export const DEFAULT_ARCHETYPE = ARCHETYPES.STRATEGIST;

/**
 * Calculate player stats from game data for archetype determination
 */
export function calculatePlayerStats(
  player: {
    username: string;
    score: number;
    allWords?: Array<{
      word: string;
      validated?: boolean;
      score?: number;
      isAiVerified?: boolean;
      timeSinceStart?: number;
    }>;
  },
  allPlayersWords: Record<string, Array<{ word: string; validated?: boolean; score?: number }>>,
  gameDuration: number = 180
): PlayerStats {
  const allWords = player.allWords || [];
  const validWords = allWords.filter(w => w.validated !== false);
  const totalWords = allWords.length;
  const validCount = validWords.length;

  // For practice mode (gameDuration = 0), calculate actual play time from word timestamps
  let effectiveGameDuration = gameDuration;
  if (gameDuration === 0 && allWords.length > 0) {
    const timings = allWords
      .map(w => w.timeSinceStart)
      .filter((t): t is number => typeof t === 'number');

    if (timings.length > 0) {
      const maxTime = Math.max(...timings);
      // Add buffer and round up to nearest 30 seconds for cleaner stats
      effectiveGameDuration = Math.max(Math.ceil((maxTime + 10) / 30) * 30, 60);
    } else {
      effectiveGameDuration = 180;
    }
  }

  // Calculate accuracy
  const accuracy = totalWords > 0 ? Math.round((validCount / totalWords) * 100) : 100;

  // Calculate words per minute (use effective duration)
  const gameMinutes = effectiveGameDuration / 60;
  const wordsPerMinute = gameMinutes > 0 ? parseFloat((validCount / gameMinutes).toFixed(1)) : 0;

  // Calculate average and longest word length
  const wordLengths = validWords.map(w => w.word.length);
  const averageWordLength = wordLengths.length > 0
    ? parseFloat((wordLengths.reduce((a, b) => a + b, 0) / wordLengths.length).toFixed(1))
    : 0;
  const longestWordLength = wordLengths.length > 0 ? Math.max(...wordLengths) : 0;

  // Find highest scoring word
  const wordScores = validWords.map(w => w.score || 0);
  const highestWordScore = wordScores.length > 0 ? Math.max(...wordScores) : 0;

  // Count unique words (words only this player found)
  const playerWordsSet = new Set(validWords.map(w => w.word.toLowerCase()));
  let uniqueWordsCount = 0;

  playerWordsSet.forEach(word => {
    let foundByOthers = false;
    Object.entries(allPlayersWords).forEach(([username, words]) => {
      if (username !== player.username) {
        const otherWords = words.filter(w => w.validated !== false);
        if (otherWords.some(w => w.word.toLowerCase() === word)) {
          foundByOthers = true;
        }
      }
    });
    if (!foundByOthers) {
      uniqueWordsCount++;
    }
  });

  // Count AI-verified words
  const aiVerifiedCount = allWords.filter(w => w.isAiVerified).length;

  // Determine speed pattern (use effective duration for practice mode)
  const speedPattern = determineSpeedPatternFromWords(validWords, effectiveGameDuration);

  return {
    username: player.username,
    score: player.score,
    totalWords,
    validWords: validCount,
    accuracy,
    wordsPerMinute,
    averageWordLength,
    longestWordLength,
    highestWordScore,
    uniqueWordsCount,
    aiVerifiedCount,
    speedPattern,
  };
}

/**
 * Determine speed pattern from word timing data
 */
function determineSpeedPatternFromWords(
  words: Array<{ timeSinceStart?: number }>,
  gameDuration: number
): SpeedPattern {
  if (words.length < 3) return SPEED_PATTERNS.STEADY;

  const thirdDuration = gameDuration / 3;
  let early = 0, mid = 0, late = 0;

  words.forEach(word => {
    const t = word.timeSinceStart;
    if (typeof t !== 'number') return;

    if (t < thirdDuration) early++;
    else if (t < thirdDuration * 2) mid++;
    else late++;
  });

  const total = early + mid + late;
  if (total === 0) return SPEED_PATTERNS.STEADY;

  const earlyPct = (early / total) * 100;
  const latePct = (late / total) * 100;

  if (latePct >= 45 && late > early && late > mid) return SPEED_PATTERNS.STRONG_FINISH;
  if (earlyPct >= 45 && early > mid && early > late) return SPEED_PATTERNS.FAST_START;
  if (early < mid && mid < late) return SPEED_PATTERNS.MOMENTUM;

  return SPEED_PATTERNS.STEADY;
}

/**
 * Determine the best archetype for a player based on their stats
 * Compares player stats against other players to find their standout trait
 */
export function determinePlayerArchetype(
  playerStats: PlayerStats,
  allPlayerStats: PlayerStats[]
): PlayerArchetype {
  // Calculate rankings for each category
  const rankings = {
    accuracy: getRanking(playerStats.accuracy, allPlayerStats.map(p => p.accuracy)),
    speed: getRanking(playerStats.wordsPerMinute, allPlayerStats.map(p => p.wordsPerMinute)),
    avgLength: getRanking(playerStats.averageWordLength, allPlayerStats.map(p => p.averageWordLength)),
    unique: getRanking(playerStats.uniqueWordsCount, allPlayerStats.map(p => p.uniqueWordsCount)),
    highScore: getRanking(playerStats.highestWordScore, allPlayerStats.map(p => p.highestWordScore)),
    volume: getRanking(playerStats.totalWords, allPlayerStats.map(p => p.totalWords)),
    aiVerified: getRanking(playerStats.aiVerifiedCount, allPlayerStats.map(p => p.aiVerifiedCount)),
  };

  // Priority-based archetype selection
  // Higher priority archetypes are checked first

  // Perfectionist: 95%+ accuracy AND ranked #1 in accuracy
  if (playerStats.accuracy >= 95 && rankings.accuracy === 1) {
    return ARCHETYPES.PERFECTIONIST;
  }

  // Speedster: Fastest words per minute AND significant speed advantage
  if (rankings.speed === 1 && playerStats.wordsPerMinute >= 4) {
    return ARCHETYPES.SPEEDSTER;
  }

  // Explorer: Most unique words AND found at least 3 unique words
  if (rankings.unique === 1 && playerStats.uniqueWordsCount >= 3) {
    return ARCHETYPES.EXPLORER;
  }

  // Scholar: Highest average word length AND avg >= 4.5 letters
  if (rankings.avgLength === 1 && playerStats.averageWordLength >= 4.5) {
    return ARCHETYPES.SCHOLAR;
  }

  // Trailblazer: Found the highest-scoring word
  if (rankings.highScore === 1 && playerStats.highestWordScore >= 5) {
    return ARCHETYPES.TRAILBLAZER;
  }

  // Maverick: Most AI-verified (unusual) words
  if (rankings.aiVerified === 1 && playerStats.aiVerifiedCount >= 2) {
    return ARCHETYPES.MAVERICK;
  }

  // Closer: Strong finish speed pattern
  if (playerStats.speedPattern === SPEED_PATTERNS.STRONG_FINISH) {
    return ARCHETYPES.CLOSER;
  }

  // Workhorse: Most total words submitted
  if (rankings.volume === 1 && playerStats.totalWords >= 15) {
    return ARCHETYPES.WORKHORSE;
  }

  // Strategist: High accuracy (90%+) as fallback
  if (playerStats.accuracy >= 90) {
    return ARCHETYPES.STRATEGIST;
  }

  // Default based on strongest relative trait
  const traitScores = [
    { archetype: ARCHETYPES.PERFECTIONIST, score: playerStats.accuracy * (rankings.accuracy === 1 ? 1.5 : 1) },
    { archetype: ARCHETYPES.SPEEDSTER, score: playerStats.wordsPerMinute * 10 * (rankings.speed === 1 ? 1.5 : 1) },
    { archetype: ARCHETYPES.EXPLORER, score: playerStats.uniqueWordsCount * 20 * (rankings.unique === 1 ? 1.5 : 1) },
    { archetype: ARCHETYPES.SCHOLAR, score: playerStats.averageWordLength * 15 * (rankings.avgLength === 1 ? 1.5 : 1) },
    { archetype: ARCHETYPES.WORKHORSE, score: playerStats.totalWords * 5 * (rankings.volume === 1 ? 1.5 : 1) },
  ];

  traitScores.sort((a, b) => b.score - a.score);
  return traitScores[0]?.archetype || DEFAULT_ARCHETYPE;
}

/**
 * Get ranking (1 = best) for a value in an array
 */
function getRanking(value: number, allValues: number[]): number {
  const sorted = [...allValues].sort((a, b) => b - a);
  return sorted.indexOf(value) + 1;
}

/**
 * Check if a value is tied for first place
 * Returns true if there are multiple players with the same top value
 */
function isTiedForFirst(value: number, allValues: number[]): boolean {
  const maxValue = Math.max(...allValues);
  if (value !== maxValue) return false;
  const countAtMax = allValues.filter(v => v === maxValue).length;
  return countAtMax > 1;
}

/**
 * Find the clear winner (no ties) for a category
 * Returns the username of the winner, or null if tied or no clear winner
 */
function findClearWinner(
  allStats: PlayerStats[],
  getValue: (stats: PlayerStats) => number,
  minThreshold: number = 0
): string | null {
  if (allStats.length === 0) return null;

  const values = allStats.map(s => getValue(s));
  const maxValue = Math.max(...values);

  // Check if max value meets minimum threshold
  if (maxValue < minThreshold) return null;

  // Check for ties
  const winnersAtMax = allStats.filter(s => getValue(s) === maxValue);
  if (winnersAtMax.length !== 1) return null;

  return winnersAtMax[0].username;
}

/**
 * Calculate archetypes for all players in a game
 * Only the BEST player in each category gets the archetype (no duplicates)
 * If there's a tie, neither player gets that archetype
 */
export function calculateAllPlayerArchetypes(
  players: Array<{
    username: string;
    score: number;
    allWords?: Array<{
      word: string;
      validated?: boolean;
      score?: number;
      isAiVerified?: boolean;
      timeSinceStart?: number;
    }>;
  }>,
  gameDuration: number = 180
): Map<string, PlayerArchetype> {
  const archetypeMap = new Map<string, PlayerArchetype>();

  // Filter to only include players with at least 3 valid words
  // Players who didn't actively participate shouldn't get an archetype
  const eligiblePlayers = players.filter(p => {
    const validWords = (p.allWords || []).filter(w => w.validated !== false);
    return validWords.length >= 3;
  });

  // Need at least 2 eligible players for archetypes to be meaningful
  if (eligiblePlayers.length < 2) return archetypeMap;

  // Build word map for unique word detection (include all players for comparison)
  const allPlayersWords: Record<string, Array<{ word: string; validated?: boolean; score?: number }>> = {};
  players.forEach(p => {
    allPlayersWords[p.username] = p.allWords || [];
  });

  // Calculate stats only for eligible players (those with 3+ valid words)
  const allStats = eligiblePlayers.map(p => calculatePlayerStats(p, allPlayersWords, gameDuration));

  // Track which players have already been assigned an archetype
  const assignedPlayers = new Set<string>();

  // Define archetype categories with their criteria
  // Order matters - earlier archetypes have higher priority
  const archetypeCategories: Array<{
    archetype: PlayerArchetype;
    getValue: (stats: PlayerStats) => number;
    minThreshold: number;
    additionalCheck?: (stats: PlayerStats) => boolean;
  }> = [
    {
      // Perfectionist: Highest accuracy (must be 95%+)
      archetype: ARCHETYPES.PERFECTIONIST,
      getValue: (s) => s.accuracy,
      minThreshold: 95,
    },
    {
      // Speedster: Fastest words per minute (must be 4+ wpm)
      archetype: ARCHETYPES.SPEEDSTER,
      getValue: (s) => s.wordsPerMinute,
      minThreshold: 4,
    },
    {
      // Explorer: Most unique words (must have 3+)
      archetype: ARCHETYPES.EXPLORER,
      getValue: (s) => s.uniqueWordsCount,
      minThreshold: 3,
    },
    {
      // Scholar: Highest average word length (must be 4.5+)
      archetype: ARCHETYPES.SCHOLAR,
      getValue: (s) => s.averageWordLength,
      minThreshold: 4.5,
    },
    {
      // Trailblazer: Highest single word score (must be 5+)
      archetype: ARCHETYPES.TRAILBLAZER,
      getValue: (s) => s.highestWordScore,
      minThreshold: 5,
    },
    {
      // Maverick: Most AI-verified words (must have 2+)
      archetype: ARCHETYPES.MAVERICK,
      getValue: (s) => s.aiVerifiedCount,
      minThreshold: 2,
    },
    {
      // Closer: Strong finish pattern (uses speed pattern, scored as 1 or 0)
      archetype: ARCHETYPES.CLOSER,
      getValue: (s) => s.speedPattern === SPEED_PATTERNS.STRONG_FINISH ? 1 : 0,
      minThreshold: 1,
    },
    {
      // Workhorse: Most total words (must have 15+)
      archetype: ARCHETYPES.WORKHORSE,
      getValue: (s) => s.totalWords,
      minThreshold: 15,
    },
    {
      // Strategist: High accuracy fallback (must be 90%+)
      archetype: ARCHETYPES.STRATEGIST,
      getValue: (s) => s.accuracy >= 90 ? s.accuracy : 0,
      minThreshold: 90,
    },
  ];

  // Assign archetypes - each player can only get one, each archetype only given once
  for (const category of archetypeCategories) {
    // Filter out already-assigned players
    const eligibleStats = allStats.filter(s => !assignedPlayers.has(s.username));
    if (eligibleStats.length === 0) continue;

    const winner = findClearWinner(eligibleStats, category.getValue, category.minThreshold);

    if (winner) {
      archetypeMap.set(winner, category.archetype);
      assignedPlayers.add(winner);
    }
  }

  return archetypeMap;
}

/**
 * Get missed high-value words for a player
 * Returns words found by others that this player didn't find, sorted by score
 */
export function getMissedWords(
  playerUsername: string,
  allPlayersWords: Record<string, Array<{ word: string; validated?: boolean; score?: number }>>,
  limit: number = 5
): Array<{ word: string; score: number; foundBy: string[] }> {
  // Include ALL words the player submitted (regardless of validation status)
  // so that duplicated/invalidated words they found don't show as "missed"
  const playerWords = new Set(
    (allPlayersWords[playerUsername] || [])
      .map(w => w.word.toLowerCase())
  );

  // Collect all words from other players with their scores
  const missedWords: Map<string, { score: number; foundBy: string[] }> = new Map();

  Object.entries(allPlayersWords).forEach(([username, words]) => {
    if (username === playerUsername) return;

    words.filter(w => w.validated !== false).forEach(wordObj => {
      const wordLower = wordObj.word.toLowerCase();
      if (!playerWords.has(wordLower)) {
        const existing = missedWords.get(wordLower);
        if (existing) {
          existing.foundBy.push(username);
        } else {
          missedWords.set(wordLower, {
            score: wordObj.score || 0,
            foundBy: [username],
          });
        }
      }
    });
  });

  // Convert to array and sort by score (high to low)
  return Array.from(missedWords.entries())
    .map(([word, data]) => ({ word, score: data.score, foundBy: data.foundBy }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
