/**
 * Game Insights Calculator
 * Provides detailed post-game statistics and analysis for players
 */

import type { LetterGrid } from '@/types';

/**
 * Speed pattern categories based on word submission timing
 */
export const SPEED_PATTERNS = {
  FAST_START: 'fastStart',       // Most words in first third
  STRONG_FINISH: 'strongFinish', // Most words in last third
  MOMENTUM: 'momentum',          // Words increase over time
  STEADY: 'steady',              // Even distribution
  FADE_OUT: 'fadeOut',           // Words decrease over time (early > mid > late)
  MID_GAME_PEAK: 'midGamePeak',  // Most words in middle third
  BURST_MODE: 'burstMode',       // Very uneven distribution (one phase dominates)
  SLOW_STARTER: 'slowStarter',   // Weak early game, then picks up
  SECOND_WIND: 'secondWind',     // Dip in middle, strong finish
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

  // Determine speed pattern with more nuanced detection
  const speedPattern = determineSpeedPattern(earlyGameWords, midGameWords, lateGameWords);

  return {
    speedPattern,
    earlyGameWords,
    midGameWords,
    lateGameWords,
  };
}

/**
 * Determine the speed pattern based on word distribution across game phases
 * Uses a more sophisticated analysis to avoid defaulting to "steady"
 */
function determineSpeedPattern(early: number, mid: number, late: number): SpeedPattern {
  const total = early + mid + late;

  // Handle edge cases
  if (total === 0) return SPEED_PATTERNS.STEADY;
  if (total <= 2) return SPEED_PATTERNS.STEADY; // Too few words to determine pattern

  // Calculate percentages for each phase
  const earlyPct = (early / total) * 100;
  const midPct = (mid / total) * 100;
  const latePct = (late / total) * 100;

  // Calculate the expected percentage for even distribution (33.3%)
  const expectedPct = 100 / 3;

  // Calculate variance from expected (how "uneven" the distribution is)
  const variance = Math.abs(earlyPct - expectedPct) + Math.abs(midPct - expectedPct) + Math.abs(latePct - expectedPct);

  // If distribution is very even (low variance), it's steady
  if (variance < 15) {
    return SPEED_PATTERNS.STEADY;
  }

  // Check for burst mode (one phase has 60%+ of words)
  if (earlyPct >= 60) return SPEED_PATTERNS.BURST_MODE;
  if (midPct >= 60) return SPEED_PATTERNS.BURST_MODE;
  if (latePct >= 60) return SPEED_PATTERNS.BURST_MODE;

  // Check for clear ascending pattern (momentum)
  if (early < mid && mid < late && latePct >= 40) {
    return SPEED_PATTERNS.MOMENTUM;
  }

  // Check for clear descending pattern (fade out)
  if (early > mid && mid > late && earlyPct >= 40) {
    return SPEED_PATTERNS.FADE_OUT;
  }

  // Check for mid-game peak (middle has most words by significant margin)
  if (mid > early && mid > late && midPct >= 40) {
    return SPEED_PATTERNS.MID_GAME_PEAK;
  }

  // Check for second wind (dip in middle, strong finish)
  if (mid < early && mid < late && latePct >= 35) {
    return SPEED_PATTERNS.SECOND_WIND;
  }

  // Check for slow starter (weak early, then picks up - either mid or late dominates)
  if (earlyPct < 20 && (midPct >= 35 || latePct >= 35)) {
    return SPEED_PATTERNS.SLOW_STARTER;
  }

  // Fast start - early game dominates
  if (earlyPct >= 40 && early > mid && early > late) {
    return SPEED_PATTERNS.FAST_START;
  }

  // Strong finish - late game dominates
  if (latePct >= 40 && late > early && late > mid) {
    return SPEED_PATTERNS.STRONG_FINISH;
  }

  // If early is strongest but not dominant enough for fast start
  if (early >= mid && early >= late) {
    return SPEED_PATTERNS.FAST_START;
  }

  // If late is strongest but not dominant enough for strong finish
  if (late >= early && late >= mid) {
    return SPEED_PATTERNS.STRONG_FINISH;
  }

  // Default fallback
  return SPEED_PATTERNS.STEADY;
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
    [SPEED_PATTERNS.FADE_OUT]: {
      icon: '📉',
      color: '#EF4444', // red
    },
    [SPEED_PATTERNS.MID_GAME_PEAK]: {
      icon: '⛰️',
      color: '#06B6D4', // cyan
    },
    [SPEED_PATTERNS.BURST_MODE]: {
      icon: '💥',
      color: '#EC4899', // pink
    },
    [SPEED_PATTERNS.SLOW_STARTER]: {
      icon: '🐢',
      color: '#84CC16', // lime
    },
    [SPEED_PATTERNS.SECOND_WIND]: {
      icon: '🌊',
      color: '#0EA5E9', // sky blue
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
