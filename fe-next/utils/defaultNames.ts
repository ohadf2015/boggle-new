/**
 * Utility for generating random default player names
 * Names are localized based on UI language
 */

import { translations } from '@/translations';

type SupportedLanguage = 'en' | 'he' | 'sv' | 'ja';

export interface NameWithAvatar {
  name: string;
  avatar: {
    emoji: string;
    color: string;
  };
}

// Map of keywords to their corresponding emoji and color
// Keywords are matched case-insensitively against the name
const KEYWORD_EMOJI_MAP: Record<string, { emoji: string; color: string }> = {
  // Animals
  pickle: { emoji: '🥒', color: '#22c55e' },
  potato: { emoji: '🥔', color: '#fcd34d' },
  banana: { emoji: '🍌', color: '#fde047' },
  waffle: { emoji: '🧇', color: '#fbbf24' },
  pancake: { emoji: '🥞', color: '#fcd34d' },
  noodle: { emoji: '🍜', color: '#fdba74' },
  snack: { emoji: '🍿', color: '#fef08a' },
  wombat: { emoji: '🐻', color: '#a16207' },
  turtle: { emoji: '🐢', color: '#22c55e' },
  donut: { emoji: '🍩', color: '#f9a8d4' },
  pretzel: { emoji: '🥨', color: '#a16207' },
  cookie: { emoji: '🍪', color: '#d97706' },
  muffin: { emoji: '🧁', color: '#f9a8d4' },
  jellybean: { emoji: '🫘', color: '#a78bfa' },
  bear: { emoji: '🐻', color: '#a16207' },
  zebra: { emoji: '🦓', color: '#1f2937' },
  salmon: { emoji: '🐟', color: '#fb923c' },
  goose: { emoji: '🦆', color: '#fef08a' },
  walrus: { emoji: '🦭', color: '#64748b' },
  penguin: { emoji: '🐧', color: '#1f2937' },
  llama: { emoji: '🦙', color: '#fcd34d' },
  dragon: { emoji: '🐉', color: '#22c55e' },
  flamingo: { emoji: '🦩', color: '#f472b6' },
  jaguar: { emoji: '🐆', color: '#fbbf24' },
  quokka: { emoji: '🐨', color: '#a16207' },
  raccoon: { emoji: '🦝', color: '#64748b' },
  sloth: { emoji: '🦥', color: '#a16207' },
  tornado: { emoji: '🌪️', color: '#64748b' },
  wizard: { emoji: '🧙', color: '#8b5cf6' },
  zucchini: { emoji: '🥒', color: '#22c55e' },
  badger: { emoji: '🦡', color: '#78716c' },
  cactus: { emoji: '🌵', color: '#22c55e' },
  duck: { emoji: '🦆', color: '#fbbf24' },
  eagle: { emoji: '🦅', color: '#78716c' },
  fox: { emoji: '🦊', color: '#fb923c' },
  gecko: { emoji: '🦎', color: '#22c55e' },
  hippo: { emoji: '🦛', color: '#64748b' },
  iguana: { emoji: '🦎', color: '#22c55e' },
  jackal: { emoji: '🐺', color: '#94a3b8' },
  koala: { emoji: '🐨', color: '#94a3b8' },
  lemur: { emoji: '🐒', color: '#78716c' },
  moose: { emoji: '🦌', color: '#a16207' },
  newt: { emoji: '🦎', color: '#22c55e' },
  panda: { emoji: '🐼', color: '#1f2937' },
  quail: { emoji: '🐦', color: '#78716c' },
  robot: { emoji: '🤖', color: '#60a5fa' },
  spider: { emoji: '🕷️', color: '#1f2937' },
  taco: { emoji: '🌮', color: '#fbbf24' },
  unicorn: { emoji: '🦄', color: '#f472b6' },
  vulture: { emoji: '🦅', color: '#78716c' },
  worm: { emoji: '🪱', color: '#f472b6' },
  yak: { emoji: '🐃', color: '#a16207' },
  zombie: { emoji: '🧟', color: '#22c55e' },
  armadillo: { emoji: '🦔', color: '#78716c' },
  buffalo: { emoji: '🦬', color: '#a16207' },
  chipmunk: { emoji: '🐿️', color: '#d97706' },
  dolphin: { emoji: '🐬', color: '#38bdf8' },
  elephant: { emoji: '🐘', color: '#94a3b8' },
  frog: { emoji: '🐸', color: '#22c55e' },
  giraffe: { emoji: '🦒', color: '#fbbf24' },
  hamster: { emoji: '🐹', color: '#fdba74' },
  ibex: { emoji: '🐐', color: '#78716c' },
  jellyfish: { emoji: '🪼', color: '#a78bfa' },
  snake: { emoji: '🐍', color: '#22c55e' },
  shark: { emoji: '🦈', color: '#38bdf8' },
  avocado: { emoji: '🥑', color: '#22c55e' },
  burrito: { emoji: '🌯', color: '#fb923c' },
  chaos: { emoji: '🌀', color: '#a78bfa' },
  disco: { emoji: '🪩', color: '#f472b6' },
  thunder: { emoji: '⚡', color: '#fbbf24' },
  cosmic: { emoji: '🌌', color: '#8b5cf6' },
  ninja: { emoji: '🥷', color: '#1f2937' },
  captain: { emoji: '🫡', color: '#3b82f6' },
  professor: { emoji: '🎓', color: '#1f2937' },
  giggles: { emoji: '😂', color: '#fbbf24' },
  lady: { emoji: '👸', color: '#f472b6' },
  baron: { emoji: '🎩', color: '#1f2937' },
  sergeant: { emoji: '🎖️', color: '#22c55e' },
  duke: { emoji: '👑', color: '#fbbf24' },
  princess: { emoji: '👑', color: '#f472b6' },
  count: { emoji: '🧛', color: '#7c3aed' },
  admiral: { emoji: '⚓', color: '#3b82f6' },
  general: { emoji: '⭐', color: '#fbbf24' },
  major: { emoji: '🎖️', color: '#22c55e' },
  // Hebrew keywords
  'טופו': { emoji: '🧈', color: '#fef08a' },
  'סביב': { emoji: '🌀', color: '#3b82f6' },
  'מלפפון': { emoji: '🥒', color: '#22c55e' },
  'קוגל': { emoji: '🥧', color: '#fcd34d' },
  'פלאפל': { emoji: '🧆', color: '#22c55e' },
  'נינג׳ה': { emoji: '🥷', color: '#1f2937' },
  'דג': { emoji: '🐟', color: '#38bdf8' },
  'בננה': { emoji: '🍌', color: '#fde047' },
  'וופל': { emoji: '🧇', color: '#fbbf24' },
  'דונאט': { emoji: '🍩', color: '#f9a8d4' },
  'נסיכת': { emoji: '👑', color: '#f472b6' },
  'אבוקדו': { emoji: '🥑', color: '#22c55e' },
  'עוגייה': { emoji: '🍪', color: '#d97706' },
  'מאפין': { emoji: '🧁', color: '#f9a8d4' },
  'דוב': { emoji: '🐻', color: '#a16207' },
  'זברה': { emoji: '🦓', color: '#1f2937' },
  'אווז': { emoji: '🦆', color: '#fef08a' },
  'פינגווין': { emoji: '🐧', color: '#1f2937' },
  'לאמה': { emoji: '🦙', color: '#fcd34d' },
  'דרקון': { emoji: '🐉', color: '#22c55e' },
  'פלמינגו': { emoji: '🦩', color: '#f472b6' },
  'רקון': { emoji: '🦝', color: '#64748b' },
  'עצלן': { emoji: '🦥', color: '#a16207' },
  'קוסם': { emoji: '🧙', color: '#8b5cf6' },
  'ברווז': { emoji: '🦆', color: '#fbbf24' },
  'נשר': { emoji: '🦅', color: '#78716c' },
  'שועל': { emoji: '🦊', color: '#fb923c' },
  'צפרדע': { emoji: '🐸', color: '#22c55e' },
  'ג׳ירפה': { emoji: '🦒', color: '#fbbf24' },
  'אוגר': { emoji: '🐹', color: '#fdba74' },
  'כריש': { emoji: '🦈', color: '#38bdf8' },
  'פנדה': { emoji: '🐼', color: '#1f2937' },
  'רובוט': { emoji: '🤖', color: '#60a5fa' },
  'חד קרן': { emoji: '🦄', color: '#f472b6' },
  'זומבי': { emoji: '🧟', color: '#22c55e' },
  'דולפין': { emoji: '🐬', color: '#38bdf8' },
  'פיל': { emoji: '🐘', color: '#94a3b8' },
  'קואלה': { emoji: '🐨', color: '#94a3b8' },
  'חתול': { emoji: '🐱', color: '#f9a8d4' },
  'ארנב': { emoji: '🐰', color: '#fda4af' },
  'תולעת': { emoji: '🪱', color: '#f472b6' },
  'מדוזה': { emoji: '🪼', color: '#a78bfa' },
};

