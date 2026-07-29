/**
 * Dictionary Validation Route
 * Same validation as multiplayer: dictionary + community checks
 * No AI calls during gameplay - pending words validated at game end
 */

import express, { Request, Response, Router, NextFunction } from 'express';
import logger from '../utils/logger';
 
import { createEndpointLimiter } from '../utils/apiRateLimiter';

// Import the same dictionary used by multiplayer
import { isDictionaryWord, dictionary, ensureLanguageLoaded } from '../dictionary';
import { isWordCommunityValid, isWordValidForScoring } from '../modules/communityWordManager';

const router: Router = express.Router();

// Rate limit: 300 requests per minute per IP
// Higher limit to accommodate multiple users on same network (family, office, cafe)
const dictionaryRateLimiter = createEndpointLimiter({
  maxRequests: 300,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
});

interface DictionaryCheckRequest extends Request {
  body: {
    word?: string;
    language?: string;
  };
}

interface DictionaryCheckResponse {
  isValid: boolean;
  source: 'dictionary' | 'community' | 'community_positive' | 'too_short' | 'not_loaded' | 'unknown' | 'error';
}

interface Dictionary {
  loaded: boolean;
}

/**
 * POST /api/dictionary/check
 * Same validation as multiplayer's wordHandler.js (lines 226-230)
 * Checks: dictionary -> community validated -> positive score
 */
router.post('/check', dictionaryRateLimiter, async (req: DictionaryCheckRequest, res: Response): Promise<void> => {
  const { word, language = 'en' } = req.body;

  if (!word || typeof word !== 'string') {
    res.status(400).json({ isValid: false, source: 'error' } as DictionaryCheckResponse);
    return;
  }

  const normalizedWord = word.toLowerCase().trim();

  if (normalizedWord.length < 2) {
    res.json({ isValid: false, source: 'too_short' } as DictionaryCheckResponse);
    return;
  }

  try {
    // Dictionaries are lazy-loaded per language (English-only at boot) and idle
    // languages can be UNLOADED by the memory manager. Without this await, any
    // non-English check (e.g. Hebrew daily challenge) hit an empty dictionary
    // and every word fell through to source:'unknown'. Ensure the requested
    // language is actually loaded before validating.
    const SUPPORTED = ['en', 'he', 'sv', 'ja', 'es', 'ru'];
    const lang = (SUPPORTED.includes(language) ? language : 'en') as import('@/shared/types').Language;
    if (SUPPORTED.includes(language)) {
      await ensureLanguageLoaded(lang);
    }

    // Check the REQUESTED language is loaded — the global `loaded` flag only
    // means English finished; lazy-loaded languages never set it.
    const dict = dictionary as Dictionary & { loadedLanguages?: Set<string> };
    const langLoaded = dict.loadedLanguages ? dict.loadedLanguages.has(lang) : dict.loaded;
    if (!langLoaded) {
      logger.warn('DICTIONARY', `Dictionary not loaded yet, returning unknown for: ${normalizedWord}`);
      res.json({ isValid: false, source: 'not_loaded' } as DictionaryCheckResponse);
      return;
    }

    // Same checks as multiplayer wordHandler.js lines 226-230:
    // const isInDictionary = isDictionaryWord(normalizedWord, game.language);
    // const isCommunityValidated = isWordCommunityValid(normalizedWord, game.language);
    // const hasPositiveScore = isWordValidForScoring(normalizedWord, game.language);
    // const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

    // Check 1: Local dictionary (same as multiplayer)
    const isInDictionary = isDictionaryWord(normalizedWord, lang);

    if (isInDictionary === true) {
      res.json({ isValid: true, source: 'dictionary' } as DictionaryCheckResponse);
      return;
    }

    // Check 2: Community validated (6+ net votes)
    const isCommunityValidated = isWordCommunityValid(normalizedWord, language);
    if (isCommunityValidated) {
      res.json({ isValid: true, source: 'community' } as DictionaryCheckResponse);
      return;
    }

    // Check 3: Has positive score from community
    const hasPositiveScore = isWordValidForScoring(normalizedWord, language);
    if (hasPositiveScore) {
      res.json({ isValid: true, source: 'community_positive' } as DictionaryCheckResponse);
      return;
    }

    // Not validated - needs AI validation at game end (like multiplayer's handlePendingWord)
    res.json({ isValid: false, source: 'unknown' } as DictionaryCheckResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('DICTIONARY', `Check error: ${err.message}`);
    res.json({ isValid: false, source: 'unknown' } as DictionaryCheckResponse);
  }
});

export default router;
