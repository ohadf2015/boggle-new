/**
 * GameAIService - Backwards Compatibility Layer
 *
 * This file has been decomposed into focused modules for better maintainability:
 * - lib/ai-service/types.ts - Types, schemas, configuration
 * - lib/ai-service/cache.ts - LRU cache implementation
 * - lib/ai-service/client.ts - Vertex AI setup & initialization
 * - lib/ai-service/validation.ts - Word validation logic
 * - lib/ai-service/hints.ts - Hint generation
 * - lib/ai-service/generation.ts - Themed/bulk word generation
 * - lib/ai-service/index.ts - Main service class
 *
 * This file re-exports everything for backwards compatibility.
 * New code should import directly from 'lib/ai-service' instead.
 */

export {
  gameAIService,
  GameAIService,
  type WordValidationResult,
  type CommunityWord,
  type HintResult,
  type TokenUsageStats,
} from './ai-service/index';