// Default colors for random selection when no keyword match
const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
];

// Default emojis for random selection when no keyword match
const DEFAULT_EMOJIS = [
  '⭐', '🌟', '✨', '🎯', '🎨', '🎮', '🚀', '💫', '🌈', '🎪',
];

/**
 * Get an avatar (emoji + color) that matches a given name
 * Looks for keywords in the name and returns matching emoji
 */
export function getAvatarForName(name: string): { emoji: string; color: string } {
  const lowerName = name.toLowerCase();

  // Check each keyword against the name
  for (const [keyword, avatar] of Object.entries(KEYWORD_EMOJI_MAP)) {
    if (lowerName.includes(keyword.toLowerCase())) {
      return avatar;
    }
  }

  // No match found - generate a deterministic "random" avatar based on name hash
  // This ensures the same name always gets the same avatar
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }

  const emojiIndex = Math.abs(hash) % DEFAULT_EMOJIS.length;
  const colorIndex = Math.abs(hash >> 4) % DEFAULT_COLORS.length;

  return {
    emoji: DEFAULT_EMOJIS[emojiIndex],
    color: DEFAULT_COLORS[colorIndex],
  };
}

/**
 * Get a random default player name from the translations
 * @param language - The UI language (en, he, sv, ja)
 * @returns A random funny player name
 * @deprecated Use getRandomDefaultNameWithAvatar instead for proper avatar matching
 */
