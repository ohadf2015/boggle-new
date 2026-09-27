/**
 * AI Service Types, Schemas, and Configuration
 */

import { z } from 'zod';

// =============================================================================
// Zod Schemas for AI Response Validation
// =============================================================================

export const WordValidationResponseSchema = z.object({
  isValid: z.boolean(),
  reason: z.string(),
  confidence: z.number().min(0).max(100),
});

export const ThemedWordsResponseSchema = z.array(z.string());

export const HintResponseSchema = z.object({
  hint: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

// =============================================================================
// Configuration Constants
// =============================================================================

/** Minimum confidence threshold for AI to approve a word (70%) */
export const MIN_CONFIDENCE_THRESHOLD = 70;

/** Gemini 1.5 Flash pricing (as of 2024) */
export const TOKEN_COSTS = {
  input: 0.000000075,   // $0.075 per 1M tokens
  output: 0.0000003,    // $0.30 per 1M tokens
} as const;

/** Retry configuration for failed API calls */
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
} as const;

/** Timeout configuration for AI operations */
export const AI_TIMEOUT_CONFIG = {
  singleValidation: 30_000,   // 30 seconds
  bulkGeneration: 45_000,     // 45 seconds
  themedBoard: 30_000,        // 30 seconds
  hint: 15_000,               // 15 seconds
} as const;

/** Validation cache configuration */
export const VALIDATION_CACHE_CONFIG = {
  maxSize: 5000,
  ttlMs: 30 * 60 * 1000,      // 30 minutes
  cleanupInterval: 5 * 60 * 1000,  // 5 minutes
} as const;

// =============================================================================
// Type Definitions
// =============================================================================

export interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

export interface WordValidationResult {
  isValid: boolean;
  reason?: string;
  source: 'database' | 'ai';
  error?: string;
}

export interface CommunityWord {
  id: string;
  word: string;
  language: string;
  approval_count: number;
  promoted_to_dictionary: boolean;
  first_approved_at: string;
}

export interface HintResult {
  hint: string;
  hintType: 'definition' | 'firstLetter' | 'length' | 'category';
  targetWord: string;
  error?: string;
}

export interface TokenUsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  requestCount: number;
  lastReset: number;
  estimatedCost: number; // in USD
}

export interface CacheEntry {
  result: { isValid: boolean; reason?: string };
  timestamp: number;
}

/** Language code to display name mapping */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  sv: 'Swedish',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
} as const;
