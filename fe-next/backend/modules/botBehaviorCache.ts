/**
 * Bot Behavior Cache
 * Manages caches for player words, blacklists, difficulty params, and wrong words
 */

const { getPopularPlayerWords, getSupabase } = require('./supabaseServer');
const { CACHE_CONFIG } = require('./botConfig');
import logger from '../utils/logger';

// Cache entry interface
interface CacheEntry<T> {
  words: T;
  timestamp: number;
}

// Bounded cache configuration
const CACHE_LIMITS = {
  PLAYER_WORDS_MAX_ENTRIES: 10,
  BLACKLIST_MAX_ENTRIES: 10,
  DIFFICULTY_PARAMS_MAX_ENTRIES: 15,
  WRONG_WORDS_MAX_ENTRIES: 10,
};

// Helper to evict oldest entry when cache is full
function evictOldestEntry<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
  if (cache.size < maxSize) return;

  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of cache.entries()) {
    if (entry.timestamp < oldestTime) {
      oldestTime = entry.timestamp;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    cache.delete(oldestKey);
    logger.debug('BOT', `Evicted oldest cache entry: ${oldestKey}`);
  }
}

// Cache stores
const playerWordsCache = new Map<string, CacheEntry<string[]>>();
const blacklistCache = new Map<string, CacheEntry<Set<string>>>();

export interface DynamicDifficultyParams {
  adjustedWordsPerMinute: number;
  adjustedMissChance: number;
  adjustedWrongWordChance: number;
  adjustedMinDelay: number;
  adjustedMaxDelay: number;
  adjustedStartDelay: number;
  sampleSize: number;
  calculatedAt: Date;
}

const difficultyParamsCache = new Map<string, CacheEntry<DynamicDifficultyParams>>();
const DIFFICULTY_PARAMS_TTL = 5 * 60 * 1000;

const wrongWordsCache = new Map<string, CacheEntry<string[]>>();
const WRONG_WORDS_TTL = 10 * 60 * 1000;

// ==========================================
// Cache Management
// ==========================================

export function cleanupPlayerWordsCache(): number {
  const now = Date.now();
  let deleted = 0;

  for (const [language, entry] of playerWordsCache.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.PLAYER_WORDS_TTL * 2) {
      playerWordsCache.delete(language);
      deleted++;
    }
  }

  if (playerWordsCache.size > CACHE_CONFIG.MAX_PLAYER_WORDS_CACHE_SIZE) {
    const entries = Array.from(playerWordsCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    const toRemove = entries.slice(0, playerWordsCache.size - CACHE_CONFIG.MAX_PLAYER_WORDS_CACHE_SIZE);
    for (const [language] of toRemove) {
      playerWordsCache.delete(language);
      deleted++;
    }
  }

  if (deleted > 0) {
    logger.debug('BOT', `Cleaned up ${deleted} expired player words cache entries`);
  }

  return deleted;
}

export async function getCachedPlayerWords(language: string): Promise<string[]> {
  const cacheEntry = playerWordsCache.get(language);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_CONFIG.PLAYER_WORDS_TTL) {
    return cacheEntry.words;
  }

  if (Math.random() < 0.1) {
    cleanupPlayerWordsCache();
  }

  try {
    const { data: words } = await getPopularPlayerWords(language, 500);
    evictOldestEntry(playerWordsCache, CACHE_LIMITS.PLAYER_WORDS_MAX_ENTRIES);
    playerWordsCache.set(language, { words, timestamp: now });
    logger.debug('BOT', `Refreshed player words cache for ${language}: ${words.length} words`);
    return words;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Failed to fetch player words: ${message}`);
    return cacheEntry?.words || [];
  }
}

export async function getCachedBlacklist(language: string): Promise<Set<string>> {
  const cacheEntry = blacklistCache.get(language);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < CACHE_CONFIG.BLACKLIST_TTL) {
    return cacheEntry.words;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return new Set();
    }

    const { data, error } = await supabase
      .from('bot_word_blacklist')
      .select('word')
      .eq('language', language);

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return new Set();
      }
      throw error;
    }

    const words = new Set<string>((data || []).map((row: { word: string }) => row.word.toLowerCase()));
    evictOldestEntry(blacklistCache, CACHE_LIMITS.BLACKLIST_MAX_ENTRIES);
    blacklistCache.set(language, { words, timestamp: now });
    logger.debug('BOT', `Refreshed blacklist cache for ${language}: ${words.size} words`);
    return words;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Failed to fetch blacklist: ${message}`);
    return cacheEntry?.words || new Set();
  }
}

export function clearBehaviorCaches(): void {
  const playerWordsCount = playerWordsCache.size;
  const blacklistCount = blacklistCache.size;
  const difficultyCount = difficultyParamsCache.size;
  const wrongWordsCount = wrongWordsCache.size;

  playerWordsCache.clear();
  blacklistCache.clear();
  difficultyParamsCache.clear();
  wrongWordsCache.clear();

  logger.info('BOT', `Cleared all behavior caches: ${playerWordsCount} player words, ${blacklistCount} blacklist, ${difficultyCount} difficulty params, ${wrongWordsCount} wrong words entries`);
}

