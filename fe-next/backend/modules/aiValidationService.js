/**
 * AI Validation Service Wrapper
 * CommonJS wrapper for the TypeScript GameAIService
 * Provides AI-powered word validation for solo host games
 */

const logger = require('../utils/logger');

// Cache the AI service instance
let gameAIServicePromise = null;

/**
 * Get or initialize the AI service instance
 * Uses dynamic import to load the TypeScript module
 */
async function getAIService() {
  if (!gameAIServicePromise) {
    gameAIServicePromise = (async () => {
      try {
        // Dynamic import of the TypeScript module
        const aiModule = await import('../../lib/ai-service.ts');
        return aiModule.gameAIService;
      } catch (error) {
        logger.error('AI_SERVICE', `Failed to load AI service: ${error.message}`);
        return null;
      }
    })();
  }
  return gameAIServicePromise;
}

/**
 * Check if AI service is available and configured
 * @returns {Promise<boolean>}
 */
async function isAIServiceAvailable() {
  try {
    const service = await getAIService();
    if (!service) return false;
    return await service.isConfigured();
  } catch (error) {
    logger.debug('AI_SERVICE', `AI service not available: ${error.message}`);
    return false;
  }
}

/**
 * Validate a word using AI
 * @param {string} word - The word to validate
 * @param {string} language - Language code (e.g., 'en', 'sv')
 * @returns {Promise<{isValid: boolean, isAiVerified: boolean, reason?: string}>}
 */
async function validateWordWithAI(word, language = 'en') {
  try {
    const service = await getAIService();
    if (!service) {
      return { isValid: false, isAiVerified: false, reason: 'AI service not available' };
    }

    const result = await service.validateAndSaveWord(word, language);

    return {
      isValid: result.isValid,
      isAiVerified: result.source === 'ai',
      reason: result.reason || (result.isValid ? 'Valid word' : 'Invalid word')
    };
  } catch (error) {
    logger.error('AI_SERVICE', `AI validation failed for "${word}": ${error.message}`);
    return { isValid: false, isAiVerified: false, reason: 'Validation error' };
  }
}

/**
 * Batch validate multiple words
 * @param {string[]} words - Array of words to validate
 * @param {string} language - Language code
 * @returns {Promise<Map<string, {isValid: boolean, isAiVerified: boolean}>>}
 */
async function validateWordsWithAI(words, language = 'en') {
  const results = new Map();

  try {
    const service = await getAIService();
    if (!service) {
      words.forEach(word => {
        results.set(word, { isValid: false, isAiVerified: false });
      });
      return results;
    }

    // Use the batch validation method
    const aiResults = await service.validateWords(words, language);

    words.forEach((word, index) => {
      const result = aiResults[index];
      results.set(word, {
        isValid: result?.isValid || false,
        isAiVerified: result?.source === 'ai'
      });
    });

    return results;
  } catch (error) {
    logger.error('AI_SERVICE', `Batch AI validation failed: ${error.message}`);
    words.forEach(word => {
      results.set(word, { isValid: false, isAiVerified: false });
    });
    return results;
  }
}

module.exports = {
  isAIServiceAvailable,
  validateWordWithAI,
  validateWordsWithAI
};
