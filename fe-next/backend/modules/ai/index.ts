/**
 * AI Module - Barrel Exports
 *
 * Re-exports all public APIs from the AI service modules.
 */

// Types
export type {
  GoogleCredentials,
  ValidationResult,
  CacheEntry,
  TokenUsageStats,
  CacheStats,
  ServiceStatus,
  ParsedValidation,
  BatchValidationItem,
} from './types.js';

export { AI_CONFIG, LANGUAGE_NAMES } from './types.js';

// Cache
export {
  WordValidationCache,
  getValidationCache,
  getCacheStats,
  clearCache,
} from './cache.js';

// Token Tracking
export {
  trackTokenUsage,
  getTokenUsage,
  resetTokenUsage,
  estimateTokens,
} from './tokenTracker.js';

// Prompt Builder
export {
  buildSingleWordPrompt,
  buildBatchPrompt,
  buildThemedBoardPrompt,
} from './promptBuilder.js';

// Retry Utilities
export { isRetryableError, sleep, withRetry } from './retryUtils.js';

// Response Parser
export {
  parseValidationResponse,
  extractPartialJsonResults,
  mapResultsToWords,
  parseBatchResponse,
  parseThemedBoardResponse,
} from './responseParser.js';

// Vertex AI Client
export { VertexAIClient, parseGoogleCredentials } from './vertexClient.js';

// Supabase Word Store
export { SupabaseWordStore, createServiceClient } from './supabaseWordStore.js';

// Main Service
export { GameAIService, gameAIService } from './gameAIService.js';
