/**
 * Token Usage Tracker
 *
 * Tracks API token usage for cost monitoring of Vertex AI calls.
 */

import { AI_CONFIG, type TokenUsageStats } from './types';

/**
 * Global token usage statistics
 */
const tokenUsage: TokenUsageStats = {
  totalInputTokens: 0,
  totalOutputTokens: 0,
  requestCount: 0,
  lastReset: Date.now(),
  estimatedCost: 0,
};

/**
 * Calculate estimated cost based on token counts
 */
function calculateCost(inputTokens: number, outputTokens: number): number {
  return (
    inputTokens * AI_CONFIG.TOKEN_COSTS.input +
    outputTokens * AI_CONFIG.TOKEN_COSTS.output
  );
}

/**
 * Update token usage statistics after an API call
 */
export function trackTokenUsage(inputTokens: number, outputTokens: number): void {
  tokenUsage.totalInputTokens += inputTokens;
  tokenUsage.totalOutputTokens += outputTokens;
  tokenUsage.requestCount++;
  tokenUsage.estimatedCost = calculateCost(
    tokenUsage.totalInputTokens,
    tokenUsage.totalOutputTokens
  );
}

/**
 * Get current token usage statistics (returns a copy)
 */
export function getTokenUsage(): TokenUsageStats {
  return { ...tokenUsage };
}

/**
 * Reset token usage statistics
 */
export function resetTokenUsage(): void {
  tokenUsage.totalInputTokens = 0;
  tokenUsage.totalOutputTokens = 0;
  tokenUsage.requestCount = 0;
  tokenUsage.lastReset = Date.now();
  tokenUsage.estimatedCost = 0;
}

/**
 * Estimate token count from text (rough approximation: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
