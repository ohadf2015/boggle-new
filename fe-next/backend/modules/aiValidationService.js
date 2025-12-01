/**
 * AI Validation Service Wrapper
 * CommonJS wrapper for the GameAIService
 * Provides AI-powered word validation for solo host games
 */

const logger = require('../utils/logger');
const { gameAIService } = require('./gameAIService');

/**
 * Get the AI service instance
 * @returns {Object} The game AI service instance
 */
function getAIService() {
  return gameAIService;
}

/**
 * Check if AI service is available and configured
 * @returns {Promise<boolean>}
 */
async function isAIServiceAvailable() {
  logger.debug('AI_SERVICE', 'Checking AI service availability...');
  try {
    const service = getAIService();
    if (!service) {
      logger.info('AI_SERVICE', 'AI service is not available (service is null)');
      return false;
    }
    const isConfigured = await service.isConfigured();
    logger.info('AI_SERVICE', `AI service availability check: ${isConfigured ? 'AVAILABLE' : 'NOT CONFIGURED'}`);
    return isConfigured;
  } catch (error) {
    logger.warn('AI_SERVICE', `AI service not available: ${error.message}`);
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
  const startTime = Date.now();
  logger.info('AI_SERVICE', `Starting AI validation for word: "${word}" (language: ${language})`);

  try {
    const service = getAIService();
    if (!service) {
      logger.warn('AI_SERVICE', `AI service not available - cannot validate "${word}"`);
      return { isValid: false, isAiVerified: false, reason: 'AI service not available' };
    }

    logger.debug('AI_SERVICE', `Calling validateAndSaveWord for "${word}"`);
    const result = await service.validateAndSaveWord(word, language);
    const duration = Date.now() - startTime;

    logger.info('AI_SERVICE', `AI validation completed for "${word}"`, {
      isValid: result.isValid,
      source: result.source,
      reason: result.reason,
      duration: `${duration}ms`
    });

    return {
      isValid: result.isValid,
      isAiVerified: result.source === 'ai',
      reason: result.reason || (result.isValid ? 'Valid word' : 'Invalid word')
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI_SERVICE', `AI validation failed for "${word}" after ${duration}ms: ${error.message}`);
    return { isValid: false, isAiVerified: false, reason: 'Validation error' };
  }
}

/**
 * Batch validate multiple words
 * @param {string[]} words - Array of words to validate
 * @param {string} language - Language code
 * @returns {Promise<Map<string, {isValid: boolean, isAiVerified: boolean, reason?: string}>>}
 */
async function validateWordsWithAI(words, language = 'en') {
  const startTime = Date.now();
  const results = new Map();

  logger.info('AI_SERVICE', `Starting batch AI validation for ${words.length} words (language: ${language})`, {
    words: words.slice(0, 10).join(', ') + (words.length > 10 ? '...' : '')
  });

  try {
    const service = getAIService();
    if (!service) {
      logger.warn('AI_SERVICE', `AI service not available - cannot batch validate ${words.length} words`);
      words.forEach(word => {
        results.set(word, { isValid: false, isAiVerified: false, reason: 'AI service not available' });
      });
      return results;
    }

    logger.debug('AI_SERVICE', `Calling batch validateWords for ${words.length} words`);

    // Use the batch validation method
    const aiResults = await service.validateWords(words, language);
    const duration = Date.now() - startTime;

    let validCount = 0;
    let aiVerifiedCount = 0;
    let dbVerifiedCount = 0;

    words.forEach((word, index) => {
      const result = aiResults[index];
      const isValid = result?.isValid || false;
      const isAiVerified = result?.source === 'ai';
      const reason = result?.reason || (isValid ? undefined : 'Invalid word');

      results.set(word, { isValid, isAiVerified, reason });

      if (isValid) {
        validCount++;
        if (isAiVerified) aiVerifiedCount++;
        else dbVerifiedCount++;
      }
    });

    logger.info('AI_SERVICE', `Batch AI validation completed for ${words.length} words`, {
      totalWords: words.length,
      validWords: validCount,
      invalidWords: words.length - validCount,
      aiVerified: aiVerifiedCount,
      dbVerified: dbVerifiedCount,
      duration: `${duration}ms`
    });

    return results;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('AI_SERVICE', `Batch AI validation failed after ${duration}ms: ${error.message}`);
    words.forEach(word => {
      results.set(word, { isValid: false, isAiVerified: false, reason: 'Validation error' });
    });
    return results;
  }
}

module.exports = {
  isAIServiceAvailable,
  validateWordWithAI,
  validateWordsWithAI
};
