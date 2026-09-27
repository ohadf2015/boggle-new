'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseRivalFromParams } from '@/utils/dailyChallenge/rivalChallenge';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { getPuzzleNumber } from '@/utils/dailyChallenge/dateUtils';

/**
 * Hook for capturing and persisting daily challenge rival data
 *
 * Reads rival challenge params from URL (whName, whEmoji, whScore, whPuzzle, whStreak)
 * and persists them to sessionStorage if valid and from today's puzzle.
 *
 * Only runs once per mount (checked via ref).
 *
 * @param todaysPuzzleNumber - Optional puzzle number for today. If not provided, calculated from current date.
 */
export function useDailyRivalChallenge(todaysPuzzleNumber?: number): void {
  const searchParams = useSearchParams();
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    try {
      // Extract rival params from URL
      const whName = searchParams.get('whName');
      const whEmoji = searchParams.get('whEmoji');
      const whScore = searchParams.get('whScore');
      const whPuzzle = searchParams.get('whPuzzle');
      const whStreak = searchParams.get('whStreak');

      // Skip if no rival params present
      if (!whName || !whEmoji || !whScore || !whPuzzle) {
        return;
      }

      // Parse and validate the params
      const params = {
        whName,
        whEmoji,
        whScore,
        whPuzzle,
      };

      // Use provided puzzle number or calculate today's
      const puzzleNumberToValidate = todaysPuzzleNumber ?? getPuzzleNumber();
      const rival = parseRivalFromParams(params, puzzleNumberToValidate);

      if (!rival) {
        // Stale link or invalid params - don't track
        return;
      }

      // Persist to sessionStorage for DailyChallengeResults to read
      sessionStorage.setItem(
        'daily_challenge_rival',
        JSON.stringify({
          name: rival.name,
          emoji: rival.emoji,
          score: rival.score,
          puzzleNumber: rival.puzzleNumber,
        })
      );

      // Track that the rival challenge invite landed
      trackGrowthEvent('daily_rival_landed', {
        source: 'daily_share',
      });
    } catch (error) {
      // Silent fail - don't break the page if parsing fails
      console.error('Failed to process daily rival challenge:', error);
    }
  }, [searchParams, todaysPuzzleNumber]);
}
