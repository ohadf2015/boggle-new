/**
 * Blast v2 Bonus Dictionary Loaders (legacy / unused).
 *
 * Bonus-word validation now flows through `useBlastDictionary.checkSync` (a sync
 * predicate over the shared warmed offline dictionary, wired into the engine via
 * `useBlastV2({ dictionaryCheck })`), with the async `verify` as the fallback.
 * These per-locale loaders are still referenced by the locale configs but never
 * invoked by the engine (`useBlastV2` seeds an empty `bonusDict`), so they
 * intentionally return empty sets. Kept to satisfy the locale-config contract.
 */

import type { Locale } from './types';

/**
 * English bonus dictionary loader
 * Uses an-array-of-english-words package
 */
async function loadEnglishBonusDict(): Promise<Set<string>> {
  try {
    // At runtime, we'd load this from a pre-built bundle or API
    // For now, return empty set with TODO for production implementation
    // TODO: wire to actual dictionary API endpoint or bundled word list
    return new Set<string>();
  } catch {
    console.warn('[Blast] Failed to load English bonus dictionary');
    return new Set<string>();
  }
}

/**
 * Hebrew bonus dictionary loader
 * Uses curated Hebrew word list (Milog-enhanced)
 */
async function loadHebrewBonusDict(): Promise<Set<string>> {
  try {
    // TODO: wire to Hebrew dictionary API endpoint or bundled Milog word list
    return new Set<string>();
  } catch {
    console.warn('[Blast] Failed to load Hebrew bonus dictionary');
    return new Set<string>();
  }
}

/**
 * Swedish bonus dictionary loader
 * Uses Swedish frequency list
 */
async function loadSwedishBonusDict(): Promise<Set<string>> {
  try {
    // TODO: wire to Swedish dictionary API endpoint or bundled word list
    return new Set<string>();
  } catch {
    console.warn('[Blast] Failed to load Swedish bonus dictionary');
    return new Set<string>();
  }
}

/**
 * Japanese bonus dictionary loader
 * Uses hiragana-only vocabulary (V1 constraint)
 */
async function loadJapaneseBonusDict(): Promise<Set<string>> {
  try {
    // TODO: wire to Japanese hiragana dictionary API endpoint or bundled list
    return new Set<string>();
  } catch {
    console.warn('[Blast] Failed to load Japanese bonus dictionary');
    return new Set<string>();
  }
}

/**
 * Spanish bonus dictionary loader
 * Uses Spanish frequency list with accent folding support
 */
async function loadSpanishBonusDict(): Promise<Set<string>> {
  try {
    // TODO: wire to Spanish dictionary API endpoint or bundled word list
    return new Set<string>();
  } catch {
    console.warn('[Blast] Failed to load Spanish bonus dictionary');
    return new Set<string>();
  }
}

/**
 * Registry of per-locale bonus dictionary loaders
 * Each loader returns a Promise<Set<string>> of valid bonus words
 */
export const bonusDictLoaders: Record<Locale, () => Promise<Set<string>>> = {
  en: loadEnglishBonusDict,
  he: loadHebrewBonusDict,
  sv: loadSwedishBonusDict,
  ja: loadJapaneseBonusDict,
  es: loadSpanishBonusDict,
};
