/**
 * Daily Buzz Challenge Generator - Barrel Exports
 * Central export point for all buzz-related functionality
 */

// Main orchestrator functions
export {
  generateDailyBuzz,
  regenerateSingleChallenge,
  regenerateChallengesByType,
  getPromptPreview,
  regeneratePartialChallenge,
  getDailyBuzz,
  deleteDailyBuzz,
  getPromptExamples,
  storePromptExample,
} from './buzzGenerator';

// Types
export type {
  AIGenerationResult,
  BuzzChallenge,
  DailyBuzzData,
  GenerateDailyBuzzOptions,
  GoogleCredentials,
  ParsedAIResponse,
  PartialRegenerationOptions,
  PromptExample,
  RegenerableField,
  SocialContent,
  SocialPlatformContent,
  TrendingTopic,
} from './types';

// Constants (for external use if needed)
export { REGION_MAP } from './constants';

// Validation utilities (for testing/admin use)
export { validateChallenges, validateSingleChallenge } from './challengeValidator';

// Trends utilities (for testing/admin use)
export { filterTrends, selectTrendsForChallenge, generateTrendingSummary } from './trendsService';
