/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for API calls.
 */

import { AI_CONFIG } from './types.js';

import logger from '../../utils/logger';

/**
 * Check if an error is retryable (network errors, rate limits, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false;

  const err = error as { message?: string; code?: string; name?: string };
  const message = (err.message || '').toLowerCase();
  const code = err.code || '';
  const name = (err.name || '').toLowerCase();

  return (
    // Named errors we explicitly throw
    name === 'htmlresponseerror' ||
    name === 'truncatedresponseerror' ||
    // Message-based detection
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('truncated') ||
    message.includes('html error page') ||
    message.includes('429') ||
    message.includes('503') ||
    message.includes('unavailable') ||
    message.includes('econnreset') ||
    message.includes('socket hang up') ||
    // Handle HTML responses (rate limits, auth errors return HTML instead of JSON)
    message.includes('<!doctype') ||
    message.includes('unexpected token') ||
    message.includes('is not valid json') ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT'
  );
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run an async function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < AI_CONFIG.RETRY.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isRetryable = isRetryableError(error);

      if (!isRetryable || attempt === AI_CONFIG.RETRY.maxRetries - 1) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.debug(
          'AI_SERVICE',
          `${operationName} failed after ${attempt + 1} attempts: ${errorMessage}`
        );
        throw error;
      }

      const delay = Math.min(
        AI_CONFIG.RETRY.baseDelayMs * Math.pow(2, attempt),
        AI_CONFIG.RETRY.maxDelayMs
      );

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.debug(
        'AI_SERVICE',
        `${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms: ${errorMessage}`
      );
      await sleep(delay);
    }
  }

  throw lastError;
}
