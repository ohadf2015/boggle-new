/**
 * Game Insights Calculator
 * Provides detailed post-game statistics and analysis for players
 */

import type { LetterGrid } from '@/types';

/**
 * Speed pattern categories based on word submission timing
 */
export const SPEED_PATTERNS = {
  FAST_START: 'fastStart',     // Most words in first third
  STRONG_FINISH: 'strongFinish', // Most words in last third
  MOMENTUM: 'momentum',         // Words increase over time
  STEADY: 'steady',             // Even distribution
} as const;

export type SpeedPattern = typeof SPEED_PATTERNS[keyof typeof SPEED_PATTERNS];

export interface WordData {
  word: string;
  validated?: boolean;
  timestamp?: number;
  score?: number;
}

export interface PlayerInsights {
  longestWord: string | null;
  longestWordLength: number;
  averageWordLength: number;
  wordsPerMinute: number;
  mostCommonLength: number | null;
  mostCommonLengthCount: number;
  speedPattern: SpeedPattern;
  wordLengthDistribution: Record<number, number>;
  earlyGameWords: number;
  midGameWords: number;
  lateGameWords: number;
  totalValidWords: number;
  accuracy: number;
}

export interface SpeedPatternAnalysis {
  speedPattern: SpeedPattern;
  earlyGameWords: number;
  midGameWords: number;
  lateGameWords: number;
}

export interface SpeedPatternDisplay {
  icon: string;
  color: string;
}

export interface PlayerScore {
  score?: number;
  words?: number;
  validWords?: WordData[] | string[];
}

export interface GameInsights {
  totalUniqueWords: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  totalWords: number;
}

/**
 * Calculate comprehensive player insights from game data
 * @param playerWords - Array of word objects with { word, validated, timestamp, score }
 * @param gameDuration - Total game duration in seconds (default 180)
 * @param totalScore - Player's total score
 * @returns Insights object with various statistics
 */
export function calculatePlayerInsights(
  playerWords: WordData[] = [],
  gameDuration: number = 180,
  totalScore: number = 0
): PlayerInsights {
  // Filter to only valid words
  const validWords = playerWords.filter(w => w.validated !== false);
  const wordCount = validWords.length;

  if (wordCount === 0) {
    return {
      longestWord: null,
      longestWordLength: 0,
      averageWordLength: 0,
      wordsPerMinute: 0,
      mostCommonLength: null,
      mostCommonLengthCount: 0,
      speedPattern: SPEED_PATTERNS.STEADY,
      wordLengthDistribution: {},
      earlyGameWords: 0,
      midGameWords: 0,
      lateGameWords: 0,
      totalValidWords: 0,
      accuracy: 0,
    };
  }

  // Calculate basic stats
  const wordLengths = validWords.map(w => w.word.length);
  const totalLength = wordLengths.reduce((sum, len) => sum + len, 0);
  const longestWord = validWords.reduce((longest, current) =>
    current.word.length > (longest?.word.length || 0) ? current : longest, validWords[0]);

  // Words per minute calculation
  const gameMinutes = gameDuration / 60;
  const wordsPerMinute = gameMinutes > 0 ? parseFloat((wordCount / gameMinutes).toFixed(1)) : 0;

  // Average word length
  const averageWordLength = parseFloat((totalLength / wordCount).toFixed(1));

  // Word length distribution
  const wordLengthDistribution: Record<number, number> = {};
  wordLengths.forEach(len => {
    wordLengthDistribution[len] = (wordLengthDistribution[len] || 0) + 1;
  });

  // Most common word length
  let mostCommonLength: number | null = null;
  let mostCommonLengthCount = 0;
  Object.entries(wordLengthDistribution).forEach(([len, count]) => {
    if (count > mostCommonLengthCount) {
      mostCommonLength = parseInt(len);
      mostCommonLengthCount = count;
    }
  });

  // Speed pattern analysis (based on timestamps if available)
  const { speedPattern, earlyGameWords, midGameWords, lateGameWords } =
    analyzeSpeedPattern(validWords, gameDuration);

  // Accuracy (valid words vs all submitted)
  const totalSubmitted = playerWords.length;
  const accuracy = totalSubmitted > 0
    ? Math.round((wordCount / totalSubmitted) * 100)
    : 100;

  return {
    longestWord: longestWord?.word || null,
    longestWordLength: longestWord?.word.length || 0,
    averageWordLength,
    wordsPerMinute,
    mostCommonLength,
    mostCommonLengthCount,
    speedPattern,
    wordLengthDistribution,
    earlyGameWords,
    midGameWords,
    lateGameWords,
    totalValidWords: wordCount,
    accuracy,
  };
}

