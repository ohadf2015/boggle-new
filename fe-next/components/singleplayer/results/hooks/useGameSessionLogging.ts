/**
 * useGameSessionLogging - Log game session to database for analytics
 *
 * Records game session data for admin analytics and tracking.
 * Runs for all users (auth and guest).
 */

import { useEffect, useRef } from 'react';
import { logGameStart, logGameEnd, formatWordsForLogging } from '@/utils/gameLogger';
import logger from '@/utils/logger';
import type { SinglePlayerResultsData } from '../../SinglePlayerView';

interface UseGameSessionLoggingParams {
  results: SinglePlayerResultsData;
  language: string;
  userId: string | undefined;
  playerRank: number;
}

/**
 * Hook to log game session to database for analytics
 * Runs once per results view for all users
 */
export function useGameSessionLogging({
  results,
  language,
  userId,
  playerRank,
}: UseGameSessionLoggingParams): void {
  const hasLoggedGameSessionRef = useRef(false);

  useEffect(() => {
    if (hasLoggedGameSessionRef.current) return;

    async function logSession(): Promise<void> {
      try {
        const validWords = results.playerWordData?.filter(w => w.isValid) || [];
        const wordDetails = validWords.map(w => ({
          word: w.word,
          points: w.score || 0,
          timestamp: Date.now()
        }));

        // Start and immediately complete the session (single player game is already done)
        const sessionId = await logGameStart({
          mode: 'singleplayer',
          language,
          userId: userId || null,
        });

        if (sessionId) {
          await logGameEnd(sessionId, {
            score: results.playerScore,
            wordsFound: formatWordsForLogging(validWords.map(w => w.word), wordDetails),
            durationSeconds: results.gameDuration || 0,
            completed: true,
            finalRank: playerRank,
          });
        }
      } catch (error) {
        logger.error('[useGameSessionLogging] Failed to log game session:', error);
      }
    }

    void logSession();
    hasLoggedGameSessionRef.current = true;
  }, [results, language, userId, playerRank]);
}
