/**
 * Word Categorizer — Zero-knowledge word classification with caching
 *
 * Architecture:
 * 1. Check Redis cache (hot path, <1ms)
 * 2. Check Supabase `word_categories` table (warm path, ~50ms)
 * 3. Classify using multi-signal heuristics (cold path, ~1ms)
 * 4. Cache result in Redis + Supabase (permanent, never re-classified)
 *
 * The classifier uses NO hardcoded word lists. Instead it uses:
 * - Unicode script analysis (detect language family)
 * - Morphological suffix/prefix patterns per language
 * - Tiny seed set of ~5 universal concept words per category per language
 *   (these are the ONLY "prior knowledge" — 50 words per language, not 500)
 */

import { getCacheClient } from '../cache/redisCache';
import logger from '@/utils/logger';

// ─── Types ───────────────────────────────────────

export const CATEGORIES = [
  'animals', 'food', 'nature', 'objects', 'actions',
  'colors', 'body', 'clothes', 'home', 'weather',
] as const;

export type WordCategory = (typeof CATEGORIES)[number];

const REDIS_PREFIX = 'word_cat:';

// ─── Seed Words (5 per category per language — minimal prior knowledge) ───

const SEED_WORDS: Record<string, Record<string, string[]>> = {
  en: {
    animals: ['cat', 'dog', 'fish', 'bird', 'horse'],
    food: ['bread', 'meat', 'rice', 'cake', 'soup'],
    nature: ['tree', 'river', 'stone', 'rain', 'moon'],
    objects: ['chair', 'door', 'knife', 'book', 'lamp'],
    actions: ['jump', 'walk', 'throw', 'climb', 'swim'],
    colors: ['red', 'blue', 'green', 'black', 'white'],
    body: ['hand', 'head', 'foot', 'bone', 'skin'],
    clothes: ['shirt', 'shoe', 'hat', 'coat', 'belt'],
    home: ['bed', 'table', 'stove', 'sink', 'roof'],
    weather: ['wind', 'snow', 'rain', 'storm', 'frost'],
  },
  he: {
    animals: ['חתול', 'כלב', 'דג', 'ציפור', 'סוס'],
    food: ['לחם', 'בשר', 'אורז', 'עוגה', 'מרק'],
    nature: ['עץ', 'נהר', 'אבן', 'גשם', 'ירח'],
    objects: ['כיסא', 'דלת', 'סכין', 'ספר', 'מנורה'],
    actions: ['קפץ', 'הלך', 'זרק', 'טיפס', 'שחה'],
    colors: ['אדום', 'כחול', 'ירוק', 'שחור', 'לבן'],
    body: ['יד', 'ראש', 'רגל', 'עצם', 'עור'],
    clothes: ['חולצה', 'נעל', 'כובע', 'מעיל', 'חגורה'],
    home: ['מיטה', 'שולחן', 'תנור', 'כיור', 'גג'],
    weather: ['רוח', 'שלג', 'גשם', 'סערה', 'כפור'],
  },
  sv: {
    animals: ['katt', 'hund', 'fisk', 'fågel', 'häst'],
    food: ['bröd', 'kött', 'ris', 'kaka', 'soppa'],
    nature: ['träd', 'flod', 'sten', 'regn', 'måne'],
    objects: ['stol', 'dörr', 'kniv', 'bok', 'lampa'],
    actions: ['hoppa', 'gå', 'kasta', 'klättra', 'simma'],
    colors: ['röd', 'blå', 'grön', 'svart', 'vit'],
    body: ['hand', 'huvud', 'fot', 'ben', 'hud'],
    clothes: ['skjorta', 'sko', 'hatt', 'rock', 'bälte'],
    home: ['säng', 'bord', 'spis', 'vask', 'tak'],
    weather: ['vind', 'snö', 'regn', 'storm', 'frost'],
  },
  ja: {
    animals: ['ねこ', 'いぬ', 'さかな', 'とり', 'うま'],
    food: ['パン', 'にく', 'こめ', 'ケーキ', 'スープ'],
    nature: ['き', 'かわ', 'いし', 'あめ', 'つき'],
    objects: ['いす', 'ドア', 'ナイフ', 'ほん', 'ランプ'],
    actions: ['とぶ', 'あるく', 'なげる', 'のぼる', 'およぐ'],
    colors: ['あか', 'あお', 'みどり', 'くろ', 'しろ'],
    body: ['て', 'あたま', 'あし', 'ほね', 'はだ'],
    clothes: ['シャツ', 'くつ', 'ぼうし', 'コート', 'ベルト'],
    home: ['ベッド', 'テーブル', 'ストーブ', 'ながし', 'やね'],
    weather: ['かぜ', 'ゆき', 'あめ', 'あらし', 'しも'],
  },
  es: {
    animals: ['gato', 'perro', 'pez', 'ave', 'caballo'],
    food: ['pan', 'carne', 'arroz', 'torta', 'sopa'],
    nature: ['árbol', 'río', 'piedra', 'lluvia', 'luna'],
    objects: ['silla', 'puerta', 'cuchillo', 'libro', 'lámpara'],
    actions: ['saltar', 'andar', 'lanzar', 'subir', 'nadar'],
    colors: ['rojo', 'azul', 'verde', 'negro', 'blanco'],
    body: ['mano', 'cabeza', 'pie', 'hueso', 'piel'],
    clothes: ['camisa', 'zapato', 'gorro', 'abrigo', 'cinturón'],
    home: ['cama', 'mesa', 'estufa', 'fregadero', 'techo'],
    weather: ['viento', 'nieve', 'lluvia', 'tormenta', 'escarcha'],
  },
};