/**
 * Analyze the player's word submission pattern over time
 * @param words - Array of word objects with timestamps
 * @param gameDuration - Total game duration in seconds
 * @returns Speed pattern and breakdown
 */
function analyzeSpeedPattern(words: WordData[], gameDuration: number): SpeedPatternAnalysis {
  if (!words.length || !words[0]?.timestamp) {
    // No timestamp data, return equal distribution
    const third = Math.ceil(words.length / 3);
    return {
      speedPattern: SPEED_PATTERNS.STEADY,
      earlyGameWords: third,
      midGameWords: third,
      lateGameWords: words.length - (third * 2),
    };
  }

  const thirdDuration = gameDuration / 3;

  let earlyGameWords = 0;
  let midGameWords = 0;
  let lateGameWords = 0;

  // Find the earliest timestamp to calculate relative times
  const timestamps = words.map(w => w.timestamp).filter((t): t is number => t !== undefined);
  const startTime = Math.min(...timestamps);

  words.forEach(word => {
    if (!word.timestamp) return;
    const elapsedSeconds = (word.timestamp - startTime) / 1000;

    if (elapsedSeconds < thirdDuration) {
      earlyGameWords++;
    } else if (elapsedSeconds < thirdDuration * 2) {
      midGameWords++;
    } else {
      lateGameWords++;
    }
  });

  // Determine speed pattern
  let speedPattern: SpeedPattern = SPEED_PATTERNS.STEADY;

  if (earlyGameWords > midGameWords && earlyGameWords > lateGameWords) {
    speedPattern = SPEED_PATTERNS.FAST_START;
  } else if (lateGameWords > earlyGameWords && lateGameWords > midGameWords) {
    speedPattern = SPEED_PATTERNS.STRONG_FINISH;
  } else if (earlyGameWords < midGameWords && midGameWords < lateGameWords) {
    speedPattern = SPEED_PATTERNS.MOMENTUM;
  }

  return {
    speedPattern,
    earlyGameWords,
    midGameWords,
    lateGameWords,
  };
}

/**
 * Get display info for a speed pattern
 * @param pattern - Speed pattern key
 * @returns Display info with icon and color
 */
export function getSpeedPatternDisplay(pattern: SpeedPattern): SpeedPatternDisplay {
  const displays: Record<SpeedPattern, SpeedPatternDisplay> = {
    [SPEED_PATTERNS.FAST_START]: {
      icon: '🚀',
      color: '#10B981', // green
    },
    [SPEED_PATTERNS.STRONG_FINISH]: {
      icon: '🏁',
      color: '#F59E0B', // amber
    },
    [SPEED_PATTERNS.MOMENTUM]: {
      icon: '📈',
      color: '#8B5CF6', // purple
    },
    [SPEED_PATTERNS.STEADY]: {
      icon: '⚖️',
      color: '#3B82F6', // blue
    },
  };

  return displays[pattern] || displays[SPEED_PATTERNS.STEADY];
}

/**
 * Calculate game-wide insights (for all players)
 * @param finalScores - Map of player scores { username: { score, words, validWords } }
 * @param letterGrid - The game's letter grid
 * @returns Game-wide statistics
 */
export function calculateGameInsights(
  finalScores: Record<string, PlayerScore>,
  letterGrid?: LetterGrid
): GameInsights {
  const players = Object.entries(finalScores);
  if (!players.length) {
    return {
      totalUniqueWords: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      totalWords: 0,
    };
  }

  const scores = players.map(([_, data]) => data.score || 0);
  const wordCounts = players.map(([_, data]) => {
    if (Array.isArray(data.validWords)) {
      return data.validWords.length;
    }
    return data.words || 0;
  });

  // Collect all unique valid words across players
  const allWords = new Set<string>();
  players.forEach(([_, data]) => {
    (data.validWords || []).forEach(word => {
      if (typeof word === 'string') {
        allWords.add(word.toLowerCase());
      } else if ((word as WordData)?.word) {
        allWords.add((word as WordData).word.toLowerCase());
      }
    });
  });

  return {
    totalUniqueWords: allWords.size,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    totalWords: wordCounts.reduce((a, b) => a + b, 0),
  };
}
