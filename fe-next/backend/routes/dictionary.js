/**
 * Dictionary Validation Route
 * Same validation as multiplayer: dictionary + community checks
 * No AI calls during gameplay - pending words validated at game end
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { createEndpointLimiter } = require('../utils/apiRateLimiter');

// Import the same dictionary used by multiplayer
const { isDictionaryWord, dictionary } = require('../dictionary');
const { isWordCommunityValid, isWordValidForScoring } = require('../modules/communityWordManager');

// Rate limit: 300 requests per minute per IP
// Higher limit to accommodate multiple users on same network (family, office, cafe)
const dictionaryRateLimiter = createEndpointLimiter({
  maxRequests: 300,
  windowMs: 60000,
  blockDurationMs: 300000, // 5 min block if abused
});

/**
 * POST /api/dictionary/check
 * Same validation as multiplayer's wordHandler.js (lines 226-230)
 * Checks: dictionary → community validated → positive score
 */
router.post('/check', dictionaryRateLimiter, async (req, res) => {
  const { word, language = 'en' } = req.body;

  if (!word || typeof word !== 'string') {
    return res.status(400).json({ isValid: false, source: 'error' });
  }

  const normalizedWord = word.toLowerCase().trim();

  if (normalizedWord.length < 2) {
    return res.json({ isValid: false, source: 'too_short' });
  }

  try {
    // Check if dictionary is loaded
    if (!dictionary.loaded) {
      logger.warn('DICTIONARY', `Dictionary not loaded yet, returning unknown for: ${normalizedWord}`);
      return res.json({ isValid: false, source: 'not_loaded' });
    }

    // Same checks as multiplayer wordHandler.js lines 226-230:
    // const isInDictionary = isDictionaryWord(normalizedWord, game.language);
    // const isCommunityValidated = isWordCommunityValid(normalizedWord, game.language);
    // const hasPositiveScore = isWordValidForScoring(normalizedWord, game.language);
    // const shouldAutoValidate = isInDictionary || isCommunityValidated || hasPositiveScore;

    // Check 1: Local dictionary (same as multiplayer)
    const isInDictionary = isDictionaryWord(normalizedWord, language);

    if (isInDictionary === true) {
      return res.json({ isValid: true, source: 'dictionary' });
    }

    // Check 2: Community validated (6+ net votes)
    const isCommunityValidated = isWordCommunityValid(normalizedWord, language);
    if (isCommunityValidated) {
      return res.json({ isValid: true, source: 'community' });
    }

    // Check 3: Has positive score from community
    const hasPositiveScore = isWordValidForScoring(normalizedWord, language);
    if (hasPositiveScore) {
      return res.json({ isValid: true, source: 'community_positive' });
    }

    // Not validated - needs AI validation at game end (like multiplayer's handlePendingWord)
    return res.json({ isValid: false, source: 'unknown' });
  } catch (error) {
    logger.error('DICTIONARY', `Check error: ${error.message}`);
    return res.json({ isValid: false, source: 'unknown' });
  }
});

module.exports = router;
