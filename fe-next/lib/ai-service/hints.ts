/**
 * AI Hint Generation for Single Player Mode
 * Creates helpful hints without giving away the answer
 */

import { type GenAIModel, trackTokenUsage } from './client';
import {
  HintResponseSchema,
  AI_TIMEOUT_CONFIG,
  LANGUAGE_NAMES,
  type HintResult,
  type TokenUsageStats,
} from './types';
import { withRetry } from './validation';
import logger from '@/backend/utils/logger';

const HINT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a hint for a word using AI
 */
export async function generateHint(
  model: GenAIModel,
  targetWord: string,
  language: string = 'en',
  hintLevel: 1 | 2 | 3 = 2,
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>,
  hintCache: Map<string, { hint: HintResult; timestamp: number }>,
  tokenUsage: TokenUsageStats
): Promise<HintResult> {
  // Check cache first
  const cacheKey = `${targetWord}:${language}:${hintLevel}`;
  const cached = hintCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < HINT_CACHE_TTL) {
    return cached.hint;
  }

  const languageName = LANGUAGE_NAMES[language] || 'English';
  const firstLetter = targetWord[0].toUpperCase();
  const wordLength = targetWord.length;

  const hintGuidance = hintLevel === 1
    ? 'Give a vague category or general context (e.g., "Something in nature")'
    : hintLevel === 2
    ? 'Give a brief definition or what it means/does (e.g., "A tool for cutting")'
    : 'Give a specific definition or usage example (e.g., "What a chef does to vegetables")';

  const prompt = `Create a helpful hint for the ${languageName} word "${targetWord}" in a word game.

${hintGuidance}

HINT STYLE (pick one that fits best):
- Definition: What the word means (e.g., "A place where books are kept")
- Category: What type of thing it is (e.g., "A type of fruit")
- Action: What it does/is used for (e.g., "What you do when tired")
- Context: Where/when you'd see it (e.g., "Found in a kitchen")

Rules:
- Max 12 words, be concise and helpful
- In ${languageName}
- Never include the word itself or obvious rhymes
- Make it useful for guessing, not just describing letters

Respond JSON only: {"hint":"your hint","difficulty":"${hintLevel === 1 ? 'easy' : hintLevel === 2 ? 'medium' : 'hard'}"}`;

  try {
    const result = await withRetry(async () => {
      const aiPromise = model.generateContent(prompt);
      return await withTimeout(aiPromise, AI_TIMEOUT_CONFIG.hint, 'Hint generation');
    }, 'generateHint');

    const response = result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Track token usage
    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = Math.ceil(text.length / 4);
    trackTokenUsage(tokenUsage, inputTokens, outputTokens);

    // Extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        hint: `${wordLength}-letter word starting with "${firstLetter}"`,
        hintType: 'firstLetter',
        targetWord,
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = HintResponseSchema.parse(parsed);

    const hintResult: HintResult = {
      hint: validated.hint,
      hintType: 'definition',
      targetWord,
    };

    // Cache the result
    hintCache.set(cacheKey, { hint: hintResult, timestamp: Date.now() });

    return hintResult;
  } catch (error) {
    logger.info('AI_SERVICE', ' generateHint error:', error);

    // Return graceful fallback
    return {
      hint: `Look for a ${wordLength}-letter word starting with "${firstLetter}"`,
      hintType: 'firstLetter',
      targetWord,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate a simple hint without AI (faster, no API call)
 */
export function generateSimpleHint(
  targetWord: string,
  hintLevel: 1 | 2 | 3 = 2
): HintResult {
  const length = targetWord.length;
  const firstLetter = targetWord[0].toUpperCase();
  const lastLetter = targetWord[targetWord.length - 1].toUpperCase();

  let hint: string;
  let hintType: HintResult['hintType'];

  switch (hintLevel) {
    case 1:
      hint = `There's a ${length}-letter word you haven't found`;
      hintType = 'length';
      break;
    case 2:
      hint = `Look for a ${length}-letter word starting with "${firstLetter}"`;
      hintType = 'firstLetter';
      break;
    case 3:
      hint = `${length} letters: "${firstLetter}" ... "${lastLetter}"`;
      hintType = 'firstLetter';
      break;
    default:
      hint = `There's a ${length}-letter word available`;
      hintType = 'length';
  }

  return {
    hint,
    hintType,
    targetWord,
  };
}

/**
 * Get a hint for a random unfound word
 */
export async function getHintForUnfoundWord(
  availableWords: string[],
  foundWords: string[],
  language: string = 'en',
  preferLonger: boolean = true,
  model: GenAIModel | null,
  withTimeout: <T>(promise: Promise<T>, timeoutMs: number, operationName: string) => Promise<T>,
  hintCache: Map<string, { hint: HintResult; timestamp: number }>,
  tokenUsage: TokenUsageStats
): Promise<HintResult | null> {
  // Filter out already found words
  const unfoundWords = availableWords.filter(
    w => !foundWords.includes(w.toLowerCase())
  );

  if (unfoundWords.length === 0) {
    return null;
  }

  // Sort by length if preferring longer words
  if (preferLonger) {
    unfoundWords.sort((a, b) => b.length - a.length);
  }

  // Pick from top candidates
  const candidates = unfoundWords.slice(0, Math.min(10, unfoundWords.length));
  const targetWord = candidates[Math.floor(Math.random() * candidates.length)];

  // Determine hint level based on word length
  const hintLevel: 1 | 2 | 3 = targetWord.length <= 4 ? 1 : targetWord.length <= 6 ? 2 : 3;

  // Try AI hint if model available, fall back to simple hint
  if (model) {
    try {
      return await generateHint(model, targetWord, language, hintLevel, withTimeout, hintCache, tokenUsage);
    } catch {
      return generateSimpleHint(targetWord, hintLevel);
    }
  }

  return generateSimpleHint(targetWord, hintLevel);
}