export function getCacheStats(): {
  playerWordsCacheSize: number;
  playerWordsCacheLanguages: string[];
  playerWordsCacheLimit: number;
  blacklistCacheSize: number;
  blacklistCacheLanguages: string[];
  blacklistCacheLimit: number;
  difficultyParamsCacheSize: number;
  difficultyParamsCacheLimit: number;
  wrongWordsCacheSize: number;
  wrongWordsCacheLimit: number;
  estimatedMemoryBytes: number;
} {
  let estimatedBytes = 0;

  for (const entry of playerWordsCache.values()) {
    estimatedBytes += entry.words.length * 8;
  }

  for (const entry of blacklistCache.values()) {
    estimatedBytes += entry.words.size * 8;
  }

  estimatedBytes += difficultyParamsCache.size * 200;

  for (const entry of wrongWordsCache.values()) {
    estimatedBytes += entry.words.length * 8;
  }

  return {
    playerWordsCacheSize: playerWordsCache.size,
    playerWordsCacheLanguages: Array.from(playerWordsCache.keys()),
    playerWordsCacheLimit: CACHE_LIMITS.PLAYER_WORDS_MAX_ENTRIES,
    blacklistCacheSize: blacklistCache.size,
    blacklistCacheLanguages: Array.from(blacklistCache.keys()),
    blacklistCacheLimit: CACHE_LIMITS.BLACKLIST_MAX_ENTRIES,
    difficultyParamsCacheSize: difficultyParamsCache.size,
    difficultyParamsCacheLimit: CACHE_LIMITS.DIFFICULTY_PARAMS_MAX_ENTRIES,
    wrongWordsCacheSize: wrongWordsCache.size,
    wrongWordsCacheLimit: CACHE_LIMITS.WRONG_WORDS_MAX_ENTRIES,
    estimatedMemoryBytes: estimatedBytes,
  };
}

export async function getCachedDifficultyParams(
  language: string,
  difficulty: 'easy' | 'medium' | 'hard'
): Promise<DynamicDifficultyParams | null> {
  const cacheKey = `${language}-${difficulty}`;
  const cacheEntry = difficultyParamsCache.get(cacheKey);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < DIFFICULTY_PARAMS_TTL) {
    return cacheEntry.words;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('bot_difficulty_params')
      .select('*')
      .eq('language', language)
      .eq('difficulty', difficulty)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        logger.debug('BOT', `No dynamic params for ${language}/${difficulty}, using defaults`);
        return null;
      }
      throw error;
    }

    if (!data) return null;

    const params: DynamicDifficultyParams = {
      adjustedWordsPerMinute: data.adjusted_words_per_minute,
      adjustedMissChance: data.adjusted_miss_chance,
      adjustedWrongWordChance: data.adjusted_wrong_word_chance,
      adjustedMinDelay: data.adjusted_min_delay,
      adjustedMaxDelay: data.adjusted_max_delay,
      adjustedStartDelay: data.adjusted_start_delay,
      sampleSize: data.sample_size,
      calculatedAt: new Date(data.calculated_at),
    };

    evictOldestEntry(difficultyParamsCache, CACHE_LIMITS.DIFFICULTY_PARAMS_MAX_ENTRIES);
    difficultyParamsCache.set(cacheKey, { words: params, timestamp: now });
    logger.debug('BOT', `Loaded dynamic params for ${language}/${difficulty}: ${params.adjustedWordsPerMinute} wpm, ${params.sampleSize} samples`);
    return params;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Failed to fetch dynamic params: ${message}`);
    return cacheEntry?.words || null;
  }
}

export async function getCachedWrongWords(
  language: string,
  limit: number = 100
): Promise<string[]> {
  const cacheEntry = wrongWordsCache.get(language);
  const now = Date.now();

  if (cacheEntry && (now - cacheEntry.timestamp) < WRONG_WORDS_TTL) {
    return cacheEntry.words;
  }

  try {
    const supabase = getSupabase();
    if (!supabase) {
      return [];
    }

    const { data, error } = await supabase
      .from('player_wrong_words')
      .select('word')
      .eq('language', language)
      .order('times_submitted', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        return [];
      }
      throw error;
    }

    const words = (data || []).map((row: { word: string }) => row.word);
    evictOldestEntry(wrongWordsCache, CACHE_LIMITS.WRONG_WORDS_MAX_ENTRIES);
    wrongWordsCache.set(language, { words, timestamp: now });
    logger.debug('BOT', `Loaded ${words.length} wrong words for ${language}`);
    return words;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('BOT', `Failed to fetch wrong words: ${message}`);
    return cacheEntry?.words || [];
  }
}

/**
 * Add a word to the bot blacklist
 */
export async function addWordToBlacklist(word: string, language: string): Promise<boolean> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      logger.warn('BOT', `Cannot add "${word}" to blacklist - Supabase not configured`);
      return false;
    }

    const normalizedWord = word.toLowerCase().trim();

    const { error } = await supabase
      .from('bot_word_blacklist')
      .insert({
        word: normalizedWord,
        language: language || 'en',
        created_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === '23505') {
        logger.debug('BOT', `Word "${normalizedWord}" already in blacklist for ${language}`);
        return true;
      }
      throw error;
    }

    blacklistCache.delete(language || 'en');

    logger.info('BOT', `Added "${normalizedWord}" to bot blacklist for ${language}`);
    return true;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('BOT', `Failed to add "${word}" to blacklist: ${message}`);
    return false;
  }
}
