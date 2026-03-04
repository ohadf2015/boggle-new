import type { Language } from '@/shared/types/game';
import { SPECIAL_TILE_DISTRIBUTION, type BlastTileType } from '../types';

/**
 * Letter frequency weights per language.
 * Extracted from lib/adventure/gridGenerator.ts for reuse in blast refill.
 */
const LETTER_WEIGHTS: Record<string, Record<string, number>> = {
  en: {
    E: 12, T: 9, A: 8, O: 8, I: 7, N: 7, S: 6, H: 6, R: 6,
    D: 4, L: 4, C: 3, U: 3, M: 3, W: 2, F: 2, G: 2, Y: 2,
    P: 2, B: 1, V: 1, K: 1, J: 1, X: 1, Q: 1, Z: 1,
  },
  he: {
    'י': 10, 'ו': 9, 'ה': 8, 'א': 7, 'ל': 7, 'מ': 6, 'ר': 6,
    'נ': 5, 'ש': 5, 'ת': 5, 'ב': 4, 'כ': 4, 'ע': 4, 'ד': 3,
    'ח': 3, 'ק': 3, 'פ': 2, 'ס': 2, 'ג': 2, 'ז': 2, 'צ': 2, 'ט': 1,
  },
  sv: {
    E: 10, A: 9, N: 8, R: 7, T: 7, S: 6, I: 6, L: 5, O: 5,
    D: 4, K: 4, M: 4, G: 3, H: 3, V: 3, '\u00C4': 3, '\u00C5': 2,
    '\u00D6': 2, F: 2, P: 2, U: 2, B: 2, C: 1, J: 1, Y: 1,
    X: 1, Z: 1, W: 1, Q: 1,
  },
  ja: {
    // Japanese uses hiragana for blast mode
    '\u3042': 8, '\u3044': 8, '\u3046': 7, '\u3048': 6, '\u304A': 6,
    '\u304B': 5, '\u304D': 5, '\u304F': 4, '\u3051': 4, '\u3053': 4,
    '\u3055': 4, '\u3057': 5, '\u3059': 4, '\u305B': 3, '\u305D': 3,
    '\u305F': 5, '\u3061': 4, '\u3064': 4, '\u3066': 4, '\u3068': 4,
    '\u306A': 4, '\u306B': 4, '\u306C': 2, '\u306D': 2, '\u306E': 5,
    '\u306F': 3, '\u3072': 2, '\u3075': 2, '\u3078': 2, '\u307B': 2,
    '\u307E': 4, '\u307F': 3, '\u3080': 2, '\u3081': 2, '\u3082': 3,
    '\u3084': 3, '\u3086': 2, '\u3088': 3, '\u3089': 3, '\u308A': 3,
    '\u308B': 4, '\u308C': 2, '\u308D': 2, '\u308F': 2, '\u3093': 5,
  },
};

/** Vowels per language (used for vowel frequency modification) */
const VOWELS: Record<string, Set<string>> = {
  en: new Set(['A', 'E', 'I', 'O', 'U']),
  he: new Set(['א', 'ו', 'י']), // approximate vowel letters
  sv: new Set(['A', 'E', 'I', 'O', 'U', '\u00C4', '\u00C5', '\u00D6']),
  ja: new Set(['\u3042', '\u3044', '\u3046', '\u3048', '\u304A']),
};

/** Pre-built weighted pools for fast random selection */
const poolCache = new Map<string, string[]>();

function getPool(language: Language, vowelModifier = 1.0): string[] {
  // Cache key includes modifier to avoid stale pools
  const cacheKey = `${language}-${vowelModifier}`;
  if (poolCache.has(cacheKey)) return poolCache.get(cacheKey)!;

  const lang = language as string;
  const weights = LETTER_WEIGHTS[lang] || LETTER_WEIGHTS.en;
  const vowelSet = VOWELS[lang] || VOWELS.en;
  const pool: string[] = [];

  for (const [letter, weight] of Object.entries(weights)) {
    const isVowel = vowelSet.has(letter);
    const adjustedWeight = isVowel ? Math.max(1, Math.round(weight * vowelModifier)) : weight;
    for (let i = 0; i < adjustedWeight; i++) {
      pool.push(letter);
    }
  }

  poolCache.set(cacheKey, pool);
  return pool;
}

/**
 * Generate a weighted random letter for the given language.
 * @param vowelModifier - Multiplier for vowel frequency (1.0 = normal, lower = fewer vowels)
 */
export function generateBlastLetter(language: Language, vowelModifier = 1.0): string {
  const pool = getPool(language, vowelModifier);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Roll for special tile type, or return 'standard'.
 * @param specialTileChance - Base probability of a special tile [0, 1]
 * @param customDistribution - Optional override distribution
 * @param spawnModifier - DDA modifier from getDDASpawnModifier(); clamped so effective chance stays in [0.05, 0.95]
 */
export function rollSpecialType(
  specialTileChance: number,
  customDistribution?: Record<string, number>,
  spawnModifier = 0,
): BlastTileType {
  // Apply DDA modifier with clamping only when a modifier is present.
  // Without modifier the base chance is used as-is (preserves existing behaviour).
  const effectiveChance = spawnModifier !== 0
    ? Math.min(0.95, Math.max(0.05, specialTileChance + spawnModifier))
    : specialTileChance;
  if (Math.random() >= effectiveChance) return 'standard';

  const dist = customDistribution ?? SPECIAL_TILE_DISTRIBUTION;
  const roll = Math.random();
  let cumulative = 0;
  for (const [tileType, weight] of Object.entries(dist)) {
    if (weight <= 0) continue;
    cumulative += weight;
    if (roll < cumulative) return tileType as BlastTileType;
  }
  return 'standard'; // Fallback
}
