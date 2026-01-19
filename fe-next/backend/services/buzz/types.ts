/**
 * Type definitions for Daily Buzz Challenge Generator
 * Centralized interfaces and types used across buzz modules
 */

import { TrendingTopic } from '../serpApiClient';

// Re-export TrendingTopic for convenience
export type { TrendingTopic };

/**
 * Challenge types supported by the Daily Buzz system
 */
export type ChallengeType =
  | 'anagram'
  | 'fill_blank'
  | 'word_chain'
  | 'definition_match'
  | 'trending_trio'
  | 'riddle'
  | 'wordle_guess';

/**
 * Difficulty levels for challenges
 */
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

/**
 * A single Daily Buzz challenge
 */
export interface BuzzChallenge {
  type: ChallengeType;
  trend_topic: string;
  prompt: string;
  answer: string;
  hint?: string;
  difficulty: DifficultyLevel;
  trending_context: string;
  options?: string[]; // For multiple choice challenges
}

/**
 * Social media platform content
 */
export interface SocialPlatformContent {
  text: string;
  hashtags: string[];
}

/**
 * Social media content for all platforms
 */
export interface SocialContent {
  x: SocialPlatformContent;
  instagram: SocialPlatformContent;
  tiktok: SocialPlatformContent;
}

/**
 * Complete Daily Buzz data stored in database
 */
export interface DailyBuzzData {
  puzzle_date: string;
  language: string;
  region: string;
  trending_summary: string;
  trending_topics: TrendingTopic[];
  challenges: BuzzChallenge[];
  ai_model: string;
  serp_api_response: unknown;
  image_url: string | null;
  image_prompt: string | null;
  image_category: string | null;
  image_alt_text: string | null;
  image_generation_cost_usd: number;
  social_content: SocialContent | null;
}

/**
 * Options for generating Daily Buzz
 */
export interface GenerateDailyBuzzOptions {
  /**
   * INTERNAL USE ONLY. Pre-fetched trends for batch processing.
   * DO NOT expose this parameter through any API endpoint.
   * Allowing external callers to pass custom trends would enable
   * partial overrides and bypass the trend fetching security model.
   */
  cachedTrends?: TrendingTopic[];
  /**
   * If true, deletes the existing challenge and all related attempts
   * before generating a new one. Use for full regeneration when you
   * want a clean slate (not just an overwrite).
   */
  deleteBeforeRegenerate?: boolean;
}

/**
 * Prompt improvement example from admin feedback
 */
export interface PromptExample {
  challenge_type: string;
  original_prompt: string;
  original_answer: string;
  feedback: string;
  improved_prompt?: string;
  improved_answer?: string;
  trend_topic?: string;
}

/**
 * Valid fields that can be partially regenerated
 */
export type RegenerableField = 'prompt' | 'answer' | 'hint' | 'options' | 'all';

/**
 * Options for partial regeneration
 */
export interface PartialRegenerationOptions {
  fields: RegenerableField[];
  customPrompt?: string;
  additionalExampleIds?: string[];
}

/**
 * Google credentials structure
 */
export interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

/**
 * Result from AI challenge generation
 */
export interface AIGenerationResult {
  challenges: BuzzChallenge[];
  selectedTrends: TrendingTopic[];
  social_content: SocialContent | null;
}

/**
 * Parsed AI response structure
 */
export interface ParsedAIResponse {
  challenges: BuzzChallenge[];
  social_content: SocialContent | null;
}
