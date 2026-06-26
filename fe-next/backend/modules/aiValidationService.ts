/**
 * AI Validation Service Wrapper
 * CommonJS wrapper for the GameAIService
 * Provides AI-powered word validation for solo host games
 *
 * AI votes count as 4 points toward the validation threshold (10 points for prominent validation)
 */

 
import logger from '../utils/logger';
 
const { gameAIService } = require('./gameAIService');
 
const { recordAIVote, AI_VOTE_POINTS } = require('./communityWordManager');

// Interfaces
export interface AIValidationResult {
  isValid: boolean;
  isAiVerified: boolean;
  reason?: string;
  confidence?: number;
}

export interface GameAIServiceResult {
  isValid: boolean;
  source: string;
  reason?: string;
  confidence?: number;
}

export interface GameAIServiceInstance {
  isConfigured: () => Promise<boolean>;
  validateAndSaveWord: (word: string, language: string) => Promise<GameAIServiceResult>;
  validateWords: (words: string[], language: string) => Promise<GameAIServiceResult[]>;
}

export interface AIVoteResult {
  netScore: number;
}

/**
 * Get the AI service instance
 */
export function getAIService(): GameAIServiceInstance | null {
  return gameAIService as GameAIServiceInstance | null;
}

/**
 * Check if AI service is available and configured
 */
export async function isAIServiceAvailable(): Promise<boolean> {
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.info('AI_SERVICE', `AI service not available: ${errorMessage}`);
    return false;
  }
}

/**
 * Validate a word using AI and record the AI vote (4 points)
 */
export async function validateWordWithAI(word: string, language: string = 'en'): Promise<AIValidationResult> {
  const startTime = Date.now();
  logger.info('AI_SERVICE', `Starting AI validation for word: "${word}" (language: ${language})`);

  try {
    const service = getAIService();
    if (!service) {
      logger.info('AI_SERVICE', `AI service not available - cannot validate "${word}"`);
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

    // Record AI vote (4 points toward threshold) if AI actually validated
    if (result.source === 'ai') {
      try {
        const aiVoteResult: AIVoteResult = await recordAIVote({
          word,
          language,
          isValid: result.isValid,
          reason: result.reason || (result.isValid ? 'Valid word' : 'Invalid word'),
          confidence: result.confidence || 85
        });
        logger.debug('AI_SERVICE', `AI vote recorded for "${word}": ${AI_VOTE_POINTS} points, netScore: ${aiVoteResult.netScore}`);
      } catch (voteError) {
        const errorMessage = voteError instanceof Error ? voteError.message : String(voteError);
        logger.debug('AI_SERVICE', `Failed to record AI vote for "${word}": ${errorMessage}`);
      }
    }

    return {
      isValid: result.isValid,
      isAiVerified: result.source === 'ai',
      reason: result.reason || (result.isValid ? 'Valid word' : 'Invalid word'),
      confidence: result.confidence
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.info('AI_SERVICE', `AI validation failed for "${word}" after ${duration}ms: ${errorMessage}`);
    return { isValid: false, isAiVerified: false, reason: 'Validation error' };
  }
}

/**
 * Batch validate multiple words and record AI votes (4 points each)
 */
export async function validateWordsWithAI(words: string[], language: string = 'en'): Promise<Map<string, AIValidationResult>> {
  const startTime = Date.now();
  const results = new Map<string, AIValidationResult>();

  logger.info('AI_SERVICE', `Starting batch AI validation for ${words.length} words (language: ${language})`, {
    words: words.slice(0, 10).join(', ') + (words.length > 10 ? '...' : '')
  });

  try {
    const service = getAIService();
    if (!service) {
      logger.info('AI_SERVICE', `AI service not available - cannot batch validate ${words.length} words`);
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

    // Process results and record AI votes
    const votePromises: Promise<unknown>[] = [];

    words.forEach((word, index) => {
      const result = aiResults[index];
      const isValid = result?.isValid || false;
      const isAiVerified = result?.source === 'ai';
      const reason = result?.reason || (isValid ? undefined : 'Invalid word');
      const confidence = result?.confidence;

      results.set(word, { isValid, isAiVerified, reason, confidence });

      if (isValid) {
        validCount++;
        if (isAiVerified) {
          aiVerifiedCount++;
          // Record AI vote (4 points) for each AI-verified word
          votePromises.push(
            recordAIVote({
              word,
              language,
              isValid: true,
              reason: reason || 'Valid word',
              confidence: confidence || 85
            }).catch((err: Error) => {
              logger.debug('AI_SERVICE', `Failed to record AI vote for "${word}": ${err.message}`);
            })
          );
        } else {
          dbVerifiedCount++;
        }
      } else if (isAiVerified) {
        // Also record negative AI votes for rejected words
        votePromises.push(
          recordAIVote({
            word,
            language,
            isValid: false,
            reason: reason || 'Invalid word',
            confidence: confidence || 85
          }).catch((err: Error) => {
            logger.debug('AI_SERVICE', `Failed to record AI vote for "${word}": ${err.message}`);
          })
        );
      }
    });

    // Wait for all AI votes to be recorded (but don't block on failures)
    if (votePromises.length > 0) {
      await Promise.allSettled(votePromises);
      logger.debug('AI_SERVICE', `Recorded ${votePromises.length} AI votes (${AI_VOTE_POINTS} points each)`);
    }

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.info('AI_SERVICE', `Batch AI validation failed after ${duration}ms: ${errorMessage}`);
    words.forEach(word => {
      results.set(word, { isValid: false, isAiVerified: false, reason: 'Validation error' });
    });
    return results;
  }
}

