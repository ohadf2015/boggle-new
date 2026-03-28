/**
 * WordValidationCache - LRU cache for word validation results
 *
 * Reduces API calls by caching recently validated words.
 * Thread-safe for single-process Node.js applications.
 */

import { AI_CONFIG, type ValidationResult, type CacheEntry, type CacheStats } from './types';

import logger from '../../utils/logger';

/**
 * LRU (Least Recently Used) cache implementation for word validations.
 * Provides O(1) get/set operations with automatic TTL-based expiration.
 */
export class WordValidationCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number;
  private ttlMs: number;
  private cleanupInterval: number;
  public hits: number = 0;
  public misses: number = 0;
  private lastCleanup: number;

  constructor(
    maxSize: number = AI_CONFIG.CACHE.maxSize,
    ttlMs: number = AI_CONFIG.CACHE.ttlMs,
    cleanupInterval: number = AI_CONFIG.CACHE.cleanupInterval
  ) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cleanupInterval = cleanupInterval;
    this.lastCleanup = Date.now();
  }

  /**
   * Generate a cache key for a word + language combination
   */
  private getKey(word: string, language: string): string {
    return `${language}:${word.toLowerCase().trim()}`;
  }

  /**
   * Get a cached validation result
   * Returns null if not found or expired
   */
  get(word: string, language: string): ValidationResult | null {
    const key = this.getKey(word, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (most recently used) for LRU behavior
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.result;
  }

  /**
   * Store a validation result in cache
   */
  set(word: string, language: string, result: ValidationResult): void {
    const key = this.getKey(word, language);

    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
    });

    // Periodic cleanup of expired entries
    this.maybeCleanup();
  }

  /**
   * Remove expired entries periodically
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    this.lastCleanup = now;
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('AI_CACHE', `Cleaned up ${removed} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total * 100).toFixed(1) : '0';

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  /**
   * Clear the entire cache and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Global singleton cache instance
let globalCache: WordValidationCache | null = null;

/**
 * Get the global validation cache instance (singleton)
 */
export function getValidationCache(): WordValidationCache {
  if (!globalCache) {
    globalCache = new WordValidationCache();
  }
  return globalCache;
}

/**
 * Get cache statistics from the global instance
 */
export function getCacheStats(): CacheStats {
  return getValidationCache().getStats();
}

/**
 * Clear the global cache
 */
export function clearCache(): void {
  getValidationCache().clear();
}
