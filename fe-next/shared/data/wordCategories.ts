/**
 * Word Categories for Word Hunt
 * Maps common English words to semantic categories for category hints.
 */

export const ALL_CATEGORIES = [
  'animals', 'food', 'nature', 'objects', 'actions',
  'colors', 'body', 'clothes', 'home', 'weather',
] as const;

export type WordCategory = (typeof ALL_CATEGORIES)[number];

export const CATEGORY_EMOJIS: Record<string, string> = {
  animals: '\uD83D\uDC3E', // 🐾
  food: '\uD83C\uDF7D\uFE0F', // 🍽️
  nature: '\uD83C\uDF3F', // 🌿
  objects: '\uD83D\uDCE6', // 📦
  actions: '\u26A1', // ⚡
  colors: '\uD83C\uDFA8', // 🎨
  body: '\uD83E\uDEC0', // 🫀
  clothes: '\uD83D\uDC54', // 👔
  home: '\uD83C\uDFE0', // 🏠
  weather: '\u26C5', // ⛅
};

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  en: {
    animals: 'animal',
    food: 'food item',
    nature: 'nature word',
    objects: 'object',
    actions: 'action',
    colors: 'color',
    body: 'body part',
    clothes: 'clothing',
    home: 'household item',
    weather: 'weather word',
  },
  he: {
    animals: '\u05D7\u05D9\u05D4',
    food: '\u05DE\u05D0\u05DB\u05DC',
    nature: '\u05D8\u05D1\u05E2',
    objects: '\u05D7\u05E4\u05E5',
    actions: '\u05E4\u05E2\u05D5\u05DC\u05D4',
    colors: '\u05E6\u05D1\u05E2',
    body: '\u05D0\u05D9\u05D1\u05E8 \u05D2\u05D5\u05E3',
    clothes: '\u05D1\u05D2\u05D3',
    home: '\u05E4\u05E8\u05D9\u05D8 \u05D1\u05D9\u05EA',
    weather: '\u05DE\u05D6\u05D2 \u05D0\u05D5\u05D5\u05D9\u05E8',
  },
  sv: {
    animals: 'djur',
    food: 'mat',
    nature: 'natur',
    objects: 'f\u00F6rem\u00E5l',
    actions: 'handling',
    colors: 'f\u00E4rg',
    body: 'kroppsdel',
    clothes: 'kl\u00E4der',
    home: 'hush\u00E5ll',
    weather: 'v\u00E4der',
  },
  ja: {
    animals: '\u52D5\u7269',
    food: '\u98DF\u3079\u7269',
    nature: '\u81EA\u7136',
    objects: '\u7269',
    actions: '\u884C\u52D5',
    colors: '\u8272',
    body: '\u4F53\u306E\u90E8\u4F4D',
    clothes: '\u8863\u670D',
    home: '\u5BB6\u5EAD\u7528\u54C1',
    weather: '\u5929\u6C17',
  },
  es: {
    animals: 'animal',
    food: 'alimento',
    nature: 'naturaleza',
    objects: 'objeto',
    actions: 'acci\u00F3n',
    colors: 'color',
    body: 'parte del cuerpo',
    clothes: 'ropa',
    home: 'art\u00EDculo del hogar',
    weather: 'clima',
  },
};

/**
 * Get the localized display label for a category.
 * Falls back to English, then to generic "word".
 */
export function getCategoryLabel(category: string, locale: string): string {
  const lang = locale.split('-')[0].split('_')[0];
  return CATEGORY_LABELS[lang]?.[category]
    ?? CATEGORY_LABELS.en?.[category]
    ?? 'word';
}
