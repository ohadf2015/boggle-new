/**
 * GameAIService - Vertex AI + Supabase Integration
 *
 * This file is a facade that re-exports from the modular ai/ directory.
 * For implementation details, see:
 * - ai/types.ts - Type definitions and configuration
 * - ai/cache.ts - LRU cache for word validations
 * - ai/tokenTracker.ts - Token usage tracking
 * - ai/promptBuilder.ts - Prompt construction
 * - ai/vertexClient.ts - Vertex AI client
 * - ai/supabaseWordStore.ts - Supabase word storage
 * - ai/gameAIService.ts - Main service orchestration
 */

// Re-export all types
export type {
  GoogleCredentials,
  ValidationResult,
  CacheEntry,
  TokenUsageStats,
  CacheStats,
  ServiceStatus,
  ParsedValidation,
  BatchValidationItem,
} from './ai/index.js';

// Re-export configuration
export { AI_CONFIG, LANGUAGE_NAMES } from './ai/index.js';

// Re-export cache utilities
export {
  WordValidationCache,
  getValidationCache,
  getCacheStats,
  clearCache,
} from './ai/index.js';

// Re-export token tracking
export { getTokenUsage, resetTokenUsage } from './ai/index.js';

// Re-export main service
export { GameAIService, gameAIService } from './ai/index.js';