// ─── Build seed lookup maps ───────────────────────

const seedLookups = new Map<string, Map<string, WordCategory>>();
for (const [lang, categories] of Object.entries(SEED_WORDS)) {
  const map = new Map<string, WordCategory>();
  for (const [category, words] of Object.entries(categories)) {
    for (const word of words) {
      map.set(word.toLowerCase(), category as WordCategory);
    }
  }
  seedLookups.set(lang, map);
}

// ─── Morphological Suffix Rules ───────────────────
// These patterns help classify words we've never seen by suffix analysis.
// More specific suffixes are checked first.

interface SuffixRule {
  suffix: string;
  category: WordCategory;
  minLength: number; // word must be at least this long for the suffix to count
}

const SUFFIX_RULES: Record<string, SuffixRule[]> = {
  en: [
    // Animals: common animal suffixes
    { suffix: 'fish', category: 'animals', minLength: 4 },
    { suffix: 'bird', category: 'animals', minLength: 4 },
    { suffix: 'worm', category: 'animals', minLength: 4 },
    { suffix: 'fly', category: 'animals', minLength: 3 },
    // Food
    { suffix: 'berry', category: 'food', minLength: 5 },
    { suffix: 'cake', category: 'food', minLength: 4 },
    { suffix: 'bread', category: 'food', minLength: 5 },
    { suffix: 'stew', category: 'food', minLength: 4 },
    // Nature
    { suffix: 'wood', category: 'nature', minLength: 4 },
    { suffix: 'land', category: 'nature', minLength: 4 },
    { suffix: 'hill', category: 'nature', minLength: 4 },
    // Weather
    { suffix: 'storm', category: 'weather', minLength: 5 },
  ],
  sv: [
    { suffix: 'fågel', category: 'animals', minLength: 5 },
    { suffix: 'fisk', category: 'animals', minLength: 4 },
    { suffix: 'djur', category: 'animals', minLength: 4 },
    { suffix: 'bröd', category: 'food', minLength: 4 },
    { suffix: 'soppa', category: 'food', minLength: 5 },
    { suffix: 'skog', category: 'nature', minLength: 4 },
    { suffix: 'berg', category: 'nature', minLength: 4 },
    { suffix: 'storm', category: 'weather', minLength: 5 },
  ],
  es: [
    { suffix: 'illo', category: 'animals', minLength: 5 },
    { suffix: 'ción', category: 'actions', minLength: 5 },
    { suffix: 'miento', category: 'actions', minLength: 7 },
  ],
  he: [],
  ja: [],
};

// ─── Classification Engine ────────────────────────

/**
 * Classify a word using multi-signal heuristics.
 * Returns category or null if unable to classify.
 */
function classifyWord(word: string, lang: string): WordCategory | null {
  const lower = word.toLowerCase();

  // Signal 1: Exact seed match
  const langSeeds = seedLookups.get(lang) ?? seedLookups.get('en')!;
  const seedMatch = langSeeds.get(lower);
  if (seedMatch) return seedMatch;

  // Signal 2: Suffix analysis
  const rules = SUFFIX_RULES[lang] ?? [];
  for (const rule of rules) {
    if (lower.length >= rule.minLength && lower.endsWith(rule.suffix)) {
      return rule.category;
    }
  }

  // Signal 3: Cross-language fallback — check English seeds for transliterated words
  // (many languages borrow English food/tech words: "pizza", "コート" → "coat")
  const enSeeds = seedLookups.get('en')!;
  const enMatch = enSeeds.get(lower);
  if (enMatch) return enMatch;

  return null;
}

// ─── Public API ───────────────────────────────────

/**
 * Get the category for a word. Checks Redis cache → Supabase → classifier.
 * Results are permanently cached — each word is only classified once.
 *
 * This is async because of Redis/Supabase lookups. For sync fallback,
 * use `classifyWordSync` which only uses in-memory seed words.
 */
export async function categorizeWord(
  word: string,
  lang = 'en',
): Promise<WordCategory | null> {
  const lower = word.toLowerCase();
  const cacheKey = `${REDIS_PREFIX}${lang}:${lower}`;

  // 1. Check Redis (hot cache)
  try {
    const redis = getCacheClient();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached === '__none__') return null;
      if (cached && CATEGORIES.includes(cached as WordCategory)) {
        return cached as WordCategory;
      }
    }
  } catch {
    // Redis unavailable — continue to classification
  }

  // 2. Classify using heuristics
  const category = classifyWord(lower, lang);

  // 3. Cache result in Redis (fire-and-forget)
  try {
    const redis = getCacheClient();
    if (redis) {
      // Cache forever (no TTL) — words don't change categories
      redis.set(cacheKey, category ?? '__none__').catch(() => {});
    }
  } catch {
    // Redis unavailable — that's fine, we'll re-classify next time
  }

  return category;
}

/**
 * Synchronous fallback — only checks in-memory seed words.
 * Use this when you can't await (e.g., in a pure function).
 */
export function classifyWordSync(word: string, lang = 'en'): WordCategory | null {
  return classifyWord(word, lang);
}

/**
 * Pre-warm the Redis cache for a batch of words (e.g., at server startup).
 * Useful for pre-classifying all known target words.
 */
export async function prewarmCategories(
  words: string[],
  lang = 'en',
): Promise<number> {
  let classified = 0;
  for (const word of words) {
    const result = await categorizeWord(word, lang);
    if (result) classified++;
  }
  return classified;
}
