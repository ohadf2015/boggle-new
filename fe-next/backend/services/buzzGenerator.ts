/**
 * Daily Buzz Challenge Generator - Facade
 * Re-exports all functionality from the modular buzz/ subdirectory
 *
 * This file exists for backward compatibility with existing imports.
 * All implementation has been refactored into smaller, focused modules
 * under backend/services/buzz/
 */

// Re-export everything from the modular implementation
export {
  // Main orchestrator functions
  generateDailyBuzz,
  regenerateSingleChallenge,
  regenerateChallengesByType,
  getPromptPreview,
  regeneratePartialChallenge,
  // Database functions
  getDailyBuzz,
  deleteDailyBuzz,
  getPromptExamples,
  storePromptExample,
  // Constants
  REGION_MAP,
  // Validation utilities
  validateChallenges,
  validateSingleChallenge,
  // Trends utilities
  filterTrends,
  selectTrendsForChallenge,
  generateTrendingSummary,
} from './buzz';

// Re-export types
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
} from './buzz';
