/**
 * Utility for generating random default player names
 * Names are localized based on UI language
 */

import { getCachedTranslation } from '@/translations/loadTranslation';

type SupportedLanguage = 'en' | 'he' | 'sv' | 'ja' | 'es';

// Character avatar image IDs for random assignment when no keyword match
const AVATAR_IMAGE_IDS: string[] = [
  'broccoli-bob', 'drippy-drop', 'sunny-steve', 'cloudy-carl',
  'octo-otto', 'pizza-pete', 'prickly-pat', 'melon-molly',
  'avo-alex', 'frosty-frank', 'flaky-fred', 'eggy-ed',
  'slimy-sam', 'starry-stella', 'shroom-shelly', 'donut-danny', 'jelly-jen'
];

export interface NameWithAvatar {
  name: string;
  avatar: {
    emoji: string;
    color: string;
    avatarImage: string;
  };
}

// Map of keywords to their corresponding emoji and color
// Keywords are matched case-insensitively against the name
// IMPORTANT: Food/Animal keywords MUST come FIRST so they match before adjectives
const KEYWORD_EMOJI_MAP: Record<string, { emoji: string; color: string }> = {
  // === FOOD (must come first) ===
  pickle: { emoji: '🥒', color: '#22c55e' },
  potato: { emoji: '🥔', color: '#fcd34d' },
  banana: { emoji: '🍌', color: '#fde047' },
  waffle: { emoji: '🧇', color: '#fbbf24' },
  pancake: { emoji: '🥞', color: '#fcd34d' },
  noodle: { emoji: '🍜', color: '#fb923c' },
  taco: { emoji: '🌮', color: '#ef4444' },
  mochi: { emoji: '🍡', color: '#f9a8d4' },
  pretzel: { emoji: '🥨', color: '#a78bfa' },
  cookie: { emoji: '🍪', color: '#a16207' },
  donut: { emoji: '🍩', color: '#f9a8d4' },
  avocado: { emoji: '🥑', color: '#86efac' },
  falafel: { emoji: '🧆', color: '#22c55e' },
  zucchini: { emoji: '🥒', color: '#22c55e' },
  burrito: { emoji: '🌯', color: '#fb923c' },
  muffin: { emoji: '🧁', color: '#f9a8d4' },
  snack: { emoji: '🍿', color: '#fef08a' },
  jellybean: { emoji: '🫘', color: '#a78bfa' },
  // === ANIMALS (must come before adjectives) ===
  salmon: { emoji: '🐟', color: '#fb923c' },
  goose: { emoji: '🦆', color: '#fef08a' },
  walrus: { emoji: '🦭', color: '#64748b' },
  penguin: { emoji: '🐧', color: '#1f2937' },
  llama: { emoji: '🦙', color: '#fcd34d' },
  dragon: { emoji: '🐉', color: '#22c55e' },
  flamingo: { emoji: '🦩', color: '#f472b6' },
  bear: { emoji: '🐻', color: '#a16207' },
  zebra: { emoji: '🦓', color: '#1f2937' },
  sloth: { emoji: '🦥', color: '#a16207' },
  quokka: { emoji: '🐨', color: '#94a3b8' },
  jellyfish: { emoji: '🪼', color: '#a78bfa' },
  raccoon: { emoji: '🦝', color: '#64748b' },
  fox: { emoji: '🦊', color: '#fb923c' },
  hippo: { emoji: '🦛', color: '#64748b' },
  koala: { emoji: '🐨', color: '#94a3b8' },
  turtle: { emoji: '🐢', color: '#22c55e' },
  wombat: { emoji: '🐻', color: '#a16207' },
  jaguar: { emoji: '🐆', color: '#fbbf24' },
  badger: { emoji: '🦡', color: '#78716c' },
  cactus: { emoji: '🌵', color: '#22c55e' },
  duck: { emoji: '🦆', color: '#fbbf24' },
  eagle: { emoji: '🦅', color: '#78716c' },
  gecko: { emoji: '🦎', color: '#22c55e' },
  iguana: { emoji: '🦎', color: '#22c55e' },
  jackal: { emoji: '🐺', color: '#94a3b8' },
  lemur: { emoji: '🐒', color: '#78716c' },
  moose: { emoji: '🦌', color: '#a16207' },
  newt: { emoji: '🦎', color: '#22c55e' },
  panda: { emoji: '🐼', color: '#1f2937' },
  quail: { emoji: '🐦', color: '#78716c' },
  robot: { emoji: '⚙️', color: '#60a5fa' },
  spider: { emoji: '🕷️', color: '#1f2937' },
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
  snake: { emoji: '🐍', color: '#22c55e' },
  shark: { emoji: '🦈', color: '#38bdf8' },
  tornado: { emoji: '🌪️', color: '#64748b' },
  wizard: { emoji: '🧙', color: '#8b5cf6' },
  // === ADJECTIVES (fallback - only match if no food/animal matched) ===
  disco: { emoji: '🪩', color: '#f472b6' },
  cosmic: { emoji: '🌌', color: '#8b5cf6' },
  fluffy: { emoji: '☁️', color: '#f9a8d4' },
  thunder: { emoji: '⚡', color: '#fbbf24' },
  chaos: { emoji: '🌀', color: '#a78bfa' },
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
  sir: { emoji: '🎩', color: '#1f2937' },
  // Hebrew keywords
  'טופו': { emoji: '🧈', color: '#fef08a' },
  'סביב': { emoji: '🌀', color: '#3b82f6' },
  'מלפפון': { emoji: '🥒', color: '#22c55e' },
  'קוגל': { emoji: '🥧', color: '#fcd34d' },
  'פלאפל': { emoji: '🧆', color: '#22c55e' },
  'נינג׳ה': { emoji: '🥷', color: '#1f2937' },
  'קפטן': { emoji: '🫡', color: '#3b82f6' },
  'ברון': { emoji: '🎩', color: '#1f2937' },
  'דוכס': { emoji: '👑', color: '#fbbf24' },
  'רוזן': { emoji: '🧛', color: '#7c3aed' },
  'רוזנת': { emoji: '👑', color: '#f472b6' },
  'אדמירל': { emoji: '⚓', color: '#3b82f6' },
  'גנרל': { emoji: '⭐', color: '#fbbf24' },
  'סמל': { emoji: '🎖️', color: '#22c55e' },
  'פרופסור': { emoji: '🎓', color: '#1f2937' },
  'חמקמק': { emoji: '🥷', color: '#64748b' },
  'כאוס': { emoji: '🌀', color: '#a78bfa' },
  'צחקוקים': { emoji: '😂', color: '#fbbf24' },
  'חטיף': { emoji: '🍿', color: '#fef08a' },
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
  'רובוט': { emoji: '⚙️', color: '#60a5fa' },
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
 * Get an avatar (emoji, color, avatarImage) that matches a given name
 * Looks for keywords in the name and returns matching avatar
 * avatarImage is required for the Avatar component to display character images
 */
export function getAvatarForName(name: string): { emoji: string; color: string; avatarImage: string } {
  const lowerName = name.toLowerCase();

  // Generate a deterministic hash for consistent avatar assignment
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }

  // Check each keyword against the name
  for (const [keyword, avatar] of Object.entries(KEYWORD_EMOJI_MAP)) {
    if (lowerName.includes(keyword.toLowerCase())) {
      // Keyword match - use deterministic avatarImage based on hash
      const avatarImageIndex = Math.abs(hash) % AVATAR_IMAGE_IDS.length;
      return {
        ...avatar,
        avatarImage: AVATAR_IMAGE_IDS[avatarImageIndex],
      };
    }
  }

  // No keyword match - generate deterministic avatar based on name hash
  // This ensures the same name always gets the same avatar
  const emojiIndex = Math.abs(hash) % DEFAULT_EMOJIS.length;
  const colorIndex = Math.abs(hash >> 4) % DEFAULT_COLORS.length;
  const avatarImageIndex = Math.abs(hash >> 2) % AVATAR_IMAGE_IDS.length;

  return {
    emoji: DEFAULT_EMOJIS[emojiIndex],
    color: DEFAULT_COLORS[colorIndex],
    avatarImage: AVATAR_IMAGE_IDS[avatarImageIndex],
  };
}

/**
 * Get a random default player name with matching avatar from the translations
 * @param language - The UI language (en, he, sv, ja)
 * @returns An object with name and matching avatar
 */
export function getRandomDefaultNameWithAvatar(language: string = 'en'): NameWithAvatar {
  const lang = (language as SupportedLanguage) || 'en';
  const langTranslations = getCachedTranslation(lang) || getCachedTranslation('en');
  const defaultNames = (langTranslations as Record<string, any>)?.joinView?.defaultPlayerNames;

  let name: string;

  if (!defaultNames || !Array.isArray(defaultNames) || defaultNames.length === 0) {
    // Fallback to English if no names available for the language
    const fallbackNames = (getCachedTranslation('en') as Record<string, any>)?.joinView?.defaultPlayerNames;
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

