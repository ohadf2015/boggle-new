/**
 * AI Hint Generation API
 * Route handler for generating progressive hints for Word Hunt Survival Mode
 */

import { Router, Request, Response } from 'express';
import {
  generateHintsSchema,
  generateAlgorithmicHints,
  generateAIEnhancedData,
  generateFallbackHints,
  getFromCache,
  setInCache,
  getCacheSize,
  getGeminiModel,
  LANGUAGE_CONFIG,
  type HintGenerationResponse,
} from './aiHintsCore';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/generate-word-hints
 * Generate progressive AI hints for a target word
 */
router.post('/generate-word-hints', async (req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();

  try {
    const parseResult = generateHintsSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: parseResult.error.issues.map(e => e.message),
      });
      return;
    }

    const { targetWord, language } = parseResult.data;
    const normalizedWord = targetWord.toUpperCase().trim();

    const cached = getFromCache(normalizedWord, language);
    if (cached) {
      logger.info('API', `Hint cache hit for ${language}:${normalizedWord}`);
      res.json(cached);
      return;
    }

    const hints = generateAlgorithmicHints(normalizedWord, language);

    const geminiModel = getGeminiModel();
    if (!geminiModel) {
      logger.warn('API', 'AI service not configured, using fallback hints');
      const fallback = generateFallbackHints(normalizedWord, language);
      res.json(fallback);
      return;
    }

    const aiData = await generateAIEnhancedData(normalizedWord, language);

    let lettersToEliminate = aiData.lettersToEliminate;
    if (!lettersToEliminate || lettersToEliminate.length === 0) {
      const config = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.en;
      const wordLetterSet = new Set(normalizedWord.split(''));
      lettersToEliminate = config.alphabet
        .split('')
        .filter(l => !wordLetterSet.has(l))
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);
    }

    const response: HintGenerationResponse = {
      hints,
      category: aiData.category || 'Unknown',
      exampleSentence: aiData.exampleSentence || generateFallbackHints(normalizedWord, language).exampleSentence,
      wordType: aiData.wordType,
      difficulty: aiData.difficulty as 'easy' | 'medium' | 'hard' | undefined,
      lettersToEliminate,
      tokenUsage: aiData.tokenUsage,
    };

    const cacheResponse = { ...response };
    delete cacheResponse.tokenUsage;
    setInCache(normalizedWord, language, cacheResponse);

    const duration = Date.now() - startTime;
    logger.info('API', `Generated hints for ${language}:${normalizedWord} in ${duration}ms`);

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Hint generation error: ${err.message}`);

    const { targetWord = 'WORD', language = 'en' } = req.body || {};
    const fallback = generateFallbackHints(
      typeof targetWord === 'string' ? targetWord : 'WORD',
      typeof language === 'string' ? language : 'en'
    );
    res.json(fallback);
  }
});

/**
 * GET /api/generate-word-hints/health
 * Health check endpoint
 */
router.get('/generate-word-hints/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    aiConfigured: !!getGeminiModel(),
    aiProvider: 'vertex-ai',
    cacheSize: getCacheSize(),
  });
});

export default router;
