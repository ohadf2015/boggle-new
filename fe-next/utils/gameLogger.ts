/**
 * Game Logger Utility
 * Client-side utility for logging game sessions and events
 */

import { getGuestSessionId, getDeviceInfo, isFirstVisit } from './sessionTracking';

export interface WordFound {
  word: string;
  timestamp: number;
  points: number;
  length: number;
}

export interface GameStartParams {
  mode: 'singleplayer' | 'multiplayer' | 'daily_challenge';
  language: string;
  difficulty?: string;
  userId?: string | null;

  // Daily challenge specific
  dailyPuzzleNumber?: number;
  targetWord?: string;

  // Multiplayer specific
  roomCode?: string;
  playerCount?: number;
}

export interface GameEndParams {
  score: number;
  wordsFound: WordFound[];
  durationSeconds: number;
  completed: boolean;

  // Daily challenge specific
  targetFound?: boolean;
  attemptsUsed?: number;
  lifeRemaining?: number;
  lifeGained?: number;
  tokensEarned?: number;
  tokensSpent?: number;
  cluesUsed?: number;

  // Multiplayer specific
  finalRank?: number;
}

// Timeout for analytics requests (fail fast to not block gameplay)
const ANALYTICS_TIMEOUT_MS = 5000;

/**
 * Fetch with timeout - aborts if request takes too long
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Log game start
 * Returns the session ID for later updates
 */
export async function logGameStart(params: GameStartParams): Promise<string | null> {
  try {
    const deviceInfo = getDeviceInfo();
    const isFirst = isFirstVisit();

    // Determine player identification
    let userId = params.userId || null;
    let guestSessionId = null;

    if (!userId) {
      guestSessionId = getGuestSessionId();
      // Skip logging if no session ID available (SSR, localStorage unavailable, etc.)
      if (!guestSessionId) {
        return null;
      }
    }

    const response = await fetchWithTimeout(
      '/api/analytics/log-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start',
          userId,
          guestSessionId,
          mode: params.mode,
          language: params.language,
          difficulty: params.difficulty || null,
          dailyPuzzleNumber: params.dailyPuzzleNumber || null,
          targetWord: params.targetWord || null,
          roomCode: params.roomCode || null,
          playerCount: params.playerCount || null,
          deviceType: deviceInfo.deviceType,
          browser: deviceInfo.browser,
          isFirstGame: isFirst,
          startedAt: new Date().toISOString(),
        }),
      },
      ANALYTICS_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.debug('[Analytics] Failed to log game start:', response.status, errorData?.error || 'Unknown error');
      return null;
    }

    const data = await response.json();
    return data.sessionId;
  } catch (error) {
    // AbortError means timeout - this is expected and shouldn't spam console
    if (error instanceof Error && error.name === 'AbortError') {
      // Use debug level - timeouts are expected in high-latency situations
      console.debug('[Analytics] Game start logging timed out (non-blocking)');
    } else {
      // Use debug for other errors too since analytics is non-critical
      console.debug('[Analytics] Error logging game start:', error);
    }
    return null;
  }
}

/**
 * Log game end / update session
 */
export async function logGameEnd(
  sessionId: string,
  params: GameEndParams
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      '/api/analytics/log-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          sessionId,
          score: params.score,
          wordsFound: params.wordsFound,
          durationSeconds: params.durationSeconds,
          completed: params.completed,
          targetFound: params.targetFound,
          attemptsUsed: params.attemptsUsed,
          lifeRemaining: params.lifeRemaining,
          lifeGained: params.lifeGained,
          tokensEarned: params.tokensEarned,
          tokensSpent: params.tokensSpent,
          cluesUsed: params.cluesUsed,
          finalRank: params.finalRank,
          completedAt: new Date().toISOString(),
        }),
      },
      ANALYTICS_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.debug('[Analytics] Failed to log game end:', response.status, errorData?.error || 'Unknown error');
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Use debug level - timeouts are expected in high-latency situations
      console.debug('[Analytics] Game end logging timed out (non-blocking)');
    } else {
      console.debug('[Analytics] Error logging game end:', error);
    }
    return false;
  }
}

/**
 * Update game session mid-game (for incremental updates)
 */
export async function updateGameSession(
  sessionId: string,
  updates: Partial<GameEndParams>
): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(
      '/api/analytics/log-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update',
          sessionId,
          ...updates,
        }),
      },
      ANALYTICS_TIMEOUT_MS
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.debug('[Analytics] Failed to update game session:', response.status, errorData?.error || 'Unknown error');
      return false;
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Use debug level - timeouts are expected in high-latency situations
      console.debug('[Analytics] Game session update timed out (non-blocking)');
    } else {
      console.debug('[Analytics] Error updating game session:', error);
    }
    return false;
  }
}

/**
 * Get current player session info
 */
export function getCurrentPlayerSession(userId?: string | null): {
  userId: string | null;
  guestSessionId: string | null;
} {
  if (userId) {
    return {
      userId,
      guestSessionId: null,
    };
  }

  return {
    userId: null,
    guestSessionId: getGuestSessionId(),
  };
}

/**
 * Format words found for logging
 */
export function formatWordsForLogging(
  words: string[],
  wordDetails?: Array<{ word: string; points?: number; timestamp?: number }>
): WordFound[] {
  if (wordDetails && wordDetails.length > 0) {
    return wordDetails.map((detail) => ({
      word: detail.word,
      timestamp: detail.timestamp || Date.now(),
      points: detail.points || 0,
      length: detail.word.length,
    }));
  }

  // Fallback: create basic entries from word list
  return words.map((word) => ({
    word,
    timestamp: Date.now(),
    points: 0,
    length: word.length,
  }));
}

/**
 * Calculate game duration
 */
export function calculateGameDuration(startTime: number): number {
  return Math.floor((Date.now() - startTime) / 1000);
}
