/**
 * The daily Word Wheel's golden word, server side: which word it is (from the
 * dictionary) and the once-a-day word-of-the-day payout when a signed-in
 * player's accepted words include it. The client only ever gets a key.
 */
import type { Request, Response } from 'express';
import type { Language } from '../../../types';
import { generateWordWheelPuzzle, type WordWheelPuzzle } from '../../../utils/dailyChallenge/wordWheelGeneration';
import { goldenWordKey, pangramCandidates, pickGoldenWord } from '../../../utils/dailyChallenge/wordWheelGolden';
import { isSubmittableDate } from '../../../utils/dailyChallenge/catchUp';
import { ensureLanguageLoaded, isValidWord } from '../../dictionary';
import { awardCoinsServer } from '../../services/economy/awardCoins';
import { WOTD_COIN_REWARD } from '../../modules/wordOfTheDayManager';
import { isValidDateFormat, isValidLanguage } from './utils';
import logger from '../../utils/logger';

// A few dates x languages: today plus the catch-up window. Strings only.
const cache = new Map<string, string | null>();
const CACHE_MAX = 32;

export function resetGoldenWordCache(): void {
  cache.clear();
}

/** The day's golden word (upper case), or null when the wheel has no 7-letter word. */
export async function goldenWordForPuzzle(puzzle: WordWheelPuzzle): Promise<string | null> {
  const id = `${puzzle.puzzleDate}|${puzzle.language}`;
  if (cache.has(id)) return cache.get(id) ?? null;
  await ensureLanguageLoaded(puzzle.language as Language);
  let cold = false;
  const isWord = (w: string) => {
    const verdict = isValidWord(w.toLowerCase(), puzzle.language as Language);
    if (verdict === null) cold = true;
    return verdict === true;
  };
  const golden = pickGoldenWord(pangramCandidates(puzzle.allLetters, isWord), puzzle.puzzleDate, puzzle.language);
  // A dictionary that failed to load answers null: don't remember "no golden word" from that.
  if (!cold) {
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(id, golden);
  }
  return golden;
}

interface GoldenPayoutInput {
  puzzle: WordWheelPuzzle;
  wordsFound: string[];
  playerId: string | null;
  /** Rows this player already has for this date in other languages (once per player per day). */
  otherLanguagesToday: number;
}

/**
 * Fresh-insert path only (a repeat submit returns before this), so the
 * one-row-per-player-per-day-per-language key plus the other-language check
 * keep it to one payout a day. Never throws: a dictionary or ledger failure
 * means no golden word, not a failed submit.
 */
export async function payGoldenWord({ puzzle, wordsFound, playerId, otherLanguagesToday }: GoldenPayoutInput): Promise<boolean> {
  try {
    const golden = await goldenWordForPuzzle(puzzle);
    const found = !!golden && wordsFound.some((w) => w.toUpperCase() === golden);
    if (!found || !playerId || otherLanguagesToday > 0) return found;
    const award = await awardCoinsServer(playerId, WOTD_COIN_REWARD, 'wotd_complete', {
      puzzleDate: puzzle.puzzleDate,
      language: puzzle.language,
      source: 'wheel_golden_word',
    });
    if (!award.success) logger.warn('API', `[WordWheel] golden word coins not awarded to ${playerId}: ${award.error}`);
    return true;
  } catch (error) {
    logger.error('API', `[WordWheel] golden word check failed: ${(error as Error).message}`);
    return false;
  }
}

/** GET /golden/:date/:language: a key for the day's golden word (null on a day without one). */
export async function handleGoldenWordKey(req: Request, res: Response): Promise<void> {
  const { date, language } = req.params as { date: string; language: string };
  if (!isValidDateFormat(date) || !isValidLanguage(language)) {
    res.status(400).json({ error: 'Invalid puzzle date or language' });
    return;
  }
  if (!isSubmittableDate(new Date().toISOString().split('T')[0], date)) {
    res.status(400).json({ error: 'Invalid puzzle date' });
    return;
  }
  try {
    const golden = await goldenWordForPuzzle(generateWordWheelPuzzle(date, language as Language));
    res.json({ key: golden ? goldenWordKey(golden, date, language) : null });
  } catch (error) {
    logger.error('API', `[WordWheel] golden key error: ${(error as Error).message}`);
    res.status(500).json({ error: 'Internal server error' });
  }
}
