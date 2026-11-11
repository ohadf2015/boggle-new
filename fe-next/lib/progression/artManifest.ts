import type { VisualTier } from '@/lib/avatar/rarity';

// Rarity is baked into each badge's frame color, so badge UI must read rarity from here.
export const achievementRarity: Record<string, VisualTier> = {
  FIRST_BLOOD: 'common',
  SPEED_DEMON: 'rare',
  WORD_MASTER: 'rare',
  COMBO_KING: 'rare',
  PERFECTIONIST: 'rare',
  LEXICON: 'epic',
  WORDSMITH: 'rare',
  QUICK_THINKER: 'common',
  DIVERSE_VOCABULARY: 'common',
  DOUBLE_TROUBLE: 'common',
  TREASURE_HUNTER: 'rare',
  TRIPLE_THREAT: 'rare',
  UNSTOPPABLE: 'epic',
  COMEBACK_KID: 'rare',
  DICTIONARY_DIVER: 'rare',
  LIGHTNING_ROUND: 'rare',
  RARE_GEM: 'epic',
  EXPLORER: 'common',
  STREAK_MASTER: 'rare',
  ANAGRAM_ARTIST: 'rare',
  WORD_ARCHITECT: 'epic',
  SPEED_LEGEND: 'epic',
  COMBO_GOD: 'legendary',
  VOCABULARY_TITAN: 'legendary',
  PRECISION_MASTER: 'epic',
  LONG_WORD_CHAIN: 'epic',
  MINIMALIST: 'common',
  WORD_SNIPER: 'epic',
  PHOTO_FINISH: 'rare',
  CLUTCH_PLAYER: 'rare',
  VETERAN: 'common',
  CENTURION: 'rare',
  WORD_COLLECTOR: 'rare',
  WORD_HOARDER: 'legendary',
  CHAMPION: 'epic',
  LEGEND: 'legendary',
  POINT_MASTER: 'epic',
  POINT_KING: 'legendary',
  DEDICATION: 'common',
  LOYAL_PLAYER: 'epic',
  EARLY_BIRD: 'common',
  PALINDROME_HUNTER: 'rare',
  COMEBACK_CHAMPION: 'epic',
  FIRST_GAME_WIN: 'common',
  CONSONANT_CULT: 'epic',
  VOWEL_HOARDER: 'epic',
  ROGUE_Q: 'epic',
  LEVIATHAN: 'legendary',
  NO_REPEATS: 'epic',
  FLAWLESS_VICTORY: 'epic',
  RIVALRY_FIRST_WIN: 'common',
  RIVALRY_5_WINS: 'rare',
  RIVALRY_25_WINS: 'legendary',
  PING_FIRST: 'common',
  PING_25: 'rare',
  REMATCH_10: 'epic',
  RECORD_FIRST: 'common',
  RECORD_10: 'epic',
  FRIENDS_5: 'rare',
  LEVEL_10: 'common',
  LEVEL_25: 'epic',
  LEVEL_50: 'legendary',
  TITLE_PICKED: 'common',
  DAILY_TOP3: 'rare',
  DAILY_BOARD_STREAK_7: 'epic',
  FIRST_FRIEND: 'common',
  LEVEL_5: 'common',
  LEVEL_75: 'epic',
  LEVEL_100: 'legendary',
  DAILY_BOARD_STREAK_30: 'legendary',
  WORLD_RECORD: 'legendary',
};

export const achievementArt: Record<string, string> = Object.fromEntries(
  Object.keys(achievementRarity).map((key) => [key, `/progression/badges/${key.toLowerCase()}.webp`]),
);

export function getAchievementArt(id: string): string | undefined {
  return achievementArt[id.toUpperCase()];
}

export function getAchievementRarity(id: string): VisualTier | undefined {
  return achievementRarity[id.toUpperCase()];
}

// innerRatio = transparent avatar hole diameter / frame image size
export const rarityFrameArt: Record<VisualTier, { src: string; innerRatio: number }> = {
  common: { src: '/progression/frames/common.webp', innerRatio: 0.618 },
  rare: { src: '/progression/frames/rare.webp', innerRatio: 0.521 },
  epic: { src: '/progression/frames/epic.webp', innerRatio: 0.494 },
  legendary: { src: '/progression/frames/legendary.webp', innerRatio: 0.515 },
};

export const rivalArt = {
  vsBurst: '/progression/rival/vs-burst.webp',
  ping: '/progression/rival/ping.webp',
} as const;

export const levelUpArt = '/progression/levelup-burst.webp';