export function getRandomDefaultName(language: string = 'en'): string {
  return getRandomDefaultNameWithAvatar(language).name;
}

/**
 * Get a random default player name with matching avatar from the translations
 * @param language - The UI language (en, he, sv, ja)
 * @returns An object with name and matching avatar
 */
export function getRandomDefaultNameWithAvatar(language: string = 'en'): NameWithAvatar {
  const lang = (language as SupportedLanguage) || 'en';
  const langTranslations = translations[lang] || translations.en;
  const defaultNames = langTranslations?.joinView?.defaultPlayerNames;

  let name: string;

  if (!defaultNames || !Array.isArray(defaultNames) || defaultNames.length === 0) {
    // Fallback to English if no names available for the language
    const fallbackNames = translations.en?.joinView?.defaultPlayerNames;
    if (!fallbackNames || !Array.isArray(fallbackNames) || fallbackNames.length === 0) {
      name = 'Player';
    } else {
      name = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
    }
  } else {
    name = defaultNames[Math.floor(Math.random() * defaultNames.length)];
  }

  return {
    name,
    avatar: getAvatarForName(name),
  };
}

/**
 * Get a random default player name, ensuring it's unique from existing names
 * @param language - The UI language
 * @param existingNames - Array of names already in use
 * @param maxAttempts - Maximum attempts to find a unique name
 * @returns A random unique funny player name
 * @deprecated Use getUniqueRandomDefaultNameWithAvatar instead for proper avatar matching
 */
export function getUniqueRandomDefaultName(
  language: string = 'en',
  existingNames: string[] = [],
  maxAttempts: number = 10
): string {
  return getUniqueRandomDefaultNameWithAvatar(language, existingNames, maxAttempts).name;
}

/**
 * Get a random default player name with matching avatar, ensuring it's unique from existing names
 * @param language - The UI language
 * @param existingNames - Array of names already in use
 * @param maxAttempts - Maximum attempts to find a unique name
 * @returns An object with unique name and matching avatar
 */
export function getUniqueRandomDefaultNameWithAvatar(
  language: string = 'en',
  existingNames: string[] = [],
  maxAttempts: number = 10
): NameWithAvatar {
  const lang = (language as SupportedLanguage) || 'en';
  const langTranslations = translations[lang] || translations.en;
  const defaultNames = langTranslations?.joinView?.defaultPlayerNames || translations.en?.joinView?.defaultPlayerNames || [];

  if (!Array.isArray(defaultNames) || defaultNames.length === 0) {
    return {
      name: 'Player',
      avatar: getAvatarForName('Player'),
    };
  }

  const lowerExisting = existingNames.map(n => n.toLowerCase());

  // Try to find a unique name
  for (let i = 0; i < maxAttempts; i++) {
    const name = defaultNames[Math.floor(Math.random() * defaultNames.length)];
    if (!lowerExisting.includes(name.toLowerCase())) {
      return {
        name,
        avatar: getAvatarForName(name),
      };
    }
  }

  // If we couldn't find a unique name, append a number
  const baseName = defaultNames[Math.floor(Math.random() * defaultNames.length)];
  const suffix = Math.floor(Math.random() * 99) + 1;
  const name = `${baseName} ${suffix}`;
  return {
    name,
    avatar: getAvatarForName(baseName), // Use base name for avatar matching
  };
}
