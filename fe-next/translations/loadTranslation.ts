/**
 * Dynamic translation loader — loads only the requested language.
 *
 * This replaces the static `import { translations } from '../translations'`
 * which bundled ALL 5 languages (1.26MB) into every page's client JS.
 *
 * Now each language is a separate chunk (~250KB) loaded on demand.
 * The active language is loaded synchronously via the initial import,
 * and switching languages triggers a lazy import of the new language file.
 */

import type { Language } from '@/types';
import { normalizeMessages } from '@/i18n/normalizeMessages';

// Translation data type — the shape of each language file
export type TranslationData = Record<string, unknown>;

// Cache for loaded translations (avoids re-importing on switch back)
const cache = new Map<Language, TranslationData>();

/**
 * Global assigned by the hashed `public/i18n/<lang>.<hash>.js` asset that the
 * locale layout loads in <head>. Catalogues used to travel as a prop from the
 * server layout to a client provider, which serialised ~525kB of JSON into
 * every page's RSC flight payload — uncacheable, and re-downloaded on every
 * full page load. As a hashed asset it is fetched once and then read from disk
 * cache. The script is a classic (non-module, non-defer) tag so the catalogue
 * exists before hydration: `t()` returns raw key paths without it.
 * Written by `scripts/build-i18n-assets.ts`.
 */
const MESSAGES_GLOBAL = '__LEXI_MESSAGES__';

function readGlobalMessages(lang: Language): TranslationData | undefined {
  const bag = (globalThis as Record<string, unknown>)[MESSAGES_GLOBAL] as
    | Record<string, TranslationData>
    | undefined;
  return bag?.[lang];
}

/**
 * Dynamically import a single language file.
 * Each language becomes its own webpack chunk (~250KB instead of 1.26MB total).
 */
export async function loadTranslation(lang: Language): Promise<TranslationData> {
  const cached = cache.get(lang);
  if (cached) return cached;

  // Already in the page courtesy of the <head> asset — skip the network entirely.
  const fromGlobal = readGlobalMessages(lang);
  if (fromGlobal) {
    cache.set(lang, fromGlobal);
    return fromGlobal;
  }

  let mod: Record<string, unknown>;

  switch (lang) {
    case 'en':
      mod = await import('./en.js');
      break;
    case 'he':
      mod = await import('./he.js');
      break;
    case 'sv':
      mod = await import('./sv.js');
      break;
    case 'ja':
      mod = await import('./ja.js');
      break;
    case 'es':
      mod = await import('./es.js');
      break;
    case 'ru':
      mod = await import('./ru.js');
      break;
    default:
      mod = await import('./en.js');
  }

  const raw = mod[lang] || mod.default || Object.values(mod)[0];
  const data = normalizeMessages(raw as Record<string, unknown>) as TranslationData;
  cache.set(lang, data);
  return data;
}

/**
 * Synchronous getter for already-cached translations.
 * In test/Node environments, falls back to require() so translations are immediately available.
 * Returns undefined only if loading fails.
 */
export function getCachedTranslation(lang: Language): TranslationData | undefined {
  const cached = cache.get(lang);
  if (cached) return cached;

  // The <head> asset runs before hydration, so this is the browser's fast path.
  const fromGlobal = readGlobalMessages(lang);
  if (fromGlobal) {
    cache.set(lang, fromGlobal);
    return fromGlobal;
  }

  // In test/server environments, load synchronously via require()
  // This ensures tests don't need async setup to access translations
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
    try {
      const mod = require(`./${lang}.js`);
      const raw = mod[lang] || mod.default || Object.values(mod)[0];
      if (raw) {
        const data = normalizeMessages(raw as Record<string, unknown>) as TranslationData;
        cache.set(lang, data);
        return data;
      }
    } catch { /* fall through */ }
  }

  return undefined;
}

/**
 * Pre-populate cache with data that was already loaded (e.g., from static import).
 */
export function seedTranslationCache(lang: Language, data: TranslationData): void {
  cache.set(lang, data);
}
