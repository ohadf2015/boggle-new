/**
 * AI Service Type Definitions
 *
 * Shared interfaces for word validation, caching, and AI service status.
 */

export interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  confidence?: number;
  source?: string;
  error?: string;
}

export interface CacheEntry {
  result: ValidationResult;
  timestamp: number;
}

export interface TokenUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  lastReset: number;
  estimatedCost: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: string;
}

export interface ServiceStatus {
  vertexAI: boolean;
  supabase: boolean;
  error: string | null;
  tokenUsage: TokenUsageStats;
  cacheStats: CacheStats;
}

export interface ParsedValidation {
  isValid: boolean;
  reason: string;
  confidence: number;
}

export interface BatchValidationItem {
  word: string;
  isValid: boolean;
  reason?: string;
  confidence?: number;
}

/**
 * Configuration constants for the AI service
 */
export const AI_CONFIG = {
  /** Minimum confidence threshold for AI to approve a word (70%) */
  MIN_CONFIDENCE_THRESHOLD: 70,

  /** Retry configuration for API calls */
  RETRY: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  },

  /** In-memory cache configuration */
  CACHE: {
    maxSize: 5000,
    ttlMs: 30 * 60 * 1000, // 30 minutes
    cleanupInterval: 5 * 60 * 1000, // 5 minutes
  },

  /** Token cost tracking (Gemini 1.5 Flash pricing as of 2024) */
  TOKEN_COSTS: {
    input: 0.000000075, // $0.075 per 1M input tokens
    output: 0.0000003, // $0.30 per 1M output tokens
  },
} as const;

/**
 * Language name mappings for prompt generation
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  ja: 'Japanese',
};
