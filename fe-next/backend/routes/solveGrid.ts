/**
 * Solve Grid API Routes
 * Handles /api/solve-grid endpoint for single-player bot simulation
 */

import express, { Request, Response, Router, NextFunction } from 'express';
 
const { ensureLanguageLoaded } = require('../dictionary');
 
const { findWordsForBots } = require('../modules/boggleSolver');
import logger from '../utils/logger';

const router: Router = express.Router();

// ==================== Types ====================

interface RateLimitData {
  count: number;
  resetTime: number;
}

interface SolveGridRequest extends Request {
  body: {
    grid?: string[][];
    language?: string;
  };
}

interface BotWords {
  easy: string[];
  medium: string[];
  hard: string[];
}

interface SolveGridResponse {
  success: boolean;
  words?: BotWords;
  error?: string;
}

interface BlacklistEntry {
  word: string;
}

// ==================== Rate Limiting ====================

// Rate limiting store (simple in-memory)
const rateLimitStore: Map<string, RateLimitData> = new Map();
const RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60000,
};
const RATE_LIMIT_SWEEP_THRESHOLD = 5000;

/**
 * Simple rate limiter middleware
 */
function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || (req.headers['x-forwarded-for'] as string) || 'unknown';
  const now = Date.now();

  // Expired entries are otherwise only overwritten when that same IP returns,
  // so one-shot IPs accumulate forever. Sweep when the map gets large rather
  // than on a timer — the work is bounded and costs nothing at normal size.
  // ponytail: size-triggered sweep; swap for an LRU only if 5k proves too big.
  if (rateLimitStore.size > RATE_LIMIT_SWEEP_THRESHOLD) {
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) rateLimitStore.delete(key);
    }
  }

  const data = rateLimitStore.get(ip);
  if (!data || now > data.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    next();
    return;
  }

  data.count++;
  if (data.count > RATE_LIMIT.maxRequests) {
    res.status(429).json({
      success: false,
      error: 'Too many requests',
    } as SolveGridResponse);
    return;
  }

  next();
}

/**
 * Filter blacklisted words from bot word list
 */
async function filterBlacklistedWords(words: BotWords, language: string): Promise<BotWords> {
  const { getSupabase } = require('../modules/supabaseServer');
  const supabase = getSupabase();

  if (!supabase) {
    logger.debug('SOLVE-GRID', 'Supabase not configured, skipping blacklist filter');
    return words;
  }

  try {
    const { data: blacklist, error } = await supabase
      .from('bot_word_blacklist')
      .select('word')
      .eq('language', language);

    if (error) {
      // Truncate error message — Supabase 502s return full HTML pages as error.message
      const errMsg = error.message.startsWith('<!') ? 'Supabase 502 Bad Gateway' : error.message.slice(0, 200);
      logger.debug('SOLVE-GRID', `Blacklist query error (returning unfiltered): ${errMsg}`);
      return words; // Return unfiltered on error — graceful degradation
    }

    const blacklistedSet = new Set(
      ((blacklist || []) as BlacklistEntry[]).map((b: BlacklistEntry) => b.word.toLowerCase())
    );

    return {
      easy: words.easy.filter((w: string) => !blacklistedSet.has(w.toLowerCase())),
      medium: words.medium.filter((w: string) => !blacklistedSet.has(w.toLowerCase())),
      hard: words.hard.filter((w: string) => !blacklistedSet.has(w.toLowerCase()))
    };
  } catch (err) {
    const error = err as Error;
    logger.debug('SOLVE-GRID', `Blacklist filter error (returning unfiltered): ${error.message}`);
    return words; // Graceful degradation
  }
}

/**
 * POST /api/solve-grid
 * Find all valid words on a Boggle grid for bot simulation
 */
router.post('/', rateLimit, async (req: SolveGridRequest, res: Response): Promise<void> => {
  const { grid, language = 'en' } = req.body;

  // Validate grid
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    res.status(400).json({
      success: false,
      error: 'Grid is required and must be a 2D array',
    } as SolveGridResponse);
    return;
  }

  // Validate grid structure (must be rectangular)
  const rowLength = grid[0]?.length || 0;
  if (!grid.every((row: unknown) => Array.isArray(row) && (row as string[]).length === rowLength)) {
    res.status(400).json({
      success: false,
      error: 'Grid must be rectangular (all rows same length)',
    } as SolveGridResponse);
    return;
  }

  // Validate grid size (4x4 to 11x11 - matches DIFFICULTIES in consts.ts)
  if (grid.length < 4 || grid.length > 11 || rowLength < 4 || rowLength > 11) {
    res.status(400).json({
      success: false,
      error: 'Grid must be between 4x4 and 11x11',
    } as SolveGridResponse);
    return;
  }

  try {
    // Load THIS language, not load(): the global loader early-returns as soon as
    // `loaded` is set, and boot sets it after English alone. Every non-English
    // request was therefore solved against an empty word Set.
    await ensureLanguageLoaded(language);

    const words = findWordsForBots(grid, language, {
      minLength: 3,
      maxLength: 10,
    }) as BotWords;

    // Filter out blacklisted words
    const filteredWords = await filterBlacklistedWords(words, language);

    // The 30s global Express timeout may have answered already on a slow solve.
    if (!res.headersSent) {
      res.json({
        success: true,
        words: filteredWords,
      } as SolveGridResponse);
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SOLVE-GRID', `Error: ${msg}`);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Failed to solve grid',
      } as SolveGridResponse);
    }
  }
});

export default router;
