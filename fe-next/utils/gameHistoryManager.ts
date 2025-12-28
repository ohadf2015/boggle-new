/**
 * Game History Manager
 * Tracks player performance across multiple games for improvement visualization
 * Works for both guest (localStorage) and authenticated users
 */

import logger from '@/utils/logger';

const GAME_HISTORY_KEY = 'boggle_game_history';
const MAX_GAMES_TO_TRACK = 20; // Keep last 20 games for chart

export interface GameHistoryEntry {
  id: string;
  timestamp: number;
  score: number;
  wordCount: number;
  accuracy: number; // percentage 0-100
  rank?: number; // 1-based rank in multiplayer
  totalPlayers?: number;
  mode: 'single' | 'multiplayer' | 'daily';
  isWinner?: boolean;
  longestWordLength?: number;
}

export interface GameHistoryData {
  entries: GameHistoryEntry[];
  lastUpdated: number;
}

/**
 * Get game history from localStorage
 */
export function getGameHistory(): GameHistoryData {
  if (typeof window === 'undefined') {
    return { entries: [], lastUpdated: 0 };
  }

  try {
    const data = localStorage.getItem(GAME_HISTORY_KEY);
    if (!data) {
      return { entries: [], lastUpdated: 0 };
    }
    const parsed = JSON.parse(data) as GameHistoryData;
    // Ensure entries array exists and is valid
    if (!Array.isArray(parsed.entries)) {
      return { entries: [], lastUpdated: 0 };
    }
    return parsed;
  } catch (error) {
    logger.error('Error reading game history:', error);
    return { entries: [], lastUpdated: 0 };
  }
}

/**
 * Save game history to localStorage
 */
function saveGameHistory(data: GameHistoryData): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error('Error saving game history:', error);
  }
}

/**
 * Add a new game to history
 */
export function addGameToHistory(entry: Omit<GameHistoryEntry, 'id' | 'timestamp'>): GameHistoryEntry {
  const history = getGameHistory();

  const newEntry: GameHistoryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  // Add to beginning (most recent first)
  history.entries.unshift(newEntry);

  // Keep only the last MAX_GAMES_TO_TRACK games
  if (history.entries.length > MAX_GAMES_TO_TRACK) {
    history.entries = history.entries.slice(0, MAX_GAMES_TO_TRACK);
  }

  history.lastUpdated = Date.now();
  saveGameHistory(history);

  logger.log('[GameHistory] Added game:', newEntry);
  return newEntry;
}

/**
 * Get entries formatted for the chart (oldest to newest for proper line progression)
 */
export function getChartData(limit: number = 10): GameHistoryEntry[] {
  const history = getGameHistory();
  // Return entries in chronological order (oldest first)
  return history.entries.slice(0, limit).reverse();
}

/**
 * Calculate performance trends
 */
export interface PerformanceTrend {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  averageScore: number;
  bestScore: number;
  totalGames: number;
  recentAverage: number;
}

export function calculateTrend(): PerformanceTrend {
  const history = getGameHistory();
  const entries = history.entries;

  if (entries.length === 0) {
    return {
      direction: 'stable',
      percentChange: 0,
      averageScore: 0,
      bestScore: 0,
      totalGames: 0,
      recentAverage: 0,
    };
  }

  const totalGames = entries.length;
  const scores = entries.map(e => e.score);
  const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const bestScore = Math.max(...scores);

  // Calculate recent average (last 3 games) vs earlier average
  const recentGames = entries.slice(0, Math.min(3, entries.length));
  const recentAverage = Math.round(
    recentGames.reduce((a, b) => a + b.score, 0) / recentGames.length
  );

  let direction: 'up' | 'down' | 'stable' = 'stable';
  let percentChange = 0;

  if (entries.length >= 4) {
    const earlierGames = entries.slice(3, Math.min(6, entries.length));
    if (earlierGames.length > 0) {
      const earlierAverage =
        earlierGames.reduce((a, b) => a + b.score, 0) / earlierGames.length;

      if (earlierAverage > 0) {
        percentChange = Math.round(((recentAverage - earlierAverage) / earlierAverage) * 100);
        if (percentChange > 10) direction = 'up';
        else if (percentChange < -10) direction = 'down';
      }
    }
  }

  return {
    direction,
    percentChange,
    averageScore,
    bestScore,
    totalGames,
    recentAverage,
  };
}

/**
 * Get a fun milestone label based on performance
 */
export function getMilestoneLabel(score: number, previousBest: number, gameNumber: number): string | null {
  // First game
  if (gameNumber === 1) return '🐣 First Steps!';

  // Personal best
  if (score > previousBest && previousBest > 0) return '🏆 New Personal Best!';

  // Score milestones
  if (score >= 200) return '🌟 Superstar!';
  if (score >= 150) return '🚀 On Fire!';
  if (score >= 100) return '💪 Word Warrior';
  if (score >= 75) return '🧠 Big Brain Time';
  if (score >= 50) return '👍 Getting Better!';

  return null;
}

/**
 * Get a funny trend message
 */
export function getTrendMessage(trend: PerformanceTrend): string {
  const { direction, percentChange, totalGames } = trend;

  if (totalGames < 2) return 'Play more to see your trend!';

  if (direction === 'up') {
    if (percentChange > 30) return "You're absolutely crushing it! 🔥";
    if (percentChange > 15) return "On your way to word domination! 📈";
    return "Steady improvement, nice! 👆";
  }

  if (direction === 'down') {
    if (percentChange < -30) return "Rough day? We all have them! 💪";
    if (percentChange < -15) return "Warming up for a comeback! 🎯";
    return "A tiny dip, no worries! 🌊";
  }

  return "Holding steady like a pro! ⚖️";
}

/**
 * Clear game history
 */
export function clearGameHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(GAME_HISTORY_KEY);
    logger.log('[GameHistory] Cleared game history');
  } catch (error) {
    logger.error('Error clearing game history:', error);
  }
}
