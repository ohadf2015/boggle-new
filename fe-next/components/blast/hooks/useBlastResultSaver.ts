import { useState, useEffect, useRef } from 'react';
import type { BlastResultsData, BlastDifficulty } from '../types';
import type { PersonalBests } from '@/app/api/blast/utils';
import { updateGuestStatsAfterGame } from '@/utils/guestManager';
import logger from '@/utils/logger';

interface BlastResultSaverReturn {
  saved: boolean;
  personalBests: PersonalBests | null;
  isNewBestScore: boolean;
  isNewBestCombo: boolean;
  error: string | null;
}

/**
 * Saves blast results to the API on mount.
 * Gracefully handles unauthenticated users (guests) — no error shown.
 */
export function useBlastResultSaver(
  results: BlastResultsData | null,
  difficulty: BlastDifficulty,
  language: string,
): BlastResultSaverReturn {
  const [state, setState] = useState<BlastResultSaverReturn>({
    saved: false,
    personalBests: null,
    isNewBestScore: false,
    isNewBestCombo: false,
    error: null,
  });
  const calledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (!results || calledRef.current) return;
    calledRef.current = true;

    async function save() {
      try {
        const response = await fetch('/api/blast/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score: results!.finalScore,
            tilesCleared: results!.tilesCleared,
            totalTiles: results!.totalTiles,
            clearPercentage: results!.clearPercentage,
            wordsFound: results!.wordsFound,
            bestWord: results!.bestWord,
            maxCombo: results!.maxCombo,
            stars: results!.stars,
            difficulty,
            language,
          }),
        });

        // 401 = guest user, save basic stats to localStorage as fallback
        if (response.status === 401) {
          try {
            updateGuestStatsAfterGame({
              score: results!.finalScore,
              wordCount: results!.wordsFound.length,
              isWinner: false,
            });
          } catch (guestErr) {
            logger.error('[useBlastResultSaver] Guest stats fallback failed:', guestErr);
          }
          if (mountedRef.current) {
            setState(s => ({ ...s, saved: false }));
          }
          return;
        }

        if (!response.ok) {
          const data = await response.json();
          logger.error('[useBlastResultSaver] Save failed:', data.error || response.status);
          if (mountedRef.current) {
            setState(s => ({ ...s, error: data.error || 'Failed to save', saved: false }));
          }
          return;
        }

        const data = await response.json();
        if (mountedRef.current) {
          setState({
            saved: true,
            personalBests: data.personalBests ?? null,
            isNewBestScore: data.isNewBestScore ?? false,
            isNewBestCombo: data.isNewBestCombo ?? false,
            error: null,
          });
        }
      } catch (err) {
        logger.error('[useBlastResultSaver] Error saving results:', err);
        if (mountedRef.current) {
          setState(s => ({
            ...s,
            error: err instanceof Error ? err.message : 'Unknown error',
            saved: false,
          }));
        }
      }
    }

    save();
  }, [results, difficulty, language]);

  return state;
}
