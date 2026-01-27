/**
 * Daily Challenge Puzzle Routes
 * GET /api/daily-challenge/puzzle/:date/:language
 */

import { Router, Request, Response } from 'express';
import type { Language } from '../../../types';
import logger from '../../utils/logger';
import { generateDailyPuzzle } from '../../../utils/dailyChallenge';
import { generateDailyPuzzleAsync } from '../../../utils/dailyChallenge/gridGeneration.server';
import { LeaderboardParams } from './types';
import { isValidDateFormat, isValidLanguage } from './utils';

import { getCachedDailyPuzzle, cacheDailyPuzzle } from '../../redisClient';
import { coalesce } from '../../utils/requestCoalescing';

const router = Router();

/**
 * GET /puzzle/:date/:language
 * Get the daily puzzle for a specific date and language
 * This endpoint returns the AI-selected word if available, otherwise deterministic
 */
router.get('/:date/:language', async (req: Request<LeaderboardParams>, res: Response): Promise<void> => {
  try {
    const { date, language } = req.params;

    // Validate date format
    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    // Validate language
    if (!isValidLanguage(language)) {
      res.status(400).json({ error: 'Invalid language code' });
      return;
    }

    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');

    const cached = await getCachedDailyPuzzle(date, language);
    if (cached) {
      res.json(cached);
      return;
    }

    const result = await coalesce(`daily:puzzle:${language}:${date}`, async () => {
      const recheck = await getCachedDailyPuzzle(date, language);
      if (recheck) return recheck;

      const puzzle = await generateDailyPuzzleAsync(date, language as Language);
      const payload = {
        grid: puzzle.grid,
        targetWord: puzzle.targetWord,
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language,
      };

      await cacheDailyPuzzle(date, language, payload);
      return payload;
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Daily puzzle error: ${err.message}`);

    // Fall back to sync version on error
    try {
      const { date, language } = req.params;
      const puzzle = generateDailyPuzzle(date, language as Language);
      res.json({
        grid: puzzle.grid,
        targetWord: puzzle.targetWord,
        puzzleDate: puzzle.puzzleDate,
        puzzleNumber: puzzle.puzzleNumber,
        language: puzzle.language
      });
    } catch (fallbackError) {
      res.status(500).json({ error: 'Failed to generate puzzle' });
    }
  }
});

export default router;
