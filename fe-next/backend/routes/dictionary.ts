/**
 * Dictionary Validation Route
 * Same validation as multiplayer: dictionary + community checks
 * No AI calls during gameplay - pending words validated at game end
 */

import express, { Request, Response, Router, NextFunction } from 'express';
import logger from '../utils/logger';
 
import { createEndpointLimiter } from '../utils/apiRateLimiter';

// Import the same dictionary used by multiplayer
 
const { isDictionaryWord, dictionary } = require('../dictionary');
 
const { isWordCommunityValid, isWordValidForScoring } = require('../modules/communityWordManager');

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
    // Check if dictionary is loaded
    const dict = dictionary as Dictionary;
    if (!dict.loaded) {
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
    const isInDictionary = isDictionaryWord(normalizedWord, language);

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
