/**
 * Word Validation Cache - LRU implementation
 * Reduces API calls by caching word validation results
 */

import { VALIDATION_CACHE_CONFIG, type CacheEntry } from './types';

/**
 * Simple LRU cache for word validations
 */
export class WordValidationCache {
  private cache = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;
  private lastCleanup = Date.now();

  private getKey(word: string, language: string): string {
    return `${language}:${word.toLowerCase().trim()}`;
  }

  get(word: string, language: string): { isValid: boolean; reason?: string } | null {
    const key = this.getKey(word, language);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() - entry.timestamp > VALIDATION_CACHE_CONFIG.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // LRU: move to end
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;

    return entry.result;
  }

  set(word: string, language: string, result: { isValid: boolean; reason?: string }): void {
    const key = this.getKey(word, language);

    if (this.cache.size >= VALIDATION_CACHE_CONFIG.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, { result, timestamp: Date.now() });
    this.maybeCleanup();
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < VALIDATION_CACHE_CONFIG.cleanupInterval) return;

    this.lastCleanup = now;
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > VALIDATION_CACHE_CONFIG.ttlMs) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; hits: number; misses: number; hitRate: string } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) : '0';
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
    };
  }

  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

// Global validation cache instance
export const validationCache = new WordValidationCache();
